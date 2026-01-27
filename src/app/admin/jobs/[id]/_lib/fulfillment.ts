// src/app/admin/jobs/[id]/_lib/fulfillment.ts

export type RequestedOutput =
  | "works" // means snapshot + inspection + hes
  | "leaf_snapshot"
  | "inspection"
  | "hes_report";

export type FulfillmentStep = {
  key: string;
  label: string;
  hint?: string | null;
  // "section" is just for grouping in the UI
  section: "Snapshot" | "Inspection / HES" | "Delivery" | "Intake";
};

export type FulfillmentTemplate = {
  title: string;
  steps: FulfillmentStep[];
};

function arr(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  return [];
}

function hasAny(outputs: string[], want: string[]) {
  const set = new Set(outputs);
  return want.some((w) => set.has(w));
}

function normalizeOutputs(outputs: any): RequestedOutput[] {
  const raw = arr(outputs).map((s) => s.trim());
  const set = new Set(raw);

  // works implies all
  if (set.has("works")) {
    set.add("leaf_snapshot");
    set.add("inspection");
    set.add("hes_report");
  }

  // allow legacy synonyms if you have them
  // set.has("snapshot") -> leaf_snapshot, etc.
  if (set.has("snapshot")) {
    set.delete("snapshot");
    set.add("leaf_snapshot");
  }
  if (set.has("hes")) {
    set.delete("hes");
    set.add("hes_report");
  }

  return Array.from(set) as RequestedOutput[];
}

function inferHasExistingInspectionReport(payload: any, files: any[] | undefined) {
  // We try a few common shapes. You can tweak these keys once you know your payload.
  const p = payload || {};
  const direct =
    Boolean(p.existing_inspection_report_url) ||
    Boolean(p.existing_inspection_report) ||
    Boolean(p.existing_report_url) ||
    Boolean(p.inspection_report_url) ||
    Boolean(p.preexisting_inspection_report);

  const f = Array.isArray(files) ? files : [];
  // naive: any file name contains "inspection" or "report" or "hes"
  const fileHit = f.some((x) => {
    const name = String(x?.name || x?.filename || x?.path || "").toLowerCase();
    return name.includes("inspection") || name.includes("report") || name.includes("hes");
  });

  return direct || fileHit;
}

export function deriveFulfillmentTemplate(args: {
  requestedOutputs: any; // job.requested_outputs
  intakePayload: any; // job.intake_payload
  files?: any[]; // optional: uploaded files list
}): FulfillmentTemplate {
  const outputs = normalizeOutputs(args.requestedOutputs);
  const wantsSnapshot = outputs.includes("leaf_snapshot");
  const wantsInspection = outputs.includes("inspection");
  const wantsHes = outputs.includes("hes_report");

  const hasExistingInspectionReport = inferHasExistingInspectionReport(args.intakePayload, args.files);

  // RULE: snapshot-only requires existing inspection report provided
  const snapshotOnly = wantsSnapshot && !wantsInspection && !wantsHes;
  const needsExistingReport = snapshotOnly && !hasExistingInspectionReport;

  const steps: FulfillmentStep[] = [];

  // Always start with intake review
  steps.push({
    key: "review_intake",
    label: "Review intake details",
    hint: "Confirm request type, contacts, address, and deadlines.",
    section: "Intake",
  });

  steps.push({
    key: "validate_address",
    label: "Validate property address",
    hint: "Confirm deliverable address matches intake and map pin.",
    section: "Intake",
  });

  if (wantsSnapshot) {
    if (needsExistingReport) {
      steps.push({
        key: "collect_existing_report",
        label: "Collect existing inspection report (required for Snapshot-only)",
        hint: "Request the existing report or upload it to Files.",
        section: "Snapshot",
      });
    }

    steps.push({
      key: "confirm_snapshot_inputs",
      label: "Confirm snapshot inputs (sqft, systems, assumptions)",
      hint: "Resolve missing sqft/year-built/systems before building worksheet.",
      section: "Snapshot",
    });

    steps.push({
      key: "build_snapshot_worksheet",
      label: "Build Snapshot Worksheet",
      hint: "Open worksheet, fill missing fields, lock assumptions.",
      section: "Snapshot",
    });

    steps.push({
      key: "generate_snapshot_deliverable",
      label: "Generate deliverable (PDF/Share link)",
      hint: "Generate and attach output link/file to the job.",
      section: "Delivery",
    });

    steps.push({
      key: "deliver_snapshot",
      label: "Deliver Snapshot to broker/client",
      hint: "Email/text link and log delivery status.",
      section: "Delivery",
    });
  }

  // Inspection / HES logic
  if (wantsInspection || wantsHes) {
    const label =
      wantsInspection && wantsHes
        ? "Schedule inspection + HES workflow"
        : wantsInspection
          ? "Schedule inspection"
          : "Schedule HES workflow";

    steps.push({
      key: "schedule_visit",
      label,
      hint: "Confirm availability + access + on-site details.",
      section: "Inspection / HES",
    });

    steps.push({
      key: "complete_visit",
      label: wantsInspection && wantsHes ? "Complete inspection + data collection" : "Complete data collection",
      hint: "Collect photos/measurements + systems + envelope data.",
      section: "Inspection / HES",
    });

    steps.push({
      key: "deliver_inspection_hes",
      label: wantsInspection && wantsHes ? "Deliver inspection + HES output" : "Deliver output",
      hint: "Send report(s) and store link/file in job.",
      section: "Delivery",
    });
  }

  // Always end with close, but only if there is any deliverable at all
  if (wantsSnapshot || wantsInspection || wantsHes) {
    steps.push({
      key: "close_request",
      label: "Close request",
      hint: "Mark complete, confirm delivery, capture notes.",
      section: "Delivery",
    });
  }

  // Title
  const title =
    outputs.includes("works")
      ? "Fulfillment · Works (Snapshot + Inspection + HES)"
      : snapshotOnly
        ? "Fulfillment · Snapshot"
        : wantsInspection && wantsHes
          ? "Fulfillment · Inspection + HES"
          : wantsInspection
            ? "Fulfillment · Inspection"
            : wantsHes
              ? "Fulfillment · HES"
              : "Fulfillment";

  return { title, steps };
}
