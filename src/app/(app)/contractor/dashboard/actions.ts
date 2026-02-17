"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { StripeService } from "@/lib/services/StripeService";
import { RefundService } from "@/lib/services/RefundService";
import type { RefundReasonCategory, RefundRequest } from "@/types/stripe";

export type AvailableLead = {
  id: string;
  system_type: string;
  city: string | null;
  state: string;
  zip: string;
  leaf_report_data: Record<string, unknown>;
  price: number;
  posted_date: string | null;
  expiration_date: string | null;
};

export type MyLead = {
  id: string;
  status: string;
  notes: string | null;
  quote_amount: number | null;
  closed_date: string | null;
  refund_status: string | null;
  system_lead: {
    id: string;
    system_type: string;
    city: string | null;
    state: string;
    zip: string;
    homeowner_name: string | null;
    homeowner_phone: string | null;
    homeowner_email: string | null;
    price: number;
  };
};

export type ContractorStats = {
  total_purchased: number;
  in_progress: number;
  closed: number;
  conversion_rate: number;
};

export async function fetchContractorDashboard() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  const now = new Date().toISOString();

  // Available leads
  const { data: available } = await supabaseAdmin
    .from("system_leads")
    .select("id, system_type, city, state, zip, leaf_report_data, price, posted_date, expiration_date")
    .eq("status", "available")
    .gt("expiration_date", now)
    .is("deleted_at", null)
    .order("posted_date", { ascending: false })
    .limit(50);

  // My purchased leads
  const { data: myLeads } = await supabaseAdmin
    .from("contractor_lead_status")
    .select(`
      id, status, notes, quote_amount, closed_date,
      system_lead:system_leads!inner(
        id, system_type, city, state, zip,
        homeowner_name, homeowner_phone, homeowner_email, price
      )
    `)
    .eq("contractor_id", userId)
    .order("updated_at", { ascending: false });

  // Stats
  const all = myLeads ?? [];
  const total = all.length;
  const inProgress = all.filter((s: { status: string }) =>
    ["new", "contacted", "quoted"].includes(s.status)
  ).length;
  const closed = all.filter((s: { status: string }) => s.status === "closed").length;
  const conversionRate = total > 0 ? Math.round((closed / total) * 100) : 0;

  // Supabase returns joined relations as arrays; flatten to single objects
  const normalizedLeads = (myLeads ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    system_lead: Array.isArray(row.system_lead) ? row.system_lead[0] : row.system_lead,
  }));

  // Fetch refund statuses for purchased leads
  const { data: refundReqs } = await supabaseAdmin
    .from("refund_requests")
    .select("lead_id, status")
    .eq("contractor_id", userId)
    .order("requested_date", { ascending: false });

  const refundMap = new Map<string, string>();
  for (const r of refundReqs ?? []) {
    if (!refundMap.has(r.lead_id)) refundMap.set(r.lead_id, r.status);
  }

  // Attach refund_status to each lead
  const leadsWithRefund = normalizedLeads.map((ml) => {
    const sl = ml.system_lead as { id: string } | undefined;
    return {
      ...ml,
      refund_status: sl ? (refundMap.get(sl.id) ?? null) : null,
    };
  });

  return {
    available: (available ?? []) as AvailableLead[],
    my_leads: leadsWithRefund as MyLead[],
    stats: { total_purchased: total, in_progress: inProgress, closed, conversion_rate: conversionRate } as ContractorStats,
  };
}

/**
 * Create a Stripe payment intent for purchasing a system lead.
 * Returns the clientSecret for use with Stripe Elements on the frontend.
 */
export async function createSystemLeadPurchaseIntent(leadId: string) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user?.id) throw new Error("Not authenticated");

  // Verify lead is available
  const { data: lead } = await supabaseAdmin
    .from("system_leads")
    .select("id, price, status, expiration_date")
    .eq("id", leadId)
    .eq("status", "available")
    .is("deleted_at", null)
    .single();

  if (!lead) throw new Error("Lead is no longer available");

  if (lead.expiration_date && new Date(lead.expiration_date) < new Date()) {
    throw new Error("Lead has expired");
  }

  // Create Stripe payment intent
  const result = await StripeService.createPaymentIntent(
    user.id,
    user.email ?? "",
    leadId,
    lead.price,
    "system_lead"
  );

  return { clientSecret: result.clientSecret };
}

export async function updateLeadStatus(
  statusId: string,
  updates: { status?: string; notes?: string; quote_amount?: number }
) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const clean: Record<string, unknown> = {};
  if (updates.status) {
    clean.status = updates.status;
    if (updates.status === "closed") clean.closed_date = new Date().toISOString();
  }
  if (updates.notes !== undefined) clean.notes = updates.notes;
  if (updates.quote_amount !== undefined) clean.quote_amount = updates.quote_amount;

  const { error } = await supabaseAdmin
    .from("contractor_lead_status")
    .update(clean)
    .eq("id", statusId)
    .eq("contractor_id", userId);

  if (error) throw new Error(error.message);
}

/**
 * Submit a refund request for a purchased system lead.
 */
export async function requestLeadRefund(
  leadId: string,
  reason: string,
  reasonCategory: RefundReasonCategory,
  notes?: string
): Promise<RefundRequest> {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  return RefundService.requestRefund(userId, leadId, "system_lead", reason, reasonCategory, notes);
}
