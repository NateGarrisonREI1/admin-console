export type IncentiveStatus = "APPLIES_POSSIBLE" | "UNKNOWN_NEEDS_INPUT" | "EXCLUDED_NOT_ELIGIBLE";

export type ResolvedIncentive = {
  id: string;
  program_name: string;
  source: string;
  sponsor_level: string;
  upgrade_type_key: string;

  amount_min: number | null;
  amount_max: number | null;
  amount_unit: "usd" | "percent" | "other";

  url?: string | null;

  confidence: "low" | "medium" | "high";
  status: IncentiveStatus;

  required_inputs: string[];
  reasons: string[];
  notes?: string | null;

  disclaimer_short: string;
};

export type IncentivesForUpgrade = {
  upgrade_catalog_id: string;
  incentives: ResolvedIncentive[];
  total_min: number | null;
  total_max: number | null;
};
