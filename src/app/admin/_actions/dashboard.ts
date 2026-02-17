"use server";

import { supabaseAdmin } from "@/lib/supabase/server";

export type AdminDashboardData = {
  kpis: {
    leads_posted: number;
    leads_sold: number;
    revenue: number;
    available_leads: number;
    pending_hes: number;
    expiring_soon: number;
  };
  system_leads: SystemLeadRow[];
  hes_requests: HesRequestRow[];
};

export type SystemLeadRow = {
  id: string;
  system_type: string;
  city: string | null;
  state: string;
  zip: string;
  homeowner_name: string | null;
  homeowner_email: string | null;
  price: number;
  status: string;
  posted_date: string | null;
  expiration_date: string | null;
  contacted_status: string;
  created_at: string;
};

export type HesRequestRow = {
  id: string;
  broker_id: string;
  property_address: string;
  city: string;
  state: string;
  zip: string;
  property_type: string;
  status: string;
  requested_completion_date: string | null;
  created_at: string;
  notes: string | null;
};

export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const soon = new Date(Date.now() + 48 * 3600_000).toISOString();

  // KPIs
  const [posted, sold, payments, available, pendingHes, expiring] = await Promise.all([
    supabaseAdmin
      .from("system_leads")
      .select("*", { count: "exact", head: true })
      .gte("posted_date", monthStart)
      .is("deleted_at", null),
    supabaseAdmin
      .from("system_leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "purchased")
      .gte("purchased_date", monthStart)
      .is("deleted_at", null),
    supabaseAdmin
      .from("payments")
      .select("amount")
      .eq("status", "completed")
      .gte("created_at", monthStart),
    supabaseAdmin
      .from("system_leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "available")
      .is("deleted_at", null),
    supabaseAdmin
      .from("hes_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .is("deleted_at", null),
    supabaseAdmin
      .from("system_leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "available")
      .lte("expiration_date", soon)
      .gt("expiration_date", now.toISOString())
      .is("deleted_at", null),
  ]);

  const revenue = (payments.data ?? []).reduce(
    (sum: number, p: { amount: number }) => sum + Number(p.amount ?? 0),
    0
  );

  // System leads (latest 50)
  const { data: sysLeads } = await supabaseAdmin
    .from("system_leads")
    .select(
      "id, system_type, city, state, zip, homeowner_name, homeowner_email, price, status, posted_date, expiration_date, contacted_status, created_at"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  // HES requests (latest 50)
  const { data: hesReqs } = await supabaseAdmin
    .from("hes_requests")
    .select(
      "id, broker_id, property_address, city, state, zip, property_type, status, requested_completion_date, created_at, notes"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  return {
    kpis: {
      leads_posted: posted.count ?? 0,
      leads_sold: sold.count ?? 0,
      revenue,
      available_leads: available.count ?? 0,
      pending_hes: pendingHes.count ?? 0,
      expiring_soon: expiring.count ?? 0,
    },
    system_leads: (sysLeads ?? []) as SystemLeadRow[],
    hes_requests: (hesReqs ?? []) as HesRequestRow[],
  };
}

export async function postLeadForSale(
  leadId: string,
  price: number,
  expirationDays: number
) {
  const exp = new Date();
  exp.setDate(exp.getDate() + expirationDays);

  const { data, error } = await supabaseAdmin
    .from("system_leads")
    .update({
      status: "available",
      price,
      posted_date: new Date().toISOString(),
      expiration_date: exp.toISOString(),
    })
    .eq("id", leadId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function assignLeadToContractor(
  leadId: string,
  contractorId: string
) {
  const { data, error } = await supabaseAdmin
    .from("system_leads")
    .update({
      status: "purchased",
      purchased_by_contractor_id: contractorId,
      purchased_date: new Date().toISOString(),
    })
    .eq("id", leadId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabaseAdmin.from("contractor_lead_status").insert({
    contractor_id: contractorId,
    system_lead_id: leadId,
    status: "new",
  });

  return data;
}

export async function assignHesRequest(
  requestId: string,
  action: "assign-internal" | "post-for-sale",
  opts?: { internalUserId?: string; price?: number }
) {
  const updates: Record<string, unknown> = {};

  if (action === "assign-internal") {
    updates.status = "assigned_internal";
    if (opts?.internalUserId) updates.assigned_to_internal_user_id = opts.internalUserId;
  } else {
    updates.posted_for_sale_date = new Date().toISOString();
    updates.price = opts?.price ?? 10;
  }

  const { data, error } = await supabaseAdmin
    .from("hes_requests")
    .update(updates)
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
