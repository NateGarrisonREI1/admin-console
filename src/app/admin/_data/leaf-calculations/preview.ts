import { calculateLeafSavings } from "../leafSSConfigRuntime";
import type { LeafPreviewInputs, LeafPreviewResult, Range } from "./types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeRange(min: number, max: number): Range {
  const lo = Number.isFinite(min) ? min : 0;
  const hi = Number.isFinite(max) ? max : lo;
  const a = Math.min(lo, hi);
  const b = Math.max(lo, hi);
  return { min: a, max: b, center: (a + b) / 2 };
}

function computePaybackRange(
  installMin: number | undefined,
  installMax: number | undefined,
  annualMinSavings: number,
  annualMaxSavings: number
): Range {
  if (installMin == null && installMax == null) return safeRange(0, 0);

  const costLo = clamp(installMin ?? installMax ?? 0, 0, Number.MAX_SAFE_INTEGER);
  const costHi = clamp(installMax ?? installMin ?? 0, 0, Number.MAX_SAFE_INTEGER);

  const sLo = Math.max(annualMinSavings, 0.0001);
  const sHi = Math.max(annualMaxSavings, 0.0001);

  const payMin = costLo / sHi; // best case
  const payMax = costHi / sLo; // worst case
  return safeRange(payMin, payMax);
}

/**
 * ✅ Permanent home (for now) of preview math.
 * UI should call this, not do math inside components.
 */
export function calculateLeafPreview(input: LeafPreviewInputs): LeafPreviewResult {
  const annualUtilitySpend = Number.isFinite(input.annualUtilitySpend) ? input.annualUtilitySpend : 2400;
  const systemShare = clamp(Number.isFinite(input.systemShare) ? input.systemShare : 0.4, 0, 1);
  const expectedLife = clamp(Number.isFinite(input.expectedLife) ? input.expectedLife : 15, 1, 60);

  const ageYears = clamp(Number.isFinite(input.ageYears) ? input.ageYears : 12, 0, 80);
  const wear = clamp(Number.isFinite(input.wear) ? input.wear : 3, 0, 5);

  const engine = calculateLeafSavings({
    annualUtilitySpend,
    systemShare,
    tier: input.tier,
    expectedLife,
    age: ageYears,
    wear,
    partialFailure: input.partialFailure ?? false,
  });

  const annualSavings = safeRange(engine.minAnnualSavings, engine.maxAnnualSavings);
  const monthlySavings = safeRange(engine.minMonthlySavings, engine.maxMonthlySavings);

  const paybackYears = computePaybackRange(
    input.installCostMin,
    input.installCostMax,
    annualSavings.min,
    annualSavings.max
  );

  return { annualSavings, monthlySavings, paybackYears, engine };
}
