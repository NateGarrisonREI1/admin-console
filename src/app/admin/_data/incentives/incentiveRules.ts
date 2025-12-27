// src/app/admin/_data/incentives/incentiveRules.ts
// TEMP STUB — legacy incentive system disabled
// New incentive logic is catalog + snapshot driven

export type IncentiveLink = {
  label: string;
  url: string;
};

export type IncentiveAmount =
  | { kind: "range"; min: number; max: number; unit?: "one_time" | "per_year" | "percent" }
  | { kind: "flat"; value: number; unit?: "one_time" | "per_year" | "percent" }
  | { kind: "text"; value: string };

export type IncentiveResource = {
  id: string;
  programName: string;
  level: "federal" | "state" | "utility" | "local" | "other";
  appliesTo?: string[];
  tags?: string[];
  amount?: IncentiveAmount;
  shortBlurb?: string;
  details?: string;
  links?: IncentiveLink[];
  disabled?: boolean;
};

export type IncentiveContext = {
  state?: string;
  utility?: string;
  zipcode?: string;
  tags?: string[];
};

export type IncentiveCopyBlock = {
  key: string;
  title: string;
  body: string;
};

// Previously used for system-type matching
export function normalizeSystemType(input: string): string {
  return (input || "").toLowerCase().replace(/\s+/g, "_");
}

// Previously rendered in snapshot UI / reports
export const INCENTIVE_COPY: IncentiveCopyBlock[] = [];

/**
 * Legacy API — intentionally returns NOTHING.
 * Keeps existing imports/builds working while we migrate.
 */
export function getIncentivesForSystemType(
  _systemType?: string,
  _context?: IncentiveContext
): IncentiveResource[] {
  return [];
}
