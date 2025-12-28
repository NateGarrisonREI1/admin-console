import { calculateLeafSavings } from "../leafSSConfigRuntime";
import type { LeafPreviewInputs, LeafPreviewResult, Range } from "./types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safe(n: any, fallback: number) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function mid(a: number, b: number) {
  return (a + b) / 2;
}

function mkRange(minV: number, maxV: number): Range {
  const lo = Math.min(minV, maxV);
  const hi = Math.max(minV, maxV);
  return { min: lo, max: hi, center: mid(lo, hi) };
}

function paybackRange(costMin?: number, costMax?: number, savMin?: number, savMax?: number): Range {
  const cMin = safe(costMin, 0);
  const cMax = safe(costMax ?? costMin, cMin);

  const sMin = safe(savMin, 0);
  const sMax = safe(savMax ?? savMin, sMin);

  const eps = 1e-9;

  const best = cMin / Math.max(sMax, eps);   // low cost / high savings
  const worst = cMax / Math.max(sMin, eps);  // high cost / low savings

  return mkRange(clamp(best, 0, 200), clamp(worst, 0, 200));
}

export function calculateLeafPreview(input: LeafPreviewInputs): LeafPreviewResult {
  const annualUtilitySpend = safe(input.annualUtilitySpend, 2400);
  const systemShare = clamp(safe(input.systemShare, 0.4), 0, 1);

  const ageYears = clamp(safe(input.ageYears, 12), 0, 80);
  const wear = clamp(safe(input.wear, 3), 0, 5);

  // ✅ FIX: was input.expectedLifeYears — your type uses expectedLife
  const expectedLife = clamp(safe((input as any).expectedLife, 15), 1, 60);

  const calc = calculateLeafSavings({
    annualUtilitySpend,
    systemShare,
    tier: input.tier,
    expectedLife,
    age: ageYears,
    wear,
    partialFailure: !!input.partialFailure,
  });

  const annualSavings = mkRange(calc.minAnnualSavings, calc.maxAnnualSavings);
  const monthlySavings = mkRange(calc.minMonthlySavings, calc.maxMonthlySavings);

  const paybackYears = paybackRange(
    input.installCostMin,
    input.installCostMax,
    calc.minAnnualSavings,
    calc.maxAnnualSavings
  );

  return {
    annualSavings,
    monthlySavings,
    paybackYears,
    currentWaste: calc.currentWaste,
    recoverableWaste: calc.recoverableWaste,
  };
}
