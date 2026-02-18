"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getContractorAuth } from "../_actions/contractor";

// ─── Types ──────────────────────────────────────────────────────────

export type DashboardStats = {
  availableLeads: number;
  activeJobs: number;
  spendThisMonth: number;
  completedThisMonth: number;
};

export type LeadPreview = {
  id: string;
  system_type: string;
  city: string | null;
  state: string;
  zip: string;
  price: number;
  posted_date: string | null;
};

export type ActiveJob = {
  id: string;
  status: string;
  system_lead: {
    system_type: string;
    city: string | null;
    state: string;
    homeowner_name: string | null;
    price: number;
  };
  updated_at: string;
};

export type NetworkSummary = {
  brokerCount: number;
  contractorCount: number;
  customerCount: number;
};

export type ContractorDashboardData = {
  stats: DashboardStats;
  newLeads: LeadPreview[];
  activeJobs: ActiveJob[];
  network: NetworkSummary;
};

const EMPTY_DATA: ContractorDashboardData = {
  stats: { availableLeads: 0, activeJobs: 0, spendThisMonth: 0, completedThisMonth: 0 },
  newLeads: [],
  activeJobs: [],
  network: { brokerCount: 0, contractorCount: 0, customerCount: 0 },
};

// ─── Fetch ──────────────────────────────────────────────────────────

export async function fetchContractorDashboard(): Promise<{ data: ContractorDashboardData }> {
  try {
    const auth = await getContractorAuth();
    const userId = auth.userId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Parallel queries — all use supabaseAdmin so they won't fail on missing RLS
    const [availableRes, myLeadsRes, paymentsRes, networkRes, customersRes] = await Promise.all([
      supabaseAdmin
        .from("system_leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "available")
        .is("deleted_at", null),
      supabaseAdmin
        .from("contractor_lead_status")
        .select(`
          id, status, updated_at,
          system_lead:system_leads!inner(
            system_type, city, state, homeowner_name, price
          )
        `)
        .eq("contractor_id", userId),
      supabaseAdmin
        .from("payments")
        .select("amount")
        .eq("contractor_id", userId)
        .eq("status", "completed")
        .gte("created_at", monthStart),
      supabaseAdmin
        .from("contractor_network")
        .select("id", { count: "exact", head: true })
        .eq("contractor_id", userId),
      supabaseAdmin
        .from("contractor_customers")
        .select("id", { count: "exact", head: true })
        .eq("contractor_id", userId),
    ]);

    const { data: newLeadsRaw } = await supabaseAdmin
      .from("system_leads")
      .select("id, system_type, city, state, zip, price, posted_date")
      .eq("status", "available")
      .is("deleted_at", null)
      .order("posted_date", { ascending: false })
      .limit(5);

    const allLeads = (myLeadsRes.data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      system_lead: Array.isArray(row.system_lead) ? row.system_lead[0] : row.system_lead,
    }));

    const activeStatuses = ["new", "contacted", "quoted"];
    const activeJobs = allLeads.filter((l) => activeStatuses.includes((l as Record<string, unknown>).status as string));
    const completedThisMonth = allLeads.filter((l) => {
      const row = l as Record<string, unknown>;
      return row.status === "closed" && (row.updated_at as string) >= monthStart;
    }).length;

    const spendThisMonth = (paymentsRes.data ?? []).reduce(
      (sum: number, p: { amount: number }) => sum + p.amount, 0
    );

    const { count: brokerCount } = await supabaseAdmin
      .from("user_relationships")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("relationship_type", "in_broker_network");

    return {
      data: {
        stats: {
          availableLeads: availableRes.count ?? 0,
          activeJobs: activeJobs.length,
          spendThisMonth,
          completedThisMonth,
        },
        newLeads: (newLeadsRaw ?? []) as LeadPreview[],
        activeJobs: activeJobs.slice(0, 5) as ActiveJob[],
        network: {
          brokerCount: brokerCount ?? 0,
          contractorCount: networkRes.count ?? 0,
          customerCount: customersRes.count ?? 0,
        },
      },
    };
  } catch {
    return { data: EMPTY_DATA };
  }
}
