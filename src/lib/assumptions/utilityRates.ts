import { supabaseServer } from "@/lib/supabase/server";

/**
 * Stub for now.
 * You already have a utility_rate_assumptions table — later we’ll compute savings from HES deltas.
 * For now, this file provides a future-proof place for that logic.
 */

export type UtilityRateAssumption = {
  id: string;
  region: string | null;
  zip_codes: string[] | null;
  electricity_kwh_rate: number | null;
  gas_therm_rate: number | null;
  effective_date: string | null;
  active: boolean | null;
};

function n(v: any): number | null {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

export async function getUtilityRateAssumptionForZip(_zip: string) {
  const sb = await supabaseServer();

  // Minimal: pick first active row (you can improve to zip match later)
  const { data, error } = await sb
    .from("utility_rate_assumptions")
    .select("*")
    .eq("active", true)
    .order("effective_date", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  const row: any = data?.[0];
  if (!row) return null;

  return {
    id: String(row.id),
    region: row.region ?? null,
    zip_codes: row.zip_codes ?? null,
    electricity_kwh_rate: n(row.electricity_kwh_rate),
    gas_therm_rate: n(row.gas_therm_rate),
    effective_date: row.effective_date ?? null,
    active: row.active ?? null,
  } as UtilityRateAssumption;
}
