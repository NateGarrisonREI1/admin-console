import { clampNonNeg } from "./money";

export function netCostRange(args: {
  installMin: number;
  installMax: number;
  incentiveMin: number;
  incentiveMax: number;
}) {
  // best case: low install, high incentive
  const netMin = clampNonNeg(args.installMin - args.incentiveMax);
  // worst case: high install, low incentive
  const netMax = clampNonNeg(args.installMax - args.incentiveMin);
  return { netMin, netMax };
}

export function paybackYearsRange(args: {
  netMin: number;
  netMax: number;
  annualSavingsMin: number;
  annualSavingsMax: number;
}) {
  const sMin = args.annualSavingsMin;
  const sMax = args.annualSavingsMax;

  if (!Number.isFinite(sMin) || !Number.isFinite(sMax) || sMin <= 0 || sMax <= 0) {
    return { paybackMin: null as number | null, paybackMax: null as number | null };
  }

  // best case: lowest net / highest savings
  const paybackMin = args.netMin / sMax;
  // worst case: highest net / lowest savings
  const paybackMax = args.netMax / sMin;

  return {
    paybackMin: Number.isFinite(paybackMin) ? paybackMin : null,
    paybackMax: Number.isFinite(paybackMax) ? paybackMax : null,
  };
}
