/**
 * Local Snapshot Helpers
 *
 * Maps calculation outputs into snapshot-safe structures.
 * This file intentionally avoids assumptions and legacy fields.
 */

import { calculateLeafPreview } from "./leafCalculations";

/* ======================================================
 * TYPES
 * ====================================================== */

export type LocalSnapshotInput = {
  annualUtilitySpend: number;
  systemShare: number;
  ageYears: number;
  expectedLife: number;
};

export type LocalSnapshotResult = {
  baselineAnnualCost: number;
  baselineMonthlyCost: number;

  annualSavings: number;
  monthlySavings: number;

  tier: "conservative" | "expected" | "optimistic";
};

/* ======================================================
 * SNAPSHOT CREATION
 * ====================================================== */

export function createLocalSnapshot(
  input: LocalSnapshotInput
): LocalSnapshotResult {
  const preview = calculateLeafPreview({
    annualUtilitySpend: input.annualUtilitySpend,
    systemShare: input.systemShare,
    ageYears: input.ageYears,
    expectedLife: input.expectedLife,
    tier: "expected"
  });

  return {
    baselineAnnualCost: preview.baselineAnnualCost,
    baselineMonthlyCost: preview.baselineMonthlyCost,

    annualSavings: preview.annualSavings,
    monthlySavings: preview.monthlySavings,

    tier: preview.tier
  };
}
