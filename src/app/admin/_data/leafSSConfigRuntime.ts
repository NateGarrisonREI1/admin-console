import { loadLeafSSMasterConfig } from "./leafSSConfigStore";
import { MOCK_SYSTEMS, type CatalogSystem } from "./mockSystems";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */

export type LeafTierKey = "good" | "better" | "best";
export type CostClass = "unreal_low" | "low" | "in" | "likely_over" | "over";

type TierOverride = {
  leafPriceRange?: { min?: number; max?: number };
  baseMonthlySavings?: { min?: number; max?: number }; // legacy fallback
  recommendedName?: string;
  statusPillText?: string;
};

type LeafSSOverrides = {
  tiers?: Partial<Record<LeafTierKey, TierOverride>>;
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

function clone<T>(x: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(x)
    : JSON.parse(JSON.stringify(x));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getCatalogSystemById(
  id: string | null | undefined
): CatalogSystem | null {
  if (!id) return null;
  return (MOCK_SYSTEMS as any[]).find((s) => s?.id === id) || null;
}

/* ─────────────────────────────────────────────
   SNAPSHOT + CATALOG MERGE (UNCHANGED)
───────────────────────────────────────────── */

function mergeSnapshotWithCatalog(snapshot: any, catalog: CatalogSystem | null) {
  const overrides: LeafSSOverrides | undefined = (catalog as any)?.leafSSOverrides;
  if (!snapshot || !overrides) return snapshot;

  const out = clone(snapshot);
  out.tiers = out.tiers || {};

  const tierKeys: LeafTierKey[] = ["good", "better", "best"];

  for (const t of tierKeys) {
    const tierOverride = overrides.tiers?.[t];
    if (!tierOverride) continue;

    out.tiers[t] = out.tiers[t] || {};

    if (tierOverride.leafPriceRange) {
      out.tiers[t].leafPriceRange = {
        ...(out.tiers[t].leafPriceRange || {}),
        ...tierOverride.leafPriceRange,
      };
    }

    if (tierOverride.baseMonthlySavings) {
      out.tiers[t].baseMonthlySavings = {
        ...(out.tiers[t].baseMonthlySavings || {}),
        ...tierOverride.baseMonthlySavings,
      };
    }

    if (tierOverride.recommendedName || tierOverride.statusPillText) {
      out.recommendedSystemCard = out.recommendedSystemCard || {};
      out.recommendedSystemCard.recommendedNameByTier =
        out.recommendedSystemCard.recommendedNameByTier || {};
      out.recommendedSystemCard.statusPillTextByTier =
        out.recommendedSystemCard.statusPillTextByTier || {};

      if (tierOverride.recommendedName) {
        out.recommendedSystemCard.recommendedNameByTier[t] =
          tierOverride.recommendedName;
      }

      if (tierOverride.statusPillText) {
        out.recommendedSystemCard.statusPillTextByTier[t] =
          tierOverride.statusPillText;
      }
    }
  }

  return out;
}

function getMasterConfig() {
  return loadLeafSSMasterConfig();
}

/* ─────────────────────────────────────────────
   PUBLIC SNAPSHOT ACCESS
───────────────────────────────────────────── */

export function getSnapshotByIndex(i: number, catalogSystemId?: string | null) {
  const cfg = getMasterConfig();
  const snaps = cfg?.snapshots || [];
  const idx = Math.max(0, Math.min(snaps.length - 1, i));
  const base = snaps[idx];

  const catalog = getCatalogSystemById(catalogSystemId || null);
  return mergeSnapshotWithCatalog(base, catalog);
}

export function getTier(snapshot: any, tier: LeafTierKey) {
  return (
    snapshot?.tiers?.[tier] ||
    snapshot?.tiers?.better ||
    snapshot?.tiers?.good
  );
}

/* ─────────────────────────────────────────────
   ✅ NEW: REAL SAVINGS CALCULATION ENGINE
   Midline realistic, wear-weighted
───────────────────────────────────────────── */

export function calculateLeafSavings(args: {
  wear: number;                 // 1–5
  age: number;                  // years
  expectedLife: number;         // years
  partialFailure?: boolean;
  annualUtilitySpend: number;   // $
  systemShare: number;          // 0–1
  tier: LeafTierKey;
}) {
  const {
    wear,
    age,
    expectedLife,
    partialFailure,
    annualUtilitySpend,
    systemShare,
    tier,
  } = args;

  /* ── Step 1: Normalize current system waste ── */

  const wearFactor = clamp(wear / 5, 0, 1);
  const ageFactor = clamp(age / expectedLife, 0, 1);
  const failureFactor = partialFailure ? 1 : 0;

  let currentWaste =
    0.45 * wearFactor +
    0.35 * ageFactor +
    0.20 * failureFactor;

  currentWaste = clamp(currentWaste, 0.15, 0.95);

  /* ── Step 2: Tier recovery potential ── */

  const tierRecovery: Record<LeafTierKey, number> = {
    good: 0.35,
    better: 0.55,
    best: 0.75,
  };

  const recoverableWaste = currentWaste * tierRecovery[tier];

  /* ── Step 3: Dollar conversion ── */

  const annualSystemCost =
    annualUtilitySpend * clamp(systemShare, 0, 1);

  const annualSavingsCenter =
    annualSystemCost * recoverableWaste;

  /* ── Step 4: Midline realistic range ── */

  const minAnnualSavings = annualSavingsCenter * 0.85;
  const maxAnnualSavings = annualSavingsCenter * 1.15;

  return {
    currentWaste,
    recoverableWaste,
    annualSavingsCenter,
    minAnnualSavings,
    maxAnnualSavings,

    // helpful derived values
    minMonthlySavings: minAnnualSavings / 12,
    maxMonthlySavings: maxAnnualSavings / 12,
    centerMonthlySavings: annualSavingsCenter / 12,
  };
}

/* ─────────────────────────────────────────────
   EXISTING HELPERS (UNCHANGED)
───────────────────────────────────────────── */

export function classifyCostFromThresholds(args: {
  price: number;
  tierMin: number;
  tierMax: number;
  unrealLowOffsetFromMin: number;
  overpricedOffsetFromMax: number;
}): CostClass {
  const { price, tierMin, tierMax, unrealLowOffsetFromMin, overpricedOffsetFromMax } =
    args;

  const COST_UNREALISTIC_BELOW = tierMin + unrealLowOffsetFromMin;
  const COST_OVERPRICED_ABOVE = tierMax + overpricedOffsetFromMax;

  if (price < COST_UNREALISTIC_BELOW) return "unreal_low";
  if (price < tierMin) return "low";
  if (price > COST_OVERPRICED_ABOVE) return "over";
  if (price > tierMax) return "likely_over";
  return "in";
}

export function dynamicSavingsRangeFromRule(args: {
  baseMin: number;
  baseMax: number;
  price: number;
  tierMax: number;
  stepSizeDollars: number;
  bumpPerStepMonthlyDollars: number;
}) {
  const { baseMin, baseMax, price, tierMax, stepSizeDollars, bumpPerStepMonthlyDollars } =
    args;

  const over = Math.max(0, price - tierMax);
  const steps = stepSizeDollars > 0 ? Math.floor(over / stepSizeDollars) : 0;
  const bump = steps * bumpPerStepMonthlyDollars;

  return { min: baseMin + bump, max: baseMax + bump };
}
