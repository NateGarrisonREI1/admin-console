"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { BrokerService } from "@/lib/services/BrokerService";
import type { ProviderType } from "@/types/broker";

// ─── Types ──────────────────────────────────────────────────────────

export type PendingInvite = {
  id: string;
  email: string;
  name: string | null;
  trade: string | null;
  invited_at: string;
  onboarding_complete: boolean;
  status: "pending" | "active";
};

export async function fetchNetwork() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(userId);
  const contractors = await svc.getContractors(broker.id);
  return { broker, contractors };
}

export async function addContractor(formData: {
  contractor_name: string;
  contractor_email: string;
  contractor_phone: string;
  provider_type: ProviderType;
  service_types: string[];
  service_areas: string[];
  lead_cost_override: number | null;
  commission_split_override: number | null;
  notes: string;
}) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(userId);

  await svc.createContractor({
    broker_id: broker.id,
    contractor_name: formData.contractor_name,
    contractor_email: formData.contractor_email || undefined,
    contractor_phone: formData.contractor_phone || undefined,
    provider_type: formData.provider_type,
    service_types: formData.service_types,
    service_areas: formData.service_areas,
    lead_cost_override: formData.lead_cost_override ?? undefined,
    commission_split_override: formData.commission_split_override ?? undefined,
    notes: formData.notes || undefined,
  });
}

export async function updateContractor(formData: {
  id: string;
  contractor_name: string;
  contractor_email: string;
  contractor_phone: string;
  provider_type: ProviderType;
  service_types: string[];
  service_areas: string[];
  lead_cost_override: number | null;
  commission_split_override: number | null;
  status: string;
  notes: string;
}) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const svc = new BrokerService();
  await svc.updateContractor(formData.id, {
    contractor_name: formData.contractor_name,
    contractor_email: formData.contractor_email || null,
    contractor_phone: formData.contractor_phone || null,
    provider_type: formData.provider_type,
    service_types: formData.service_types,
    service_areas: formData.service_areas,
    lead_cost_override: formData.lead_cost_override,
    commission_split_override: formData.commission_split_override,
    status: formData.status as "active" | "paused" | "removed",
    notes: formData.notes || null,
  });
}

export async function removeContractor(formData: { id: string }) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const svc = new BrokerService();
  await svc.removeContractor(formData.id);
}

// ─── Broker invite contractor ───────────────────────────────────────

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

export async function brokerInviteContractor(input: {
  email: string;
  full_name?: string;
  company_name?: string;
  trade?: string;
  phone?: string;
}): Promise<{ ok: boolean; message: string }> {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const brokerId = userData?.user?.id;
  if (!brokerId) throw new Error("Not authenticated");

  const email = String(input.email || "").trim().toLowerCase();
  if (!isValidEmail(email)) throw new Error("Enter a valid email address.");

  const admin = supabaseAdmin;
  const fullName = input.full_name?.trim() || null;

  // Check if a user with this email already exists
  const { data: listRes, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 5000 });
  if (listErr) throw new Error(listErr.message);

  const existing = listRes.users.find((u) => (u.email || "").toLowerCase() === email);

  if (existing) {
    // User exists — check their role
    const { data: existingProfile } = await admin
      .from("app_profiles")
      .select("role")
      .eq("id", existing.id)
      .single();

    const existingRole = (existingProfile?.role as string) || "homeowner";

    if (existingRole !== "contractor") {
      throw new Error(`This email is already registered with a different role (${existingRole}).`);
    }

    // Already a contractor — just add to broker's network via user_relationships
    await admin.from("user_relationships").upsert({
      user_id: existing.id,
      related_user_id: brokerId,
      relationship_type: "in_broker_network",
    }, { onConflict: "user_id,related_user_id,relationship_type" });

    // Also add to broker_contractors table for the network UI
    const svc = new BrokerService();
    const broker = await svc.getOrCreateBroker(brokerId);
    await svc.createContractor({
      broker_id: broker.id,
      contractor_name: fullName || email,
      contractor_email: email,
      contractor_phone: input.phone || undefined,
      provider_type: "contractor",
      service_types: input.trade ? [input.trade] : [],
      service_areas: [],
    });

    return { ok: true, message: `${email} added to your network.` };
  }

  // User doesn't exist — create via invite
  const { data: invited, error: iErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role: "contractor" },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
  });
  if (iErr) throw new Error(iErr.message);

  const newUserId = invited.user?.id;
  if (!newUserId) throw new Error("Failed to create user.");

  // Create app_profiles
  await admin.from("app_profiles").upsert({
    id: newUserId,
    role: "contractor",
    status: "pending",
    first_name: fullName?.split(" ")[0] || null,
    last_name: fullName?.split(" ").slice(1).join(" ") || null,
    full_name: fullName,
    email,
    phone: input.phone || null,
  }, { onConflict: "id" });

  // Create contractor_profiles
  await admin.from("contractor_profiles").upsert({
    id: newUserId,
    onboarding_complete: false,
    company_name: input.company_name?.trim() || fullName,
    phone: input.phone || null,
    email,
  }, { onConflict: "id" });

  // Create user_relationships (contractor → broker network)
  await admin.from("user_relationships").upsert({
    user_id: newUserId,
    related_user_id: brokerId,
    relationship_type: "in_broker_network",
  }, { onConflict: "user_id,related_user_id,relationship_type" });

  // Create user_sources
  await admin.from("user_sources").upsert({
    user_id: newUserId,
    source_type: "broker_invite",
    source_ref_id: brokerId,
  }, { onConflict: "user_id" });

  // Add to broker_contractors table
  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(brokerId);
  await svc.createContractor({
    broker_id: broker.id,
    contractor_name: fullName || email,
    contractor_email: email,
    contractor_phone: input.phone || undefined,
    provider_type: "contractor",
    service_types: input.trade ? [input.trade] : [],
    service_areas: [],
  });

  return { ok: true, message: `Invite sent to ${email}` };
}

// ─── Fetch pending invites ──────────────────────────────────────────

export async function fetchPendingInvites(): Promise<PendingInvite[]> {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const brokerId = userData?.user?.id;
  if (!brokerId) return [];

  const admin = supabaseAdmin;

  // Get all contractors in this broker's network via user_relationships
  const { data: rels } = await admin
    .from("user_relationships")
    .select("user_id, created_at")
    .eq("related_user_id", brokerId)
    .eq("relationship_type", "in_broker_network");

  if (!rels || rels.length === 0) return [];

  const contractorIds = rels.map((r: Record<string, unknown>) => r.user_id as string);

  // Get their profiles
  const { data: profiles } = await admin
    .from("app_profiles")
    .select("id, full_name, email, role")
    .in("id", contractorIds)
    .eq("role", "contractor");

  if (!profiles || profiles.length === 0) return [];

  // Get their contractor_profiles for onboarding status
  const { data: cpRows } = await admin
    .from("contractor_profiles")
    .select("id, onboarding_complete, system_specialties")
    .in("id", contractorIds);

  const cpMap = new Map((cpRows || []).map((cp: Record<string, unknown>) => [cp.id as string, cp]));
  const relMap = new Map(rels.map((r: Record<string, unknown>) => [r.user_id as string, r]));

  return (profiles as Record<string, unknown>[]).map((p) => {
    const cp = cpMap.get(p.id as string) as Record<string, unknown> | undefined;
    const rel = relMap.get(p.id as string) as Record<string, unknown> | undefined;
    const onboardingComplete = !!cp?.onboarding_complete;
    const specialties = (cp?.system_specialties as string[]) ?? [];

    return {
      id: p.id as string,
      email: (p.email as string) || "",
      name: (p.full_name as string) || null,
      trade: specialties.length > 0 ? specialties[0] : null,
      invited_at: (rel?.created_at as string) || "",
      onboarding_complete: onboardingComplete,
      status: onboardingComplete ? ("active" as const) : ("pending" as const),
    };
  });
}
