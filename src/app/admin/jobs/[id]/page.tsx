// src/app/admin/jobs/[id]/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { supabaseServer } from "../../../../lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server";

import ConsoleHeader from "./_components/ConsoleHeader";
import FilesCard from "./_components/FilesCard";
import TimelineCard from "./_components/TimelineCard";
import NotesCard from "./_components/NotesCard";
import WorkflowCard from "./_components/WorkflowCard";
import UpgradeCardsCard from "./_components/UpgradeCardsCard";


import {
  defaultChecklist,
  ensurePayloadShape,
  normalizeAddr,
  safeObj,
  upsertChecklist,
} from "./_lib/console";

type PageProps = { params: Promise<{ id: string }> };

function str(v: any) {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

type ApptRow = {
  id: string;
  job_id: string;
  kind: string;
  status: string | null;
  start_at: string | null;
  end_at: string | null;
  assignee: string | null;
  notes: string | null;
  service_kinds: string[] | null;
};

export default async function AdminJobDetailPage({ params }: PageProps) {
  noStore();

  const { id: jobId } = await params;
  const supabase = await supabaseServer();
  const admin = supabaseAdmin;

  /* ======================
     SERVER ACTIONS (SERVICE ROLE WRITES)
  ====================== */
  async function updateResponseStatus(formData: FormData) {
    "use server";

    const raw = str(formData.get("response_status"));
    const v = String(raw || "unreviewed").trim().toLowerCase();

    const admin = supabaseAdmin;

    const { data: existing, error: e1 } = await admin
      .from("admin_jobs")
      .select("intake_payload")
      .eq("id", jobId)
      .single();
    if (e1) throw e1;

    const payload = ensurePayloadShape(existing?.intake_payload);
    payload.console.timeline = [
      {
        ts: new Date().toISOString(),
        type: "status",
        message: `response_status → ${v}`,
      },
      ...(payload.console.timeline || []),
    ];

    const { error: e2 } = await admin
      .from("admin_jobs")
      .update({
        response_status: v,
        intake_payload: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    if (e2) throw e2;

    revalidatePath("/admin/jobs");
    revalidatePath(`/admin/jobs/${jobId}`);
    redirect(`/admin/jobs/${jobId}`);
  }

  async function saveAdminNotes(formData: FormData) {
    "use server";
    const notes = String(formData.get("admin_notes") || "");

    const admin = supabaseAdmin;

    const { data: existing, error: e1 } = await admin
      .from("admin_jobs")
      .select("intake_payload")
      .eq("id", jobId)
      .single();
    if (e1) throw e1;

    const payload = ensurePayloadShape(existing?.intake_payload);
    payload.admin_notes = notes;
    payload.console.timeline = [
      {
        ts: new Date().toISOString(),
        type: "note",
        message: "Updated internal notes",
      },
      ...(payload.console.timeline || []),
    ];

    const { error: e2 } = await admin
      .from("admin_jobs")
      .update({ intake_payload: payload, updated_at: new Date().toISOString() })
      .eq("id", jobId);
    if (e2) throw e2;

    revalidatePath(`/admin/jobs/${jobId}`);
    redirect(`/admin/jobs/${jobId}`);
  }

  async function addTimelineEvent(formData: FormData) {
    "use server";
    const message = str(formData.get("message"));
    const type = str(formData.get("type")) || "note";
    if (!message) redirect(`/admin/jobs/${jobId}`);

    const admin = supabaseAdmin;

    const { data: existing, error: e1 } = await admin
      .from("admin_jobs")
      .select("intake_payload")
      .eq("id", jobId)
      .single();
    if (e1) throw e1;

    const payload = ensurePayloadShape(existing?.intake_payload);
    payload.console.timeline = [
      { ts: new Date().toISOString(), type, message },
      ...(payload.console.timeline || []),
    ];

    const { error: e2 } = await admin
      .from("admin_jobs")
      .update({ intake_payload: payload, updated_at: new Date().toISOString() })
      .eq("id", jobId);
    if (e2) throw e2;

    revalidatePath(`/admin/jobs/${jobId}`);
    redirect(`/admin/jobs/${jobId}`);
  }

  async function toggleChecklistItem(formData: FormData) {
    "use server";
    const itemId = str(formData.get("item_id"));
    if (!itemId) redirect(`/admin/jobs/${jobId}`);

    const admin = supabaseAdmin;

    const { data: existing, error: e1 } = await admin
      .from("admin_jobs")
      .select("intake_payload, requested_outputs")
      .eq("id", jobId)
      .single();
    if (e1) throw e1;

    const payload = ensurePayloadShape(existing?.intake_payload);

    const outputs: string[] = Array.isArray(existing?.requested_outputs)
      ? existing!.requested_outputs
      : [];

    const wantsSnapshot = outputs.includes("leaf_snapshot") || outputs.includes("snapshot");
    const wantsInspectionOrHes =
      outputs.includes("inspection") ||
      outputs.includes("hes_report") ||
      outputs.includes("hes");

    const base = defaultChecklist({ wantsSnapshot, wantsInspectionOrHes });
    const withMap = upsertChecklist(payload, base);

    const map = safeObj(withMap.console.checklist);
    if (!map[itemId]) {
      const found = base.find((x) => x.id === itemId);
      map[itemId] = {
        id: itemId,
        label: found?.label || itemId,
        done: false,
        hint: "",
      };
    }

    map[itemId].done = !Boolean(map[itemId].done);
    withMap.console.checklist = map;

    withMap.console.timeline = [
      {
        ts: new Date().toISOString(),
        type: "note",
        message: `${map[itemId].done ? "Completed" : "Reopened"}: ${map[itemId].label}`,
      },
      ...(withMap.console.timeline || []),
    ];

    const { error: e2 } = await admin
      .from("admin_jobs")
      .update({ intake_payload: withMap, updated_at: new Date().toISOString() })
      .eq("id", jobId);
    if (e2) throw e2;

    revalidatePath(`/admin/jobs/${jobId}`);
    redirect(`/admin/jobs/${jobId}`);
  }

  async function saveContactsAction(formData: FormData) {
    "use server";

    const admin = supabaseAdmin;

    const { data: existing, error: e1 } = await admin
      .from("admin_jobs")
      .select("intake_payload")
      .eq("id", jobId)
      .single();
    if (e1) throw e1;

    const payload = ensurePayloadShape(existing?.intake_payload);
    payload.broker = payload.broker && typeof payload.broker === "object" ? payload.broker : {};
    payload.client = payload.client && typeof payload.client === "object" ? payload.client : {};

    const broker_name = str(formData.get("broker_name"));
    const broker_email = str(formData.get("broker_email"));
    const broker_phone = str(formData.get("broker_phone"));
    const brokerage = str(formData.get("brokerage"));

    const client_name = str(formData.get("client_name"));
    const client_email = str(formData.get("client_email"));
    const client_phone = str(formData.get("client_phone"));

    if (broker_name) payload.broker.name = broker_name;
    if (broker_email) payload.broker.email = broker_email;
    if (broker_phone) payload.broker.phone = broker_phone;
    if (brokerage) payload.broker.brokerage = brokerage;

    if (client_name) payload.client.name = client_name;
    if (client_email) payload.client.email = client_email;
    if (client_phone) payload.client.phone = client_phone;

    if (broker_name) payload.broker_name = broker_name;
    if (broker_email) payload.broker_email = broker_email;
    if (broker_phone) payload.broker_phone = broker_phone;
    if (brokerage) payload.brokerage = brokerage;

    if (client_name) payload.client_name = client_name;
    if (client_email) payload.client_email = client_email;
    if (client_phone) payload.client_phone = client_phone;

    payload.console.timeline = [
      {
        ts: new Date().toISOString(),
        type: "note",
        message: "Updated broker/client contact info",
      },
      ...(payload.console.timeline || []),
    ];

    const { error: e2 } = await admin
      .from("admin_jobs")
      .update({ intake_payload: payload, updated_at: new Date().toISOString() })
      .eq("id", jobId);
    if (e2) throw e2;

    revalidatePath("/admin/jobs");
    revalidatePath(`/admin/jobs/${jobId}`);
    redirect(`/admin/jobs/${jobId}`);
  }

  async function saveNotesAction(formData: FormData) {
    "use server";

    const admin = supabaseAdmin;

    const { data: existing, error: e1 } = await admin
      .from("admin_jobs")
      .select("intake_payload")
      .eq("id", jobId)
      .single();
    if (e1) throw e1;

    const payload = ensurePayloadShape(existing?.intake_payload);

    const broker_notes = str(formData.get("broker_notes"));

    if (broker_notes) payload.broker_notes = broker_notes;

    payload.console.timeline = [
      {
        ts: new Date().toISOString(),
        type: "note",
        message: "Updated broker notes",
      },
      ...(payload.console.timeline || []),
    ];

    const { error: e2 } = await admin
      .from("admin_jobs")
      .update({ intake_payload: payload, updated_at: new Date().toISOString() })
      .eq("id", jobId);
    if (e2) throw e2;

    revalidatePath("/admin/jobs");
    revalidatePath(`/admin/jobs/${jobId}`);
    redirect(`/admin/jobs/${jobId}`);
  }

  /* ======================
     LOAD JOB
  ====================== */
  const { data: job, error: jobErr } = await supabase
    .from("admin_jobs")
    .select(
      "id, created_at, customer_type, customer_name, address1, address2, city, state, zip, requested_outputs, intake_source, confirmation_code, response_status, inspection_status, intake_payload"
    )
    .eq("id", jobId)
    .single();

  if (jobErr || !job) {
    return (
      <div className="admin-card">
        <div style={{ fontWeight: 950, fontSize: 18 }}>Job not found</div>
        <div style={{ marginTop: 10 }}>
          <Link
            href="/admin/jobs"
            className="admin-btn"
            style={{ textDecoration: "none", borderRadius: 999 }}
          >
            ← Back
          </Link>
        </div>
      </div>
    );
  }

  if (job.customer_type !== "agent_broker") {
    return (
      <div className="admin-card">
        <div style={{ fontWeight: 950, fontSize: 18 }}>Broker jobs only (for now)</div>
        <div style={{ marginTop: 10 }}>
          <Link
            href="/admin/jobs"
            className="admin-btn"
            style={{ textDecoration: "none", borderRadius: 999 }}
          >
            ← Back
          </Link>
        </div>
      </div>
    );
  }

  // ✅ normalized requests (preferred source of truth)
  const { data: reqRows, error: reqErr } = await admin
    .from("admin_job_requests")
    .select("request_key, status, created_at")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  if (reqErr) throw new Error(reqErr.message);

  const addr = normalizeAddr(job);

  const outputs: string[] = Array.isArray(job.requested_outputs) ? job.requested_outputs : [];
  const wantsSnapshot = outputs.includes("leaf_snapshot") || outputs.includes("snapshot");
  const wantsInspectionOrHes =
    outputs.includes("inspection") || outputs.includes("hes_report") || outputs.includes("hes");

  const payload = ensurePayloadShape(job.intake_payload);

  const broker = safeObj(payload.broker);
  const client = safeObj(payload.client);
  const intakeTimeline = safeObj(payload.timeline);

  const brokerNotes = payload.notes || payload.broker_notes || "";
  const adminNotes = payload.admin_notes || "";

  const neededBy = intakeTimeline.needed_by || intakeTimeline.neededBy || payload.needed_by || "";
  const listingStatus =
    intakeTimeline.listing_status || intakeTimeline.listingStatus || payload.listing_status || "";

  const events = Array.isArray(payload.console.timeline) ? payload.console.timeline : [];

  /* ======================
     ✅ SCHEDULING SUMMARY
  ====================== */
  const nowMinus = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: apptRowsRaw, error: apptErr } = await admin
    .from("admin_job_appointments")
    .select("id, job_id, kind, status, start_at, end_at, assignee, notes, service_kinds")
    .eq("job_id", jobId)
    .eq("status", "scheduled")
    .gte("end_at", nowMinus)
    .order("start_at", { ascending: true })
    .limit(25);

  if (apptErr) throw new Error(apptErr.message);

  const appts = (apptRowsRaw ?? []) as ApptRow[];
  const nextAppt = appts.find((a) => a.start_at && a.end_at) || null;

  function includesService(a: ApptRow, service: "inspection" | "hes") {
    const kind = String(a.kind || "").toLowerCase();
    if (kind === service) return true;
    if (kind === "visit") {
      const sk = Array.isArray(a.service_kinds)
        ? a.service_kinds.map((x) => String(x).toLowerCase())
        : [];
      return sk.includes(service);
    }
    return false;
  }

  const scheduleSummary = {
    next: nextAppt,
    hasInspectionScheduled: appts.some((a) => includesService(a, "inspection")),
    hasHesScheduled: appts.some((a) => includesService(a, "hes")),
    hasVisitScheduled: appts.some((a) => String(a.kind || "").toLowerCase() === "visit"),
  };

  /* ======================
     FILES (service role)
  ====================== */
  const { data: filesRaw } = await admin
    .from("admin_job_files")
    .select(
      "id, created_at, bucket, path, filename, content_type, size_bytes, uploaded_by, meta, storage_path, file_path, file_name, original_filename, mime_type, file_size_bytes"
    )
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  const files = (filesRaw ?? []).map((f: any) => {
    const bucket = f.bucket || "job-files";
    const path = f.path || f.storage_path || f.file_path || null;
    const name = f.filename || f.original_filename || f.file_name || "file";
    const type = f.content_type || f.mime_type || null;
    const size = f.size_bytes ?? f.file_size_bytes ?? null;
    return { ...f, _bucket: bucket, _path: path, _name: name, _type: type, _size: size };
  });

  const signed: Record<string, string> = {};
  for (const f of files) {
    if (!f._bucket || !f._path) continue;
    const { data } = await admin.storage.from(f._bucket).createSignedUrl(f._path, 60 * 15);
    if (data?.signedUrl) signed[String(f.id)] = data.signedUrl;
  }

  /* ======================
     LATEST SNAPSHOT FOR HES PARSE CARD
  ====================== */
  const { data: snapshot } = await admin
  .from("admin_job_snapshots")
  .select("id, generated_at, status, output_data")


  return (
    <div className="space-y-6">
      <ConsoleHeader
        job={job}
        addr={addr}
        outputs={outputs}
        wantsSnapshot={wantsSnapshot}
        jobId={jobId}
        saveContactsAction={saveContactsAction}
        saveNotesAction={saveNotesAction}
      />

      <WorkflowCard
        job={job}
        wantsSnapshot={wantsSnapshot}
        wantsInspectionOrHes={wantsInspectionOrHes}
        updateResponseStatus={updateResponseStatus}
        showStatusControls={true}
        scheduleSummary={scheduleSummary}
        requestedRequests={(reqRows ?? []) as any[]}
        requestedOutputs={outputs}
      />

      <FilesCard files={files} signed={signed} />

      <UpgradeCardsCard jobId={jobId} />

      <NotesCard adminNotes={adminNotes} saveAdminNotes={saveAdminNotes} />
      <TimelineCard events={events} addEventAction={addTimelineEvent} />

      {/* If you want checklist back in this page later, we can add it here.
          (You currently render it elsewhere / or removed it during redesign.) */}
    </div>
  );
}