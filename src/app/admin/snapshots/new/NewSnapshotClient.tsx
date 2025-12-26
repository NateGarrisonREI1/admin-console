"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { MOCK_JOBS, type Job, type ExistingSystem } from "../../_data/mockJobs";
import { findLocalJob } from "../../_data/localJobs";

export default function NewSnapshotClient() {
  const sp = useSearchParams();
  const jobId = sp.get("jobId") || "";
  const systemId = sp.get("systemId") || "";

  const { job, system } = useMemo(() => {
    let job: Job | null = null;

    if (jobId) {
      job = findLocalJob(jobId) ?? MOCK_JOBS.find((j) => j.id === jobId) ?? null;
    }

    let system: ExistingSystem | null = null;
    if (job && systemId) {
      system = job.systems.find((s) => s.id === systemId) ?? null;
    }

    return { job, system };
  }, [jobId, systemId]);

  if (!jobId || !systemId) {
    return (
      <div className="rei-card">
        <div style={{ fontWeight: 900, fontSize: 16 }}>Missing parameters</div>
        <div style={{ color: "var(--muted)", marginTop: 8 }}>
          Expected <code>?jobId=...</code> and <code>&systemId=...</code>
        </div>
        <div style={{ marginTop: 12 }}>
          <Link href="/admin/jobs">← Back to Jobs</Link>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="rei-card">
        <div style={{ fontWeight: 900, fontSize: 16 }}>Job not found</div>
        <div style={{ color: "var(--muted)", marginTop: 8 }}>
          No job exists with id: <code>{jobId}</code>
        </div>
        <div style={{ marginTop: 12 }}>
          <Link href="/admin/jobs">← Back to Jobs</Link>
        </div>
      </div>
    );
  }

  if (!system) {
    return (
      <div className="rei-card">
        <div style={{ fontWeight: 900, fontSize: 16 }}>System not found</div>
        <div style={{ color: "var(--muted)", marginTop: 8 }}>
          This job exists, but no system matches id: <code>{systemId}</code>
        </div>
        <div style={{ marginTop: 12 }}>
          <Link href={`/admin/jobs/${job.id}`}>← Back to Job</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="rei-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>
              New LEAF System Snapshot
            </div>
            <div style={{ color: "var(--muted)" }}>
              Job: <b>{job.customerName}</b> — {job.reportId}
            </div>
          </div>

          <Link
            className="rei-btn"
            href={`/admin/jobs/${job.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            ← Back to Job
          </Link>
        </div>
      </div>

      <div className="rei-card">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>System (from worksheet)</div>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 14,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", color: "var(--muted)" }}>
            <div>
              <b style={{ color: "var(--text)" }}>Type:</b> {system.type}
            </div>
            <div>
              <b style={{ color: "var(--text)" }}>Subtype:</b> {system.subtype}
            </div>
            <div>
              <b style={{ color: "var(--text)" }}>Age:</b> {system.ageYears} yrs
            </div>
            <div>
              <b style={{ color: "var(--text)" }}>Operational:</b> {system.operational}
            </div>
            <div>
              <b style={{ color: "var(--text)" }}>Wear:</b> {system.wear}/5
            </div>
            <div>
              <b style={{ color: "var(--text)" }}>Maintenance:</b> {system.maintenance}
            </div>
          </div>

          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Next: we’ll render your actual Snapshot intake UI here and store snapshots (localStorage first, Supabase later).
          </div>

          <button className="rei-btn rei-btnPrimary" type="button" disabled>
            Save Snapshot (coming next)
          </button>
        </div>
      </div>
    </div>
  );
}
