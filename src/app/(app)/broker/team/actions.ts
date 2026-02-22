// src/app/(app)/broker/team/actions.ts
"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { BrokerService } from "@/lib/services/BrokerService";
import { revalidatePath } from "next/cache";

// ─── Types ──────────────────────────────────────────────────────────

export type TeamMember = {
  id: string;
  contractorUserId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  serviceTypes: string[];
  serviceAreas: string[];
  status: string;
  notes: string | null;
  isPreferred: boolean;
  leadsRouted: number;
  leadsCompleted: number;
  createdAt: string;
};

export type TeamData = {
  members: TeamMember[];
};

export type PlatformUser = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  service_areas: string[];
  service_types: string[];
};

export type REITeamMember = {
  id: string;
  fullName: string;
  role: "hes_assessor" | "inspector";
  serviceArea: string;
};

// ─── Auth helper ────────────────────────────────────────────────────

async function getBrokerId(): Promise<string | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id;
  if (!userId) return null;

  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(userId);
  return broker.id;
}

// ─── Fetch Broker Team ──────────────────────────────────────────────

export async function fetchBrokerTeam(): Promise<TeamData | null> {
  const brokerId = await getBrokerId();
  if (!brokerId) return null;

  const { data, error } = await supabaseAdmin
    .from("broker_contractors")
    .select("*")
    .eq("broker_id", brokerId)
    .neq("status", "removed")
    .order("is_preferred", { ascending: false })
    .order("company_name", { ascending: true });

  if (error) {
    console.error("[fetchBrokerTeam]", error.message);
    return { members: [] };
  }

  const members: TeamMember[] = (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    contractorUserId: (r.contractor_user_id as string) ?? null,
    name: (r.contractor_name as string) || "Unknown",
    email: (r.contractor_email as string) ?? null,
    phone: (r.contractor_phone as string) ?? null,
    companyName: (r.company_name as string) ?? null,
    serviceTypes: Array.isArray(r.service_types) ? r.service_types as string[] : [],
    serviceAreas: Array.isArray(r.service_areas) ? r.service_areas as string[] : [],
    status: (r.status as string) || "active",
    notes: (r.notes as string) ?? null,
    isPreferred: !!(r.is_preferred),
    leadsRouted: (r.leads_routed as number) ?? 0,
    leadsCompleted: (r.leads_completed as number) ?? 0,
    createdAt: r.created_at as string,
  }));

  return { members };
}

// ─── Search Network Contractors ─────────────────────────────────────

export async function searchNetworkContractors(
  query: string,
  filters?: { areas?: string[]; trades?: string[] },
): Promise<PlatformUser[]> {
  const brokerId = await getBrokerId();
  if (!brokerId) return [];

  // Get contractor_user_ids already on this broker's team
  const { data: existing } = await supabaseAdmin
    .from("broker_contractors")
    .select("contractor_user_id")
    .eq("broker_id", brokerId)
    .neq("status", "removed");

  const excludeIds = new Set(
    (existing ?? [])
      .map((r: Record<string, unknown>) => r.contractor_user_id as string)
      .filter(Boolean)
  );

  // If area or trade filters are set, pre-filter via contractor_profiles
  let filteredProfileIds: Set<string> | null = null;
  const hasAreaFilter = filters?.areas && filters.areas.length > 0;
  const hasTradeFilter = filters?.trades && filters.trades.length > 0;

  if (hasAreaFilter || hasTradeFilter) {
    let cpQuery = supabaseAdmin.from("contractor_profiles").select("id");
    if (hasAreaFilter) cpQuery = cpQuery.overlaps("service_areas", filters!.areas!);
    if (hasTradeFilter) cpQuery = cpQuery.overlaps("service_types", filters!.trades!);
    const { data: cpResults } = await cpQuery;
    filteredProfileIds = new Set(
      (cpResults ?? []).map((r: Record<string, unknown>) => r.id as string)
    );
    if (filteredProfileIds.size === 0) return [];
  }

  // Query app_profiles — all contractor-role users
  let q = supabaseAdmin
    .from("app_profiles")
    .select("id,full_name,first_name,last_name,email,phone")
    .eq("role", "contractor")
    .order("full_name")
    .limit(50);

  const trimmed = query.trim();
  if (trimmed) {
    q = q.or(
      `full_name.ilike.%${trimmed}%,email.ilike.%${trimmed}%,first_name.ilike.%${trimmed}%,last_name.ilike.%${trimmed}%`
    );
  }

  if (filteredProfileIds !== null) {
    q = q.in("id", Array.from(filteredProfileIds));
  }

  const { data: results, error } = await q;
  if (error) {
    console.error("[searchNetworkContractors]", error.message);
    return [];
  }

  const matchedUsers = (results ?? [])
    .filter((r) => !excludeIds.has(r.id))
    .slice(0, 20);

  if (matchedUsers.length === 0) return [];

  // Enrich with contractor_profiles data
  const userIds = matchedUsers.map((u) => u.id);
  const { data: cpRows } = await supabaseAdmin
    .from("contractor_profiles")
    .select("id,company_name,service_areas,service_types")
    .in("id", userIds);

  const cpMap = new Map(
    (cpRows ?? []).map((cp: Record<string, unknown>) => [cp.id as string, cp])
  );

  return matchedUsers.map((r) => {
    const cp = cpMap.get(r.id) as Record<string, unknown> | undefined;
    return {
      id: r.id,
      full_name: r.full_name,
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      phone: r.phone,
      company_name: (cp?.company_name as string) ?? null,
      service_areas: Array.isArray(cp?.service_areas) ? cp.service_areas as string[] : [],
      service_types: Array.isArray(cp?.service_types) ? cp.service_types as string[] : [],
    };
  });
}

// ─── Add Contractor to Team ─────────────────────────────────────────

export async function addContractorToTeam(
  userId: string,
): Promise<{ success: boolean; name?: string; error?: string }> {
  const brokerId = await getBrokerId();
  if (!brokerId) return { success: false, error: "Not authenticated" };

  // Check for duplicates
  const { data: dup } = await supabaseAdmin
    .from("broker_contractors")
    .select("id")
    .eq("broker_id", brokerId)
    .eq("contractor_user_id", userId)
    .neq("status", "removed")
    .maybeSingle();

  if (dup) return { success: false, error: "This contractor is already on your team." };

  // Fetch profile
  const { data: profile, error: profErr } = await supabaseAdmin
    .from("app_profiles")
    .select("id,full_name,first_name,last_name,email,phone")
    .eq("id", userId)
    .single();

  if (profErr || !profile) return { success: false, error: "User not found." };

  const name =
    profile.full_name ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "Unknown";

  // Get contractor_profiles data for service info
  const { data: cpRow } = await supabaseAdmin
    .from("contractor_profiles")
    .select("company_name,service_areas,service_types")
    .eq("id", userId)
    .maybeSingle();

  const cp = cpRow as Record<string, unknown> | null;

  const { error } = await supabaseAdmin
    .from("broker_contractors")
    .insert({
      broker_id: brokerId,
      contractor_user_id: userId,
      contractor_name: name,
      contractor_email: profile.email || null,
      contractor_phone: profile.phone || null,
      company_name: (cp?.company_name as string) || null,
      service_types: Array.isArray(cp?.service_types) ? cp.service_types : [],
      service_areas: Array.isArray(cp?.service_areas) ? cp.service_areas : [],
      status: "active",
      is_preferred: false,
    });

  if (error) return { success: false, error: error.message };
  revalidatePath("/broker/team");
  return { success: true, name };
}

// ─── Invite Contractor ──────────────────────────────────────────────

export async function inviteContractor(input: {
  email: string;
  name?: string;
}): Promise<{ success: boolean; error?: string }> {
  const brokerId = await getBrokerId();
  if (!brokerId) return { success: false, error: "Not authenticated" };

  // Check if email already on team
  const { data: existing } = await supabaseAdmin
    .from("broker_contractors")
    .select("id")
    .eq("broker_id", brokerId)
    .eq("contractor_email", input.email.trim())
    .neq("status", "removed")
    .maybeSingle();

  if (existing) return { success: false, error: "This email is already on your team." };

  const { error } = await supabaseAdmin
    .from("broker_contractors")
    .insert({
      broker_id: brokerId,
      contractor_name: input.name?.trim() || input.email.trim(),
      contractor_email: input.email.trim(),
      status: "pending_invite",
      is_preferred: false,
      service_types: [],
      service_areas: [],
    });

  if (error) return { success: false, error: error.message };
  revalidatePath("/broker/team");
  return { success: true };
}

// ─── Update Team Member ─────────────────────────────────────────────

export async function updateTeamMember(input: {
  id: string;
  status?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const brokerId = await getBrokerId();
  if (!brokerId) return { success: false, error: "Not authenticated" };

  const updates: Record<string, unknown> = {};
  if (input.status !== undefined) updates.status = input.status;
  if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;

  const { error } = await supabaseAdmin
    .from("broker_contractors")
    .update(updates)
    .eq("id", input.id)
    .eq("broker_id", brokerId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/broker/team");
  return { success: true };
}

// ─── Remove Team Member ─────────────────────────────────────────────

export async function removeTeamMember(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const brokerId = await getBrokerId();
  if (!brokerId) return { success: false, error: "Not authenticated" };

  const { error } = await supabaseAdmin
    .from("broker_contractors")
    .update({ status: "removed" })
    .eq("id", id)
    .eq("broker_id", brokerId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/broker/team");
  return { success: true };
}

// ─── Fetch REI HES Assessors ────────────────────────────────────────

export async function fetchREIAssessors(): Promise<REITeamMember[]> {
  const { data, error } = await supabaseAdmin
    .from("app_profiles")
    .select("id, full_name, staff_type")
    .eq("role", "rei_staff")
    .eq("staff_type", "hes_assessor")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("[fetchREIAssessors]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    fullName: (row.full_name as string) || "Team Member",
    role: "hes_assessor" as const,
    serviceArea: "Portland Metro",
  }));
}

// ─── Fetch REI Home Inspectors ──────────────────────────────────────

export async function fetchREIInspectors(): Promise<REITeamMember[]> {
  const { data, error } = await supabaseAdmin
    .from("app_profiles")
    .select("id, full_name, staff_type")
    .eq("role", "rei_staff")
    .eq("staff_type", "home_inspector")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("[fetchREIInspectors]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    fullName: (row.full_name as string) || "Team Member",
    role: "inspector" as const,
    serviceArea: "Portland Metro",
  }));
}
