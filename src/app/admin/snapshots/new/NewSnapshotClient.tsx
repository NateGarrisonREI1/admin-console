"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSnapshotDraft, upsertLocalSnapshot } from "../../_data/localSnapshots";

function req(v: string | null | undefined) {
  return (v ?? "").trim();
}

export default function NewSnapshotClient() {
  const router = useRouter();
  const sp = useSearchParams();

  // INTAKE-FIRST: ONLY accept data from params (or later: from a selected Job)
  // No seeded demo values.
  const jobIdFromUrl = req(sp.get("jobId"));
  const systemIdFromUrl = req(sp.get("systemId"));
  const systemTypeFromUrl = req(sp.get("systemType")); // optional fallback

  // Allow a minimal manual override ONLY for development (still empty by default)
  const [jobId, setJobId] = useState(jobIdFromUrl);
  const [systemId, setSystemId] = useState(systemIdFromUrl);
  const [systemType, setSystemType] = useState(systemTypeFromUrl);

  const hasMinimum = useMemo(() => {
    // You must have a jobId + either systemId OR systemType to create.
    return Boolean(jobId) && (Boolean(systemId) || Boolean(systemType));
  }, [jobId, systemId, systemType]);

  function create() {
    if (!hasMinimum) return;

    // INTAKE-FIRST: create EMPTY snapshot shell.
    // existing/proposed/calcs get filled by intake + editor chunks later.
    const draft = createSnapshotDraft({
      jobId,
      systemId: systemId || undefined,
      title: "",

      // Keep these minimal and empty.
      existing: systemType ? { type: systemType } : undefined,
      suggested: undefined,
      calculationInputs: undefined,
    });

    const saved = upsertLocalSnapshot(draft);
    router.push(`/admin/snapshots/${encodeURIComponent(saved.id)}`);
  }

  return (
    <main style={{ padding: 24, maxWidth: 820 }}>
      <h1 style={{ margin: 0 }}>Create Snapshot</h1>
      <div style={{ color: "#6b7280", marginTop: 8 }}>
        Intake-first: this page creates a snapshot only when required intake fields are present.
      </div>

      {!hasMinimum && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            border: "1px solid #fde68a",
            background: "#fffbeb",
            borderRadius: 12,
          }}
        >
          <div style={{ fontWeight: 900 }}>Missing intake context</div>
          <div style={{ marginTop: 6, color: "#92400e" }}>
            This route must be opened from a Job/System intake flow.
            <br />
            Required: <b>jobId</b> + (<b>systemId</b> or <b>systemType</b>)
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "#92400e" }}>
            Example: <code>/admin/snapshots/new?jobId=123&systemType=HVAC</code>
          </div>
        </div>
      )}

      <section style={{ marginTop: 18, padding: 14, border: "1px solid #e5e7eb", borderRadius: 12, background: "white" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Intake Inputs</div>

        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Job ID (required)</div>
            <input
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="Provided by intake"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>System ID (optional if systemType provided)</div>
            <input
              value={systemId}
              onChange={(e) => setSystemId(e.target.value)}
              placeholder="Provided by intake"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>System Type (optional if systemId provided)</div>
            <input
              value={systemType}
              onChange={(e) => setSystemType(e.target.value)}
              placeholder="HVAC, Windows, Insulation, etc."
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            onClick={create}
            disabled={!hasMinimum}
            style={{
              border: "1px solid #111",
              padding: "10px 14px",
              borderRadius: 10,
              background: hasMinimum ? "#111" : "#999",
              color: "white",
              fontWeight: 900,
              cursor: hasMinimum ? "pointer" : "not-allowed",
            }}
          >
            Create Snapshot
          </button>

          <Link
            href="/admin/snapshots"
            style={{
              border: "1px solid #ddd",
              padding: "10px 14px",
              borderRadius: 10,
              background: "white",
              textDecoration: "none",
              color: "#111",
            }}
          >
            Cancel
          </Link>
        </div>
      </section>
    </main>
  );
}
