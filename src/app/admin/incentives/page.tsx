// src/app/admin/incentives/page.tsx
import { supabaseAdmin } from "@/lib/supabase/server";
import IncentivesConsole from "./_components/IncentivesConsole";
import { fetchEnergyStarOffersByZip } from "@/lib/incentives/energystarRebateFinder";

export const dynamic = "force-dynamic";

type Section = {
  key: string;
  label: string;
  table: string;
  rows: any[];
  editable: boolean;
};

type UpgradeOption = {
  id: string;
  display_name: string | null;
  feature_key: string | null;
};

async function load(table: string) {
  const { data, error } = await supabaseAdmin.from(table).select("*");
  if (error) return [];
  return data ?? [];
}

async function loadUpgradeOptions(): Promise<UpgradeOption[]> {
  const { data, error } = await supabaseAdmin
    .from("upgrade_catalog")
    .select("id, display_name, feature_key")
    .order("display_name", { ascending: true });

  if (error) return [];
  return (data ?? []) as UpgradeOption[];
}

/** Server Action: ZIP -> fetch offers -> upsert cache table */
async function fetchAndCacheEnergyStarByZipAction(prevStateOrFormData: any, maybeFormData?: FormData) {
  "use server";

  // Support BOTH:
  // 1) <form action={actionFn}> calls (formData)
  // 2) useActionState(actionFn) calls (prevState, formData)
  const formData: FormData =
    maybeFormData instanceof FormData
      ? maybeFormData
      : prevStateOrFormData instanceof FormData
        ? prevStateOrFormData
        : (null as any);

  if (!formData || typeof (formData as any).get !== "function") {
    return { ok: false, inserted: 0, diagnostics: { error: "No FormData received by server action." } };
  }

  const zip = String(formData.get("zip") ?? "").trim();

  let offers: any[] = [];
  let diagnostics: any = null;

  try {
    const r = await fetchEnergyStarOffersByZip(zip);
    offers = r.offers;
    diagnostics = r.diagnostics;
  } catch (e: any) {
    const msg = String(e?.message ?? e ?? "Unknown error");

    await supabaseAdmin.from("admin_incentives_cache").insert({
      source: "energystar_rebate_finder",
      zip: zip.replace(/[^0-9]/g, "").slice(0, 10),
      external_key: `err_${Date.now()}`,
      raw_payload: { error: msg },
      fetched_at: new Date().toISOString(),
    } as any);

    return { ok: false, inserted: 0, diagnostics: { error: msg } };
  }

  const rows = offers.map((o) => ({
    source: "energystar_rebate_finder",
    zip: o.zip,
    external_key: o.external_key,
    product_category: o.product_category ?? null,
    program_name: o.program_name ?? null,
    utility: o.utility ?? null,
    state: o.state ?? null,
    offer_url: o.offer_url ?? null,
    amount_text: o.amount_text ?? null,
    details_text: o.details_text ?? null,
    raw_payload: o.raw_payload ?? null,
    fetched_at: new Date().toISOString(),
  }));

  if (rows.length === 0) {
    await supabaseAdmin.from("admin_incentives_cache").insert({
      source: "energystar_rebate_finder",
      zip: zip.replace(/[^0-9]/g, "").slice(0, 10),
      external_key: `diag_${Date.now()}`,
      raw_payload: diagnostics,
      fetched_at: new Date().toISOString(),
    } as any);

    return { ok: true, inserted: 0, diagnostics };
  }

  const { error } = await supabaseAdmin
    .from("admin_incentives_cache")
    .upsert(rows as any, { onConflict: "source,zip,external_key" });

  if (error) return { ok: false, inserted: 0, diagnostics: { error: error.message } };

  return { ok: true, inserted: rows.length, diagnostics };
}



export default async function IncentivesPage() {
  const [
    programs,
    rules,
    incentives,
    zipPrograms,
    utilityRates,
    params,
    audit,
    byZip,
    energyStarCache, // 👈 NEW
    upgradeOptions,
  ] = await Promise.all([
    load("incentive_programs"),
    load("incentive_rules"),
    load("incentives"),
    load("incentive_zip_programs"),
    load("utility_rate_assumptions"),
    load("admin_parameters"),
    load("incentive_audit_log"),
    load("v_incentives_by_zip"),
    load("admin_incentives_cache"), // 👈 NEW
    loadUpgradeOptions(),
  ]);

  const sections: Section[] = [
    { key: "programs", label: "Programs", table: "incentive_programs", rows: programs, editable: true },
    { key: "rules", label: "Rules", table: "incentive_rules", rows: rules, editable: true },
    { key: "incentives", label: "Incentives", table: "incentives", rows: incentives, editable: true },
    { key: "zip", label: "ZIP Programs", table: "incentive_zip_programs", rows: zipPrograms, editable: true },
    { key: "utility", label: "Utility Rates", table: "utility_rate_assumptions", rows: utilityRates, editable: true },
    { key: "params", label: "Parameters", table: "admin_parameters", rows: params, editable: true },

    // READ-ONLY VIEWS
    { key: "byzip", label: "Resolved by ZIP", table: "v_incentives_by_zip", rows: byZip, editable: false },
    { key: "audit", label: "Audit Log", table: "incentive_audit_log", rows: audit, editable: false },

    // 👇 NEW PROOF TAB
    {
      key: "energystar_cache",
      label: "ENERGY STAR Cache",
      table: "admin_incentives_cache",
      rows: energyStarCache,
      editable: false,
    },
  ];

  return (
    <IncentivesConsole
      sections={sections}
      upgradeOptions={upgradeOptions}
      fetchAndCacheEnergyStarByZipAction={fetchAndCacheEnergyStarByZipAction}
    />
  );
}
