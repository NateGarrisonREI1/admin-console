import type { IncentivesForUpgrade, ResolvedIncentive } from "../types";

function s(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function n(v: any): number | null {
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}

const DISCLAIMER =
  "Estimates only. Eligibility and amounts depend on program rules and installed equipment. Verify before purchase/installation.";

export async function resolveIncentivesV0(args: {
  admin: any;
  zip: string;
  upgrades: { upgrade_catalog_id: string; upgrade_type_key: string | null }[];
}): Promise<IncentivesForUpgrade[]> {
  const zip = s(args.zip).trim();
  const upgrades = (args.upgrades || []).map((u) => ({
    upgrade_catalog_id: String(u.upgrade_catalog_id),
    upgrade_type_key: u.upgrade_type_key ? String(u.upgrade_type_key) : null,
  }));

  if (!zip) {
    return upgrades.map((u) => ({
      upgrade_catalog_id: u.upgrade_catalog_id,
      incentives: [],
      total_min: null,
      total_max: null,
    }));
  }

  const { data, error } = await args.admin
    .from("v_incentives_by_zip")
    .select(
      "zip, incentive_program_id, source, program_name, sponsor_level, upgrade_type_key, amount_min, amount_max, amount_unit, url, confidence, reasons, notes, active"
    )
    .eq("zip", zip)
    .eq("active", true);

  if (error) {
    console.warn("[incentivesV0] query failed", error.message);
    return upgrades.map((u) => ({
      upgrade_catalog_id: u.upgrade_catalog_id,
      incentives: [],
      total_min: null,
      total_max: null,
    }));
  }

  const rows: any[] = Array.isArray(data) ? data : [];
  const byType = new Map<string, any[]>();
  for (const r of rows) {
    const k = s(r.upgrade_type_key).trim() || "other";
    if (!byType.has(k)) byType.set(k, []);
    byType.get(k)!.push(r);
  }

  return upgrades.map((u) => {
    const hits = byType.get(u.upgrade_type_key || "other") || [];

    const incentives: ResolvedIncentive[] = hits.map((r) => ({
      id: String(r.incentive_program_id),
      program_name: s(r.program_name),
      source: s(r.source),
      sponsor_level: s(r.sponsor_level),
      upgrade_type_key: s(r.upgrade_type_key),

      amount_min: n(r.amount_min),
      amount_max: n(r.amount_max),
      amount_unit: (s(r.amount_unit) as any) || "usd",

      url: r.url ? s(r.url) : null,

      confidence: (s(r.confidence) as any) || "low",
      status: "APPLIES_POSSIBLE",

      required_inputs: [],
      reasons: Array.isArray(r.reasons) ? r.reasons.map(String) : ["ZIP_BASED_MATCH"],
      notes: r.notes ? s(r.notes) : null,

      disclaimer_short: DISCLAIMER,
    }));

    const usd = incentives.filter((x) => x.amount_unit === "usd");
    const mins = usd.map((x) => x.amount_min).filter((x): x is number => typeof x === "number");
    const maxs = usd.map((x) => x.amount_max).filter((x): x is number => typeof x === "number");

    return {
      upgrade_catalog_id: u.upgrade_catalog_id,
      incentives,
      total_min: mins.length ? mins.reduce((a, b) => a + b, 0) : null,
      total_max: maxs.length ? maxs.reduce((a, b) => a + b, 0) : null,
    };
  });
}
