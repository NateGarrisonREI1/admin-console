// src/lib/incentives/incentiveRules.ts
// TEMP STUB — Incentive rules disabled
// Incentives are now catalog-driven + snapshot-calculated

export type IncentiveResource = {
  id: string;
  programName: string;
  level: "federal" | "state" | "utility" | "local" | "other";
  shortBlurb?: string;
};

export type IncentiveContext = {
  state?: string;
  utility?: string;
  zipcode?: string;
  tags?: string[];
};

// 🔒 Hard-disable all auto incentives
export function getIncentivesForSystemType(): IncentiveResource[] {
  return [];
}
