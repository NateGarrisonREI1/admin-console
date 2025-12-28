import { calculateLeafSavings } from "../leafSSConfigRuntime";
import type { LeafPreviewInputs, LeafPreviewResult, Range } from "./types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function midpoint(min?: number, max?: number): number | null {
  if (typeof min !== "number" || typeof max !== "number") return null;
  return (min + max) / 2;
}

function rangeFromMinMax(min: number, max: number, center?: number): Range {
  const c = typeof center === "number" ? center : (min + max) / 2;
  return { min, max, center: c };
}

export function calculateLeafPreview(input: LeafPreviewInputs): LeafPreviewResult {
  const annualUtilitySpend = clamp(Number(input.annualUtilitySpend) || 0, 0, 1e12);
  const systemShare = clamp(Number(input.systemShare) || 0, 0, 1);

  const age = clamp(Number(input.ageYears) || 0, 0, 200);
  const wear = clamp(Number(input.wear) || 1, 1, 5);
  const expectedLife = clamp(Number(input.expectedLifeYears) || 1, 1, 200);

  const calc = calculateLeafSavings({
    tier: input.tier,
    annualUtilitySpend,
    systemShare,
    age,
    wear,
    expectedLife,
    partialFailure: !!input.partialFailure,
  });

  const annual = rangeFromMinMax(calc.minAnnualSavings, calc.maxAnnualSavings, calc.annualSavingsCenter);
  const monthly = rangeFromMinMax(calc.minMonthlySavings, calc.maxMonthlySavings, calc.centerMonthlySavings);

  // Payback needs install costs
  const costMin = typeof input.installCostMin === "number" ? input.installCostMin : undefined;
  const costMax = typeof input.installCostMax === "number" ? input.installCostMax : undefined;
  const costCenter = midpoint(costMin, costMax);

  let paybackYears: Range | null = null;
  // only compute if we have costs and savings isn't ~0
  if (typeof costMin === "number" && typeof costMax === "number" && annual.min > 1) {
    // Best case payback uses MIN cost + MAX savings
    const pbMin = costMin / annual.max;
    // Worst case uses MAX cost + MIN savings
    const pbMax = costMax / annual.min;
    const pbCenter = (costCenter ?? ((costMin + costMax) / 2)) / annual.center;

    paybackYears = rangeFromMinMax(pbMin, pbMax, pbCenter);
  }

  return {
    currentWaste: calc.currentWaste,
    recoverableWaste: calc.recoverableWaste,
    annualSavings: annual,
    monthlySavings: monthly,
    paybackYears,
  };
}
