"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadLocalSnapshots, type SnapshotDraft } from "../_data/localSnapshots";

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : "—";
}

function toText(v: unknown) {
  if (v == null) return "—";
  if (typeof v === "string") return v.trim() || "—";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "—";
  if (typeof v === "boolean") return v ? "true" : "false";

  // Avoid ReactNode '{}' issues by never returning objects directly
  try {
    const s = String(v);
    return s && s !== "[object Object]" ? s : "—";
  } catch {
    return "—";
  }
}

export default function Page() {
  const [rows, setRows] = useState<SnapshotDraft[]>([]);

  useEffect(() => {
    setRows(loadLocalSnapshots());
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Snapshots (Local)</div>
          <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
            Stored in browser localStorage for now.
          </div>
        </div>

        <Link
          href="/admin/snapshots/new"
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #16a34a",
            background: "#16a34a",
            color: "white",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          + New Snapshot
        </Link>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {rows.length === 0 ? (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 14,
              background: "white",
              color: "#6b7280",
              fontWeight: 700,
            }}
          >
            No local snapshots yet.
          </div>
        ) : (
          rows.map((s) => {
            const title = toText((s as any).title);
            const jobId = toText((s as any).jobId);
            const systemId = toText((s as any).systemId);

            return (
              <Link
                key={String((s as any).id)}
                href={`/admin/snapshots/${encodeURIComponent(String((s as any).id))}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    padding: 14,
                    background: "white",
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 15 }}>
                    {title === "—" ? "Untitled Snapshot" : title}
                  </div>

                  <div style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>
                    Job: <b>{jobId}</b> • System: <b>{systemId}</b>
                  </div>

                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    Updated: <b>{formatDate((s as any).updatedAt as any)}</b>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
