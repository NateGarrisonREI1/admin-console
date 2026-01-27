import type { ResolvedIncentive } from "./resolve";

export type NormalizedIncentive = ResolvedIncentive & {
  amount_min: number;
  amount_max: number;
};

function num(v: any) {
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
