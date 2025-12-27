import { calculateLeafSavings, type LeafTierKey } from "./leafSSConfigRuntime";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */

export type SnapshotDraft = {
  id: string;

  // ties it back to the Job + Existing System
  jobId: string;
  systemId: string;

  // existing system context (copied at creation time)
 existing: {
  type: string;
  subtype: string;
  ageYears: number | null;
  operational: string;
  wear: number | null; // 1–5
  maintenance: string;

  // ✅ Report/UI-facing fields (editable on snapshot creation page)
  label?: string; // ex: "Existing gas furnace"
  statusPillText?: string; // ex: "Near end of life"
  annualCostRange?: { min: number; max: number };
  carbonRange?: { min: number; max: number };
};

  };

  // suggested upgrade selection
  suggested: {
  systemId?: string;

  // Base name (still required)
  name: string;

  // (Legacy) quick fields
  estCost?: number;
  estAnnualSavings?: number;
  estPaybackYears?: number;
  notes?: string;

  // ✅ Report-editable tier config (Good/Better/Best)
  tierOverrides?: Record<
    "good" | "better" | "best",
    {
      leafPriceRange?: { min?: number; max?: number };
      baseMonthlySavings?: { min?: number; max?: number };
      recommendedName?: string;
      statusPillText?: string;
    }
  >;

  // ✅ Inputs + outputs for the “Run calculations” button
  calculationInputs?: {
    selectedTier?: "good" | "better" | "best";
    selectedPrice?: number;
    incentivesLow?: number;
    incentivesHigh?: number;
  };

  calculatedSavings?: {
    monthlyRange?: { min: number; max: number };
    costClass?: "unreal_low" | "low" | "in" | "likely_over" | "over";
  };
};


  // ✅ NEW — derived, not user-editable
  calculatedSavings?: {
    currentWaste: number;
    recoverableWaste: number;

    minAnnual: number;
    maxAnnual: number;
    centerAnnual: number;

    minMonthly: number;
    maxMonthly: number;
    centerMonthly: number;
  };

  createdAt: string;
  updatedAt: string;
};

const KEY = "rei_mock_snapshots_v1";

/* ─────────────────────────────────────────────
   STORAGE HELPERS
───────────────────────────────────────────── */

export function loadLocalSnapshots(): SnapshotDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SnapshotDraft[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalSnapshots(items: SnapshotDraft[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

/* ─────────────────────────────────────────────
   ✅ CORE: RECALCULATE SAVINGS
───────────────────────────────────────────── */

function withCalculatedSavings(snapshot: SnapshotDraft): SnapshotDraft {
  const tier = snapshot.suggested.tier;
  if (!tier) return snapshot;

  // These will later come from job / system context
  // For now we use safe midline defaults
  const annualUtilitySpend = 2400; // $200/mo placeholder
  const systemShare = 0.4;         // HVAC-like default
  const expectedLife = 20;

  const result = calculateLeafSavings({
    wear: snapshot.existing.wear,
    age: snapshot.existing.ageYears,
    expectedLife,
    partialFailure: snapshot.existing.operational !== "Operational",
    annualUtilitySpend,
    systemShare,
    tier,
  });

  return {
    ...snapshot,
    calculatedSavings: {
      currentWaste: result.currentWaste,
      recoverableWaste: result.recoverableWaste,

      minAnnual: result.minAnnualSavings,
      maxAnnual: result.maxAnnualSavings,
      centerAnnual: result.annualSavingsCenter,

      minMonthly: result.minMonthlySavings,
      maxMonthly: result.maxMonthlySavings,
      centerMonthly: result.centerMonthlySavings,
    },
  };
}

/* ─────────────────────────────────────────────
   CRUD OPERATIONS
───────────────────────────────────────────── */

export function upsertLocalSnapshot(snapshot: SnapshotDraft) {
  const existing = loadLocalSnapshots();
  const idx = existing.findIndex((s) => s.id === snapshot.id);

  const recalculated = withCalculatedSavings({
    ...snapshot,
    updatedAt: new Date().toISOString(),
  });

  const next =
    idx >= 0
      ? [...existing.slice(0, idx), recalculated, ...existing.slice(idx + 1)]
      : [recalculated, ...existing];

  saveLocalSnapshots(next);
}

export function findLocalSnapshot(snapshotId: string): SnapshotDraft | null {
  const items = loadLocalSnapshots();
  return items.find((s) => s.id === snapshotId) ?? null;
}

export function deleteLocalSnapshot(snapshotId: string) {
  const items = loadLocalSnapshots();
  saveLocalSnapshots(items.filter((s) => s.id !== snapshotId));
}

export function snapshotsForJob(jobId: string): SnapshotDraft[] {
  const items = loadLocalSnapshots();
  return items.filter((s) => s.jobId === jobId);
}
