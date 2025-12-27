export type IncentiveScope =
  | { type: "federal" }
  | { type: "state"; states: string[] } // ["OR", "WA"]
  | { type: "zip"; zips: string[] };    // ["97123"]

export type CatalogIncentive = {
  id: string;
  name: string;
  amount: number; // dollars
  scope: IncentiveScope;

  // system attachment
  systemIds?: string[];
  systemTags?: string[];

  notes?: string;
};

export type JobIncentiveScope = "federal" | "state" | "local";

export type JobAppliedIncentive = {
  id: string;
  name: string;
  amount: number;
  scope: JobIncentiveScope;
  applied: boolean;
  source: "catalog" | "manual";
};
