// src/lib/catalog/catalogTypes.ts

export type IncentiveScope =
  | { type: "federal" }
  | { type: "state"; states: string[] } // ["OR", "WA"]
  | { type: "zip"; zips: string[] }; // ["97123", "97201"]

export type CatalogIncentive = {
  id: string;
  name: string;
  amount: number; // positive dollar value

  scope: IncentiveScope;

  // how it attaches
  systemIds?: string[]; // explicit match
  systemTags?: string[]; // tag-based match (recommended for reuse)

  notes?: string;
};

export type CatalogSystem = {
  id: string;
  category:
    | "HVAC"
    | "Water Heater"
    | "Windows"
    | "Doors"
    | "Lighting"
    | "Insulation"
    | "Other";

  name: string;
  highlights: string[];

  // used elsewhere in LEAF SS
  defaultAssumptions: {
    estCost?: number;
    estAnnualSavings?: number;
    estPaybackYears?: number;
  };

  tags?: string[];

  // ✅ incentives live on the catalog system
  incentives?: CatalogIncentive[];

  // optional per-system overrides (you already added something like this)
  overrides?: Record<string, unknown>;
};

export type LocalCatalogV1 = {
  version: 1;
  updatedAt: string; // ISO
  systems: CatalogSystem[];
};
