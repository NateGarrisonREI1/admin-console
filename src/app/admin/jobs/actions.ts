// src/app/admin/jobs/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";

function getStr(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}
function getBool(formData: FormData, key: string) {
  const v = String(formData.get(key) || "").trim();
  return v === "on" || v === "true" || v === "1";
}
function getNum(formData: FormData, key: string) {
  const raw = String(formData.get(key) || "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
function getIsoOrNull(formData: FormData, key: string) {
  const raw = String(formData.get(key) || "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function archiveJobAction(formData: FormData) {
  const jobId = getStr(formData, "job_id");
  if (!jobId) return;

  const { error } = await supabaseAdmin
    .from("admin_jobs")
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/jobs");
}

export async function unarchiveJobAction(formData: FormData) {
  const jobId = getStr(formData, "job_id");
  if (!jobId) return;

  const { error } = await supabaseAdmin
    .from("admin_jobs")
    .update({ is_archived: false, archived_at: null })
    .eq("id", jobId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/jobs");
}

export async function hardDeleteJobAction(formData: FormData) {
  const jobId = getStr(formData, "job_id");
  const confirm = getStr(formData, "confirm").toUpperCase();

  if (!jobId || confirm !== "DELETE") return;

  const { data: job, error: readErr } = await supabaseAdmin
    .from("admin_jobs")
    .select("id, is_archived")
    .eq("id", jobId)
    .maybeSingle();

  if (readErr) throw new Error(readErr.message);
  if (!job?.is_archived) return;

  await supabaseAdmin.from("admin_job_appointments").delete().eq("job_id", jobId);
  await supabaseAdmin.from("admin_job_contacts").delete().eq("job_id", jobId);
  await supabaseAdmin.from("admin_job_existing_systems").delete().eq("job_id", jobId);
  await supabaseAdmin.from("admin_job_files").delete().eq("job_id", jobId);
  await supabaseAdmin.from("admin_job_requests").delete().eq("job_id", jobId);

  const { error } = await supabaseAdmin.from("admin_jobs").delete().eq("id", jobId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/jobs");
}

/**
 * NEW: Remove contractor lead for a job (and unmark job.lead_posted)
 * FormData: job_id
 */
export async function removeLeadForAdminJobAction(formData: FormData) {
  const jobId = getStr(formData, "job_id");
  if (!jobId) return;

  // find lead by job
  const { data: lead, error: readErr } = await supabaseAdmin
    .from("contractor_leads")
    .select("id")
    .eq("admin_job_id", jobId)
    .maybeSingle();

  if (readErr) throw new Error(readErr.message);

  if (lead?.id) {
    const { error: delErr } = await supabaseAdmin.from("contractor_leads").delete().eq("id", lead.id);
    if (delErr) throw new Error(delErr.message);
  }

  // unmark job posted
  const { error: updErr } = await supabaseAdmin
    .from("admin_jobs")
    .update({
      lead_posted: false,
      lead_posted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (updErr) throw new Error(updErr.message);

  revalidatePath("/admin/jobs");
  revalidatePath("/admin/contractor-leads");
  revalidatePath("/contractor/job-board");
}

/**
 * NEW: Update lead fields for a job (edit from admin job card drawer)
 * FormData: job_id, price_cents?, expires_at?, system_catalog_id?, assigned_contractor_profile_id?,
 *          is_assigned_only?, title?, summary?
 */
export async function updateLeadForAdminJobAction(formData: FormData) {
  const jobId = getStr(formData, "job_id");
  if (!jobId) return;

  const price_cents = getNum(formData, "price_cents");
  const expires_at = getIsoOrNull(formData, "expires_at");

  const system_catalog_id = getStr(formData, "system_catalog_id") || null;
  const assigned_contractor_profile_id = getStr(formData, "assigned_contractor_profile_id") || null;
  const is_assigned_only = getBool(formData, "is_assigned_only");

  const title = getStr(formData, "title") || null;
  const summary = getStr(formData, "summary") || null;

  // find lead by job
  const { data: lead, error: readErr } = await supabaseAdmin
    .from("contractor_leads")
    .select("id, admin_job_id")
    .eq("admin_job_id", jobId)
    .maybeSingle();

  if (readErr) throw new Error(readErr.message);
  if (!lead?.id) throw new Error("No contractor lead exists for this job yet.");

  const { error: updErr } = await supabaseAdmin
    .from("contractor_leads")
    .update({
      price_cents,
      expires_at,
      system_catalog_id,
      assigned_contractor_profile_id,
      is_assigned_only,
      title,
      summary,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lead.id);

  if (updErr) throw new Error(updErr.message);

  revalidatePath("/admin/jobs");
  revalidatePath("/admin/contractor-leads");
  revalidatePath("/contractor/job-board");
}

/**
 * UPDATED: Create (or update) contractor lead from admin job.
 * Now accepts optional config fields from the drawer.
 *
 * FormData:
 * - job_id (required)
 * - price_cents (optional, defaults 9900)
 * - expires_at (optional ISO/date)
 * - system_catalog_id (optional uuid)
 * - assigned_contractor_profile_id (optional uuid)
 * - is_assigned_only (optional checkbox)
 */
export async function createLeadFromAdminJobAction(formData: FormData) {
  const jobId = getStr(formData, "job_id");
  if (!jobId) return;

  // Drawer fields (optional)
  const price_cents = getNum(formData, "price_cents") ?? 9900;
  const expires_at = getIsoOrNull(formData, "expires_at");
  const system_catalog_id = getStr(formData, "system_catalog_id") || null;
  const assigned_contractor_profile_id = getStr(formData, "assigned_contractor_profile_id") || null;
  const is_assigned_only = getBool(formData, "is_assigned_only");

  // 1) Load the job
  const { data: job, error: jobErr } = await supabaseAdmin
    .from("admin_jobs")
    .select("id, city, state, zip, notes")
    .eq("id", jobId)
    .single();

  if (jobErr) {
    console.error("createLeadFromAdminJobAction jobErr:", jobErr);
    throw new Error(jobErr.message);
  }

  // 2) Load latest request (optional context)
  const { data: req, error: reqErr } = await supabaseAdmin
    .from("admin_job_requests")
    .select("requested_outputs, customer_type")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reqErr) console.warn("createLeadFromAdminJobAction reqErr:", reqErr);

  const requested = (req?.requested_outputs ?? []) as string[];
  const wantsSnapshot = requested.includes("leaf_snapshot") || requested.includes("snapshot");

  const titleDefault = wantsSnapshot
    ? "LEAF Snapshot → Contractor Estimate"
    : "Home Energy Upgrade Estimate";

  const summaryDefault =
    (job.notes && String(job.notes).trim()) ||
    "Homeowner requested contractor estimates for recommended energy upgrades.";

  const public_details = {
    requested_outputs: requested,
    customer_type: req?.customer_type ?? null,
    property: {
      city: job.city ?? null,
      state: job.state ?? null,
      zip: job.zip ?? null,
    },
    source: "admin_create_lead_v4",
  };

  // Optional title/summary overrides from drawer
  const title = getStr(formData, "title") || titleDefault;
  const summary = getStr(formData, "summary") || summaryDefault;

  // 3) Upsert lead (idempotent)
  const payload = {
    admin_job_id: job.id,
    status: "open",
    price_cents,
    expires_at,
    system_catalog_id,
    assigned_contractor_profile_id,
    is_assigned_only,
    location_city: job.city,
    location_state: job.state,
    location_zip: job.zip,
    title,
    summary,
    public_details,
    private_details: null,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await supabaseAdmin
    .from("contractor_leads")
    .upsert(payload, { onConflict: "admin_job_id" });

  if (upsertErr) {
    console.error("createLeadFromAdminJobAction upsertErr:", upsertErr);
    throw new Error(upsertErr.message);
  }

  // 4) Persist admin_jobs sticky flag (and verify it persisted)
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("admin_jobs")
    .update({
      lead_posted: true,
      lead_posted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id)
    .select("id, lead_posted")
    .single();

  if (updateErr) {
    console.error("createLeadFromAdminJobAction updateErr:", updateErr);
    throw new Error(`Failed to mark lead_posted=true on admin_jobs. ${updateErr.message}`);
  }
  if (!updated?.lead_posted) throw new Error("Update did not persist lead_posted=true (unexpected).");

  // 5) Revalidate affected routes
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/contractor-leads");
  revalidatePath("/contractor/job-board");
}
