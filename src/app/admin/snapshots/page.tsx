"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadLocalSnapshots, type SnapshotDraft } from "../_data/localSnapshots";

function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function SnapshotsPage() {
  const [snapshots, setSnapshots] = useState<SnapshotDraft[]>([]);

  useEffect(() => {
    setSnapshots(loadLocalSnapshots());
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>REI Admin</h1>
          <h2 style={{ margin: "8px 0 0" }}>System Snapshots</h2>
          <div style={{ color: "#6b7280", marginTop: 6 }}>Local-only v0 (in-memory). Single source: localSnapshots.ts</div>
        </div>

        <Link
          href="/admin/snapshots/new"
          style={{
            border: "1px solid #111",
            padding: "10px 14px",
            borderRadius: 10,
            textDecoration: "none",
            color: "#111",
            fontWeight: 800,
            background: "white",
          }}
        >
          + New Snapshot
        </Link>
      </header>

      <div style={{ marginTop: 18 }}>
        <Link href="/admin" style={{ color: "#6d28d9", textDecoration: "none" }}>
          ← Back to Admin
        </Link>
      </div>

      <section style={{ marginTop: 18 }}>
        {snapshots.length === 0 ? (
          <div style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12, background: "white" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>No snapshots yet</div>
            <div style={{ color: "#6b7280" }}>
              Click <b>+ New Snapshot</b> to create your first LEAF System Snapshot.
            </div>
          </div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {snapshots.map((s) => (
              <li key={s.id} style={{ marginBottom: 14 }}>
                <Link href={`/admin/snapshots/${encodeURIComponent(s.id)}`} style={{ fontWeight: 900 }}>
                  {s.title?.trim()
                    ? s.title
                    : `${s.existing?.type || "System"} — ${s.existing?.subtype || "Snapshot"}`}
                </Link>

                <div style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>
                  Job: <b>{s.jobId || "—"}</b> • System: <b>{s.systemId || "—"}</b>
                </div>

                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  Updated: {formatDate(s.updatedAt || s.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
