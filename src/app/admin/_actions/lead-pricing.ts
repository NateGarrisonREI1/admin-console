// src/app/admin/_actions/lead-pricing.ts
"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { LeadPricingConfig } from "@/types/schema";

export async function fetchLeadPricingConfig(): Promise<LeadPricingConfig[]> {
  const { data, error } = await supabaseAdmin
    .from("lead_pricing_config")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data as LeadPricingConfig[];
}

export async function updateLeadPricing(
  id: string,
  data: {
    display_name?: string;
    min_price?: number;
    max_price?: number;
    default_price?: number;
  },
) {
  const { error } = await supabaseAdmin
    .from("lead_pricing_config")
    .update(data)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function toggleLeadPricingActive(id: string, isActive: boolean) {
  const { error } = await supabaseAdmin
    .from("lead_pricing_config")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addLeadPricingTier(data: {
  system_type: string;
  display_name: string;
  min_price: number;
  max_price: number;
  default_price: number;
}) {
  const { error } = await supabaseAdmin
    .from("lead_pricing_config")
    .insert(data);
  if (error) throw new Error(error.message);
}

export async function deleteLeadPricingTier(id: string) {
  const { error } = await supabaseAdmin
    .from("lead_pricing_config")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
