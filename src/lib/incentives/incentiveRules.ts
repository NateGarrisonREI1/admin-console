// src/lib/incentives/incentiveRules.ts
/**
 * Incentives + rebate “rules” (V0)
 * ---------------------------------------------------------
 * This is intentionally simple + editable.
 *
 * Goals:
 * - Attach “resources” (pdf links, websites) to system types
 * - Attach editable “copy” blocks (wording text) to system types
 * - Keep amounts flexible (ranges, “typical”, etc.)
 * - Provide ONE function your UI can call:
 *     getIncentivesForSystemType(systemType, context?)
 *
 * Later:
 * - Replace hardcoded arrays with DB (Supabase) tables
 * - Add state/utility rules, income qualification, effective dates, etc.
 */

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
  // what system types this applies to (normalized matching)
  appliesTo: string[]; // ex: ["hvac", "water_heater", "windows"]
  // optional tighter matching if you want it
  tags?: string[]; // ex: ["heat_pump", "gas_furnace", "tankless"]
  amount?: IncentiveAmount;
  shortBlurb: string; // 1–2 lines in UI
  details?: string; // longer info text (editable)
  links?: IncentiveLink[];
  // future: date windows, income caps, location filters, etc.
};

export type IncentiveContext = {
  state?: string; // "OR"
  utility?: string; // "PGE"
  zipcode?: string;
  // optional tags from the system (subtype/fuel/etc)
  tags?: string[];
};

// -------------------------
// Editable “copy” blocks
// -------------------------
export type IncentiveCopyBlock = {
  key: string;
  title: string;
  body: string; // editable wording
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

// -------------------------
// System type normalization
// -------------------------
/**
 * Your systems in the app show things like:
 * - HVAC
 * - Water Heater
 * - Windows
 *
 * Normalize those into keys so rules are stable.
 */
export function normalizeSystemType(input: string): string {
  const s = (input || "").trim().toLowerCase();

  // common groupings
  if (s.includes("hvac") || s.includes("heating") || s.includes("cooling") || s.includes("furnace")) return "hvac";
  if (s.includes("water heater") || s.includes("waterheater") || s.includes("wh")) return "water_heater";
  if (s.includes("window")) return "windows";
  if (s.includes("door")) return "doors";
  if (s.includes("insulation")) return "insulation";
  if (s.includes("solar")) return "solar";
  if (s.includes("ev") || s.includes("charger")) return "ev_charging";
  if (s.includes("lighting")) return "lighting";
  if (s.includes("appliance") || s.includes("fridge") || s.includes("washer") || s.includes("dryer")) return "appliances";

  // fallback: safe slug
  return s.replace(/\s+/g, "_");
}

// -------------------------
// Incentive library (V0)
// -------------------------
/**
 * These are “starter” entries so your UI has something to render.
 * You will likely replace most of these with real state/utility programs soon.
 *
 * IMPORTANT: amounts here are placeholders / examples.
 */
export const INCENTIVE_LIBRARY: IncentiveResource[] = [
  // ---------------- FEDERAL (examples) ----------------
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

  // HVAC / Heat pump “placeholder”
  {
    id: "fed-hvac-credit-placeholder",
    programName: "Federal efficiency credit (placeholder)",
    level: "federal",
    appliesTo: ["hvac", "water_heater"],
    amount: { kind: "text", value: "Often a % or capped amount depending on equipment" },
    shortBlurb: "Federal credits may apply to high-efficiency HVAC and water heating.",
    details:
      "Federal credits change year-to-year. Replace this entry with the exact credit rules you want to reference (by product type / certification).",
    links: [{ label: "ENERGY STAR Rebate Finder", url: "https://www.energystar.gov/rebate-finder" }],
  },

  // ---------------- STATE (examples) ----------------
  {
    id: "state-or-placeholder",
    programName: "State program (placeholder)",
    level: "state",
    appliesTo: ["hvac", "water_heater", "windows", "insulation"],
    amount: { kind: "text", value: "$500–$1,500 typical (varies)" },
    shortBlurb: "State programs often offer rebates for qualifying upgrades (varies by funding).",
    details:
      "Replace this with Oregon-specific programs (or your target state). You can later filter by context.state/zipcode.",
  },

  // ---------------- UTILITY / LOCAL (examples) ----------------
  {
    id: "utility-placeholder",
    programName: "Utility rebate (placeholder)",
    level: "utility",
    appliesTo: ["hvac", "water_heater", "insulation", "windows", "lighting"],
    amount: { kind: "text", value: "$250–$750 typical (varies)" },
    shortBlurb: "Utilities often provide rebates for efficiency upgrades.",
    details:
      "Utility programs vary by provider and can require approved contractors. Replace with real PGE/PacifiCorp/etc rules as you add them.",
  },
];

// -------------------------
// Main exported function
// -------------------------
/**
 * This is what your report page imports.
 * It returns all incentive resources that match the system type + optional context tags.
 */
export function getIncentivesForSystemType(
  systemType: string,
  context?: IncentiveContext
): IncentiveResource[] {
  const key = normalizeSystemType(systemType);
  const ctxTags = (context?.tags || []).map((t) => (t || "").toLowerCase().trim()).filter(Boolean);

  // 1) match by system type
  let results = INCENTIVE_LIBRARY.filter((r) => r.appliesTo.includes(key));

  // 2) optional tag filtering (if a rule has tags, at least one must match)
  if (ctxTags.length) {
    results = results.filter((r) => {
      if (!r.tags || r.tags.length === 0) return true;
      const ruleTags = r.tags.map((t) => t.toLowerCase().trim());
      return ruleTags.some((t) => ctxTags.includes(t));
    });
  }

  // 3) future: filter by state/utility/zip
  // if (context?.state) { ... }

  return results;
}
