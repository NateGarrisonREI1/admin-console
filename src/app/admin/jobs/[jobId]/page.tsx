"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { useParams } from "next/navigation";

import { MOCK_JOBS, type Job } from "../../_data/mockJobs";
import { findLocalJob } from "../../_data/localJobs";
import {
  deleteLocalSnapshot,
  loadLocalSnapshots,
  snapshotsForJob,
  type SnapshotDraft,
} from "../../_data/localSnapshots";


/* ===========================
   SAFE INCENTIVE PLACEHOLDER
   =========================== */

/**
 * Temporary incentive shape.
 * This prevents TS errors and allows wording edits.
 * Later this will be replaced by real rules + Supabase.
 */
type IncentiveResource = {
  id: string;
  programName: string;
  shortBlurb?: string;
  details?: string;
  amount?: {
    kind: "flat" | "range" | "text";
    value?: number | string;
    min?: number;
    max?: number;
    unit?: "percent" | "per_year" | "one_time";
  };
  links?: { label: string; url: string }[];
};

const incentiveResources: IncentiveResource[] = []; // intentionally empty for now

/* ===========================
   HELPERS
   =========================== */

function formatMoney(n?: number | null) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function badgeStyle(tone: "good" | "warn" | "bad" | "neutral"): CSSProperties {
  const map: Record<string, CSSProperties> = {
    good: { background: "#14532d", color: "#bbf7d0" },
    warn: { background: "#78350f", color: "#fde68a" },
    bad: { background: "#7f1d1d", color: "#fecaca" },
    neutral: { background: "#1f2937", color: "#e5e7eb" },
  };
  return map[tone];
}

/* ===========================
   PAGE
   =========================== */

export default function MockLeafReportPage() {
  const params = useParams();
  const jobId = params?.jobId as string;

  const job: Job | null = useMemo(() => {
    return findLocalJob(jobId) ?? MOCK_JOBS.find((j) => j.id === jobId) ?? null;
  }, [jobId]);

  const snapshots = useMemo(() => {
    loadLocalSnapshots();
    return snapshotsForJob(jobId);
  }, [jobId]);

  const [index, setIndex] = useState(0);
  const active = snapshots[index];

  if (!job) {
    return (
      <div className="rei-card">
        <h2>Job not found</h2>
        <Link href="/admin/jobs">← Back to Jobs</Link>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="rei-card">
        <h2>No snapshots yet</h2>
        <p>Create at least one snapshot to generate a report.</p>
        <Link href={`/admin/jobs/${job.id}`}>← Back to Job</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* HEADER */}
      <div className="rei-card" style={{ background: "#000", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900 }}>LEAF Report Preview</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              {job.customerName} • {job.reportId}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Link className="rei-btn" href={`/admin/jobs/${job.id}`}>
              ← Back
            </Link>
            <button
              className="rei-btn rei-btnPrimary"
              onClick={() => alert("Send Report (placeholder)")}
            >
              Send Report
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
          <button
            className="rei-btn"
            disabled={index === 0}
            onClick={() => setIndex((i) => clamp(i - 1, 0, snapshots.length - 1))}
          >
            ← Prev
          </button>
          <button
            className="rei-btn"
            disabled={index === snapshots.length - 1}
            onClick={() => setIndex((i) => clamp(i + 1, 0, snapshots.length - 1))}
          >
            Next →
          </button>
        </div>
      </div>

      {/* EXISTING VS SUGGESTED */}
      <div className="rei-card">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <h3>Current System</h3>
            <p>
              {active.existing.type} — {active.existing.subtype}
            </p>
            <p style={{ fontSize: 12, opacity: 0.7 }}>
              Age: {active.existing.ageYears ?? "—"} yrs • Wear:{" "}
              {active.existing.wear ?? "—"}/5
            </p>
          </div>

          <div>
            <h3>Recommended Upgrade</h3>
            <p>{active.suggested.name}</p>
            <p style={{ fontSize: 12 }}>
              Est. Cost: <b>{formatMoney(active.suggested.estCost)}</b>
              <br />
              Est. Savings / yr:{" "}
              <b>{formatMoney(active.suggested.estAnnualSavings)}</b>
            </p>
          </div>
        </div>
      </div>

      {/* INCENTIVES */}
      <div className="rei-card">
        <h3>Incentives & Rebates</h3>
        <p style={{ fontSize: 12, opacity: 0.7 }}>
          This section will be driven by editable rules later.
        </p>

        {incentiveResources.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.6 }}>
            No incentives matched yet. (Normal until rules are added.)
          </div>
        ) : (
          incentiveResources.map((r) => (
            <div key={r.id}>
              <b>{r.programName}</b>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
