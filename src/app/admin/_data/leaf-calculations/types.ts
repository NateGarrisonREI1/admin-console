export type LeafTierKey = "good" | "better" | "best";

export type Range = { min: number; max: number; center: number };

export type LeafPreviewInputs = {
  tier: LeafTierKey;

  annualUtilitySpend: number; // $/yr
  systemShare: number; // 0–1
  expectedLife: number; // ✅ this must exist (years)
  partialFailure?: boolean;

  ageYears: number;
  wear: number;

  installCostMin?: number;
  installCostMax?: number;
};

export type LeafPreviewResult = {
  annualSavings: Range;
  monthlySavings: Range;
  paybackYears: Range;

  currentWaste: number;
  recoverableWaste: number;
};
