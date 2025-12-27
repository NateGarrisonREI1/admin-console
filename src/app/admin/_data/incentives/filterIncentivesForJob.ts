import { Incentive } from "./incentivesModel";

export function filterIncentivesForJob(
  incentives: Incentive[],
  job: { zip?: string; state?: string }
): Incentive[] {
  const zip = String(job.zip || "").trim();
  const state = String(job.state || "").trim().toUpperCase();

  return incentives.filter((i) => {
    const states = i.appliesTo?.states;
    const zips = i.appliesTo?.zips;

    if (zips?.length) return zips.includes(zip);
    if (states?.length) return states.includes(state);
    return true; // global
  });
}

export function groupIncentivesByLevel(incentives: Incentive[]) {
  return incentives.reduce<Record<string, Incentive[]>>((acc, inc) => {
    acc[inc.level] ||= [];
    acc[inc.level].push(inc);
    return acc;
  }, {});
}
