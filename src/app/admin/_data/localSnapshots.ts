// src/app/admin/_data/localSnapshots.ts

export type SnapshotExisting = {
  systemType?: string;
  utilityType?: string;
  ageYears?: number;
  shareOfUtility?: number;
  // allow extra fields without TS whack-a-mole
  [key: string]: unknown;
};

export type SnapshotProposed = {
  catalogSystemId?: string;
  installCost?: number;
  make?: string;
  model?: string;
  [key: string]: unknown;
};

export type SnapshotDraft = {
  id: string;

  // keep optional so older code compiles, but we always *store* strings
  title?: string;
  notes?: string;

  existing?: SnapshotExisting;
  proposed?: SnapshotProposed;

  updatedAt?: string; // ISO
  createdAt?: string; // ISO

  // allow extra fields (jobId/systemId/etc) without needing type edits
  [key: string]: unknown;
};

const LS_KEY = "leaf_admin_local_snapshots_v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `snap_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function readAll(): SnapshotDraft[] {
  if (typeof window === "undefined") return [];
  const arr = safeParse<SnapshotDraft[]>(window.localStorage.getItem(LS_KEY));
  return Array.isArray(arr) ? arr : [];
}

function writeAll(items: SnapshotDraft[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(items));
}

export function loadLocalSnapshots(): SnapshotDraft[] {
  return readAll().sort((a, b) =>
    String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""))
  );
}

export function getSnapshotById(id: string): SnapshotDraft | null {
  const all = readAll();
  return all.find((s) => s.id === id) ?? null;
}

/**
 * Create a draft snapshot shell.
 * Supports optional init so callers can do createSnapshotDraft({ jobId, systemId, title })
 */
export function createSnapshotDraft(
  init?: Partial<SnapshotDraft> & {
    existing?: SnapshotExisting;
    proposed?: SnapshotProposed;
  }
): SnapshotDraft {
  const id = String(init?.id ?? makeId());
  const iso = nowIso();

  return {
    // init first so we can overwrite below with safe defaults
    ...(init ?? {}),

    id,

    // normalize common fields so editor inputs are always safe
    title: String(init?.title ?? ""),
    notes: String(init?.notes ?? ""),

    existing: (init?.existing ?? {}) as SnapshotExisting,
    proposed: (init?.proposed ?? {}) as SnapshotProposed,

    createdAt: String(init?.createdAt ?? iso),
    updatedAt: String(init?.updatedAt ?? iso),
  };
}

export function upsertLocalSnapshot(draft: SnapshotDraft): SnapshotDraft {
  const all = readAll();
  const iso = nowIso();

  const next: SnapshotDraft = {
    ...draft,

    // normalize
    id: String(draft.id),
    title: String(draft.title ?? ""),
    notes: String(draft.notes ?? ""),
    existing: (draft.existing ?? {}) as SnapshotExisting,
    proposed: (draft.proposed ?? {}) as SnapshotProposed,
    createdAt: String(draft.createdAt ?? iso),
    updatedAt: iso,
  };

  const idx = all.findIndex((s) => s.id === next.id);
  if (idx >= 0) all[idx] = next;
  else all.unshift(next);

  writeAll(all);
  return next;
}

export function deleteLocalSnapshot(id: string): void {
  const all = readAll().filter((s) => s.id !== id);
  writeAll(all);
}
