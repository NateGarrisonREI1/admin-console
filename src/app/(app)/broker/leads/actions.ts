// src/app/(app)/broker/leads/actions.ts
"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { BrokerService } from "@/lib/services/BrokerService";

// ─── Types ──────────────────────────────────────────────────────────

export type BrokerMarketplaceLead = {
  id: string;
  title: string | null;
  description: string | null;
  system_type: string;
  city: string | null;
  state: string;
  area: string | null;
  zip: string;
  address: string | null;
  price: number;
  status: string;
  has_leaf: boolean;
  is_exclusive: boolean;
  homeowner_name: string | null;
  homeowner_email: string | null;
  homeowner_phone: string | null;
  best_contact_time: string | null;
  home_type: string | null;
  home_year_built: number | null;
  home_sqft: number | null;
  beds: number | null;
  baths: number | null;
  leaf_report_data: Record<string, unknown> | null;
  created_at: string;
  purchased_date: string | null;
  expiration_date: string | null;
  buyer_id: string | null;
  buyer_name: string | null;
  routing_channel: string | null;
  exclusive_contractor_id: string | null;
  is_free_assignment: boolean;
};

export type BrokerMarketplaceStats = {
  total: number;
  available: number;
  sold: number;
  expired: number;
  totalRevenue: number;
  reiRevenue: number;
  brokerEarnings: number;
};

export type BrokerMarketplaceTransaction = {
  id: string;
  lead_id: string;
  lead_title: string | null;
  contractor_name: string | null;
  total_amount: number;
  rei_amount: number;
  poster_amount: number;
  service_fee: number;
  stripe_payment_intent_id: string | null;
  created_at: string;
};

export type BrokerMarketplaceData = {
  leads: BrokerMarketplaceLead[];
  stats: BrokerMarketplaceStats;
  areas: string[];
  transactions: BrokerMarketplaceTransaction[];
};

// ─── Auth ───────────────────────────────────────────────────────────

async function getBroker() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;
  const svc = new BrokerService();
  return svc.getOrCreateBroker(userId);
}

// ─── Fetch ──────────────────────────────────────────────────────────

export async function fetchBrokerMarketplaceData(): Promise<BrokerMarketplaceData> {
  const broker = await getBroker();
  if (!broker) {
    return {
      leads: [],
      stats: { total: 0, available: 0, sold: 0, expired: 0, totalRevenue: 0, reiRevenue: 0, brokerEarnings: 0 },
      areas: [],
      transactions: [],
    };
  }

  // Fetch leads posted by this broker
  const { data: rows, error } = await supabaseAdmin
    .from("system_leads")
    .select("*")
    .eq("broker_id", broker.user_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[fetchBrokerMarketplaceData]", error.message);
    return {
      leads: [],
      stats: { total: 0, available: 0, sold: 0, expired: 0, totalRevenue: 0, reiRevenue: 0, brokerEarnings: 0 },
      areas: [],
      transactions: [],
    };
  }

  const leadRows = (rows ?? []) as Array<Record<string, unknown>>;

  // Collect buyer IDs for name lookups
  const profileIds = new Set<string>();
  for (const l of leadRows) {
    if (l.purchased_by_contractor_id) profileIds.add(l.purchased_by_contractor_id as string);
  }

  const nameMap = new Map<string, string>();
  if (profileIds.size > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("app_profiles")
      .select("id, email, full_name, first_name, last_name")
      .in("id", [...profileIds]);

    for (const p of (profiles ?? []) as Record<string, unknown>[]) {
      const name =
        (p.full_name as string) ||
        [p.first_name, p.last_name].filter(Boolean).join(" ") ||
        (p.email as string) ||
        "Unknown";
      nameMap.set(p.id as string, name);
    }
  }

  const typedLeads: BrokerMarketplaceLead[] = leadRows.map((l) => ({
    id: l.id as string,
    title: (l.title as string) ?? null,
    description: (l.description as string) ?? null,
    system_type: l.system_type as string,
    city: (l.city as string) ?? null,
    state: l.state as string,
    area: (l.area as string) ?? null,
    zip: l.zip as string,
    address: (l.address as string) ?? null,
    price: Number(l.price),
    status: l.status as string,
    has_leaf: !!(l.has_leaf),
    is_exclusive: !!(l.is_exclusive),
    homeowner_name: (l.homeowner_name as string) ?? null,
    homeowner_email: (l.homeowner_email as string) ?? null,
    homeowner_phone: (l.homeowner_phone as string) ?? null,
    best_contact_time: (l.best_contact_time as string) ?? null,
    home_type: (l.home_type as string) ?? null,
    home_year_built: (l.home_year_built as number) ?? null,
    home_sqft: (l.home_sqft as number) ?? null,
    beds: (l.beds as number) ?? null,
    baths: l.baths != null ? Number(l.baths) : null,
    leaf_report_data: (l.leaf_report_data as Record<string, unknown>) ?? null,
    created_at: l.created_at as string,
    purchased_date: (l.purchased_date as string) ?? null,
    expiration_date: (l.expiration_date as string) ?? null,
    buyer_id: (l.purchased_by_contractor_id as string) ?? null,
    buyer_name: l.purchased_by_contractor_id
      ? (nameMap.get(l.purchased_by_contractor_id as string) ?? null)
      : null,
    routing_channel: (l.routing_channel as string) ?? null,
    exclusive_contractor_id: (l.exclusive_contractor_id as string) ?? null,
    is_free_assignment: !!(l.is_free_assignment),
  }));

  // Stats
  const available = typedLeads.filter((l) => l.status === "available").length;
  const sold = typedLeads.filter((l) => l.status === "purchased").length;
  const expired = typedLeads.filter((l) => l.status === "expired").length;
  const totalRevenue = typedLeads
    .filter((l) => l.status === "purchased")
    .reduce((sum, l) => sum + l.price, 0);
  const reiRevenue = Math.round(totalRevenue * 30) / 100;
  const brokerEarnings = Math.round(totalRevenue * 68.6) / 100;

  const areas = [...new Set(typedLeads.map((l) => l.area).filter(Boolean))] as string[];
  areas.sort();

  // Fetch transactions for this broker's leads
  let transactions: BrokerMarketplaceTransaction[] = [];
  const leadIds = typedLeads.map((l) => l.id);
  if (leadIds.length > 0) {
    const { data: txRows } = await supabaseAdmin
      .from("lead_transactions")
      .select("*")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: false })
      .limit(20);

    if (txRows && txRows.length > 0) {
      // Collect contractor IDs
      const txProfileIds = new Set<string>();
      for (const tx of txRows as Record<string, unknown>[]) {
        if (tx.contractor_id) txProfileIds.add(tx.contractor_id as string);
      }
      const missingIds = [...txProfileIds].filter((id) => !nameMap.has(id));
      if (missingIds.length > 0) {
        const { data: txProfiles } = await supabaseAdmin
          .from("app_profiles")
          .select("id, email, full_name, first_name, last_name")
          .in("id", missingIds);
        for (const p of (txProfiles ?? []) as Record<string, unknown>[]) {
          const name =
            (p.full_name as string) ||
            [p.first_name, p.last_name].filter(Boolean).join(" ") ||
            (p.email as string) ||
            "Unknown";
          nameMap.set(p.id as string, name);
        }
      }

      const leadTitleMap = new Map<string, string | null>();
      for (const l of typedLeads) leadTitleMap.set(l.id, l.title);

      transactions = (txRows as Record<string, unknown>[]).map((tx) => ({
        id: tx.id as string,
        lead_id: tx.lead_id as string,
        lead_title: leadTitleMap.get(tx.lead_id as string) ?? null,
        contractor_name: tx.contractor_id ? (nameMap.get(tx.contractor_id as string) ?? null) : null,
        total_amount: Number(tx.total_amount),
        rei_amount: Number(tx.rei_amount),
        poster_amount: Number(tx.poster_amount),
        service_fee: Number(tx.service_fee),
        stripe_payment_intent_id: (tx.stripe_payment_intent_id as string) ?? null,
        created_at: tx.created_at as string,
      }));
    }
  }

  return {
    leads: typedLeads,
    stats: { total: typedLeads.length, available, sold, expired, totalRevenue, reiRevenue, brokerEarnings },
    areas,
    transactions,
  };
}
