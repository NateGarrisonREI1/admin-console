import { calculateLeafSavings } from "./leafSSConfigRuntime";
import { LeafTierKey } from "./localCatalog";

/* ============================
   Types
============================ */

export type SnapshotCalcInputs = {
  annualUtilitySpend: number;     // $/yr
  systemShare: number;            // 0–1
  tier: LeafTierKey;
  expectedUsefulLifeYears: number;
  ageYears: number;
  wear: number;                   // 1–5
  partialFailure?: boolean;
};

export type SnapshotCalcResult = {
  annualSavings: {
    min: number;
    max: number;
    center: number;
  };
  monthlySavings: {
    min: number;
    max: number;
    center: number;
  };
  paybackYears: {
    min: number;
    max: number;
    center: number;
  };
  meta: {
    tier: LeafTierKey;
    recoverableWastePct: number;
    currentWastePct: number;
  };
};

/* ============================
   Helpers
============================ */

function mid(min: number, max: number) {
  return (min + max) / 2;
}

/* ============================
   Main calc entry point
============================ */

export function runSnapshotCalculation(
  inputs: SnapshotCalcInputs
): SnapshotCalcResult {
  const calc = calculateLeafSavings({
    annualUtilitySpend: inputs.annualUtilitySpend,
    systemShare: inputs.systemShare,
    tier: inputs.tier,
    expectedLife: inputs.expectedUsefulLifeYears,
    age: inputs.ageYears,
    wear: inputs.wear,
    partialFailure: inputs.partialFailure,
  });

  return {
    annualSavings: {
      min: calc.minAnnualSavings,
      max: calc.maxAnnualSavings,
      center: calc.annualSavingsCenter,
    },
    monthlySavings: {
      min: calc.minMonthlySavings,
      max: calc.maxMonthlySavings,
      center: calc.centerMonthlySavings,
    },
    paybackYears: {
      min: calc.minPaybackYears,
      max: calc.maxPaybackYears,
      center: mid(calc.minPaybackYears, calc.maxPaybackYears),
    },
    meta: {
      tier: inputs.tier,
      recoverableWastePct: calc.recoverableWaste,
      currentWastePct: calc.currentWaste,
    },
  };
}

