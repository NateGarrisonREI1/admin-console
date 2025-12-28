import type { LeafTierKey } from "../leafSSConfigRuntime";

export type LeafPreviewInputs = {
  annualUtilitySpend: number; // $/yr
  systemShare: number;        // 0..1
  expectedLife: number;       // years

  ageYears: number;           // years
  wear: number;               // 0..5
  partialFailure?: boolean;

  tier: LeafTierKey;

  // optional – only used to compute payback preview if provided
  installCostMin?: number;
  installCostMax?: number;
};

export type Range = { min: number; max: number; center: number };

export type LeafPreviewResult = {
  annualSavings: Range;
  monthlySavings: Range;
  paybackYears: Range;
  engine: any; // keep flexible for now; we’ll tighten later
};
