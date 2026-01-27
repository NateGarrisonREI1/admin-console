"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteLocalSnapshot,
  getSnapshotById,
  upsertLocalSnapshot,
  type SnapshotDraft,
} from "../../_data/localSnapshots";

function toNumberOrUndefined(v: string): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function clamp01(n: number) {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export default function SnapshotEditorClient({ snapshotId }: { snapshotId: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<SnapshotDraft | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    const found = getSnapshotById(snapshotId);
    setDraft(found);
    setLoading(false);
  }, [snapshotId]);

  const canSave = useMemo(() => !!draft, [draft]);

  // ✅ loosen typing so you don't get "title not assignable to id"
  function update(key: string, value: unknown) {
    setStatus("idle");
    setDraft((prev) => (prev ? ({ ...prev, [key]: value } as SnapshotDraft) : prev));
  }

  function updateExisting(path: string, value: unknown) {
    setStatus("idle");
    setDraft((prev) => {
      if (!prev) return prev;
      const existing = { ...(prev.existing ?? {}) } as Record<string, unknown>;
      existing[path] = value;
      return { ...prev, existing };
    });
  }

  function updateProposed(path: string, value: unknown) {
    setStatus("idle");
    setDraft((prev) => {
      if (!prev) return prev;
      const proposed = { ...(prev.proposed ?? {}) } as Record<string, unknown>;
      proposed[path] = value;
      return { ...prev, proposed };
    });
  }

  function onSave() {
    if (!draft) return;
    try {
      const saved = upsertLocalSnapshot(draft);
      setDraft(saved);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  function onDelete() {
    if (!draft) return;
    deleteLocalSnapshot(draft.id);
    router.push("/admin/snapshots");
  }

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Loading snapshot…</div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Snapshot not found</div>
        <div style={{ color: "#6b7280", marginTop: 6 }}>
          The snapshot id <code>{snapshotId}</code> does not exist in local storage.
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => router.push("/admin/snapshots")}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "white",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Back to Snapshots
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, display: "grid", gap: 16 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Edit Snapshot</div>
          <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
            ID: <code>{draft.id}</code>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => router.push("/admin/snapshots")}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "white",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Back
          </button>

          <button
            onClick={onSave}
            disabled={!canSave}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #16a34a",
              background: canSave ? "#16a34a" : "#9ca3af",
              color: "white",
              cursor: canSave ? "pointer" : "not-allowed",
              fontWeight: 800,
            }}
          >
            Save
          </button>

          <button
            onClick={onDelete}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ef4444",
              background: "white",
              color: "#ef4444",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Status */}
      {status !== "idle" && (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid #ddd",
            background: status === "saved" ? "#ecfdf5" : "#fef2f2",
            color: status === "saved" ? "#065f46" : "#991b1b",
            fontWeight: 700,
          }}
        >
          {status === "saved" ? "Saved ✅" : "Save failed ❌"}
        </div>
      )}

      {/* Basics */}
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "white" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Basics</div>

        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#374151" }}>Title</div>
            <input
              value={String(draft.title ?? "")}
              onChange={(e) => update("title", e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              placeholder="e.g. Replace Furnace"
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#374151" }}>Notes</div>
            <textarea
              value={String(draft.notes ?? "")}
              onChange={(e) => update("notes", e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", minHeight: 90, resize: "vertical" }}
              placeholder="Optional notes…"
            />
          </label>
        </div>
      </section>

      {/* Existing */}
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "white" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Existing System (Intake)</div>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#374151" }}>System Type</div>
            <input
              value={String(draft.existing?.systemType ?? "")}
              onChange={(e) => updateExisting("systemType", e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              placeholder="HVAC, Windows, Water Heater…"
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#374151" }}>Utility Type</div>
            <input
              value={String(draft.existing?.utilityType ?? "")}
              onChange={(e) => updateExisting("utilityType", e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              placeholder="Electric, Gas, Propane…"
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#374151" }}>Age (years)</div>
            <input
              inputMode="numeric"
              value={String(draft.existing?.ageYears ?? "")}
              onChange={(e) => updateExisting("ageYears", toNumberOrUndefined(e.target.value))}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              placeholder="e.g. 12"
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#374151" }}>Share of Utility (0–1)</div>
            <input
              inputMode="decimal"
              value={String(draft.existing?.shareOfUtility ?? "")}
              onChange={(e) => {
                const n = toNumberOrUndefined(e.target.value);
                updateExisting("shareOfUtility", n === undefined ? undefined : clamp01(n));
              }}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              placeholder="e.g. 0.35"
            />
          </label>
        </div>

        <div style={{ color: "#6b7280", fontSize: 12, marginTop: 10 }}>
          Note: We are NOT calculating anything yet — we’re capturing intake fields first.
        </div>
      </section>

      {/* Proposed */}
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "white" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Proposed System (Selection / Intake)</div>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#374151" }}>Catalog System ID</div>
            <input
              value={String(draft.proposed?.catalogSystemId ?? "")}
              onChange={(e) => updateProposed("catalogSystemId", e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              placeholder="(wired to catalog later)"
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#374151" }}>Install Cost (optional)</div>
            <input
              inputMode="numeric"
              value={String(draft.proposed?.installCost ?? "")}
              onChange={(e) => updateProposed("installCost", toNumberOrUndefined(e.target.value))}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              placeholder="e.g. 9500"
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#374151" }}>Make (optional)</div>
            <input
              value={String(draft.proposed?.make ?? "")}
              onChange={(e) => updateProposed("make", e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              placeholder="Brand"
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#374151" }}>Model (optional)</div>
            <input
              value={String(draft.proposed?.model ?? "")}
              onChange={(e) => updateProposed("model", e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              placeholder="Model number"
            />
          </label>
        </div>

        <div style={{ color: "#6b7280", fontSize: 12, marginTop: 10 }}>
          Next step: replace Catalog System ID with a real dropdown + catalog browser.
        </div>
      </section>
    </div>
  );
}
