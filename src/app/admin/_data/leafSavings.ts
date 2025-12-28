import LEAF_SS_CONFIG from "./leafSSConfig";

export type LeafTierKey = "conservative" | "expected" | "optimistic";

/**
 * Placeholder savings calculation.
 * This will evolve once baseline system cost exists.
 */
export function calculateLeafSavings({
  baselineAnnualCost,
  tier = "expected"
}: {
  baselineAnnualCost: number;
  tier?: LeafTierKey;
}) {
  const multipliers: Record<LeafTierKey, number> = {
    conservative: 0.1,
    expected: 0.2,
    optimistic: 0.3
  };

  const savings = baselineAnnualCost * multipliers[tier];

  return {
    annualSavings: savings,
    monthlySavings: savings / 12,
    tier
  };
}
