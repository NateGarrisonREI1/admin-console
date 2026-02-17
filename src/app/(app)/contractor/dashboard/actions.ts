"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

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

  return {
    available: (available ?? []) as AvailableLead[],
    my_leads: normalizedLeads as MyLead[],
    stats: { total_purchased: total, in_progress: inProgress, closed, conversion_rate: conversionRate } as ContractorStats,
  };
}

export async function purchaseSystemLead(leadId: string) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  // Verify lead is available
  const { data: lead } = await supabaseAdmin
    .from("system_leads")
    .select("*")
    .eq("id", leadId)
    .eq("status", "available")
    .is("deleted_at", null)
    .single();

  if (!lead) throw new Error("Lead is no longer available");

  if (lead.expiration_date && new Date(lead.expiration_date) < new Date()) {
    throw new Error("Lead has expired");
  }

  // Purchase
  const { error } = await supabaseAdmin
    .from("system_leads")
    .update({
      status: "purchased",
      purchased_by_contractor_id: userId,
      purchased_date: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (error) throw new Error(error.message);

  // Create tracking row
  await supabaseAdmin.from("contractor_lead_status").insert({
    contractor_id: userId,
    system_lead_id: leadId,
    status: "new",
  });

  // Record payment
  await supabaseAdmin.from("payments").insert({
    contractor_id: userId,
    system_lead_id: leadId,
    amount: lead.price,
    system_type: lead.system_type,
    status: "completed",
  });
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
