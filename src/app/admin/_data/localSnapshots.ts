import { calculateLeafSavings, type LeafTierKey } from "./leafSavings";

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

    /** Optional, report/UI-facing labels (editable on snapshot creation page) */
    label?: string;
    statusPillText?: string;

    /** Optional ranges used by the report UI */
    annualCostRange?: { min: number; max: number };
    carbonRange?: { min: number; max: number };

    /** Optional image URL (or data URL) used by the report UI */
    imageUrl?: string;
  };

  // suggested upgrade selection
  suggested: {
    catalogSystemId: string | null;
    name: string;
    tier?: LeafTierKey;
    estCost: number | null;

    // legacy (will be phased out)
    estAnnualSavings: number | null;
    estPaybackYears: number | null;

    notes: string;

    /** Optional report/UI fields (editable on snapshot creation page) */
    recommendedNameByTier?: Partial<Record<LeafTierKey, string>>;
    statusPillTextByTier?: Partial<Record<LeafTierKey, string>>;

    /** Optional image URL (or data URL) used by the report UI */
    imageUrl?: string;

    /**
     * Optional per-snapshot overrides for LEAF SS master config. These should
     * be treated as “inputs”, not hard-coded report defaults.
     */
    leafSSOverrides?: {
      tiers?: Partial<
        Record<
          LeafTierKey,
          {
            leafPriceRange?: { min?: number; max?: number };
            baseMonthlySavings?: { min?: number; max?: number }; // legacy fallback
            recommendedName?: string;
            statusPillText?: string;
          }
        >
      >;
    };
  };

  /** Optional calculation inputs captured on the snapshot creation page */
  calculationInputs?: {
    annualUtilitySpend?: number; // $
    systemShare?: number; // 0–1
    expectedLife?: number; // years
    partialFailure?: boolean;
  };

  // ✅ derived, not user-editable
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

function mapRuntimeToSnapshot(result: ReturnType<typeof calculateLeafSavings>) {
  return {
    currentWaste: result.currentWaste,
    recoverableWaste: result.recoverableWaste,

    minAnnual: result.minAnnualSavings,
    maxAnnual: result.maxAnnualSavings,
    centerAnnual: result.annualSavingsCenter,

    minMonthly: result.minMonthlySavings,
    maxMonthly: result.maxMonthlySavings,
    centerMonthly: result.centerMonthlySavings,
  };
}

function withCalculatedSavings(snapshot: SnapshotDraft): SnapshotDraft {
  const tier = snapshot.suggested.tier;
  if (!tier) return snapshot;

  // Editable inputs captured on the snapshot builder page
  const annualUtilitySpend =
    snapshot.calculationInputs?.annualUtilitySpend ?? 2400; // $200/mo fallback
  const systemShare = snapshot.calculationInputs?.systemShare ?? 0.4; // HVAC-ish fallback
  const expectedLife = snapshot.calculationInputs?.expectedLife ?? 20;
  const partialFailure = snapshot.calculationInputs?.partialFailure;

  // Existing condition (nullable in draft)
  const wear = snapshot.existing.wear ?? 3; // fallback mid
  const age = snapshot.existing.ageYears ?? 10; // fallback mid

  const result = calculateLeafSavings({
    wear,
    age,
    tier,
    annualUtilitySpend,
    systemShare,
    expectedLife,
    partialFailure,
  });

  return {
    ...snapshot,
    calculatedSavings: mapRuntimeToSnapshot(result),
    updatedAt: new Date().toISOString(),
  };
}

export function upsertLocalSnapshot(draft: SnapshotDraft) {
  const items = loadLocalSnapshots();
  const i = items.findIndex((s) => s.id === draft.id);
  const next = withCalculatedSavings(draft);
  if (i >= 0) items[i] = next;
  else items.unshift(next);
  saveLocalSnapshots(items);
}

export function deleteLocalSnapshot(id: string) {
  const items = loadLocalSnapshots().filter((s) => s.id !== id);
  saveLocalSnapshots(items);
}

export function snapshotsForJob(jobId: string) {
  return loadLocalSnapshots().filter((s) => s.jobId === jobId);
}
