// src/app/admin/contractor-leads/actions.ts
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

/**
 * Update a contractor lead by id (admin)
 * FormData:
 * - lead_id (required)
 * - price_cents?
 * - expires_at? (datetime-local or ISO)
 * - system_catalog_id?
 * - assigned_contractor_profile_id?
 * - is_assigned_only?
 * - title?
 * - summary?
 */
export async function updateLeadAction(formData: FormData) {
  const leadId = getStr(formData, "lead_id");
  if (!leadId) return;

  const price_cents = getNum(formData, "price_cents");
  const expires_at = getIsoOrNull(formData, "expires_at");

  const system_catalog_id = getStr(formData, "system_catalog_id") || null;
  const assigned_contractor_profile_id = getStr(formData, "assigned_contractor_profile_id") || null;
  const is_assigned_only = getBool(formData, "is_assigned_only");

  const title = getStr(formData, "title") || null;
  const summary = getStr(formData, "summary") || null;

  const { error } = await supabaseAdmin
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
    .eq("id", leadId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/contractor-leads");
  revalidatePath("/contractor/job-board");
  revalidatePath("/admin/jobs");
}

/**
 * Remove/unpost a lead by id (admin)
 * FormData:
 * - lead_id (required)
 */
export async function removeLeadAction(formData: FormData) {
  const leadId = getStr(formData, "lead_id");
  if (!leadId) return;

  const { data: lead, error: readErr } = await supabaseAdmin
    .from("contractor_leads")
    .select("id, admin_job_id")
    .eq("id", leadId)
    .single();

  if (readErr) throw new Error(readErr.message);

  const { error: delErr } = await supabaseAdmin.from("contractor_leads").delete().eq("id", leadId);
  if (delErr) throw new Error(delErr.message);

  if (lead?.admin_job_id) {
    const { error: updErr } = await supabaseAdmin
      .from("admin_jobs")
      .update({
        lead_posted: false,
        lead_posted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.admin_job_id);

    if (updErr) throw new Error(updErr.message);
  }

  revalidatePath("/admin/contractor-leads");
  revalidatePath("/contractor/job-board");
  revalidatePath("/admin/jobs");
}
