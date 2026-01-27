// src/lib/snapshot/buildSnapshotUpgradeCards.ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveIncentives } from "@/lib/incentives";
import { mapUpgradeToTypeKey } from "@/lib/incentives/v0_dbCached/mapUpgradeToTypeKey";

function s(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

/**
 * Strict numeric parsing:
 * - null/undefined/"" => null (NOT 0)
 * - numeric strings => number
 * - non-numeric => null
 */
function n(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const num = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(num) ? num : null;
}

function clamp0(x: number) {
  return x < 0 ? 0 : x;
}

function normalizeRange(min: number | null, max: number | null) {
  if (min == null && max == null) return { min: null, max: null };
  if (min != null && max == null) return { min, max: min };
  if (min == null && max != null) return { min: max, max };
  return min! <= max! ? { min, max } : { min: max!, max: min! };
}

function calcPaybackRange(
  netMin: number | null,
  netMax: number | null,
  savMin: number | null,
  savMax: number | null
) {
  const net = normalizeRange(netMin, netMax);
  const sav = normalizeRange(savMin, savMax);

  if (net.min == null || net.max == null || sav.min == null || sav.max == null) {
    return { paybackMin: null, paybackMax: null };
  }
  if (sav.min <= 0 || sav.max <= 0) return { paybackMin: null, paybackMax: null };

  const paybackMin = net.min / sav.max; // best case
  const paybackMax = net.max / sav.min; // worst case

  if (!Number.isFinite(paybackMin) || !Number.isFinite(paybackMax)) {
    return { paybackMin: null, paybackMax: null };
  }
  const pb = normalizeRange(paybackMin, paybackMax);
  return { paybackMin: pb.min, paybackMax: pb.max };
}

export type BuildSnapshotUpgradeCardsArgs = {
  snapshotId: string;
  zip: string;
  regions: any | null;
  incomeQualified: boolean | null;
};

// IMPORTANT: use undefined (not null) for optional strings to satisfy TS
export type UpgradeCard = {
  title?: string;
  display_name?: string;
  feature_key?: string;
  upgrade_catalog_id?: string;

  // economics
  install_cost_min?: number | null;
  install_cost_max?: number | null;
  annual_savings_min?: number | null;
  annual_savings_max?: number | null;

  // incentives
  incentives?: any[];
  incentive_total_min?: number | null;
  incentive_total_max?: number | null;

  // derived
  net_cost_min?: number | null;
  net_cost_max?: number | null;
  payback_years_min?: number | null;
  payback_years_max?: number | null;

  // readiness
  roi_ready?: boolean;

  // content
  bullets?: string[];
  notes?: string | null;
  tags?: string[];
};

function orderKey(r: any) {
  const so = n(r?.sort_order);
  const rk = n(r?.rank);
  const pr = n(r?.priority);
  return so ?? rk ?? pr ?? 9999;
}

async function loadSnapshotRecs(admin: any, snapshotId: string) {
  const fullSelect =
    "upgrade_catalog_id, bullets, notes, rationale, sort_order, rank, priority";

  const minimalSelect = "upgrade_catalog_id";

  const tryFull = await admin
    .from("snapshot_upgrade_recommendations")
    .select(fullSelect)
    .eq("snapshot_id", snapshotId);

  if (!tryFull.error) {
    return Array.isArray(tryFull.data) ? tryFull.data : [];
  }

  const tryMin = await admin
    .from("snapshot_upgrade_recommendations")
    .select(minimalSelect)
    .eq("snapshot_id", snapshotId);

  if (tryMin.error) {
    throw new Error(
      `buildSnapshotUpgradeCards: recs query failed: ${tryMin.error.message}`
    );
  }
  return Array.isArray(tryMin.data) ? tryMin.data : [];
}

type AssumptionRow = {
  install_cost_min: any;
  install_cost_max: any;
  annual_savings_min: any;
  annual_savings_max: any;
  expected_life_years?: any;
  updated_at?: any;
};

function pickMostCompleteAssumption(rows: any): AssumptionRow | null {
  const arr: AssumptionRow[] = Array.isArray(rows) ? rows : rows ? [rows] : [];
  if (arr.length === 0) return null;

  const meta = (a: AssumptionRow) => {
    const icMin = n(a.install_cost_min);
    const icMax = n(a.install_cost_max);
    const asMin = n(a.annual_savings_min);
    const asMax = n(a.annual_savings_max);

    const filled =
      (icMin != null ? 1 : 0) +
      (icMax != null ? 1 : 0) +
      (asMin != null ? 1 : 0) +
      (asMax != null ? 1 : 0);

    const hasInstallBoth = icMin != null && icMax != null ? 1 : 0;
    const hasSavingsBoth = asMin != null && asMax != null ? 1 : 0;

    const t = s(a.updated_at).trim();
    const ts = t ? Date.parse(t) : 0;

    return { filled, hasInstallBoth, hasSavingsBoth, ts: Number.isFinite(ts) ? ts : 0 };
  };

  let best = arr[0];
  let bestM = meta(best);

  for (let i = 1; i < arr.length; i++) {
    const cur = arr[i];
    const m = meta(cur);

    // Order:
    // 1) filled desc
    // 2) hasInstallBoth desc
    // 3) hasSavingsBoth desc
    // 4) updated_at desc
    if (m.filled !== bestM.filled) {
      if (m.filled > bestM.filled) {
        best = cur;
        bestM = m;
      }
      continue;
    }
    if (m.hasInstallBoth !== bestM.hasInstallBoth) {
      if (m.hasInstallBoth > bestM.hasInstallBoth) {
        best = cur;
        bestM = m;
      }
      continue;
    }
    if (m.hasSavingsBoth !== bestM.hasSavingsBoth) {
      if (m.hasSavingsBoth > bestM.hasSavingsBoth) {
        best = cur;
        bestM = m;
      }
      continue;
    }
    if (m.ts !== bestM.ts) {
      if (m.ts > bestM.ts) {
        best = cur;
        bestM = m;
      }
      continue;
    }
  }

  return best ?? null;
}

export async function buildSnapshotUpgradeCards(
  args: BuildSnapshotUpgradeCardsArgs
): Promise<UpgradeCard[]> {
  const { snapshotId, zip } = args;

  const admin = supabaseAdmin();

  // 1) Snapshot recommendations define which catalog items become cards
  const recRows: any[] = await loadSnapshotRecs(admin, snapshotId);

  const catalogIds = recRows
    .map((r) => r?.upgrade_catalog_id)
    .filter(Boolean)
    .map((x) => String(x));

  if (catalogIds.length === 0) return [];

  // 2) Catalog display info
  const { data: cats, error: catErr } = await admin
    .from("upgrade_catalog")
    .select("id, display_name, feature_key")
    .in("id", catalogIds);

  if (catErr) {
    throw new Error(
      `buildSnapshotUpgradeCards: catalog query failed: ${catErr.message}`
    );
  }

  const catById = new Map<string, any>();
  for (const c of cats ?? []) catById.set(String(c.id), c);

  // 3) Assumptions via mapping: catalog -> upgrade_type -> assumptions
  let assumptionsByCatalogId = new Map<string, AssumptionRow | null>();

  const { data: maps, error: mapErr } = await admin
    .from("upgrade_catalog_upgrade_types")
    .select(
      `
      upgrade_catalog_id,
      upgrade_type_id,
      upgrade_types:upgrade_type_id (
        id,
        name,
        upgrade_type_assumptions (
          install_cost_min,
          install_cost_max,
          annual_savings_min,
          annual_savings_max,
          expected_life_years,
          updated_at
        )
      )
    `
    )
    .in("upgrade_catalog_id", catalogIds);

  if (mapErr) {
    console.warn(
      `[buildSnapshotUpgradeCards] mapping query skipped/failed: ${mapErr.message}`
    );
  } else {
    assumptionsByCatalogId = new Map<string, AssumptionRow | null>();
    for (const m0 of maps ?? []) {
      const m: any = m0 as any;
      const cid = String(m.upgrade_catalog_id);

      const ut = Array.isArray(m.upgrade_types) ? m.upgrade_types[0] : m.upgrade_types;
      const best = pickMostCompleteAssumption(ut?.upgrade_type_assumptions);

      assumptionsByCatalogId.set(cid, best ?? null);
    }
  }

  // 4) Stable card order (if those columns exist)
  const recSorted = [...recRows].sort((a, b) => orderKey(a) - orderKey(b));

  // 5) Build cards (V1: net/payback ignore incentives, incentives still displayed)
  const cards: UpgradeCard[] = recSorted.map((r: any) => {
    const catalogId = String(r.upgrade_catalog_id);
    const c = catById.get(catalogId) || {};
    const a = assumptionsByCatalogId.get(catalogId) || null;

    const install = normalizeRange(n(a?.install_cost_min), n(a?.install_cost_max));
    const savings = normalizeRange(n(a?.annual_savings_min), n(a?.annual_savings_max));

    // V1 economics: incentives assumed 0 for net/payback
    const netMin = install.min != null ? clamp0(install.min) : null;
    const netMax = install.max != null ? clamp0(install.max) : null;

    const { paybackMin, paybackMax } = calcPaybackRange(
      netMin,
      netMax,
      savings.min,
      savings.max
    );

    const roiReady =
      paybackMin != null &&
      paybackMax != null &&
      savings.min != null &&
      savings.max != null &&
      savings.min > 0 &&
      savings.max > 0 &&
      netMin != null &&
      netMax != null;

    const bullets = Array.isArray(r?.bullets) ? r.bullets.filter(Boolean) : [];
    const notes = s(r?.notes || r?.rationale || "").trim() || null;

    const displayName = s(c?.display_name).trim();
    const featureKey = s(c?.feature_key).trim();

    return {
      upgrade_catalog_id: catalogId,
      feature_key: featureKey || undefined,
      title: displayName || "Upgrade",
      display_name: displayName || undefined,

      bullets,
      notes,

      install_cost_min: install.min,
      install_cost_max: install.max,
      annual_savings_min: savings.min,
      annual_savings_max: savings.max,

      incentives: [],
      incentive_total_min: null,
      incentive_total_max: null,

      net_cost_min: netMin,
      net_cost_max: netMax,
      payback_years_min: paybackMin,
      payback_years_max: paybackMax,

      roi_ready: roiReady,
    };
  });

  // 6) Attach V0 DB-cached incentives (non-blocking)
  // NOTE: We populate incentives + totals, but DO NOT recompute net/payback in V1.
  try {
    const zipClean = s(zip).trim();
    if (zipClean) {
      const upgradesForResolver = cards.map((c) => ({
        upgrade_catalog_id: String(c.upgrade_catalog_id || ""),
        upgrade_type_key: mapUpgradeToTypeKey({
          feature_key: c.feature_key,
          title: c.title,
          display_name: c.display_name,
        }),
      }));

      const resolved = await resolveIncentives({
        admin,
        zip: zipClean,
        upgrades: upgradesForResolver,
      });

      const byCatalogId = new Map<string, any>();
      for (const row of resolved || []) {
        byCatalogId.set(String(row.upgrade_catalog_id), row);
      }

      for (const c of cards) {
        const cid = String(c.upgrade_catalog_id || "");
        const hit = byCatalogId.get(cid);
        if (!hit) continue;

        c.incentives = hit.incentives || [];
        c.incentive_total_min =
          typeof hit.total_min === "number" ? hit.total_min : n(hit.total_min);
        c.incentive_total_max =
          typeof hit.total_max === "number" ? hit.total_max : n(hit.total_max);
      }
    }
  } catch (e: any) {
    console.warn("[buildSnapshotUpgradeCards] incentives attach failed", e?.message || e);
  }

  // 7) ROI readiness sorting (ready first, then lowest payback)
  cards.sort((a, b) => {
    const ar = a.roi_ready ? 1 : 0;
    const br = b.roi_ready ? 1 : 0;
    if (ar !== br) return br - ar;

    const ap =
      typeof a.payback_years_min === "number"
        ? a.payback_years_min
        : typeof a.payback_years_max === "number"
        ? a.payback_years_max
        : Number.POSITIVE_INFINITY;

    const bp =
      typeof b.payback_years_min === "number"
        ? b.payback_years_min
        : typeof b.payback_years_max === "number"
        ? b.payback_years_max
        : Number.POSITIVE_INFINITY;

    if (ap !== bp) return ap - bp;
    return 0;
  });

  return cards;
}
