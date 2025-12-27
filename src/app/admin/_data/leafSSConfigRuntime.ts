import { loadLeafSSMasterConfig } from "./leafSSConfigStore";
import { MOCK_SYSTEMS, type CatalogSystem } from "./mockSystems";

export type LeafTierKey = "good" | "better" | "best";

export type CostClass = "unreal_low" | "low" | "in" | "likely_over" | "over";

type TierOverride = {
  leafPriceRange?: { min?: number; max?: number };
  baseMonthlySavings?: { min?: number; max?: number };
  recommendedName?: string;
  statusPillText?: string;
};

type LeafSSOverrides = {
  tiers?: Partial<Record<LeafTierKey, TierOverride>>;
};

function clone<T>(x: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(x)
    : JSON.parse(JSON.stringify(x));
}

function getCatalogSystemById(
  id: string | null | undefined
): CatalogSystem | null {
  if (!id) return null;
  return (MOCK_SYSTEMS as any[]).find((s) => s?.id === id) || null;
}

function mergeSnapshotWithCatalog(snapshot: any, catalog: CatalogSystem | null) {
  const overrides: LeafSSOverrides | undefined = (catalog as any)?.leafSSOverrides;
  if (!snapshot || !overrides) return snapshot;

  const out = clone(snapshot);

  // ensure tiers exist
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

    // optional: recommended card labels per tier
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

/**
 * pass catalogSystemId to apply catalog overrides for this snapshot only
 */
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
