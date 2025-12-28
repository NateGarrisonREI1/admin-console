import type { LeafCalculationInput, LeafCalculationResult } from "./types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * PREVIEW CALC ENGINE
 * - safe + deterministic
 * - no UI imports
 * - no catalog lookups
 * - future: swap to runtime engine without changing UI call-sites
 */
export function calculateLeafPreview(input: LeafCalculationInput): LeafCalculationResult {
  const ex = input.existing;
  const eff = clamp(Number(input.catalogTier.efficiencyScore ?? 50), 0, 100) / 100;

  // ---- waste model (placeholder) ----
  const ageFactor = clamp(ex.ageYears / Math.max(ex.expectedLifeYears, 1), 0, 1);
  const wearFactor = clamp(ex.wear / 5, 0, 1);

  let currentWaste = 0.3 + ageFactor * 0.4 + wearFactor * 0.3;
  if (ex.partialFailure) currentWaste += 0.15;
  currentWaste = clamp(currentWaste, 0.05, 0.9);

  const recoverableWaste = clamp(currentWaste * eff, 0, currentWaste);

  // ---- savings model (placeholder) ----
  const annualBase = ex.annualUtilitySpend * ex.systemShare * recoverableWaste;

  const minAnnual = annualBase * 0.7;
  const centerAnnual = annualBase;
  const maxAnnual = annualBase * 1.3;

  // ---- payback placeholder (still output ranges) ----
  // We can replace this later with: (netCostAfterIncentives / annualSavings)
  // For now: a “dummy” range that stays stable for UI.
  const centerPay = centerAnnual > 0 ? clamp(10 - eff * 4, 1, 25) : 25;
  const minPay = clamp(centerPay * 0.85, 1, 30);
  const maxPay = clamp(centerPay * 1.15, 1, 30);

  return {
    currentWaste,
    recoverableWaste,
    annualSavings: { min: minAnnual, center: centerAnnual, max: maxAnnual },
    monthlySavings: { min: minAnnual / 12, center: centerAnnual / 12, max: maxAnnual / 12 },
    paybackYears: { min: minPay, center: centerPay, max: maxPay },
  };
}
