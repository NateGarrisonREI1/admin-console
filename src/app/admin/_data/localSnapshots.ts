/**
 * Local Snapshots (Compatibility Layer)
 *
 * Goal: keep the app compiling + running while we rebuild
 * the real domain model + persistence.
 *
 * ✅ Exposes the legacy API expected by pages/components
 * ✅ Stores data in-memory only
 * ❌ No business logic here
 */

export type LeafTierKey = "good" | "better" | "best";

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

  // allow future fields while rebuilding schema
  [key: string]: any;

  createdAt?: string;
  updatedAt?: string;
};

/* ======================================================
 * IN-MEMORY STORE (TEMPORARY)
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
      existing: snapshot.existing || _snapshots[index].existing,
      suggested: snapshot.suggested || _snapshots[index].suggested,
      calculationInputs:
        snapshot.calculationInputs || _snapshots[index].calculationInputs,
      updatedAt: now,
    };
  } else {
    _snapshots.push({
      ...snapshot,
      existing: snapshot.existing ?? {},
      suggested: snapshot.suggested ?? {},
      calculationInputs: snapshot.calculationInputs ?? {},
      createdAt: snapshot.createdAt || now,
      updatedAt: now,
    });
  }

  return snapshot;
}

export function deleteLocalSnapshot(snapshotId: string): void {
  _snapshots = _snapshots.filter((s) => s.id !== snapshotId);
}

/**
 * Previously persisted snapshots.
 * Now a no-op for compatibility.
 */
export function saveLocalSnapshots(): void {
  // intentionally empty
}
