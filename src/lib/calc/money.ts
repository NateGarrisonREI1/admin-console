export function clampNonNeg(n: number) {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function roundMoney(n: number) {
  return Math.round(n);
}

export function fmtUSD(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtRangeUSD(min: number, max: number) {
  const a = roundMoney(clampNonNeg(min));
  const b = roundMoney(clampNonNeg(max));
  if (a === b) return fmtUSD(a);
  return `${fmtUSD(a)}–${fmtUSD(b)}`;
}

export function fmtYearsRange(min: number | null, max: number | null) {
  if (min == null || max == null) return "—";
  const a = Math.max(0, min);
  const b = Math.max(0, max);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "—";
  if (Math.abs(a - b) < 0.25) return `${a.toFixed(1)} yrs`;
  return `${a.toFixed(1)}–${b.toFixed(1)} yrs`;
}
