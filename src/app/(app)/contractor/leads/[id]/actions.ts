"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { getContractorAuth } from "../../_actions/contractor";

// ─── Types ──────────────────────────────────────────────────────────

export type NoteEntry = {
  date: string;
  text: string;
};

export type CommEntry = {
  date: string;
  type: "call" | "email" | "text";
  note: string;
};

export type LeadDetailData = {
  id: string;
  system_lead_id: string;
  status: string;
  notes: string | null;
  quote_amount: number | null;
  closed_date: string | null;
  updated_at: string;
  notes_log: NoteEntry[];
  communication_log: CommEntry[];
  final_value: number | null;
  rating: number | null;
  system_lead: {
    id: string;
    system_type: string;
    city: string | null;
    state: string;
    zip: string;
    address: string | null;
    homeowner_name: string | null;
    homeowner_phone: string | null;
    homeowner_email: string | null;
    best_contact_time: string | null;
    price: number;
    posted_date: string | null;
    purchased_date: string | null;
    leaf_report_data: Record<string, unknown> | null;
    broker_id: string | null;
  };
  payment: {
    id: string;
    amount: number;
    created_at: string;
  } | null;
  refund_request: {
    id: string;
    status: string;
    reason: string;
    reason_category: string;
  } | null;
  can_request_refund: boolean;
};

// ─── Auth helper ────────────────────────────────────────────────────

async function getContractorId(): Promise<string> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data?.user?.id) throw new Error("Not authenticated");
  return data.user.id;
}

// ─── Fetch lead detail ──────────────────────────────────────────────

export async function fetchLeadDetail(leadStatusId: string): Promise<LeadDetailData | null> {
  const auth = await getContractorAuth();
  if (auth.isAdmin) return null;

  const userId = auth.userId;

  const { data: cls, error } = await supabaseAdmin
    .from("contractor_lead_status")
    .select(`
      id, system_lead_id, status, notes, quote_amount, closed_date, updated_at,
      notes_log, communication_log, final_value, rating,
      system_lead:system_leads!inner(
        id, system_type, city, state, zip, address,
        homeowner_name, homeowner_phone, homeowner_email, best_contact_time,
        price, posted_date, purchased_date, leaf_report_data, broker_id
      )
    `)
    .eq("id", leadStatusId)
    .eq("contractor_id", userId)
    .single();

  if (error || !cls) return null;

  const row = cls as Record<string, unknown>;
  const sysLead = Array.isArray(row.system_lead) ? row.system_lead[0] : row.system_lead;

  // Fetch payment
  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("id, amount, created_at")
    .eq("contractor_id", userId)
    .eq("system_lead_id", (sysLead as Record<string, unknown>).id)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();

  // Fetch existing refund request
  let refundReq = null;
  if (payment) {
    const { data: rr } = await supabaseAdmin
      .from("refund_requests")
      .select("id, status, reason, reason_category")
      .eq("payment_id", payment.id)
      .eq("contractor_id", userId)
      .limit(1)
      .maybeSingle();
    refundReq = rr;
  }

  // Can request refund: within 48 hours, status is new or contacted, no existing refund
  const purchasedDate = (sysLead as Record<string, unknown>).purchased_date as string | null;
  const hoursSincePurchase = purchasedDate
    ? (Date.now() - new Date(purchasedDate).getTime()) / 3600000
    : Infinity;
  const canRequestRefund =
    !refundReq &&
    ["new", "contacted"].includes(row.status as string) &&
    hoursSincePurchase <= 48 &&
    !!payment;

  return {
    id: row.id as string,
    system_lead_id: row.system_lead_id as string,
    status: row.status as string,
    notes: row.notes as string | null,
    quote_amount: row.quote_amount as number | null,
    closed_date: row.closed_date as string | null,
    updated_at: row.updated_at as string,
    notes_log: (row.notes_log as NoteEntry[]) ?? [],
    communication_log: (row.communication_log as CommEntry[]) ?? [],
    final_value: row.final_value as number | null,
    rating: row.rating as number | null,
    system_lead: sysLead as LeadDetailData["system_lead"],
    payment: payment as LeadDetailData["payment"],
    refund_request: refundReq as LeadDetailData["refund_request"],
    can_request_refund: canRequestRefund,
  };
}

// ─── Update status ──────────────────────────────────────────────────

export async function updateLeadStatus(leadStatusId: string, newStatus: string): Promise<void> {
  const userId = await getContractorId();

  const updates: Record<string, unknown> = { status: newStatus };
  if (newStatus === "closed") {
    updates.closed_date = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from("contractor_lead_status")
    .update(updates)
    .eq("id", leadStatusId)
    .eq("contractor_id", userId);

  if (error) throw new Error(error.message);

  // If completed, update contractor_customers
  if (newStatus === "closed") {
    const { data: cls } = await supabaseAdmin
      .from("contractor_lead_status")
      .select("system_lead_id")
      .eq("id", leadStatusId)
      .single();

    if (cls?.system_lead_id) {
      await supabaseAdmin
        .from("contractor_customers")
        .update({ job_status: "completed" })
        .eq("contractor_id", userId)
        .eq("lead_id", cls.system_lead_id);
    }
  }
}

// ─── Add note ───────────────────────────────────────────────────────

export async function addLeadNote(leadStatusId: string, text: string): Promise<void> {
  const userId = await getContractorId();

  const { data: cls } = await supabaseAdmin
    .from("contractor_lead_status")
    .select("notes_log")
    .eq("id", leadStatusId)
    .eq("contractor_id", userId)
    .single();

  if (!cls) throw new Error("Lead not found");

  const currentLog = (cls.notes_log as NoteEntry[]) ?? [];
  const newEntry: NoteEntry = { date: new Date().toISOString(), text };
  const updatedLog = [newEntry, ...currentLog];

  const { error } = await supabaseAdmin
    .from("contractor_lead_status")
    .update({ notes_log: updatedLog })
    .eq("id", leadStatusId)
    .eq("contractor_id", userId);

  if (error) throw new Error(error.message);
}

// ─── Add communication log ──────────────────────────────────────────

export async function addCommunicationLog(
  leadStatusId: string,
  type: "call" | "email" | "text",
  note: string
): Promise<void> {
  const userId = await getContractorId();

  const { data: cls } = await supabaseAdmin
    .from("contractor_lead_status")
    .select("communication_log")
    .eq("id", leadStatusId)
    .eq("contractor_id", userId)
    .single();

  if (!cls) throw new Error("Lead not found");

  const currentLog = (cls.communication_log as CommEntry[]) ?? [];
  const newEntry: CommEntry = { date: new Date().toISOString(), type, note };
  const updatedLog = [newEntry, ...currentLog];

  const { error } = await supabaseAdmin
    .from("contractor_lead_status")
    .update({ communication_log: updatedLog })
    .eq("id", leadStatusId)
    .eq("contractor_id", userId);

  if (error) throw new Error(error.message);
}

// ─── Request refund ─────────────────────────────────────────────────

export async function requestRefund(
  leadStatusId: string,
  reasonCategory: string,
  description: string
): Promise<void> {
  const userId = await getContractorId();

  const { data: cls } = await supabaseAdmin
    .from("contractor_lead_status")
    .select("system_lead_id, status")
    .eq("id", leadStatusId)
    .eq("contractor_id", userId)
    .single();

  if (!cls) throw new Error("Lead not found");

  if (!["new", "contacted"].includes(cls.status)) {
    throw new Error("Refund can only be requested for Purchased or Contacted leads");
  }

  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("id, created_at")
    .eq("contractor_id", userId)
    .eq("system_lead_id", cls.system_lead_id)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();

  if (!payment) throw new Error("No payment found for this lead");

  const hoursSincePurchase = (Date.now() - new Date(payment.created_at).getTime()) / 3600000;
  if (hoursSincePurchase > 48) {
    throw new Error("Refund window has expired (48 hours)");
  }

  const { data: existing } = await supabaseAdmin
    .from("refund_requests")
    .select("id")
    .eq("payment_id", payment.id)
    .limit(1)
    .maybeSingle();

  if (existing) throw new Error("A refund has already been requested for this lead");

  const { error } = await supabaseAdmin
    .from("refund_requests")
    .insert({
      payment_id: payment.id,
      contractor_id: userId,
      lead_id: cls.system_lead_id,
      lead_type: "system_lead",
      reason: description,
      reason_category: reasonCategory,
      status: "pending",
    });

  if (error) throw new Error(error.message);

  await supabaseAdmin
    .from("payments")
    .update({ refund_status: "requested" })
    .eq("id", payment.id);
}

// ─── Complete lead ──────────────────────────────────────────────────

export async function completeLead(
  leadStatusId: string,
  finalValue?: number,
  rating?: number
): Promise<void> {
  const userId = await getContractorId();

  const updates: Record<string, unknown> = {
    status: "closed",
    closed_date: new Date().toISOString(),
  };
  if (finalValue != null) updates.final_value = finalValue;
  if (rating != null) updates.rating = rating;

  const { error } = await supabaseAdmin
    .from("contractor_lead_status")
    .update(updates)
    .eq("id", leadStatusId)
    .eq("contractor_id", userId);

  if (error) throw new Error(error.message);

  const { data: cls } = await supabaseAdmin
    .from("contractor_lead_status")
    .select("system_lead_id")
    .eq("id", leadStatusId)
    .single();

  if (cls?.system_lead_id) {
    await supabaseAdmin
      .from("contractor_customers")
      .update({ job_status: "completed" })
      .eq("contractor_id", userId)
      .eq("lead_id", cls.system_lead_id);
  }
}
