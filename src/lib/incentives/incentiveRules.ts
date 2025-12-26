/**
 * Incentives + tax form rules engine (v0)
 *
 * Goal:
 * - Keep ALL incentive links, rebate placeholders, and eligibility rules OUT of the UI
 * - UI calls `getIncentivesForSnapshot()` and renders whatever it returns
 *
 * Later:
 * - Replace hardcoded programs with DB-driven rules (Supabase tables)
 * - Add location-based programs (state/utility) + income qualifiers
 * - Attach per-system “forms + rebates” and compute totals dynamically
 */

export type IncentiveForm = {
  id: string;
  title: string;
  url: string;
  note?: string;
};

export type IncentiveProgram = {
  id: string;
  title: string;
  level: "federal" | "state" | "utility" | "local" | "other";
  /**
   * If you know an amount, set it.
   * If it’s a range, use min/max.
   * If unknown, omit.
   */
  amount?: number;
  min?: number;
  max?: number;
  /**
   * Optional: a short eligibility note or rule summary
   */
  note?: string;
  /**
   * Optional links (program page, PDF, etc.)
   */
  links?: Array<{ label: string; url: string }>;
};

export type IncentiveResult = {
  forms: IncentiveForm[];
  programs: IncentiveProgram[];
  totals: {
    min: number;
    max: number;
    /**
     * If true, totals are rough placeholders (expected at v0)
     */
    estimated: boolean;
  };
  /**
   * “Why” messages that the UI can show in a small info box
   */
  notes: string[];
};

/**
 * Context allows us to make incentives location-aware later.
 * Keep it broad, so it works with your Job model now and later.
 */
export type IncentiveContext = {
  /**
   * Example: "OR", "WA"
   */
  stateCode?: string;
  /**
   * Example: "Hillsboro", "Portland"
   */
  city?: string;
  /**
   * Example: "PGE", "PacifiCorp"
   */
  utilityProvider?: string;
  /**
   * Optional for later: household income, electrification flags, etc.
   */
  meta?: Record<string, any>;
};

/**
 * Minimal shape of your snapshot that we can safely rely on without importing types.
 * (Keeps this module independent from your admin/_data structures.)
 */
export type SnapshotLike = {
  id?: string;
  existing?: {
    type?: string;
    subtype?: string;
    fuel?: string;
  };
  suggested?: {
    name?: string;
    catalogSystemId?: string | null;
    estCost?: number | null;
  };
};

const IRS_FORM_5695: IncentiveForm = {
  id: "irs-5695",
  title: "IRS Form 5695 (Residential Energy Credits)",
  url: "https://www.irs.gov/pub/irs-pdf/f5695.pdf",
  note: "Common federal form for residential energy credits (varies by upgrade type).",
};

const ENERGY_STAR_REBATE_FINDER: IncentiveForm = {
  id: "energystar-rebate-finder",
  title: "ENERGY STAR Rebate Finder",
  url: "https://www.energystar.gov/rebate-finder",
  note: "Find rebates by ZIP + product type.",
};

function norm(s?: string) {
  return (s ?? "").trim().toLowerCase();
}

function includesAny(haystack: string, needles: string[]) {
  const h = norm(haystack);
  return needles.some((n) => h.includes(norm(n)));
}

function money(n: number) {
  return Math.round(n);
}

function sumRange(programs: IncentiveProgram[]) {
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

  return { min: money(min), max: money(max) };
}

/**
 * v0: very simple type-based mapping.
 * Later: move these to Supabase tables and/or JSON configs managed in admin UI.
 */
function rulesForSystemType(systemType: string, ctx?: IncentiveContext): IncentiveResult {
  const t = norm(systemType);

  const forms: IncentiveForm[] = [IRS_FORM_5695, ENERGY_STAR_REBATE_FINDER];
  const programs: IncentiveProgram[] = [];
  const notes: string[] = [];

  // ---- HVAC / Heat Pump / Furnace ----
  if (includesAny(t, ["hvac", "heat", "furnace", "air", "heat pump", "mini split"])) {
    programs.push({
      id: "federal-hvac-placeholder",
      title: "Federal efficiency credit (placeholder)",
      level: "federal",
      min: 300,
      max: 2000,
      note:
        "Placeholder range. Final amount depends on equipment type/efficiency and current federal rules.",
    });

    programs.push({
      id: "utility-hvac-placeholder",
      title: "Utility rebate (placeholder)",
      level: "utility",
      min: 250,
      max: 1500,
      note:
        "Placeholder range. Utility rebates vary by provider, fuel switching, and contractor participation.",
      links: ctx?.utilityProvider
        ? [{ label: `Check ${ctx.utilityProvider} rebates`, url: "https://www.energystar.gov/rebate-finder" }]
        : undefined,
    });

    notes.push(
      "HVAC incentives are usually sensitive to efficiency ratings, fuel switching, and contractor program requirements."
    );
  }

  // ---- Water heater ----
  if (includesAny(t, ["water heater", "water"])) {
    programs.push({
      id: "federal-water-heater-placeholder",
      title: "Federal water heater credit (placeholder)",
      level: "federal",
      min: 150,
      max: 2000,
      note:
        "Placeholder range. Heat pump water heaters often qualify for higher incentives than standard tank replacements.",
    });

    programs.push({
      id: "utility-water-heater-placeholder",
      title: "Utility water heater rebate (placeholder)",
      level: "utility",
      min: 100,
      max: 800,
      note:
        "Placeholder range. Often requires eligible model + participating contractor or specific install conditions.",
    });

    notes.push("Water heater incentives often depend on technology type (heat pump vs standard) and tank size.");
  }

  // ---- Windows / Doors / Insulation ----
  if (includesAny(t, ["window", "door", "insulation", "attic", "wall", "crawl"])) {
    programs.push({
      id: "federal-envelope-placeholder",
      title: "Federal envelope credit (placeholder)",
      level: "federal",
      min: 100,
      max: 1200,
      note:
        "Placeholder range. Building envelope credits often have caps and product requirements.",
    });

    programs.push({
      id: "utility-envelope-placeholder",
      title: "State/utility efficiency program (placeholder)",
      level: "state",
      min: 200,
      max: 2500,
      note:
        "Placeholder range. Often requires pre/post verification or participation in a state program.",
    });

    notes.push("Envelope incentives often require documentation (product labels, invoices) and may have caps.");
  }

  // ---- Lighting ----
  if (includesAny(t, ["lighting", "led"])) {
    programs.push({
      id: "utility-lighting-placeholder",
      title: "Utility lighting rebate (placeholder)",
      level: "utility",
      min: 25,
      max: 500,
      note: "Placeholder range. Many lighting rebates are per-fixture or require eligible products.",
    });

    notes.push("Lighting rebates are commonly per-unit. Future: calculate based on quantity.");
  }

  // ---- Default fallback ----
  if (programs.length === 0) {
    programs.push({
      id: "generic-placeholder",
      title: "Incentives may be available (placeholder)",
      level: "other",
      min: 0,
      max: 750,
      note:
        "Placeholder. This system type isn’t mapped yet. Add a rule for this category when ready.",
    });

    notes.push("Rule not yet defined for this system type. Add mapping in incentiveRules.ts (or DB later).");
  }

  const totals = sumRange(programs);

  return {
    forms,
    programs,
    totals: { ...totals, estimated: true },
    notes,
  };
}

/**
 * Public API the report page should call.
 * Give it the snapshot + job context, and it returns forms/programs/totals.
 */
export function getIncentivesForSnapshot(snapshot: SnapshotLike, ctx?: IncentiveContext): IncentiveResult {
  const existingType = snapshot?.existing?.type ?? "";
  const suggestedName = snapshot?.suggested?.name ?? "";

  // Prefer the system “type” (HVAC/Windows/etc). Fall back to suggested name if needed.
  const key = existingType || suggestedName || "unknown";

  const base = rulesForSystemType(key, ctx);

  // Optional: add per-snapshot hints (example: if suggested from catalog, we could later attach exact eligibility)
  if (snapshot?.suggested?.catalogSystemId) {
    base.notes.unshift("Suggested upgrade is linked to catalog (future: attach exact program eligibility + rebates).");
  }

  // Optional: add cost sensitivity notes (future: can compute net cost ranges)
  if (typeof snapshot?.suggested?.estCost === "number") {
    base.notes.push("Future: compute net cost after incentives using the suggested install cost.");
  }

  return base;
}
