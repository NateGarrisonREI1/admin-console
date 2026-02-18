// src/app/admin/_actions/services.ts
"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { ServiceCategory, ServiceTier, ServiceAddon } from "@/types/schema";

// ─── Types ──────────────────────────────────────────────────────────

export type ServiceCatalogCategory = ServiceCategory & {
  tiers: ServiceTier[];
  addons: ServiceAddon[];
};

export type ServiceCatalog = ServiceCatalogCategory[];

// ─── Fetch ──────────────────────────────────────────────────────────

export async function fetchServiceCatalog(): Promise<ServiceCatalog> {
  const [catRes, tierRes, addonRes] = await Promise.all([
    supabaseAdmin.from("service_categories").select("*").order("sort_order"),
    supabaseAdmin.from("service_tiers").select("*").order("sort_order"),
    supabaseAdmin.from("service_addons").select("*").order("sort_order"),
  ]);

  if (catRes.error) throw new Error(catRes.error.message);
  if (tierRes.error) throw new Error(tierRes.error.message);
  if (addonRes.error) throw new Error(addonRes.error.message);

  const categories = catRes.data as ServiceCategory[];
  const tiers = tierRes.data as ServiceTier[];
  const addons = addonRes.data as ServiceAddon[];

  return categories.map((cat) => ({
    ...cat,
    tiers: tiers.filter((t) => t.category_id === cat.id),
    addons: addons.filter((a) => a.category_id === cat.id),
  }));
}

// ─── Tier CRUD ──────────────────────────────────────────────────────

export async function updateServiceTier(
  tierId: string,
  data: { name?: string; price?: number; size_label?: string; sq_ft_min?: number | null; sq_ft_max?: number | null; is_active?: boolean },
) {
  const { error } = await supabaseAdmin
    .from("service_tiers")
    .update(data)
    .eq("id", tierId);
  if (error) throw new Error(error.message);
}

export async function addServiceTier(
  categoryId: string,
  data: { name: string; slug: string; size_label: string; sq_ft_min?: number | null; sq_ft_max?: number | null; price: number },
) {
  const { error } = await supabaseAdmin
    .from("service_tiers")
    .insert({ category_id: categoryId, ...data });
  if (error) throw new Error(error.message);
}

// ─── Addon CRUD ─────────────────────────────────────────────────────

export async function updateServiceAddon(
  addonId: string,
  data: { name?: string; price?: number; price_range_low?: number | null; price_range_high?: number | null; is_active?: boolean },
) {
  const { error } = await supabaseAdmin
    .from("service_addons")
    .update(data)
    .eq("id", addonId);
  if (error) throw new Error(error.message);
}

export async function addServiceAddon(
  categoryId: string,
  data: { name: string; slug: string; price: number; price_range_low?: number | null; price_range_high?: number | null },
) {
  const { error } = await supabaseAdmin
    .from("service_addons")
    .insert({ category_id: categoryId, ...data });
  if (error) throw new Error(error.message);
}

// ─── Delete ─────────────────────────────────────────────────────────

export async function deleteServiceTier(id: string) {
  const { error } = await supabaseAdmin
    .from("service_tiers")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteServiceAddon(id: string) {
  const { error } = await supabaseAdmin
    .from("service_addons")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── Toggle active ──────────────────────────────────────────────────

export async function toggleServiceActive(
  type: "tier" | "addon",
  id: string,
  isActive: boolean,
) {
  const table = type === "tier" ? "service_tiers" : "service_addons";
  const { error } = await supabaseAdmin
    .from(table)
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
