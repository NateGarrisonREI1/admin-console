// src/lib/incentives/incentiveRules.ts

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
  appliesTo: string[]; // ["hvac", "water_heater", ...]
  tags?: string[]; // ["heat_pump", "tankless", ...]
  amount?: IncentiveAmount;
  shortBlurb: string;
  details?: string;
  links?: IncentiveLink[];

  // ✅ optional admin control
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

export const INCENTIVE_COPY: IncentiveCopyBlock[] = [
  {
    key: "general_disclaimer",
    title: "Important",
    body:
      "Incentives change often and can run out. LEAF shows typical programs based on system type. Your contractor confirms eligibility, paperwork, and final amounts.",
  },
  {
    key: "federal_tax_credit_blurb",
    title: "Federal tax credits",
    body:
      "Federal credits are typically claimed by the homeowner when filing taxes. Keep invoices and product documentation. Contractor can help confirm qualifying equipment.",
  },
  {
    key: "utility_rebate_blurb",
    title: "Utility rebates",
    body:
      "Utility rebates may require participating contractors and specific efficiency requirements. Some apply at point-of-sale; others require submitting paperwork after install.",
  },
];

export function normalizeSystemType(input: string): string {
  const s = (input || "").trim().toLowerCase();
  if (s.includes("hvac") || s.includes("heating") || s.includes("cooling") || s.includes("furnace")) return "hvac";
  if (s.includes("water heater") || s.includes("waterheater") || s.includes("wh")) return "water_heater";
  if (s.includes("window")) return "windows";
  if (s.includes("door")) return "doors";
  if (s.includes("insulation")) return "insulation";
  if (s.includes("solar")) return "solar";
  if (s.includes("ev") || s.includes("charger")) return "ev_charging";
  if (s.includes("lighting")) return "lighting";
  if (s.includes("appliance") || s.includes("fridge") || s.includes("washer") || s.includes("dryer")) return "appliances";
  return s.replace(/\s+/g, "_");
}

/**
 * Starter defaults (your old behavior).
 * Admin overrides can add/replace these at runtime.
 */
export const INCENTIVE_LIBRARY: IncentiveResource[] = [
  {
    id: "fed-irs-5695",
    programName: "IRS Form 5695 (Residential Clean Energy Credits)",
    level: "federal",
    appliesTo: ["solar", "ev_charging"],
    amount: { kind: "text", value: "Varies (tax credit form / eligibility dependent)" },
    shortBlurb: "Common IRS form used to claim certain residential energy credits.",
    details:
      "Use this form when claiming eligible residential energy credits. Eligibility depends on equipment type and current federal rules.",
    links: [{ label: "IRS Form 5695 (PDF)", url: "https://www.irs.gov/pub/irs-pdf/f5695.pdf" }],
  },
  {
    id: "fed-hvac-credit-placeholder",
    programName: "Federal efficiency credit (placeholder)",
    level: "federal",
    appliesTo: ["hvac", "water_heater"],
    amount: { kind: "text", value: "Often a % or capped amount depending on equipment" },
    shortBlurb: "Federal credits may apply to high-efficiency HVAC and water heating.",
    details:
      "Replace this with the exact credit rules you want to reference (by product type / certification).",
    links: [{ label: "ENERGY STAR Rebate Finder", url: "https://www.energystar.gov/rebate-finder" }],
  },
  {
    id: "state-or-placeholder",
    programName: "State program (placeholder)",
    level: "state",
    appliesTo: ["hvac", "water_heater", "windows", "insulation"],
    amount: { kind: "text", value: "$500–$1,500 typical (varies)" },
    shortBlurb: "State programs often offer rebates for qualifying upgrades (varies by funding).",
    details: "Replace this with Oregon-specific programs (or your target state).",
  },
  {
    id: "utility-placeholder",
    programName: "Utility rebate (placeholder)",
    level: "utility",
    appliesTo: ["hvac", "water_heater", "insulation", "windows", "lighting"],
    amount: { kind: "text", value: "$250–$750 typical (varies)" },
    shortBlurb: "Utilities often provide rebates for efficiency upgrades.",
    details:
      "Utility programs vary by provider and can require approved contractors.",
  },
];

// ✅ Reads admin-defined incentives from localStorage (client-safe)
function readOverridesFromLocalStorage(): IncentiveResource[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("rei.incentives.overrides.v1");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as IncentiveResource[]) : [];
  } catch {
    return [];
  }
}

function tagMatch(ruleTags: string[] | undefined, ctxTags: string[]): boolean {
  if (!ruleTags || ruleTags.length === 0) return true;
  if (!ctxTags.length) return false;
  const a = ruleTags.map((t) => t.toLowerCase().trim()).filter(Boolean);
  const b = ctxTags.map((t) => t.toLowerCase().trim()).filter(Boolean);
  return a.some((t) => b.includes(t));
}

/**
 * Main API (unchanged name) — now includes admin overrides automatically.
 * Overrides:
 * - can add new incentives
 * - can "replace" an existing incentive by using the same id
 * - can disable an incentive via `disabled: true`
 */
export function getIncentivesForSystemType(systemType: string, context?: IncentiveContext): IncentiveResource[] {
  const key = normalizeSystemType(systemType);
  const ctxTags = (context?.tags || []).map((t) => (t || "").toLowerCase().trim()).filter(Boolean);

  const base = INCENTIVE_LIBRARY.filter((r) => r.appliesTo.includes(key));
  const overridesAll = readOverridesFromLocalStorage();
  const overrides = overridesAll.filter(
    (r) => r.appliesTo.includes(key) && !r.disabled && tagMatch(r.tags, ctxTags)
  );

  // base respects tag matching too
  const baseFiltered = base
    .filter((r) => !r.disabled)
    .filter((r) => tagMatch(r.tags, ctxTags));

  // Overrides win by id (replace base)
  const overrideIds = new Set(overrides.map((o) => o.id));
  const merged = [
    ...overrides, // show admin-defined first
    ...baseFiltered.filter((b) => !overrideIds.has(b.id)),
  ];

  return merged;
}
