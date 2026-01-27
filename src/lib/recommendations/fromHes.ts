// src/lib/recommendations/fromHes.ts

export type HesSuggestionRow = {
  section: "priority" | "additional";
  feature: string;
  todays_condition: string;
  recommendation: string;
};

export type UpgradeCatalogRow = {
  id: string;
  display_name: string;
  description: string | null;
  feature_key: string;
  lead_class: "equipment" | "service";
  intent_keys: string[] | null;
  tags: string[] | null;
  aliases: string[] | null;
  sort_rank: number | null;
  is_active: boolean | null;
};

export type HesSystemRecommendation = {
  section: "priority" | "additional";

  feature_key: string;
  intent_key: string;

  lead_class: "equipment" | "service";
  confidence: number;

  feature_raw: string;
  todays_condition_raw: string;
  recommendation_raw: string;

  matches: Array<Pick<UpgradeCatalogRow, "id" | "display_name" | "feature_key" | "lead_class">>;
};

function s(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function normSpaces(v: string) {
  return s(v).replace(/\s+/g, " ").trim();
}
function low(v: string) {
  return normSpaces(v).toLowerCase();
}

export function featureKeyFromHesFeature(featureRaw: string): string {
  const f = low(featureRaw);

  if (f.includes("air conditioner")) return "air_conditioner";
  if (f.includes("heating equipment")) return "heating_equipment";
  if (f.includes("water heater")) return "water_heater";
  if (f.includes("solar pv")) return "solar_pv";

  if (f.includes("envelope") || f.includes("air sealing")) return "envelope_air_sealing";
  if (f.includes("duct sealing")) return "duct_sealing";
  if (f.includes("duct insulation")) return "duct_insulation";

  if (f.includes("attic insulation")) return "attic_insulation";
  if (f.includes("wall insulation")) return "wall_insulation";
  if (f.includes("floor insulation")) return "floor_insulation";
  if (f.includes("foundation wall insulation")) return "foundation_wall_insulation";
  if (f.includes("basement wall insulation")) return "basement_wall_insulation";
  if (f.includes("knee wall insulation")) return "knee_wall_insulation";
  if (f.includes("cathedral ceiling/roof")) return "cathedral_ceiling_roof";

  if (f.includes("windows")) return "windows";
  if (f.includes("skylights")) return "skylights";

  return f.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function intentKeyFromRecommendationText(recRaw: string): string {
  const r = low(recRaw);
  if (!r || r === "—" || r === "n/a") return "none";

  if (r.includes("professionally air seal")) return "air_seal_professional";
  if (r.includes("reduce leakage")) return "reduce_leakage";
  if (r.includes("insulate to r-")) return "increase_r_value";
  if (r.includes("when replacing") && r.includes("energy star"))
    return "upgrade_when_replacing_energy_star";
  if (r.includes("upgrade") && r.includes("energy star")) return "upgrade_energy_star";
  if (r.includes("capacity") && r.includes("kw")) return "add_solar";

  if (r.includes("seal")) return "seal";
  if (r.includes("insulat")) return "insulate";
  if (r.includes("replace")) return "replace";
  if (r.includes("upgrade")) return "upgrade";
  if (r.includes("reduce")) return "reduce";

  return "other";
}

export function leadClassFromFeatureKey(feature_key: string): "equipment" | "service" {
  if (feature_key === "air_conditioner") return "equipment";
  if (feature_key === "heating_equipment") return "equipment";
  if (feature_key === "water_heater") return "equipment";
  if (feature_key === "solar_pv") return "equipment";
  return "service";
}

export function confidenceForRow(
  row: HesSuggestionRow,
  feature_key: string,
  intent_key: string
): number {
  let c = 0.6;
  if (row.section === "priority") c += 0.25;
  if (intent_key !== "other" && intent_key !== "none") c += 0.1;
  if (
    feature_key === "air_conditioner" ||
    feature_key === "heating_equipment" ||
    feature_key === "water_heater"
  ) {
    c += 0.05;
  }
  return Math.max(0, Math.min(1, c));
}

async function fetchUpgradeCatalogMatches(
  supabase: any,
  args: { feature_key: string; lead_class: "equipment" | "service"; intent_key: string }
): Promise<UpgradeCatalogRow[]> {
  const { feature_key, lead_class, intent_key } = args;

  // Base pool: match by feature_key + lead_class + active
  const { data, error } = await supabase
    .from("upgrade_catalog")
    .select(
      "id, display_name, description, feature_key, lead_class, intent_keys, tags, aliases, sort_rank, is_active"
    )
    .eq("is_active", true)
    .eq("feature_key", feature_key)
    .eq("lead_class", lead_class)
    .order("sort_rank", { ascending: true })
    .order("display_name", { ascending: true })
    .limit(8);

  if (error) throw error;

  const rows = (data ?? []) as UpgradeCatalogRow[];

  // Prefer rows whose intent_keys includes this intent_key (if any)
  const preferred = rows.filter((r) => (r.intent_keys ?? []).includes(intent_key));
  const others = rows.filter((r) => !(r.intent_keys ?? []).includes(intent_key));

  return [...preferred, ...others].slice(0, 5);
}

export async function buildSystemRecommendationsFromHes(
  supabase: any,
  suggestions: HesSuggestionRow[]
): Promise<HesSystemRecommendation[]> {
  const rows = (suggestions ?? []).filter((r) => {
    const rec = normSpaces(r.recommendation);
    return rec && rec !== "—" && rec.toLowerCase() !== "n/a";
  });

  const out: HesSystemRecommendation[] = [];

  for (const r of rows) {
    const feature_key = featureKeyFromHesFeature(r.feature);
    const intent_key = intentKeyFromRecommendationText(r.recommendation);
    const lead_class = leadClassFromFeatureKey(feature_key);
    const confidence = confidenceForRow(r, feature_key, intent_key);

    if (intent_key === "none") continue;

    const matches = await fetchUpgradeCatalogMatches(supabase, {
      feature_key,
      lead_class,
      intent_key,
    });

    out.push({
      section: r.section,
      feature_key,
      intent_key,
      lead_class,
      confidence,
      feature_raw: r.feature,
      todays_condition_raw: r.todays_condition,
      recommendation_raw: r.recommendation,
      matches: matches.map((m) => ({
        id: m.id,
        display_name: m.display_name,
        feature_key: m.feature_key,
        lead_class: m.lead_class,
      })),
    });
  }

  out.sort((a, b) => {
    const sA = a.section === "priority" ? 0 : 1;
    const sB = b.section === "priority" ? 0 : 1;
    if (sA !== sB) return sA - sB;

    const lA = a.lead_class === "equipment" ? 0 : 1;
    const lB = b.lead_class === "equipment" ? 0 : 1;
    if (lA !== lB) return lA - lB;

    return (b.confidence ?? 0) - (a.confidence ?? 0);
  });

  return out;
}
