// src/app/admin/contractor-leads/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AdminOpsService } from "@/lib/services/AdminOpsService";
import type {
  DirectLead,
  HesTeamMember,
  InspectorTeamMember,
  PartnerContractor,
  BrokerHealthSummary,
  BrokerHealthAudit,
} from "@/types/admin-ops";

const svc = new AdminOpsService();

// ─── Direct Leads ─────────────────────────────────────────────

export type DirectLeadsTabData = {
  leads: DirectLead[];
  hesMembers: HesTeamMember[];
  inspectors: InspectorTeamMember[];
  partners: PartnerContractor[];
};

export async function fetchDirectLeadsTab(): Promise<DirectLeadsTabData> {
  const [leads, hesMembers, inspectors, partners] = await Promise.all([
    svc.getDirectLeads(),
    svc.getHesTeamMembers(),
    svc.getInspectorTeamMembers(),
    svc.getPartnerContractors("active"),
  ]);
  return { leads, hesMembers, inspectors, partners };
}

export async function createDirectLeadAction(input: {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  service_needed?: string[];
  date_needed?: string;
  budget?: number;
  special_notes?: string;
  source?: string;
}) {
  await svc.createDirectLead(input);
  revalidatePath("/admin/contractor-leads");
}

export async function assignDirectLeadAction(
  leadId: string,
  assignedType: string,
  assignedToId: string,
) {
  await svc.assignDirectLead(leadId, assignedType, assignedToId);
  revalidatePath("/admin/contractor-leads");
}

export async function updateDirectLeadStatusAction(
  leadId: string,
  status: string,
) {
  const updates: Record<string, unknown> = { status };
  if (status === "completed") updates.completed_at = new Date().toISOString();
  await svc.updateDirectLead(leadId, updates);
  revalidatePath("/admin/contractor-leads");
}

// ─── Broker Health ────────────────────────────────────────────

export async function fetchBrokerHealthList(): Promise<BrokerHealthSummary[]> {
  return svc.getBrokersWithHealth();
}

export async function fetchBrokerAudit(brokerId: string): Promise<BrokerHealthAudit> {
  return svc.getBrokerHealthAudit(brokerId);
}

// ─── Legacy (keep for backward compat) ───────────────────────

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
