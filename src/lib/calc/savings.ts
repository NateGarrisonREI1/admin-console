/**
 * Placeholder savings module.
 *
 * Today: use assumptions bands (annual_savings_min/max) from upgrade_type_assumptions.
 * Future: compute from HES deltas + utility rates + escalation factors.
 */

export function pickSavingsBand(args: {
  annualSavingsMin: number | null;
  annualSavingsMax: number | null;
}) {
  const min = Number(args.annualSavingsMin ?? 0);
  const max = Number(args.annualSavingsMax ?? 0);

  if (!Number.isFinite(min) || !Number.isFinite(max) || (min === 0 && max === 0)) {
    return { annualSavingsMin: 0, annualSavingsMax: 0, hasSavings: false };
  }

  return {
    annualSavingsMin: Math.max(0, min),
    annualSavingsMax: Math.max(Math.max(0, min), max),
    hasSavings: true,
  };
}
