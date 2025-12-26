"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MOCK_JOBS, type Job } from "../_data/mockJobs";
import { loadLocalJobs } from "../_data/localJobs";
import { loadLocalSnapshots, type SnapshotDraft } from "../_data/localSnapshots";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function SnapshotsPage() {
  const [localJobs, setLocalJobs] = useState<Job[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotDraft[]>([]);

  useEffect(() => {
    setLocalJobs(loadLocalJobs());
    setSnapshots(loadLocalSnapshots());
  }, []);

  const jobsById = useMemo(() => {
    const merged = [...MOCK_JOBS, ...localJobs];
    const map = new Map<string, Job>();
    for (const j of merged) map.set(j.id, j);
    return map;
  }, [localJobs]);

  const ordered = useMemo(() => {
    return [...snapshots].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  }, [snapshots]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="rei-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>LEAF System Snapshots</div>
            <div style={{ color: "var(--muted)" }}>
              All snapshots saved in your browser (localStorage) for now.
            </div>
          </div>

          <Link className="rei-btn rei-btnPrimary" href="/admin/jobs" style={{ textDecoration: "none" }}>
            Create from Jobs
          </Link>
        </div>
      </div>

      <div className="rei-card">
        {ordered.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>No snapshots saved yet.</div>
        ) : (
          <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.2fr 1.4fr 0.9fr 0.9fr 0.8fr 0.9fr",
                gap: 10,
                padding: "12px 14px",
                background: "rgba(16,24,40,.03)",
                fontWeight: 900,
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              <div>Job</div>
              <div>Existing</div>
              <div>Suggested</div>
              <div>Cost</div>
              <div>Savings/yr</div>
              <div>Payback</div>
              <div>Updated</div>
            </div>

            {ordered.map((snap) => {
              const job = jobsById.get(snap.jobId);
              const jobLabel = job ? `${job.customerName} — ${job.reportId}` : snap.jobId;

              return (
                <div
                  key={snap.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1.2fr 1.4fr 0.9fr 0.9fr 0.8fr 0.9fr",
                    gap: 10,
                    padding: "12px 14px",
                    borderTop: "1px solid var(--border)",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <Link
                      href={`/admin/jobs/${snap.jobId}`}
                      style={{ textDecoration: "none", color: "inherit", fontWeight: 900 }}
                    >
                      {jobLabel}
                    </Link>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>
                      {job?.address ?? "—"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontWeight: 900 }}>{snap.existing.type}</div>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>{snap.existing.subtype}</div>
                  </div>

                  <div>
                    <div style={{ fontWeight: 900 }}>{snap.suggested.name}</div>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>
                      {snap.suggested.catalogSystemId ? "From catalog" : "Manual"}
                      {snap.suggested.notes ? ` • ${snap.suggested.notes}` : ""}
                    </div>
                  </div>

                  <div style={{ color: "var(--muted)" }}>{snap.suggested.estCost ?? "—"}</div>
                  <div style={{ color: "var(--muted)" }}>{snap.suggested.estAnnualSavings ?? "—"}</div>
                  <div style={{ color: "var(--muted)" }}>{snap.suggested.estPaybackYears ?? "—"}</div>
                  <div style={{ color: "var(--muted)" }}>{formatDate(snap.updatedAt)}</div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ height: 10 }} />
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          Next: we’ll add “Edit Snapshot” + “Delete Snapshot” here, then build the mock report preview.
        </div>
      </div>
    </div>
  );
}
