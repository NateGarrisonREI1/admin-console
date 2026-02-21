// src/app/(app)/broker/team/actions.ts
"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { BrokerService } from "@/lib/services/BrokerService";
import type { BrokerContractor } from "@/types/broker";

// ─── Types ──────────────────────────────────────────────────────────

export type ServiceCoverage = {
  type: string;
  covered: boolean;
};

export type BrokerTeamData = {
  contractors: BrokerContractor[];
  coverage: ServiceCoverage[];
};

export type AddContractorInput = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  serviceTypes: string[];
  serviceAreas: string[];
  notes: string;
};

export type UpdateContractorInput = AddContractorInput & {
  id: string;
};

// ─── Constants ──────────────────────────────────────────────────────

const ALL_SERVICE_TYPES = [
  "HVAC",
  "Solar",
  "Electrical",
  "Plumbing",
  "Insulation",
  "Windows",
  "Handyman",
];

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

// ─── Fetch ──────────────────────────────────────────────────────────

export async function fetchBrokerContractors(): Promise<BrokerTeamData | null> {
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
    console.error("[fetchBrokerContractors]", error.message);
    return { contractors: [], coverage: ALL_SERVICE_TYPES.map((t) => ({ type: t, covered: false })) };
  }

  const contractors = (data ?? []) as BrokerContractor[];

  // Compute service coverage
  const coveredTypes = new Set<string>();
  for (const c of contractors) {
    for (const st of c.service_types ?? []) {
      coveredTypes.add(st);
    }
  }

  const coverage: ServiceCoverage[] = ALL_SERVICE_TYPES.map((type) => ({
    type,
    covered: coveredTypes.has(type),
  }));

  return { contractors, coverage };
}

// ─── Add ────────────────────────────────────────────────────────────

export async function addContractor(
  input: AddContractorInput,
): Promise<{ success: true; contractor: BrokerContractor } | { success: false; error: string }> {
  const brokerId = await getBrokerId();
  if (!brokerId) return { success: false, error: "Not authenticated" };

  if (!input.companyName.trim()) return { success: false, error: "Company name is required" };
  if (!input.contactName.trim()) return { success: false, error: "Contact name is required" };
  if (!input.email.trim()) return { success: false, error: "Email is required" };

  const { data, error } = await supabaseAdmin
    .from("broker_contractors")
    .insert({
      broker_id: brokerId,
      company_name: input.companyName.trim(),
      contractor_name: input.contactName.trim(),
      contractor_email: input.email.trim(),
      contractor_phone: input.phone.trim() || null,
      website: input.website.trim() || null,
      service_types: input.serviceTypes,
      service_areas: input.serviceAreas,
      notes: input.notes.trim() || null,
      status: "active",
      is_preferred: false,
    })
    .select()
    .single();

  if (error) {
    console.error("[addContractor]", error.message);
    return { success: false, error: "Failed to add contractor" };
  }

  return { success: true, contractor: data as BrokerContractor };
}

// ─── Update ─────────────────────────────────────────────────────────

export async function updateContractor(
  input: UpdateContractorInput,
): Promise<{ success: true; contractor: BrokerContractor } | { success: false; error: string }> {
  const brokerId = await getBrokerId();
  if (!brokerId) return { success: false, error: "Not authenticated" };

  if (!input.companyName.trim()) return { success: false, error: "Company name is required" };
  if (!input.contactName.trim()) return { success: false, error: "Contact name is required" };
  if (!input.email.trim()) return { success: false, error: "Email is required" };

  const { data, error } = await supabaseAdmin
    .from("broker_contractors")
    .update({
      company_name: input.companyName.trim(),
      contractor_name: input.contactName.trim(),
      contractor_email: input.email.trim(),
      contractor_phone: input.phone.trim() || null,
      website: input.website.trim() || null,
      service_types: input.serviceTypes,
      service_areas: input.serviceAreas,
      notes: input.notes.trim() || null,
    })
    .eq("id", input.id)
    .eq("broker_id", brokerId)
    .select()
    .single();

  if (error) {
    console.error("[updateContractor]", error.message);
    return { success: false, error: "Failed to update contractor" };
  }

  return { success: true, contractor: data as BrokerContractor };
}

// ─── Remove ─────────────────────────────────────────────────────────

export async function removeContractor(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const brokerId = await getBrokerId();
  if (!brokerId) return { success: false, error: "Not authenticated" };

  const { error } = await supabaseAdmin
    .from("broker_contractors")
    .update({ status: "removed" })
    .eq("id", id)
    .eq("broker_id", brokerId);

  if (error) {
    console.error("[removeContractor]", error.message);
    return { success: false, error: "Failed to remove contractor" };
  }

  return { success: true };
}

// ─── Set Preferred ──────────────────────────────────────────────────

export async function setPreferred(
  id: string,
  serviceType: string,
): Promise<{ success: boolean; error?: string }> {
  const brokerId = await getBrokerId();
  if (!brokerId) return { success: false, error: "Not authenticated" };

  // Unset preferred for all other contractors with this service type
  const { data: allContractors } = await supabaseAdmin
    .from("broker_contractors")
    .select("id, service_types, is_preferred")
    .eq("broker_id", brokerId)
    .eq("is_preferred", true)
    .neq("status", "removed");

  for (const c of (allContractors ?? []) as { id: string; service_types: string[]; is_preferred: boolean }[]) {
    if (c.id !== id && (c.service_types ?? []).includes(serviceType)) {
      await supabaseAdmin
        .from("broker_contractors")
        .update({ is_preferred: false })
        .eq("id", c.id);
    }
  }

  // Set this contractor as preferred
  const { error } = await supabaseAdmin
    .from("broker_contractors")
    .update({ is_preferred: true })
    .eq("id", id)
    .eq("broker_id", brokerId);

  if (error) {
    console.error("[setPreferred]", error.message);
    return { success: false, error: "Failed to set preferred" };
  }

  return { success: true };
}
