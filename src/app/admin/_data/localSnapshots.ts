// src/app/admin/_data/localSnapshots.ts
// Simple client-only storage for snapshot drafts (dev helper)

export type SnapshotDraft = {
  id: string;
  title?: string;
  updated_at?: string; // ISO
  created_at?: string; // ISO

  // snapshot editor expects this
  existing?: Record<string, unknown>;

  // keep generic payload too
  data?: any;
};


const KEY = "leaf_admin_local_snapshots_v1";

function safeNowISO() {
  return new Date().toISOString();
}

function readAll(): SnapshotDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows: SnapshotDraft[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    // ignore
  }
}

export function loadLocalSnapshots(): SnapshotDraft[] {
  return readAll().sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
}

export function getSnapshotById(id: string): SnapshotDraft | null {
  const all = readAll();
  return all.find((s) => s.id === id) ?? null;
}

export function upsertLocalSnapshot(draft: SnapshotDraft) {
  const all = readAll();
  const now = safeNowISO();
  const next: SnapshotDraft = {
    ...draft,
    updated_at: now,
    created_at: draft.created_at || now,
  };
  const idx = all.findIndex((s) => s.id === next.id);
  if (idx >= 0) all[idx] = next;
  else all.unshift(next);
  writeAll(all);
  return next;
}

export function deleteLocalSnapshot(id: string) {
  const all = readAll().filter((s) => s.id !== id);
  writeAll(all);
}

export function createSnapshotDraft(partial?: Partial<SnapshotDraft>): SnapshotDraft {
  const id =
    partial?.id ||
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `draft_${Math.random().toString(36).slice(2)}`);

  const now = safeNowISO();
  return {
    id,
    title: partial?.title || "Untitled Snapshot",
    data: partial?.data ?? {},
    created_at: partial?.created_at || now,
    updated_at: partial?.updated_at || now,
  };
}
