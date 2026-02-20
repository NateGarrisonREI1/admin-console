"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

// ─── Types ──────────────────────────────────────────────────────────

export type MarketplaceLead = {
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
  broker_id: string | null;
  broker_name: string | null;
  buyer_id: string | null;
  buyer_name: string | null;
  routing_channel: string | null;
  exclusive_contractor_id: string | null;
  is_free_assignment: boolean;
};

export type MarketplaceStats = {
  total: number;
  available: number;
  sold: number;
  expired: number;
  totalRevenue: number;
  reiRevenue: number;
};

export type MarketplaceTransaction = {
  id: string;
  lead_id: string;
  lead_title: string | null;
  contractor_name: string | null;
  poster_name: string | null;
  total_amount: number;
  rei_amount: number;
  poster_amount: number;
  service_fee: number;
  stripe_payment_intent_id: string | null;
  created_at: string;
};

export type MarketplaceData = {
  leads: MarketplaceLead[];
  stats: MarketplaceStats;
  areas: string[];
  brokers: { id: string; name: string }[];
  transactions: MarketplaceTransaction[];
};

// ─── Auth ───────────────────────────────────────────────────────────

async function requireAdmin(): Promise<string> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated.");

  const { data: prof } = await supabase
    .from("app_profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if ((prof?.role || "homeowner") !== "admin") throw new Error("Admin only.");
  return data.user.id;
}

// ─── Fetch ──────────────────────────────────────────────────────────

export async function fetchMarketplaceData(): Promise<MarketplaceData> {
  await requireAdmin();

  const { data: rows, error } = await supabaseAdmin
    .from("system_leads")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[fetchMarketplaceData]", error.message);
    throw new Error(error.message);
  }

  const leads = (rows ?? []) as Array<Record<string, unknown>>;

  // Collect broker + buyer IDs for name lookups
  const profileIds = new Set<string>();
  for (const l of leads) {
    if (l.broker_id) profileIds.add(l.broker_id as string);
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

  const typedLeads: MarketplaceLead[] = leads.map((l) => ({
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
    broker_id: (l.broker_id as string) ?? null,
    broker_name: l.broker_id ? (nameMap.get(l.broker_id as string) ?? null) : null,
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

  const areas = [...new Set(typedLeads.map((l) => l.area).filter(Boolean))] as string[];
  areas.sort();

  const brokerMap = new Map<string, string>();
  for (const l of typedLeads) {
    if (l.broker_id && l.broker_name) brokerMap.set(l.broker_id, l.broker_name);
  }
  const brokers = [...brokerMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Fetch recent transactions from lead_transactions
  let transactions: MarketplaceTransaction[] = [];
  const { data: txRows } = await supabaseAdmin
    .from("lead_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (txRows && txRows.length > 0) {
    // Collect additional profile IDs from transactions
    const txProfileIds = new Set<string>();
    for (const tx of txRows as Record<string, unknown>[]) {
      if (tx.contractor_id) txProfileIds.add(tx.contractor_id as string);
      if (tx.poster_id) txProfileIds.add(tx.poster_id as string);
    }
    // Only fetch IDs we don't already have
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

    // Map lead IDs to titles
    const leadTitleMap = new Map<string, string | null>();
    for (const l of typedLeads) leadTitleMap.set(l.id, l.title);

    transactions = (txRows as Record<string, unknown>[]).map((tx) => ({
      id: tx.id as string,
      lead_id: tx.lead_id as string,
      lead_title: leadTitleMap.get(tx.lead_id as string) ?? null,
      contractor_name: tx.contractor_id ? (nameMap.get(tx.contractor_id as string) ?? null) : null,
      poster_name: tx.poster_id ? (nameMap.get(tx.poster_id as string) ?? null) : null,
      total_amount: Number(tx.total_amount),
      rei_amount: Number(tx.rei_amount),
      poster_amount: Number(tx.poster_amount),
      service_fee: Number(tx.service_fee),
      stripe_payment_intent_id: (tx.stripe_payment_intent_id as string) ?? null,
      created_at: tx.created_at as string,
    }));
  }

  return {
    leads: typedLeads,
    stats: { total: typedLeads.length, available, sold, expired, totalRevenue, reiRevenue },
    areas,
    brokers,
    transactions,
  };
}

// ─── Mutations ──────────────────────────────────────────────────────

export async function adminUpdateLead(
  leadId: string,
  updates: { title?: string; description?: string; price?: number; status?: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const { error } = await supabaseAdmin
      .from("system_leads")
      .update(updates)
      .eq("id", leadId);
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/marketplace");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function adminExpireLead(leadId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const { error } = await supabaseAdmin
      .from("system_leads")
      .update({ status: "expired" })
      .eq("id", leadId)
      .eq("status", "available");
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/marketplace");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function adminReactivateLead(leadId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const { error } = await supabaseAdmin
      .from("system_leads")
      .update({
        status: "available",
        expiration_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      })
      .eq("id", leadId)
      .eq("status", "expired");
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/marketplace");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export type PostLeadInput = {
  title: string;
  description: string;
  system_type: string;
  price: number;
  home_type: string;
  home_year_built: number | null;
  home_sqft: number | null;
  beds: number | null;
  baths: number | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  area: string;
  homeowner_name: string;
  homeowner_email: string;
  homeowner_phone: string;
  best_contact_time: string;
  // Routing — Phase 8A
  routing_channel: "open_market" | "internal_network" | "exclusive";
  exclusive_contractor_id: string | null;
  is_free_assignment: boolean;
  network_release_hours: number | null; // 24 | 48 | 72 | null (never)
  // Legacy compat
  routing?: "marketplace" | "assign";
  assign_to_contractor_id?: string | null;
};

export async function fetchNetworkContractors(): Promise<{ id: string; name: string; company_name: string | null }[]> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("rei_contractor_network")
    .select("id, contractor_id, name, company_name")
    .eq("status", "active")
    .order("company_name", { ascending: true });

  if (error) {
    console.warn("[fetchNetworkContractors] Table may not exist:", error.message);
    return [];
  }
  if (!data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    company_name: (r.company_name as string) ?? null,
  }));
}

export async function fetchContractors(): Promise<{ id: string; name: string }[]> {
  await requireAdmin();
  const { data } = await supabaseAdmin
    .from("app_profiles")
    .select("id, email, full_name, first_name, last_name, role, status")
    .eq("role", "contractor");

  if (!data) return [];
  return (data as Record<string, unknown>[])
    .filter((p) => !p.status || p.status === "active")
    .map((p) => ({
      id: p.id as string,
      name:
        (p.full_name as string) ||
        [p.first_name, p.last_name].filter(Boolean).join(" ") ||
        (p.email as string) ||
        "Unknown",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function adminPostLead(
  input: PostLeadInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminId = await requireAdmin();

    if (!input.title.trim()) return { success: false, error: "Title is required." };
    if (!input.homeowner_name.trim()) return { success: false, error: "Homeowner name is required." };
    if (!input.system_type) return { success: false, error: "Service type is required." };

    const channel = input.routing_channel || "open_market";

    // Validate based on routing channel
    if (channel === "open_market" && (!input.price || input.price <= 0)) {
      return { success: false, error: "Price must be greater than 0 for open market leads." };
    }
    if (channel === "internal_network" && !input.is_free_assignment && (!input.price || input.price <= 0)) {
      return { success: false, error: "Price must be greater than 0 for network leads." };
    }
    if (channel === "exclusive" && !input.exclusive_contractor_id) {
      return { success: false, error: "Please select a contractor for exclusive assignment." };
    }

    const leadRow: Record<string, unknown> = {
      title: input.title.trim(),
      description: input.description.trim() || null,
      system_type: input.system_type,
      price: (channel === "exclusive" && input.is_free_assignment) ? 0 : (input.price || 0),
      is_exclusive: channel === "exclusive",
      home_type: input.home_type || null,
      home_year_built: input.home_year_built,
      home_sqft: input.home_sqft,
      beds: input.beds,
      baths: input.baths,
      address: input.address.trim() || null,
      city: input.city.trim() || null,
      state: input.state || "OR",
      zip: input.zip.trim() || "00000",
      area: input.area || null,
      homeowner_name: input.homeowner_name.trim(),
      homeowner_email: input.homeowner_email.trim() || null,
      homeowner_phone: input.homeowner_phone.trim() || null,
      best_contact_time: input.best_contact_time.trim() || null,
      has_leaf: false,
      leaf_report_data: null,
      broker_id: adminId,
      // Phase 8A routing fields
      routing_channel: channel,
      source: "admin_post",
      is_free_assignment: channel === "exclusive" ? input.is_free_assignment : false,
    };

    // Channel-specific logic
    if (channel === "exclusive" && input.exclusive_contractor_id) {
      leadRow.exclusive_contractor_id = input.exclusive_contractor_id;
      leadRow.status = "available";
      leadRow.purchased_by_contractor_id = input.exclusive_contractor_id;
      if (input.is_free_assignment) {
        leadRow.price = 0;
        leadRow.is_free_assignment = true;
      }
    } else if (channel === "internal_network") {
      leadRow.status = "available";
      leadRow.expiration_date = new Date(Date.now() + 30 * 86400000).toISOString();
      if (input.network_release_hours != null) {
        leadRow.network_release_at = new Date(Date.now() + input.network_release_hours * 60 * 60 * 1000).toISOString();
      }
    } else {
      // open_market
      leadRow.status = "available";
      leadRow.expiration_date = new Date(Date.now() + 30 * 86400000).toISOString();
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("system_leads")
      .insert(leadRow)
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    // If exclusive assignment, also create contractor_lead_status row
    if (channel === "exclusive" && input.exclusive_contractor_id && inserted) {
      await supabaseAdmin.from("contractor_lead_status").insert({
        system_lead_id: inserted.id,
        contractor_id: input.exclusive_contractor_id,
        status: "assigned",
      });
    }

    revalidatePath("/admin/marketplace");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function adminDeleteLead(leadId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    // Check if seed data — hard delete; otherwise soft delete
    const { data: lead } = await supabaseAdmin
      .from("system_leads")
      .select("is_seed_data")
      .eq("id", leadId)
      .single();

    if (lead?.is_seed_data) {
      const { error } = await supabaseAdmin
        .from("system_leads")
        .delete()
        .eq("id", leadId);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabaseAdmin
        .from("system_leads")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", leadId);
      if (error) return { success: false, error: error.message };
    }

    revalidatePath("/admin/marketplace");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
