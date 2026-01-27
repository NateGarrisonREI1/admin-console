import { supabaseServer } from "@/lib/supabase/server";

export type UpgradeTypeAssumptions = {
  upgrade_type_id: string;
  install_cost_min: number | null;
  install_cost_max: number | null;
  annual_savings_min: number | null;
  annual_savings_max: number | null;
  expected_life_years: number | null;
};

function n(v: any): number | null {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

export async function getUpgradeTypeAssumptions(upgradeTypeId: string) {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("upgrade_type_assumptions")
    .select("*")
    .eq("upgrade_type_id", upgradeTypeId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    // Future-proof: no row should not break snapshot
    return {
      upgrade_type_id: upgradeTypeId,
      install_cost_min: null,
      install_cost_max: null,
      annual_savings_min: null,
      annual_savings_max: null,
      expected_life_years: null,
    } as UpgradeTypeAssumptions;
  }

  return {
    upgrade_type_id: String(data.upgrade_type_id),
    install_cost_min: n(data.install_cost_min),
    install_cost_max: n(data.install_cost_max),
    annual_savings_min: n(data.annual_savings_min),
    annual_savings_max: n(data.annual_savings_max),
    expected_life_years: data.expected_life_years == null ? null : Number(data.expected_life_years),
  } as UpgradeTypeAssumptions;
}
