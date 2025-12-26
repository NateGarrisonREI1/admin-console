/**
 * src/lib/incentives/incentiveRules.ts
 *
 * Central incentive + form rules for LEAF report mock.
 * - Today: hardcoded data + simple rule matching
 * - Later: replace RULES + copy blocks with Supabase-driven config
 */

export type IncentiveLevel = "federal" | "state" | "utility" | "local" | "other";

export type IncentiveForm = {
  id: string;
  title: string;
  url: string;
  note?: string; // editable wording
  tags?: string[];
};

export type IncentiveLink = {
  label: string;
  url: string;
};

export type IncentiveProgram = {
  id: string;
  level: IncentiveLevel;
  title: string;
  note?: string; // editable wording
  // You can support either a fixed amount OR a range
  amount?: number;
  min?: number;
  max?: number;
  links?: IncentiveLink[];
  tags?: string[];
};

export type IncentiveTotals = {
  min: number;
  max: number;
  estimated: boolean; // true if these are typical estimates
};

export type IncentiveResult = {
  totals: IncentiveTotals;
  forms: IncentiveForm[];
  programs: IncentiveProgram[];
  copy: {
    // Editable “info text” blocks for the incentives area
    heading: string;
    subheading: string;
    disclaimer: string;
  };
};

export type SnapshotLike = {
  existing?: {
    type?: string;
    subtype?: string;
    fuel?: string;
  };
  suggested?: {
    name?: string;
    notes?: string;
    catalogSystemId?: string | null;
  };
};

export type IncentiveContext = {
  stateCode?: string; // e.g. "OR"
  city?: string;
  utilityProvider?: string;
};

/**
 * All editable wording lives here.
 * Later: store these in a DB table + load by tenant/project.
 */
const COPY = {
  heading: "Incentives & Rebates",
  subheading:
    "These values are generated from rules. Later you’ll attach exact programs, eligibility, forms, and rebate values per system type and location.",
  disclaimer:
    "Note: Incentive amounts and eligibility vary by location, efficiency, program funding, and contractor participation. This section is rule-driven so wording and links can be updated without changing report UI.",
};

/**
 * Canonical forms library (PDFs / rebate finders / etc).
 * You can attach these to rules by `id`.
 */
const FORMS: Record<string, IncentiveForm> = {
  irs_5695: {
    id: "irs_5695",
    title: "IRS Form 5695 (Residential Energy Credits)",
    url: "https://www.irs.gov/pub/irs-pdf/f5695.pdf",
    note: "Used for claiming qualifying federal energy tax credits.",
    tags: ["federal", "tax-credit"],
  },
  energystar_rebate_finder: {
    id: "energystar_rebate_finder",
    title: "ENERGY STAR Rebate Finder",
    url: "https://www.energystar.gov/rebate-finder",
    note: "Search rebates by ZIP code and product type.",
    tags: ["federal", "state", "utility", "lookup"],
  },
  doe_energysaver: {
    id: "doe_energysaver",
    title: "DOE Energy Saver Guide",
    url: "https://www.energy.gov/energysaver",
    note: "General guidance on efficiency upgrades.",
    tags: ["education"],
  },
};

/**
 * Canonical programs library.
 * You can attach these to rules by `id`.
 *
 * NOTE: These are intentionally “typical ranges” for now.
 * Later: replace with location-specific tables.
 */
const PROGRAMS: Record<string, IncentiveProgram> = {
  fed_energy_credit_typical: {
    id: "fed_energy_credit_typical",
    level: "federal",
    title: "Federal Energy Tax Credit (typical)",
    note: "Often 20–30% depending on measure and program year; homeowner claims when filing taxes.",
    min: 600,
    max: 2000,
    links: [{ label: "IRS Form 5695", url: FORMS.irs_5695.url }],
    tags: ["federal", "tax-credit"],
  },

  utility_rebate_typical: {
    id: "utility_rebate_typical",
    level: "utility",
    title: "Utility / Local Rebate (typical)",
    note: "May require participating contractor and specific equipment tiers.",
    min: 250,
    max: 750,
    tags: ["utility", "rebate"],
  },

  state_rebate_typical: {
    id: "state_rebate_typical",
    level: "state",
    title: "State Program Rebate (typical)",
    note: "Availability varies by state and funding windows.",
    min: 500,
    max: 1500,
    tags: ["state", "rebate"],
  },

  heat_pump_bonus: {
    id: "heat_pump_bonus",
    level: "utility",
    title: "Heat Pump Upgrade Bonus (typical)",
    note: "Often higher incentives when switching from fossil fuel to heat pump.",
    min: 800,
    max: 3000,
    tags: ["hvac", "heat-pump", "utility"],
  },

  envelope_weatherization: {
    id: "envelope_weatherization",
    level: "state",
    title: "Weatherization / Envelope Incentive (typical)",
    note: "Insulation + air sealing programs commonly bundle rebates.",
    min: 400,
    max: 1200,
    tags: ["insulation", "air-sealing", "envelope"],
  },

  windows_credit: {
    id: "windows_credit",
    level: "federal",
    title: "Windows & Doors Credit (typical)",
    note: "Often capped; check U-factor/SHGC requirements and program caps.",
    min: 200,
    max: 600,
    tags: ["windows", "doors", "federal"],
  },

  water_heater_credit: {
    id: "water_heater_credit",
    level: "federal",
    title: "Water Heater Credit (typical)",
    note: "Higher for heat pump water heaters vs standard replacements.",
    min: 300,
    max: 2000,
    tags: ["water-heater", "federal"],
  },
};

/**
 * RULES
 * Match on snapshot existing type/subtype/fuel keywords.
 *
 * You can add/edit wording by:
 * - updating PROGRAMS / FORMS entries
 * - adding/changing rules here
 */
type Rule = {
  id: string;
  match: {
    // simple keyword matching
    anyTypeIncludes?: string[];
    anySubtypeIncludes?: string[];
    anyFuelIncludes?: string[];
  };
  attach: {
    forms?: string[]; // ids from FORMS
    programs?: string[]; // ids from PROGRAMS
  };
};

const RULES: Rule[] = [
  // HVAC general
  {
    id: "hvac_general",
    match: { anyTypeIncludes: ["hvac"] },
    attach: {
      forms: ["energystar_rebate_finder"],
      programs: ["utility_rebate_typical", "state_rebate_typical", "fed_energy_credit_typical"],
    },
  },

  // Heat pump (HVAC subtype keywords)
  {
    id: "hvac_heat_pump",
    match: { anyTypeIncludes: ["hvac"], anySubtypeIncludes: ["heat pump", "mini split", "ductless"] },
    attach: {
      forms: ["energystar_rebate_finder", "irs_5695"],
      programs: ["heat_pump_bonus", "fed_energy_credit_typical", "utility_rebate_typical"],
    },
  },

  // Gas furnace
  {
    id: "hvac_gas_furnace",
    match: { anyTypeIncludes: ["hvac"], anySubtypeIncludes: ["furnace"], anyFuelIncludes: ["gas", "natural gas"] },
    attach: {
      forms: ["energystar_rebate_finder"],
      programs: ["utility_rebate_typical", "state_rebate_typical"],
    },
  },

  // Water heater
  {
    id: "water_heater",
    match: { anyTypeIncludes: ["water heater"] },
    attach: {
      forms: ["energystar_rebate_finder", "irs_5695"],
      programs: ["water_heater_credit", "utility_rebate_typical"],
    },
  },

  // Windows
  {
    id: "windows",
    match: { anyTypeIncludes: ["window", "windows"] },
    attach: {
      forms: ["energystar_rebate_finder", "irs_5695"],
      programs: ["windows_credit"],
    },
  },

  // Doors
  {
    id: "doors",
    match: { anyTypeIncludes: ["door", "doors"] },
    attach: {
      forms: ["energystar_rebate_finder", "irs_5695"],
      programs: ["windows_credit"],
    },
  },

  // Insulation / envelope
  {
    id: "insulation_envelope",
    match: { anyTypeIncludes: ["insulation", "envelope", "air sealing", "air-sealing"] },
    attach: {
      forms: ["energystar_rebate_finder", "irs_5695"],
      programs: ["envelope_weatherization", "fed_energy_credit_typical"],
    },
  },
];

/**
 * Public API: given a snapshot and context, return the incentive block payload.
 */
export function getIncentivesForSnapshot(snapshot: SnapshotLike, ctx?: IncentiveContext): IncentiveResult {
  const type = norm(snapshot?.existing?.type);
  const subtype = norm(snapshot?.existing?.subtype);
  const fuel = norm(snapshot?.existing?.fuel);

  const matchedRuleIds = matchRules({ type, subtype, fuel });

  // Collect forms/programs from matched rules
  const formIds = new Set<string>();
  const programIds = new Set<string>();

  for (const rule of RULES) {
    if (!matchedRuleIds.includes(rule.id)) continue;
    (rule.attach.forms ?? []).forEach((id) => formIds.add(id));
    (rule.attach.programs ?? []).forEach((id) => programIds.add(id));
  }

  // Always include rebate finder (useful global default)
  formIds.add("energystar_rebate_finder");

  const forms = uniqBy(
    [...formIds].map((id) => FORMS[id]).filter(Boolean),
    (f) => f.id
  );

  const programs = uniqBy(
    [...programIds].map((id) => PROGRAMS[id]).filter(Boolean),
    (p) => p.id
  );

  const totals = computeTotals(programs);

  // You can later use ctx (stateCode/utilityProvider) to tweak:
  // - filter programs by state
  // - swap links by utility provider
  // For now, ctx is unused intentionally.

  return {
    totals,
    forms,
    programs,
    copy: { ...COPY },
  };
}

/* -----------------------
   Helpers
----------------------- */

function norm(v?: string) {
  return (v ?? "").trim().toLowerCase();
}

function includesAny(haystack: string, needles?: string[]) {
  if (!needles?.length) return true;
  return needles.some((n) => haystack.includes(n.toLowerCase()));
}

function matchRules(input: { type: string; subtype: string; fuel: string }) {
  const hits: string[] = [];

  for (const rule of RULES) {
    const tOk = includesAny(input.type, rule.match.anyTypeIncludes);
    const stOk = includesAny(input.subtype, rule.match.anySubtypeIncludes);
    const fOk = includesAny(input.fuel, rule.match.anyFuelIncludes);

    if (tOk && stOk && fOk) hits.push(rule.id);
  }

  return hits;
}

function computeTotals(programs: IncentiveProgram[]): IncentiveTotals {
  let min = 0;
  let max = 0;

  for (const p of programs) {
    if (typeof p.amount === "number") {
      min += p.amount;
      max += p.amount;
      continue;
    }
    if (typeof p.min === "number") min += p.min;
    if (typeof p.max === "number") max += p.max;
  }

  // If nothing matched, keep it as “estimated typical”
  const estimated = true;

  // Avoid weird case where max < min
  if (max < min) max = min;

  return { min, max, estimated };
}

function uniqBy<T>(items: T[], keyFn: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = keyFn(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}
