import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

function clean(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}
function upper2(v: string) {
  return v.trim().toUpperCase().slice(0, 2);
}
function safeName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

const BUCKET = "admin-attachments";

type CustomerType = "homeowner" | "agent_broker" | "inspector" | "other";
type FileKind =
  | "inspection"
  | "hes_report"
  | "system_photo"
  | "estimate"
  | "utility_bill"
  | "listing_packet"
  | "disclosure"
  | "other";

function asCustomerType(v: string): CustomerType | null {
  if (v === "homeowner" || v === "agent_broker" || v === "inspector" || v === "other") return v;
  return null;
}

function asFileKind(v: string): FileKind | null {
  const ok: FileKind[] = [
    "inspection",
    "hes_report",
    "system_photo",
    "estimate",
    "utility_bill",
    "listing_packet",
    "disclosure",
    "other",
  ];
  return ok.includes(v as any) ? (v as FileKind) : null;
}

async function uploadAndRecordFile(opts: {
  admin: typeof supabaseAdmin;
  jobId: string;
  file: File;
  category: string; // freeform label you can filter by in UI
}) {
  const { admin, jobId, file, category } = opts;

  const now = Date.now();
  const path = `jobs/${jobId}/intake/${now}-${safeName(file.name)}`;

  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: (file as any).type || undefined,
  });

  if (upErr) {
    console.error("Intake file upload failed:", { category, upErr });
    return;
  }

  const { error: dbErr } = await admin.from("admin_job_files").insert({
    job_id: jobId,
    utility_row_id: null,
    category, // e.g. "intake:primary:inspection" / "intake:client:utility_bill"
    file_name: file.name,
    mime_type: (file as any).type || null,
    file_path: path,
    size_bytes: (file as any).size ?? null,
  });

  if (dbErr) console.error("Intake file db insert failed:", { category, dbErr });
}

export async function POST(req: Request) {
  const formData = await req.formData();

  // ---- Base fields (existing) ----
  const customer_name = clean(formData.get("customer_name"));
  const customer_type = asCustomerType(clean(formData.get("customer_type")));

  const address1 = clean(formData.get("address1"));
  const city = clean(formData.get("city"));
  const state = upper2(clean(formData.get("state")));
  const zip = clean(formData.get("zip"));

  const customer_phone = clean(formData.get("customer_phone")) || null;
  const customer_email = clean(formData.get("customer_email")) || null;
  const notes = clean(formData.get("notes")) || null;

  // ---- New fields (admin intake v2) ----
  const inspection_status = clean(formData.get("inspection_status")) || "none"; // "has_report" | "none"
  const requested_outputs = (formData.getAll("requested_outputs") || [])
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);

  // People / role-specific fields
  const broker_name = clean(formData.get("broker_name")) || null;
  const broker_contact = clean(formData.get("broker_contact")) || null;

  const inspector_name = clean(formData.get("inspector_name")) || null;
  const inspector_contact = clean(formData.get("inspector_contact")) || null;

  const other_customer_desc = clean(formData.get("other_customer_desc")) || null;

  // Per-section file metadata (best-effort)
  const file_kind = asFileKind(clean(formData.get("file_kind"))) || null;
  const file_other_label = clean(formData.get("file_other_label")) || null;

  const broker_file_kind = asFileKind(clean(formData.get("broker_file_kind"))) || null;
  const broker_file_other_label = clean(formData.get("broker_file_other_label")) || null;

  const client_file_kind = asFileKind(clean(formData.get("client_file_kind"))) || null;
  const client_file_other_label = clean(formData.get("client_file_other_label")) || null;

  const inspector_file_kind = asFileKind(clean(formData.get("inspector_file_kind"))) || null;
  const inspector_file_other_label = clean(formData.get("inspector_file_other_label")) || null;

  const other_file_kind = asFileKind(clean(formData.get("other_file_kind"))) || null;
  const other_file_other_label = clean(formData.get("other_file_other_label")) || null;

  // ---- Server-side validation aligned to the UI ----
  if (!address1 || !state || state.length !== 2 || !zip || zip.length < 5) {
    return NextResponse.redirect(new URL("/admin/intake", req.url));
  }

  if (customer_type === "agent_broker") {
    if (!broker_name || !broker_contact || !customer_name) {
      return NextResponse.redirect(new URL("/admin/intake", req.url));
    }
  }

  if (customer_type === "homeowner") {
    if (!customer_name) return NextResponse.redirect(new URL("/admin/intake", req.url));
  }

  if (customer_type === "inspector") {
    if (!inspector_name || !inspector_contact) {
      return NextResponse.redirect(new URL("/admin/intake", req.url));
    }
  }

  if (customer_type === "other") {
    if (!other_customer_desc) {
      return NextResponse.redirect(new URL("/admin/intake", req.url));
    }
  }

  const admin = supabaseAdmin;

  // ---- Build intake_payload (JSON) ----
  const intake_payload = {
    broker: broker_name || broker_contact ? { name: broker_name, contact: broker_contact } : null,
    inspector:
      inspector_name || inspector_contact
        ? { name: inspector_name, contact: inspector_contact }
        : null,
    other_customer_desc,
    file_meta: {
      primary: { kind: file_kind, other_label: file_other_label },
      broker: { kind: broker_file_kind, other_label: broker_file_other_label },
      client: { kind: client_file_kind, other_label: client_file_other_label },
      inspector: { kind: inspector_file_kind, other_label: inspector_file_other_label },
      other: { kind: other_file_kind, other_label: other_file_other_label },
    },
  };

  // ---- Insert job (try extended schema, fallback to legacy) ----
  let jobId: string | null = null;

  // Attempt extended insert
  {
    const { data: job, error } = await admin
      .from("admin_jobs")
      .insert({
        customer_name,
        customer_type,
        customer_phone,
        customer_email,
        address1,
        city: city || null,
        state,
        zip,
        notes,
        status: "new",
        intake_stage: "pre_intake",

        // NEW (only works if columns exist)
        inspection_status,
        requested_outputs,
        intake_payload,
      })
      .select("id")
      .single();

    if (!error && job?.id) {
      jobId = job.id;
    } else {
      // fallback to legacy insert if new columns don't exist
      console.warn("Extended intake insert failed, falling back:", error);

      const { data: job2, error: err2 } = await admin
        .from("admin_jobs")
        .insert({
          customer_name,
          customer_type,
          customer_phone,
          customer_email,
          address1,
          city: city || null,
          state,
          zip,
          notes,
          status: "new",
          intake_stage: "pre_intake",
        })
        .select("id")
        .single();

      if (err2 || !job2?.id) {
        console.error("Pre-intake create failed:", err2);
        return NextResponse.redirect(new URL("/admin/intake?error=unknown", req.url));
      }
      jobId = job2.id;
    }
  }

  if (!jobId) {
    return NextResponse.redirect(new URL("/admin/intake?error=unknown", req.url));
  }

  // ---- Upload files (multi) ----
  // Primary (name="file") — keep existing behavior, now supports multiple too
  const primaryFiles = formData.getAll("file").filter((x) => x instanceof File) as File[];
  for (const f of primaryFiles) {
    if (f && f.name) {
      const kind = file_kind || "other";
      await uploadAndRecordFile({
        admin,
        jobId,
        file: f,
        category: `intake:primary:${kind}${file_other_label ? `:${safeName(file_other_label)}` : ""}`,
      });
    }
  }

  // Broker (single)
  const brokerFile = formData.get("broker_file");
  if (brokerFile instanceof File && brokerFile.name) {
    const kind = broker_file_kind || "other";
    await uploadAndRecordFile({
      admin,
      jobId,
      file: brokerFile,
      category: `intake:broker:${kind}${broker_file_other_label ? `:${safeName(broker_file_other_label)}` : ""}`,
    });
  }

  // Client (multi)
  const clientFiles = formData.getAll("client_files").filter((x) => x instanceof File) as File[];
  for (const f of clientFiles) {
    if (f && f.name) {
      const kind = client_file_kind || "other";
      await uploadAndRecordFile({
        admin,
        jobId,
        file: f,
        category: `intake:client:${kind}${client_file_other_label ? `:${safeName(client_file_other_label)}` : ""}`,
      });
    }
  }

  // Inspector (multi)
  const inspectorFiles = formData
    .getAll("inspector_files")
    .filter((x) => x instanceof File) as File[];
  for (const f of inspectorFiles) {
    if (f && f.name) {
      const kind = inspector_file_kind || "other";
      await uploadAndRecordFile({
        admin,
        jobId,
        file: f,
        category: `intake:inspector:${kind}${inspector_file_other_label ? `:${safeName(inspector_file_other_label)}` : ""}`,
      });
    }
  }

  // Other (multi)
  const otherFiles = formData.getAll("other_files").filter((x) => x instanceof File) as File[];
  for (const f of otherFiles) {
    if (f && f.name) {
      const kind = other_file_kind || "other";
      await uploadAndRecordFile({
        admin,
        jobId,
        file: f,
        category: `intake:other:${kind}${other_file_other_label ? `:${safeName(other_file_other_label)}` : ""}`,
      });
    }
  }

  // Extra rows (multi)
  const extraFiles = formData.getAll("extra_files").filter((x) => x instanceof File) as File[];
  const extraKinds = (formData.getAll("extra_file_kind") || [])
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  const extraOtherLabels = (formData.getAll("extra_file_other_label") || []).map((x) =>
    typeof x === "string" ? x.trim() : ""
  );

  // Pair by index best-effort (doesn't have to be perfect yet)
  for (let i = 0; i < extraFiles.length; i++) {
    const f = extraFiles[i];
    if (!f?.name) continue;
    const kind = asFileKind(extraKinds[i] || "") || "other";
    const otherLabel = extraOtherLabels[i] || "";
    await uploadAndRecordFile({
      admin,
      jobId,
      file: f,
      category: `intake:extra:${kind}${otherLabel ? `:${safeName(otherLabel)}` : ""}`,
    });
  }

  return NextResponse.redirect(new URL(`/admin/jobs/${jobId}`, req.url));
}
