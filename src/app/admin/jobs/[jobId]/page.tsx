"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { MOCK_JOBS, type Job } from "../../_data/mockJobs";
import { findLocalJob } from "../../_data/localJobs";

export default function JobDetailPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params?.jobId;

  const [localJob, setLocalJob] = useState<Job | null>(null);

  useEffect(() => {
    if (!jobId) return;
    setLocalJob(findLocalJob(jobId));
  }, [jobId]);

  const job = useMemo(() => {
    if (!jobId) return null;
    return localJob ?? MOCK_JOBS.find((j) => j.id === jobId) ?? null;
  }, [jobId, localJob]);

  if (!jobId) {
    return (
      <div className="rei-card">
        <div style={{ fontWeight: 900 }}>Missing job id</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="rei-card">
        <div style={{ fontWeight: 900, fontSize: 16 }}>Job not found</div>
        <div style={{ color: "var(--muted)", marginTop: 6 }}>
          No job exists with id: <code>{jobId}</code>
        </div>
        <div style={{ marginTop: 12 }}>
          <Link href="/admin/jobs">← Back to Jobs</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Header */}
      <div className="rei-card">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>
              {job.customerName} —{" "}
              <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {job.reportId}
              </span>
            </div>

            <div style={{ color: "var(--muted)" }}>{job.address ?? "—"}</div>

            <div
              style={{
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
                marginTop: 10,
                color: "var(--muted)",
                fontSize: 13,
              }}
            >
              <div>
                <b style={{ color: "var(--text)" }}>Sq Ft:</b> {job.sqft ?? "—"}
              </div>
              <div>
                <b style={{ color: "var(--text)" }}>Year Built:</b> {job.yearBuilt ?? "—"}
              </div>
              <div>
                <b style={{ color: "var(--text)" }}>Systems:</b> {job.systems.length}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Link className="rei-btn" href="/admin/jobs" style={{ textDecoration: "none", color: "inherit" }}>
              ← Jobs
            </Link>
            <button className="rei-btn rei-btnPrimary" type="button" disabled>
              Generate Mock Report
            </button>
          </div>
        </div>
      </div>

      {/* Inspection Upload (placeholder) */}
      <div className="rei-card">
        <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6 }}>Inspection Upload</div>
        <div style={{ color: "var(--muted)", marginBottom: 12 }}>
          Placeholder: upload inspection/HES PDFs here (Supabase Storage later).
        </div>
        <button
          className="rei-btn"
          type="button"
          disabled
          style={{ border: "1px solid var(--border)", background: "transparent" }}
        >
          Upload Inspection PDF (coming next)
        </button>
      </div>

      {/* Existing Systems */}
      <div className="rei-card">
        <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 10 }}>Existing Systems</div>

        {job.systems.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>
            No systems on this job yet. Next step: we’ll add the worksheet/intake panel here and create systems from it.
          </div>
        ) : (
          <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 1.4fr 0.7fr 0.7fr 0.9fr 1fr",
                gap: 10,
                padding: "12px 14px",
                background: "rgba(16,24,40,.03)",
                fontWeight: 900,
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              <div>Type</div>
              <div>Subtype</div>
              <div>Age</div>
              <div>Operational</div>
              <div>Wear</div>
              <div />
            </div>

            {job.systems.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.1fr 1.4fr 0.7fr 0.7fr 0.9fr 1fr",
                  gap: 10,
                  padding: "12px 14px",
                  borderTop: "1px solid var(--border)",
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 900 }}>{s.type}</div>
                <div style={{ color: "var(--muted)" }}>{s.subtype}</div>
                <div style={{ color: "var(--muted)" }}>{s.ageYears} yrs</div>
                <div style={{ color: "var(--muted)" }}>{s.operational}</div>
                <div style={{ color: "var(--muted)" }}>{s.wear}/5</div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <Link
                    className="rei-btn rei-btnPrimary"
                    href={`/admin/snapshots/new?jobId=${encodeURIComponent(job.id)}&systemId=${encodeURIComponent(s.id)}`}
                    style={{ textDecoration: "none" }}
                  >
                    Create Snapshot
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
