import { loadLeafSSMasterConfig } from "./leafSSConfigStore";

export type LeafTierKey = "good" | "better" | "best";
export type CostClass = "unreal_low" | "low" | "in" | "likely_over" | "over";

export function getSnapshotByIndex(i: number) {
  const snaps = LEAF_SS_CONFIG.snapshots || [];
  const idx = Math.max(0, Math.min(snaps.length - 1, i));
  return snaps[idx];
}

export function getTier(snapshot: any, tier: LeafTierKey) {
  return snapshot?.tiers?.[tier] || snapshot?.tiers?.better || snapshot?.tiers?.good;
}

export function classifyCostFromThresholds(args: {
  price: number;
  tierMin: number;
  tierMax: number;
  unrealLowOffsetFromMin: number;
  overpricedOffsetFromMax: number;
}): CostClass {
  const { price, tierMin, tierMax, unrealLowOffsetFromMin, overpricedOffsetFromMax } = args;

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
  const { baseMin, baseMax, price, tierMax, stepSizeDollars, bumpPerStepMonthlyDollars } = args;
  const over = Math.max(0, price - tierMax);
  const steps = stepSizeDollars > 0 ? Math.floor(over / stepSizeDollars) : 0;
  const bump = steps * bumpPerStepMonthlyDollars;
  return { min: baseMin + bump, max: baseMax + bump };
}
function getMasterConfig() {
  return loadLeafSSMasterConfig();
}
