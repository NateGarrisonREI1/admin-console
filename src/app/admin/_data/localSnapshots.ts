/**
 * Local Snapshots (Compatibility Layer)
 *
 * This file exists to preserve the local snapshot API surface
 * while the persistence and calculation engines are rebuilt.
 *
 * ⚠️ All functions are intentionally no-op or in-memory.
 * ⚠️ Do NOT add business logic here.
 */

/* ======================================================
 * TYPES
 * ====================================================== */

export type SnapshotDraft = {
  id: string;
  jobId?: string;
  title?: string;

  // Temporary / transitional fields
  baselineAnnualCost?: number;
  baselineMonthlyCost?: number;
  annualSavings?: number;
  monthlySavings?: number;

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
      updatedAt: now,
    };
  } else {
    _snapshots.push({
      ...snapshot,
      createdAt: now,
      updatedAt: now,
    });
  }

  return snapshot;
}

export function deleteLocalSnapshot(snapshotId: string): void {
  _snapshots = _snapshots.filter((s) => s.id !== snapshotId);
}

/* ======================================================
 * LEGACY / SAFE NO-OPS
 * ====================================================== */

/**
 * Previously persisted snapshots.
 * Now a no-op for compatibility.
 */
export function saveLocalSnapshots(): void {
  // intentionally empty
}
