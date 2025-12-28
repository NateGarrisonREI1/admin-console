/* =========================================================
   LEAF SS — Local Snapshots (Single Source of Truth for v0)

   Why this file exists:
   - Owns the Snapshot data model (types + defaults)
   - Owns CRUD signatures used across the app
   - Normalizes older/partial objects into a stable shape
   - Keeps persistence intentionally simple (in-memory) for now

   IMPORTANT:
   - No React imports
   - No calculations
   - No catalog logic
   ========================================================= */

export type LeafTierKey = "good" | "better" | "best";

export type MoneyRange = { min: number; max: number };
export type CarbonRange = { min: number; max: number };

export type ExistingSystemInfo = {
  type: string;
  subtype: string;

  ageYears: number | null;
  operational: "Yes" | "No";
  wear: number | null; // 1–5
  maintenance: "Good" | "Average" | "Poor";

  // purely display (optional, but normalized)
  label: string;
  statusPillText: string;
  annualCostRange: MoneyRange;
  carbonRange: CarbonRange;
  imageUrl: string;
};

export type SuggestedUpgradeInfo = {
  // catalog linkage (optional)
  catalogSystemId: string | null;

  // display (normalized)
  name: string;
  notes: string;
  tier: LeafTierKey;

  // simple user-entered economics (optional)
  estCost: number | null;
  estAnnualSavings: number | null;
  estPaybackYears: number | null;

  // optional per-tier overrides (kept flexible on purpose)
  recommendedNameByTier: Record<string, string>;
  statusPillTextByTier: Record<string, string>;
  imageUrl: string;

  leafSSOverrides: {
    tiers: Record<string, any>;
  };
};

export type SnapshotCalculationInputs = {
  // v0 inputs (you can change later, but keep normalized)
  annualUtilitySpend: number; // dollars/year
  systemShare: number; // 0–1 share of total utility spend
  expectedLife: number; // years
  partialFailure: boolean;
};

export type SnapshotDraft = {
  id: string;

  // linkage
  jobId: string;
  systemId: string;

  // user-facing label (optional)
  title: string;

  // core blocks (REQUIRED + normalized)
  existing: ExistingSystemInfo;
  suggested: SuggestedUpgradeInfo;
  calculationInputs: SnapshotCalculationInputs;

  // timestamps (REQUIRED + normalized)
  createdAt: string;
  updatedAt: string;

  // allow forward-compat without breaking builds
  [key: string]: any;
};

/* =========================================================
   Defaults (THE contract)
   ========================================================= */

function nowIso() {
  return new Date().toISOString();
}

function makeSnapshotId(systemId: string) {
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `snap_${systemId}_${rand}`;
}

export const DEFAULT_EXISTING: ExistingSystemInfo = {
  type: "",
  subtype: "",
  ageYears: null,
  operational: "Yes",
  wear: null,
  maintenance: "Average",

  label: "",
  statusPillText: "",
  annualCostRange: { min: 0, max: 0 },
  carbonRange: { min: 0, max: 0 },
  imageUrl: "",
};

export const DEFAULT_SUGGESTED: SuggestedUpgradeInfo = {
  catalogSystemId: null,
  name: "",
  notes: "",
  tier: "better",

  estCost: null,
  estAnnualSavings: null,
  estPaybackYears: null,

  recommendedNameByTier: {},
  statusPillTextByTier: {},
  imageUrl: "",

  leafSSOverrides: { tiers: {} },
};

export const DEFAULT_INPUTS: SnapshotCalculationInputs = {
  annualUtilitySpend: 2400,
  systemShare: 0.4,
  expectedLife: 20,
  partialFailure: false,
};

/* =========================================================
   Normalization (prevents “possibly undefined” hell)
   ========================================================= */

function normalizeSnapshotDraft(partial: any): SnapshotDraft {
  const createdAt = typeof partial?.createdAt === "string" ? partial.createdAt : nowIso();
  const updatedAt = typeof partial?.updatedAt === "string" ? partial.updatedAt : createdAt;

  const existingRaw = partial?.existing ?? {};
  const suggestedRaw = partial?.suggested ?? {};
  const inputsRaw = partial?.calculationInputs ?? {};

  const normalized: SnapshotDraft = {
    id: typeof partial?.id === "string" ? partial.id : makeSnapshotId(String(partial?.systemId || "system")),
    jobId: String(partial?.jobId || ""),
    systemId: String(partial?.systemId || ""),

    title: typeof partial?.title === "string" ? partial.title : "",

    existing: {
      ...DEFAULT_EXISTING,
      ...existingRaw,
      annualCostRange: {
        min: Number(existingRaw?.annualCostRange?.min ?? DEFAULT_EXISTING.annualCostRange.min),
        max: Number(existingRaw?.annualCostRange?.max ?? DEFAULT_EXISTING.annualCostRange.max),
      },
      carbonRange: {
        min: Number(existingRaw?.carbonRange?.min ?? DEFAULT_EXISTING.carbonRange.min),
        max: Number(existingRaw?.carbonRange?.max ?? DEFAULT_EXISTING.carbonRange.max),
      },
      ageYears: existingRaw?.ageYears === null || existingRaw?.ageYears === undefined ? null : Number(existingRaw.ageYears),
      wear: existingRaw?.wear === null || existingRaw?.wear === undefined ? null : Number(existingRaw.wear),
    },

    suggested: {
      ...DEFAULT_SUGGESTED,
      ...suggestedRaw,
      catalogSystemId: suggestedRaw?.catalogSystemId ?? DEFAULT_SUGGESTED.catalogSystemId,
      tier: (suggestedRaw?.tier as LeafTierKey) || DEFAULT_SUGGESTED.tier,
      leafSSOverrides: {
        tiers: { ...(suggestedRaw?.leafSSOverrides?.tiers || {}) },
      },
      recommendedNameByTier: { ...(suggestedRaw?.recommendedNameByTier || {}) },
      statusPillTextByTier: { ...(suggestedRaw?.statusPillTextByTier || {}) },
      estCost: suggestedRaw?.estCost === null || suggestedRaw?.estCost === undefined ? null : Number(suggestedRaw.estCost),
      estAnnualSavings:
        suggestedRaw?.estAnnualSavings === null || suggestedRaw?.estAnnualSavings === undefined
          ? null
          : Number(suggestedRaw.estAnnualSavings),
      estPaybackYears:
        suggestedRaw?.estPaybackYears === null || suggestedRaw?.estPaybackYears === undefined
          ? null
          : Number(suggestedRaw.estPaybackYears),
    },

    calculationInputs: {
      ...DEFAULT_INPUTS,
      ...inputsRaw,
      annualUtilitySpend: Number(inputsRaw?.annualUtilitySpend ?? DEFAULT_INPUTS.annualUtilitySpend),
      systemShare: Number(inputsRaw?.systemShare ?? DEFAULT_INPUTS.systemShare),
      expectedLife: Number(inputsRaw?.expectedLife ?? DEFAULT_INPUTS.expectedLife),
      partialFailure: Boolean(inputsRaw?.partialFailure ?? DEFAULT_INPUTS.partialFailure),
    },

    createdAt,
    updatedAt,

    // preserve any unknown fields for forward compat
    ...partial,
  };

  return normalized;
}

/* =========================================================
   In-memory store (replace later with DB/API)
   ========================================================= */

let _snapshots: SnapshotDraft[] = [];

/* =========================================================
   Public API (keep signatures stable)
   ========================================================= */

export function loadLocalSnapshots(): SnapshotDraft[] {
  // Always return normalized snapshots so UI never sees undefined blocks.
  _snapshots = _snapshots.map(normalizeSnapshotDraft);
  return _snapshots;
}

export function saveLocalSnapshots(next?: SnapshotDraft[]): void {
  // Compatibility: some callers pass an updated array.
  if (Array.isArray(next)) {
    _snapshots = next.map(normalizeSnapshotDraft);
    return;
  }
  // Otherwise no-op (in-memory store already updated via upsert/delete)
}

export function snapshotsForJob(jobId: string): SnapshotDraft[] {
  return loadLocalSnapshots().filter((s) => s.jobId === jobId);
}

export function getSnapshotById(snapshotId: string): SnapshotDraft | null {
  const found = loadLocalSnapshots().find((s) => s.id === snapshotId);
  return found ? normalizeSnapshotDraft(found) : null;
}

export function createSnapshotDraft(args: {
  jobId: string;
  systemId: string;
  existing?: Partial<ExistingSystemInfo>;
  suggested?: Partial<SuggestedUpgradeInfo>;
  calculationInputs?: Partial<SnapshotCalculationInputs>;
  title?: string;
}): SnapshotDraft {
  const t = nowIso();
  return normalizeSnapshotDraft({
    id: makeSnapshotId(args.systemId),
    jobId: args.jobId,
    systemId: args.systemId,
    title: args.title ?? "",
    existing: { ...DEFAULT_EXISTING, ...(args.existing || {}) },
    suggested: { ...DEFAULT_SUGGESTED, ...(args.suggested || {}) },
    calculationInputs: { ...DEFAULT_INPUTS, ...(args.calculationInputs || {}) },
    createdAt: t,
    updatedAt: t,
  });
}

export function upsertLocalSnapshot(snapshot: SnapshotDraft): SnapshotDraft {
  const normalized = normalizeSnapshotDraft({
    ...snapshot,
    updatedAt: nowIso(),
    createdAt: snapshot.createdAt || nowIso(),
  });

  const idx = _snapshots.findIndex((s) => s.id === normalized.id);
  if (idx >= 0) _snapshots[idx] = normalized;
  else _snapshots.push(normalized);

  return normalized;
}

export function deleteLocalSnapshot(snapshotId: string): void {
  _snapshots = _snapshots.filter((s) => s.id !== snapshotId);
}
