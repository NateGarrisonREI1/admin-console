// src/app/admin/jobs/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function archiveJobAction(formData: FormData) {
  const jobId = String(formData.get("job_id") || "").trim();
  if (!jobId) return;

  const { error } = await supabaseAdmin
    .from("admin_jobs")
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/jobs");
}

export async function unarchiveJobAction(formData: FormData) {
  const jobId = String(formData.get("job_id") || "").trim();
  if (!jobId) return;

  const { error } = await supabaseAdmin
    .from("admin_jobs")
    .update({ is_archived: false, archived_at: null })
    .eq("id", jobId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/jobs");
}

export async function hardDeleteJobAction(formData: FormData) {
  const jobId = String(formData.get("job_id") || "").trim();
  const confirm = String(formData.get("confirm") || "")
    .trim()
    .toUpperCase();

  if (!jobId || confirm !== "DELETE") return;

  const { data: job, error: readErr } = await supabaseAdmin
    .from("admin_jobs")
    .select("id, is_archived")
    .eq("id", jobId)
    .maybeSingle();

  if (readErr || !job?.is_archived) return;

  await supabaseAdmin.from("admin_job_appointments").delete().eq("job_id", jobId);
  await supabaseAdmin.from("admin_job_contacts").delete().eq("job_id", jobId);
  await supabaseAdmin.from("admin_job_existing_systems").delete().eq("job_id", jobId);
  await supabaseAdmin.from("admin_job_files").delete().eq("job_id", jobId);
  await supabaseAdmin.from("admin_job_requests").delete().eq("job_id", jobId);

  const { error } = await supabaseAdmin.from("admin_jobs").delete().eq("id", jobId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/jobs");
}

export async function createLeadFromAdminJobAction(formData: FormData) {
  const jobId = String(formData.get("job_id") || "").trim();
  if (!jobId) return;

  // 1) Load the job
  const { data: job, error: jobErr } = await supabaseAdmin
    .from("admin_jobs")
    .select("id, address1, city, state, zip, notes")
    .eq("id", jobId)
    .single();

  if (jobErr) {
    console.error("createLeadFromAdminJobAction jobErr:", jobErr);
    throw new Error(jobErr.message);
  }

  // 2) Load latest request (optional context)
  const { data: req, error: reqErr } = await supabaseAdmin
    .from("admin_job_requests")
    .select("requested_outputs, customer_type, intake_payload")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reqErr) {
    // non-fatal, but log it
    console.warn("createLeadFromAdminJobAction reqErr:", reqErr);
  }

  const requested = (req?.requested_outputs ?? []) as string[];
  const wantsSnapshot = requested.includes("leaf_snapshot") || requested.includes("snapshot");

  const title = wantsSnapshot
    ? "LEAF Snapshot → Contractor Estimate"
    : "Home Energy Upgrade Estimate";

  const summary =
    (job.notes && String(job.notes).trim()) ||
    "Homeowner requested contractor estimates for recommended energy upgrades.";

  const public_details = {
    requested_outputs: requested,
    customer_type: req?.customer_type ?? null,
    // Keep it safe: no name/phone/email/address2/etc.
    property: {
      city: job.city ?? null,
      state: job.state ?? null,
      zip: job.zip ?? null,
    },
    source: "admin_create_lead_v0",
  };

  // 3) Upsert lead (idempotent)
  // IMPORTANT: onConflict requires a UNIQUE constraint or UNIQUE index on (admin_job_id)
  const payload = {
    admin_job_id: job.id,
    status: "open",
    price_cents: 9900,
    location_city: job.city,
    location_state: job.state,
    location_zip: job.zip,
    title,
    summary,
    public_details,
    private_details: null,
  };

  const { data: lead, error: upsertErr } = await supabaseAdmin
    .from("contractor_leads")
    .upsert(payload, { onConflict: "admin_job_id" })
    .select("id, admin_job_id, status, created_at")
    .maybeSingle();

  if (upsertErr) {
    console.error("createLeadFromAdminJobAction upsertErr:", upsertErr);
    throw new Error(upsertErr.message);
  }

  console.log("Lead upserted:", lead);

  // 4) Refresh pages
  revalidatePath("/admin/jobs");
  revalidatePath("/contractor/job-board");
}
