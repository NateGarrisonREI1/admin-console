// src/app/admin/network/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";

// ─── Types ──────────────────────────────────────────────────────────

export type NetworkPartner = {
  id: string;
  contractor_id: string;
  member_type: string; // 'contractor' | 'hes_assessor' | 'inspector'
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

export type NetworkStats = {
  total: number;
  contractors: number;
  hes: number;
  inspectors: number;
};

export type NetworkData = {
  partners: NetworkPartner[];
  stats: NetworkStats;
};

// ─── Fetch ──────────────────────────────────────────────────────────

export async function fetchNetworkPartners(): Promise<NetworkData> {
  const { data: rows, error } = await supabaseAdmin
    .from("rei_contractor_network")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchNetworkPartners]", error.message);
    return { partners: [], stats: { total: 0, contractors: 0, hes: 0, inspectors: 0 } };
  }

  const partners: NetworkPartner[] = (rows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    contractor_id: r.contractor_id as string,
    member_type: (r.member_type as string) || "contractor",
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

  const stats: NetworkStats = {
    total: partners.length,
    contractors: partners.filter((p) => p.member_type === "contractor").length,
    hes: partners.filter((p) => p.member_type === "hes_assessor").length,
    inspectors: partners.filter((p) => p.member_type === "inspector").length,
  };

  return { partners, stats };
}

// ─── Add ────────────────────────────────────────────────────────────

export async function addNetworkPartner(input: {
  name: string;
  member_type: string;
  email?: string;
  phone?: string;
  company_name?: string;
  service_areas?: string[];
  services?: string[];
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("rei_contractor_network")
      .insert({
        contractor_id: crypto.randomUUID(),
        member_type: input.member_type || "contractor",
        name: input.name.trim(),
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        company_name: input.company_name?.trim() || null,
        service_areas: input.service_areas ?? [],
        services: input.services ?? [],
        notes: input.notes?.trim() || null,
        status: "active",
      });

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

// ─── Update Status ──────────────────────────────────────────────────

export async function updateNetworkPartnerStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("rei_contractor_network")
      .update({ status })
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/network");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
