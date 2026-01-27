// src/lib/incentives/normalize.ts

/**
 * TEMP SHAPE
 * ----------
 * This intentionally avoids importing ./resolve so builds
 * don't break while incentives are still in flux.
 *
 * When the resolver is finalized, we can re-export the real type.
 */
export type ResolvedIncentive = {
  id?: string;
  program?: string;
  source?: string;

  amount_min?: number | string | null;
  amount_max?: number | string | null;
  max_amount?: number | string | null;

  [key: string]: unknown;
};

export type NormalizedIncentive = ResolvedIncentive & {
  amount_min: number;
  amount_max: number;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeIncentive(i: ResolvedIncentive): NormalizedIncentive {
  const min = num(i.amount_min);
  const max = num(i.amount_max ?? i.max_amount);

  return {
    ...i,
    amount_min: Math.max(0, min),
    amount_max: Math.max(0, max),
  };
}

export function normalizeIncentives(list: ResolvedIncentive[]) {
  return list.map(normalizeIncentive);
}

export function incentiveTotals(list: ResolvedIncentive[]) {
  const items = normalizeIncentives(list);

  let incentiveMin = 0;
  let incentiveMax = 0;

  for (const i of items) {
    incentiveMin += i.amount_min;
    incentiveMax += i.amount_max;
  }

  return { incentiveMin, incentiveMax, items };
}
