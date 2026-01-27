// src/app/admin/upgrade-catalog/_actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";

function s(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function parseIntentKeys(input: string): string[] {
  const raw = s(input).trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function nInt(v: any, fallback: number) {
  const num = Number(s(v).trim());
  return Number.isFinite(num) ? Math.trunc(num) : fallback;
}

export async function createUpgradeItem(formData: FormData) {
  const feature_key = s(formData.get("feature_key")).trim();
  const display_name = s(formData.get("display_name")).trim();
  const description = s(formData.get("description")).trim() || null;

  const lead_class = s(formData.get("lead_class")).trim() as "equipment" | "service";
  const is_active = s(formData.get("is_active")).trim() !== "false";
  const sort_rank = nInt(formData.get("sort_rank"), 100);
  const intent_keys = parseIntentKeys(s(formData.get("intent_keys")));

  if (!feature_key) throw new Error("feature_key is required");
  if (!display_name) throw new Error("display_name is required");
  if (lead_class !== "equipment" && lead_class !== "service") {
    throw new Error("lead_class must be equipment or service");
  }

  const { error } = await supabaseAdmin.from("upgrade_catalog").insert({
    feature_key,
    display_name,
    description,
    lead_class,
    is_active,
    sort_rank,
    intent_keys,
  });

  if (error) throw new Error(`Failed to create item: ${error.message}`);

  revalidatePath("/admin/upgrade-catalog");
}

export async function updateUpgradeItem(formData: FormData) {
  const id = s(formData.get("id")).trim();
  if (!id) throw new Error("id is required");

  const display_name = s(formData.get("display_name")).trim();
  const description = s(formData.get("description")).trim() || null;

  const lead_class = s(formData.get("lead_class")).trim() as "equipment" | "service";
  const sort_rank = nInt(formData.get("sort_rank"), 100);
  const intent_keys = parseIntentKeys(s(formData.get("intent_keys")));

  if (!display_name) throw new Error("display_name is required");
  if (lead_class !== "equipment" && lead_class !== "service") {
    throw new Error("lead_class must be equipment or service");
  }

  const { error } = await supabaseAdmin
    .from("upgrade_catalog")
    .update({
      display_name,
      description,
      lead_class,
      sort_rank,
      intent_keys,
    })
    .eq("id", id);

  if (error) throw new Error(`Failed to update item: ${error.message}`);

  revalidatePath("/admin/upgrade-catalog");
}

export async function toggleUpgradeItemActive(formData: FormData) {
  const id = s(formData.get("id")).trim();
  const next = s(formData.get("is_active")).trim() === "true";
  if (!id) throw new Error("id is required");

  const { error } = await supabaseAdmin
    .from("upgrade_catalog")
    .update({ is_active: next })
    .eq("id", id);

  if (error) throw new Error(`Failed to toggle active: ${error.message}`);

  revalidatePath("/admin/upgrade-catalog");
}

/**
 * Promote an item to default for its feature_key:
 * - sets this item sort_rank=1
 * - bumps other ACTIVE items of same feature_key to 10,20,30... preserving existing order
 */
export async function promoteUpgradeItem(formData: FormData) {
  const id = s(formData.get("id")).trim();
  const feature_key = s(formData.get("feature_key")).trim();
  if (!id) throw new Error("id is required");
  if (!feature_key) throw new Error("feature_key is required");

  const { data, error } = await supabaseAdmin
    .from("upgrade_catalog")
    .select("id, sort_rank, display_name")
    .eq("feature_key", feature_key)
    .eq("is_active", true)
    .order("sort_rank", { ascending: true })
    .order("display_name", { ascending: true });

  if (error) throw new Error(`Failed to load siblings: ${error.message}`);

  const siblings = (data ?? []) as Array<{
    id: string;
    sort_rank: number | null;
    display_name: string | null;
  }>;

  // If the promoted item isn't active, activate it first, then reload.
  if (!siblings.some((x) => x.id === id)) {
    const { error: actErr } = await supabaseAdmin
      .from("upgrade_catalog")
      .update({ is_active: true })
      .eq("id", id);

    if (actErr) throw new Error(`Failed to activate before promote: ${actErr.message}`);

    const { data: data2, error: err2 } = await supabaseAdmin
      .from("upgrade_catalog")
      .select("id, sort_rank, display_name")
      .eq("feature_key", feature_key)
      .eq("is_active", true)
      .order("sort_rank", { ascending: true })
      .order("display_name", { ascending: true });

    if (err2) throw new Error(`Failed to reload siblings: ${err2.message}`);
    siblings.splice(0, siblings.length, ...((data2 ?? []) as any));
  }

  const others = siblings.filter((x) => x.id !== id);

  const updates: Array<{ id: string; sort_rank: number }> = [{ id, sort_rank: 1 }];
  let rank = 10;
  for (const o of others) {
    updates.push({ id: o.id, sort_rank: rank });
    rank += 10;
  }

  for (const u of updates) {
    const { error: upErr } = await supabaseAdmin
      .from("upgrade_catalog")
      .update({ sort_rank: u.sort_rank })
      .eq("id", u.id);

    if (upErr) throw new Error(`Failed to update rank: ${upErr.message}`);
  }

  revalidatePath("/admin/upgrade-catalog");
}

export async function duplicateUpgradeItem(formData: FormData) {
  const id = s(formData.get("id")).trim();
  if (!id) throw new Error("id is required");

  const { data, error } = await supabaseAdmin
    .from("upgrade_catalog")
    .select("feature_key, display_name, description, lead_class, intent_keys, sort_rank, is_active")
    .eq("id", id)
    .single();

  if (error) throw new Error(`Failed to load item: ${error.message}`);

  const base: any = data;
  const copyName = `${s(base.display_name)} (Copy)`.slice(0, 200);
  const nextRank = (typeof base.sort_rank === "number" ? base.sort_rank : 100) + 10;

  const { error: insErr } = await supabaseAdmin.from("upgrade_catalog").insert({
    feature_key: base.feature_key,
    display_name: copyName,
    description: base.description ?? null,
    lead_class: base.lead_class,
    intent_keys: base.intent_keys ?? [],
    sort_rank: nextRank,
    is_active: base.is_active ?? true,
  });

  if (insErr) throw new Error(`Failed to duplicate: ${insErr.message}`);

  revalidatePath("/admin/upgrade-catalog");
}

/**
 * One-click seeding for missing features / standard defaults
 */
export async function seedPresetForFeature(formData: FormData) {
  const feature_key = s(formData.get("feature_key")).trim();
  if (!feature_key) throw new Error("feature_key is required");

  const presets: Record<
    string,
    { display_name: string; lead_class: "equipment" | "service"; sort_rank: number; intent_keys: string[] }
  > = {
    air_conditioner: {
      display_name: "ENERGY STAR A/C Replacement",
      lead_class: "equipment",
      sort_rank: 10,
      intent_keys: ["upgrade_when_replacing_energy_star"],
    },
    heating_equipment: {
      display_name: "High-Efficiency Heating Upgrade",
      lead_class: "equipment",
      sort_rank: 10,
      intent_keys: ["upgrade_when_replacing_energy_star"],
    },
    water_heater: {
      display_name: "High-Efficiency Water Heater Upgrade",
      lead_class: "equipment",
      sort_rank: 10,
      intent_keys: ["upgrade_when_replacing_energy_star"],
    },
    envelope_air_sealing: {
      display_name: "Professional Whole-Home Air Sealing",
      lead_class: "service",
      sort_rank: 20,
      intent_keys: ["air_seal_professional", "reduce_leakage"],
    },
    attic_insulation: {
      display_name: "Attic Insulation Upgrade",
      lead_class: "service",
      sort_rank: 30,
      intent_keys: ["increase_r_value"],
    },
    duct_sealing: {
      display_name: "Duct Sealing (Reduce Leakage)",
      lead_class: "service",
      sort_rank: 30,
      intent_keys: ["reduce_leakage", "seal"],
    },
    duct_insulation: {
      display_name: "Duct Insulation Upgrade",
      lead_class: "service",
      sort_rank: 40,
      intent_keys: ["insulate"],
    },
    wall_insulation: {
      display_name: "Wall Insulation Upgrade",
      lead_class: "service",
      sort_rank: 40,
      intent_keys: ["increase_r_value"],
    },
    floor_insulation: {
      display_name: "Floor Insulation Upgrade",
      lead_class: "service",
      sort_rank: 40,
      intent_keys: ["increase_r_value"],
    },
    foundation_wall_insulation: {
      display_name: "Foundation Wall Insulation Upgrade",
      lead_class: "service",
      sort_rank: 40,
      intent_keys: ["increase_r_value"],
    },
    basement_wall_insulation: {
      display_name: "Basement Wall Insulation Upgrade",
      lead_class: "service",
      sort_rank: 40,
      intent_keys: ["increase_r_value"],
    },
    knee_wall_insulation: {
      display_name: "Knee Wall Insulation Upgrade",
      lead_class: "service",
      sort_rank: 40,
      intent_keys: ["increase_r_value"],
    },
    cathedral_ceiling_roof: {
      display_name: "Cathedral Ceiling/Roof Insulation Upgrade",
      lead_class: "service",
      sort_rank: 40,
      intent_keys: ["increase_r_value"],
    },
    windows: {
      display_name: "High-Performance Window Upgrade",
      lead_class: "service",
      sort_rank: 60,
      intent_keys: ["replace"],
    },
    skylights: {
      display_name: "Skylight Upgrade",
      lead_class: "service",
      sort_rank: 60,
      intent_keys: ["replace"],
    },
    solar_pv: {
      display_name: "Solar PV System (Add Solar)",
      lead_class: "equipment",
      sort_rank: 50,
      intent_keys: ["add_solar"],
    },
  };

  const preset = presets[feature_key] ?? {
    display_name: `${feature_key.replace(/_/g, " ")} upgrade`,
    lead_class: "service" as const,
    sort_rank: 100,
    intent_keys: [],
  };

  const { error } = await supabaseAdmin.from("upgrade_catalog").insert({
    feature_key,
    display_name: preset.display_name,
    lead_class: preset.lead_class,
    sort_rank: preset.sort_rank,
    intent_keys: preset.intent_keys,
    is_active: true,
  });

  if (error) throw new Error(`Failed to seed preset: ${error.message}`);

  revalidatePath("/admin/upgrade-catalog");
}

/**
 * ✅ Rank dropdown handler (1-based position)
 * - position=1 => top/default
 * - re-writes ranks as 10,20,30...
 */
export async function setUpgradeItemPosition(formData: FormData) {
  const id = s(formData.get("id")).trim();
  const feature_key = s(formData.get("feature_key")).trim();
  const position = Number(s(formData.get("position")).trim()); // 1-based

  if (!id) throw new Error("id is required");
  if (!feature_key) throw new Error("feature_key is required");
  if (!Number.isFinite(position) || position < 1) throw new Error("position must be >= 1");

  const { data, error } = await supabaseAdmin
    .from("upgrade_catalog")
    .select("id, display_name, sort_rank")
    .eq("feature_key", feature_key)
    .eq("is_active", true)
    .order("sort_rank", { ascending: true })
    .order("display_name", { ascending: true });

  if (error) throw new Error(`Failed to load siblings: ${error.message}`);

  const list = (data ?? []).slice() as Array<{ id: string }>;
  const curIdx = list.findIndex((x) => x.id === id);
  if (curIdx === -1) {
    revalidatePath("/admin/upgrade-catalog");
    return;
  }

  const [item] = list.splice(curIdx, 1);
  const nextIdx = Math.min(list.length, Math.max(0, position - 1));
  list.splice(nextIdx, 0, item);

  for (let i = 0; i < list.length; i++) {
    const nextRank = (i + 1) * 10;
    const row = list[i];

    const { error: upErr } = await supabaseAdmin
      .from("upgrade_catalog")
      .update({ sort_rank: nextRank })
      .eq("id", row.id);

    if (upErr) throw new Error(`Failed to update rank: ${upErr.message}`);
  }

  revalidatePath("/admin/upgrade-catalog");
}

export async function deleteUpgradeItem(formData: FormData) {
  const id = s(formData.get("id")).trim();
  if (!id) throw new Error("Missing id");

  const { error: usageErr, count } = await supabaseAdmin
    .from("snapshot_upgrade_recommendations")
    .select("id", { count: "exact", head: true })
    .eq("upgrade_catalog_id", id);

  if (usageErr) throw new Error(usageErr.message);

  const usedCount = count ?? 0;
  if (usedCount > 0) {
    throw new Error("Cannot delete: item has been used in snapshots. Deactivate instead.");
  }

  const { error: delErr } = await supabaseAdmin.from("upgrade_catalog").delete().eq("id", id);
  if (delErr) throw new Error(delErr.message);

  revalidatePath("/admin/upgrade-catalog");
}
export async function upsertUpgradeCatalogImage(formData: FormData) {
  const upgrade_catalog_id = s(formData.get("upgrade_catalog_id")).trim();
  const kind = s(formData.get("kind")).trim() as "storage" | "external";

  if (!upgrade_catalog_id) throw new Error("upgrade_catalog_id is required");
  if (kind !== "storage" && kind !== "external") throw new Error("kind must be storage or external");

  if (kind === "storage") {
    const storage_bucket = s(formData.get("storage_bucket")).trim() || "upgrade-catalog";
    const storage_path = s(formData.get("storage_path")).trim();
    if (!storage_path) throw new Error("storage_path is required");

    const { error } = await supabaseAdmin.from("upgrade_catalog_media").upsert(
      {
        upgrade_catalog_id,
        kind,
        storage_bucket,
        storage_path,
        external_url: null,
      },
      { onConflict: "upgrade_catalog_id" }
    );

    if (error) throw new Error(error.message);

    revalidatePath("/admin/upgrade-catalog");
    return;
  }

  const external_url = s(formData.get("external_url")).trim();
  if (!external_url) throw new Error("external_url is required");

  const { error } = await supabaseAdmin.from("upgrade_catalog_media").upsert(
    {
      upgrade_catalog_id,
      kind,
      storage_bucket: "upgrade-catalog",
      storage_path: null,
      external_url,
    },
    { onConflict: "upgrade_catalog_id" }
  );

  if (error) throw new Error(error.message);

  revalidatePath("/admin/upgrade-catalog");
}

export async function clearUpgradeCatalogImage(formData: FormData) {
  const upgrade_catalog_id = s(formData.get("upgrade_catalog_id")).trim();
  if (!upgrade_catalog_id) throw new Error("upgrade_catalog_id is required");

  const { error } = await supabaseAdmin
    .from("upgrade_catalog_media")
    .delete()
    .eq("upgrade_catalog_id", upgrade_catalog_id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/upgrade-catalog");
}

export async function listUpgradeAssumptionHealth() {
  const admin = supabaseAdmin;

  const { data, error } = await admin
    .from("v_upgrade_assumptions_health")
    .select(
      [
        "upgrade_catalog_id",
        "upgrade_type_id",
        "upgrade_type_name",
        "install_cost_min",
        "install_cost_max",
        "annual_savings_min",
        "annual_savings_max",
        "expected_life_years",
        "has_type_mapping",
        "has_costs",
        "has_savings",
        "is_roi_ready",
      ].join(",")
    );

  if (error) {
    throw new Error(`listUpgradeAssumptionHealth failed: ${error.message}`);
  }

  return data ?? [];
}



// -------------------------
// Mapping + Assumptions (V1)
// -------------------------

function nNum(v: any): number | null {
  if (v == null) return null;
  const raw = typeof v === "string" ? v.trim() : v;
  if (raw === "") return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

export async function listUpgradeTypesLite() {
  const admin = supabaseAdmin;
  const { data, error } = await admin
    .from("upgrade_types")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw new Error(`listUpgradeTypesLite failed: ${error.message}`);
  return (data ?? []) as Array<{ id: string; name: string }>;
}

export async function setUpgradeCatalogTypeMapping(input: {
  upgrade_catalog_id: string;
  upgrade_type_id: string;
}) {
  const admin = supabaseAdmin;
  const upgrade_catalog_id = s(input?.upgrade_catalog_id).trim();
  const upgrade_type_id = s(input?.upgrade_type_id).trim();

  if (!upgrade_catalog_id) throw new Error("Missing upgrade_catalog_id");
  if (!upgrade_type_id) throw new Error("Missing upgrade_type_id");

  const { error } = await admin
    .from("upgrade_catalog_upgrade_types")
    .upsert({ upgrade_catalog_id, upgrade_type_id }, { onConflict: "upgrade_catalog_id" });

  if (error) throw new Error(`setUpgradeCatalogTypeMapping failed: ${error.message}`);

  revalidatePath("/admin/upgrade-catalog");
  return { ok: true };
}

export async function upsertUpgradeTypeAssumptions(input: {
  upgrade_type_id: string;

  install_cost_min?: any;
  install_cost_max?: any;
  annual_savings_min?: any;
  annual_savings_max?: any;
  expected_life_years?: any;
}) {
  const admin = supabaseAdmin;
  const upgrade_type_id = s(input?.upgrade_type_id).trim();
  if (!upgrade_type_id) throw new Error("Missing upgrade_type_id");

  const install_cost_min = nNum(input.install_cost_min);
  const install_cost_max = nNum(input.install_cost_max);
  const annual_savings_min = nNum(input.annual_savings_min);
  const annual_savings_max = nNum(input.annual_savings_max);
  const expected_life_years = nNum(input.expected_life_years);

  if (install_cost_min != null && install_cost_max != null && install_cost_min > install_cost_max) {
    throw new Error("Install cost min cannot be greater than max");
  }
  if (annual_savings_min != null && annual_savings_max != null && annual_savings_min > annual_savings_max) {
    throw new Error("Savings min cannot be greater than max");
  }

  const { error } = await admin
    .from("upgrade_type_assumptions")
    .upsert(
      {
        upgrade_type_id,
        install_cost_min,
        install_cost_max,
        annual_savings_min,
        annual_savings_max,
        expected_life_years,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "upgrade_type_id" }
    );

  if (error) throw new Error(`upsertUpgradeTypeAssumptions failed: ${error.message}`);

  revalidatePath("/admin/upgrade-catalog");
  return { ok: true };
}

export async function bulkUpsertMappingsAndAssumptions(input: {
  mappings?: Array<{ upgrade_catalog_id: string; upgrade_type_id: string }>;
  assumptions?: Array<{
    upgrade_type_id: string;
    install_cost_min?: number | null;
    install_cost_max?: number | null;
    annual_savings_min?: number | null;
    annual_savings_max?: number | null;
    expected_life_years?: number | null;
  }>;
}) {
  "use server";

  const admin = supabaseAdmin;

  const mappings = Array.isArray(input.mappings) ? input.mappings : [];
  const assumptions = Array.isArray(input.assumptions) ? input.assumptions : [];

  // 1) Upsert mappings (catalog -> type)
  if (mappings.length > 0) {
    const { error } = await admin
      .from("upgrade_catalog_upgrade_types")
      .upsert(mappings, { onConflict: "upgrade_catalog_id" });

    if (error) throw new Error(`bulkUpsertMappingsAndAssumptions mappings failed: ${error.message}`);
  }

  // 2) Upsert assumptions (type -> assumptions)
  // Only update provided columns; do NOT accidentally wipe fields.
  if (assumptions.length > 0) {
    const rows = assumptions.map((a) => {
      const row: any = { upgrade_type_id: a.upgrade_type_id };
      if ("install_cost_min" in a) row.install_cost_min = a.install_cost_min;
      if ("install_cost_max" in a) row.install_cost_max = a.install_cost_max;
      if ("annual_savings_min" in a) row.annual_savings_min = a.annual_savings_min;
      if ("annual_savings_max" in a) row.annual_savings_max = a.annual_savings_max;
      if ("expected_life_years" in a) row.expected_life_years = a.expected_life_years;
      return row;
    });

    const { error } = await admin
      .from("upgrade_type_assumptions")
      .upsert(rows, { onConflict: "upgrade_type_id" });

    if (error) throw new Error(`bulkUpsertMappingsAndAssumptions assumptions failed: ${error.message}`);
  }

  revalidatePath("/admin/upgrade-catalog");
  return { ok: true, mappings: mappings.length, assumptions: assumptions.length };
}
export async function setFeaturePriority(formData: FormData) {
  const feature_key = s(formData.get("feature_key")).trim();
  const is_priority_raw = s(formData.get("is_priority")).trim().toLowerCase();
  const is_priority = is_priority_raw === "true" || is_priority_raw === "1" || is_priority_raw === "yes";

  if (!feature_key) throw new Error("Missing feature_key");

  const admin = supabaseAdmin;

  const { error } = await admin
    .from("admin_upgrade_feature_settings")
    .upsert(
      { feature_key, is_priority },
      { onConflict: "feature_key" }
    );

  if (error) throw new Error(`Failed to set feature priority: ${error.message}`);

  revalidatePath("/admin/upgrade-catalog");
}


