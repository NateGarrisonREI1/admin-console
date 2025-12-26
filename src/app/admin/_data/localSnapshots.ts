export type SnapshotDraft = {
  id: string;

  // ties it back to the Job + Existing System
  jobId: string;
  systemId: string;

  // existing system context (copied at creation time so it doesn't change later)
  existing: {
    type: string;
    subtype: string;
    ageYears: number;
    operational: string;
    wear: number;
    maintenance: string;
  };

  // suggested upgrade selection
  suggested: {
    catalogSystemId: string | null;
    name: string; // what we show in the snapshot
    estCost: number | null;
    estAnnualSavings: number | null;
    estPaybackYears: number | null;
    notes: string;
  };

  createdAt: string;
  updatedAt: string;
};

const KEY = "rei_mock_snapshots_v1";

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

export function upsertLocalSnapshot(snapshot: SnapshotDraft) {
  const existing = loadLocalSnapshots();
  const idx = existing.findIndex((s) => s.id === snapshot.id);

  const next =
    idx >= 0
      ? [...existing.slice(0, idx), snapshot, ...existing.slice(idx + 1)]
      : [snapshot, ...existing];

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
