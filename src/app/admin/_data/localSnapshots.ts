/**
 * Local Snapshots (Compatibility Layer)
 *
 * Purpose:
 * - Keep the app compiling and usable
 * - Preserve legacy API signatures
 * - Avoid locking in bad architecture
 *
 * This file is intentionally:
 * - In-memory only
 * - Logic-dumb
 * - Replaceable later
 */

export type LeafTierKey = "good" | "better" | "best";

/* ======================================================
 * SNAPSHOT DRAFT (UI SHAPE)
 * ====================================================== */

export type SnapshotDraft = {
  id: string;
  jobId?: string;
  systemId?: string;
  title?: string;

  existing: {
    type?: string;
    subtype?: string;
    ageYears?: number | null;
    operational?: "Yes" | "No";
    wear?: number | null;
    maintenance?: "Good" | "Average" | "Poor";

    label?: string;
    statusPillText?: string;
    annualCostRange?: { min: number; max: number };
    carbonRange?: { min: number; max: number };
    imageUrl?: string;
  };

  suggested: {
    catalogSystemId?: string | null;
    name?: string;
    estCost?: number | null;

    estAnnualSavings?: number | null;
    estPaybackYears?: number | null;

    notes?: string;
    tier?: LeafTierKey;

    recommendedNameByTier?: Record<string, string>;
    statusPillTextByTier?: Record<string, string>;
    imageUrl?: string;

    leafSSOverrides?: {
      tiers?: Record<string, any>;
    };
  };

  calculationInputs: {
    annualUtilitySpend?: number;
    systemShare?: number;
    expectedLife?: number;
    partialFailure?: boolean;
  };

  createdAt?: string;
  updatedAt?: string;

  // Escape hatch while rebuilding schema
  [key: string]: any;
};

/* ======================================================
 * IN-MEMORY STORE
 * ====================================================== */

let _snapshots: SnapshotDraft[] = [];

/* ======================================================
 * LOADERS
 * ====================================================== */

export function loadLocalSnapshots(): SnapshotDraft[] {
  return _snapshots;
}

export function snapshotsForJob(jobId: string): SnapshotDraft[] {
  return _snapshots.filter((s) => s.jobId === jobId);
}

/* ======================================================
 * MUTATIONS
 * ====================================================== */

export function upsertLocalSnapshot(snapshot: SnapshotDraft): SnapshotDraft {
  const index = _snapshots.findIndex((s) => s.id === snapshot.id);
  const now = new Date().toISOString();

  if (index >= 0) {
    _snapshots[index] = {
      ..._snapshots[index],
      ...snapshot,
      existing: snapshot.existing,
      suggested: snapshot.suggested,
      calculationInputs: snapshot.calculationInputs,
      updatedAt: now,
    };
  } else {
    _snapshots.push({
      ...snapshot,
      createdAt: snapshot.createdAt || now,
      updatedAt: now,
    });
  }

  return snapshot;
}

export function deleteLocalSnapshot(snapshotId: string): void {
  _snapshots = _snapshots.filter((s) => s.id !== snapshotId);
}

/* ======================================================
 * LEGACY COMPAT
 * ====================================================== */

/**
 * Legacy callers sometimes pass an updated array.
 * We accept it to stay compatible.
 */
export function saveLocalSnapshots(next?: SnapshotDraft[]): void {
  if (Array.isArray(next)) {
    _snapshots = next;
  }
}
