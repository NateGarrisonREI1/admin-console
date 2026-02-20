// src/app/admin/network/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";

// ─── Types ──────────────────────────────────────────────────────────

export type MemberType = "contractor" | "hes_assessor" | "inspector";

export type NetworkPartner = {
  id: string;
  contractor_id: string;
  member_type: MemberType;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  service_areas: string[];
  services: string[];
  status: string;
  notes: string | null;
  created_at: string;
};

export type NetworkData = {
  partners: NetworkPartner[];
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

// ─── Fetch ──────────────────────────────────────────────────────────

export async function fetchNetworkPartners(): Promise<NetworkData> {
  const { data: rows, error } = await supabaseAdmin
    .from("rei_contractor_network")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[fetchNetworkPartners] Table may not exist:", error.message);
    return { partners: [] };
  }

  const partners: NetworkPartner[] = (rows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    contractor_id: r.contractor_id as string,
    member_type: ((r.member_type as string) || "contractor") as MemberType,
    name: (r.name as string) || "Unknown",
    email: (r.email as string) ?? null,
    phone: (r.phone as string) ?? null,
    company_name: (r.company_name as string) ?? null,
    service_areas: Array.isArray(r.service_areas) ? r.service_areas as string[] : [],
    services: Array.isArray(r.services) ? r.services as string[] : [],
    status: (r.status as string) || "active",
    notes: (r.notes as string) ?? null,
    created_at: r.created_at as string,
  }));

  return { partners };
}

// ─── Search Platform Users ──────────────────────────────────────────

export async function searchPlatformUsers(
  query: string,
  filters?: { areas?: string[]; trades?: string[] },
): Promise<PlatformUser[]> {
  // Get all contractor_ids already in network
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from("rei_contractor_network")
    .select("contractor_id");
  if (existingErr) {
    console.warn("[searchPlatformUsers] rei_contractor_network may not exist:", existingErr.message);
  }
  const excludeIds = new Set(
    (existing ?? []).map((r: Record<string, unknown>) => r.contractor_id as string)
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
    console.error("[searchPlatformUsers]", error.message);
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

// ─── Add Platform User to Network ───────────────────────────────────

export async function addPlatformUserToNetwork(input: {
  userId: string;
  memberType: MemberType;
}): Promise<{ success: boolean; name?: string; error?: string }> {
  try {
    // Check for duplicates
    const { data: dup } = await supabaseAdmin
      .from("rei_contractor_network")
      .select("id")
      .eq("contractor_id", input.userId)
      .maybeSingle();

    if (dup) return { success: false, error: "This user is already in your network." };

    // Fetch profile
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("app_profiles")
      .select("id,full_name,first_name,last_name,email,phone")
      .eq("id", input.userId)
      .single();

    if (profErr || !profile) return { success: false, error: "User not found." };

    const name =
      profile.full_name ||
      [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
      "Unknown";

    const { error } = await supabaseAdmin
      .from("rei_contractor_network")
      .insert({
        contractor_id: profile.id,
        member_type: input.memberType,
        name,
        email: profile.email || null,
        phone: profile.phone || null,
        status: "active",
      });

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/network");
    return { success: true, name };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ─── Invite to Network (pending) ────────────────────────────────────

export async function inviteToNetwork(input: {
  email: string;
  name?: string;
  memberType: MemberType;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if email already in network
    const { data: existing } = await supabaseAdmin
      .from("rei_contractor_network")
      .select("id")
      .eq("email", input.email.trim())
      .maybeSingle();

    if (existing) return { success: false, error: "This email is already in your network." };

    const { error } = await supabaseAdmin
      .from("rei_contractor_network")
      .insert({
        contractor_id: crypto.randomUUID(), // placeholder until they create an account
        member_type: input.memberType,
        name: input.name?.trim() || input.email.trim(),
        email: input.email.trim(),
        status: "pending_invite",
      });

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/network");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ─── Update ─────────────────────────────────────────────────────────

export async function updateNetworkPartner(input: {
  id: string;
  status?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: Record<string, unknown> = {};
    if (input.status !== undefined) updates.status = input.status;
    if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;

    const { error } = await supabaseAdmin
      .from("rei_contractor_network")
      .update(updates)
      .eq("id", input.id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/network");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ─── Remove ─────────────────────────────────────────────────────────

export async function removeNetworkPartner(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("rei_contractor_network")
      .delete()
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/network");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
