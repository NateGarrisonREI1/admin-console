"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { MOCK_JOBS, type Job } from "../../_data/mockJobs";
import { findLocalJob } from "../../_data/localJobs";

import { upsertLocalSnapshot, type SnapshotDraft } from "../../_data/localSnapshots";

function nowIso() {
  return new Date().toISOString();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function NewSnapshotClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const jobId = sp.get("jobId") ?? "";
  const systemId = sp.get("systemId") ?? "";

  const job: Job | null = useMemo(() => {
    if (!jobId) return null;
    return findLocalJob(jobId) ?? MOCK_JOBS.find((j) => j.id === jobId) ?? null;
  }, [jobId]);

  const existingSystem = useMemo(() => {
    if (!job) return null;
    // Expecting job.systems[] exists in your mock/local job shape
    const sys = (job.systems || []).find((s: any) => s.id === systemId);
    return sys ?? null;
  }, [job, systemId]);

  const [suggestedName, setSuggestedName] = useState("");
  const [estCost, setEstCost] = useState<string>("");
  const [estAnnualSavings, setEstAnnualSavings] = useState<string>("");
  const [estPaybackYears, setEstPaybackYears] = useState<string>("");
  const [notes, setNotes] = useState("");

  const backHref = job ? `/admin/jobs/${job.id}` : "/admin/jobs";

  function parseNum(v: string) {
    const cleaned = (v || "").replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function onSave() {
    if (!job || !existingSystem) return;

    if (!suggestedName.trim()) {
      alert("Suggested system name is required.");
      return;
    }

    const draft: SnapshotDraft = {
      id: `snap_${Math.random().toString(16).slice(2)}_${Date.now()}`,
      jobId: job.id,
      systemId: existingSystem.id,
      createdAt: nowIso(),
      updatedAt: nowIso(),

      existing: {
        type: existingSystem.type ?? "",
        subtype: existingSystem.subtype ?? "",
        ageYears: existingSystem.ageYears ?? null,
        operational: existingSystem.operational ?? "",
        wear: existingSystem.wear ?? null,
        maintenance: existingSystem.maintenance ?? "",
      },

      suggested: {
  name: suggestedName.trim(),

  // Optional catalog reference (future-ready)
  catalogSystemId: null,

  estCost: parseNum(estCost),
  estAnnualSavings: parseNum(estAnnualSavings),
  estPaybackYears: parseNum(estPaybackYears),
  notes: notes.trim(),
},

    upsertLocalSnapshot(draft);

    // back to job page where Saved Snapshots should show it
    router.push(`/admin/jobs/${job.id}?snapSaved=1`);
  }

  if (!jobId || !systemId) {
    return (
      <div className="rei-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Missing URL parameters</div>
        <div style={{ color: "var(--muted)" }}>
          Expected <code>?jobId=...</code> and <code>&systemId=...</code>.
        </div>
        <Link className="rei-btn" href="/admin/jobs" style={{ width: "fit-content" }}>
          ← Back to Jobs
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="rei-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Job not found</div>
        <div style={{ color: "var(--muted)" }}>
          No job exists with id: <code>{jobId}</code>
        </div>
        <Link className="rei-btn" href="/admin/jobs" style={{ width: "fit-content" }}>
          ← Back to Jobs
        </Link>
      </div>
    );
  }

  if (!existingSystem) {
    return (
      <div className="rei-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Existing system not found</div>
        <div style={{ color: "var(--muted)" }}>
          No system exists with id: <code>{systemId}</code> for this job.
        </div>
        <Link className="rei-btn" href={backHref} style={{ width: "fit-content" }}>
          ← Back to Job
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Header */}
      <div className="rei-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>New LEAF System Snapshot</div>
            <div style={{ color: "var(--muted)", marginTop: 6 }}>
              Job: <b>{job.customerName}</b> — <span style={{ opacity: 0.75 }}>{job.reportId}</span>
            </div>
          </div>

          <Link className="rei-btn" href={backHref} style={{ width: "fit-content" }}>
            ← Back to Job
          </Link>
        </div>
      </div>

      {/* Existing system */}
      <div className="rei-card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Existing System (from worksheet)</div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 12,
            background: "white",
          }}
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <span style={{ fontWeight: 800 }}>Type:</span> {existingSystem.type}
            </div>
            <div>
              <span style={{ fontWeight: 800 }}>Subtype:</span> {existingSystem.subtype}
            </div>
            <div>
              <span style={{ fontWeight: 800 }}>Age:</span> {existingSystem.ageYears ?? "—"} yrs
            </div>
            <div>
              <span style={{ fontWeight: 800 }}>Operational:</span> {existingSystem.operational ?? "—"}
            </div>
            <div>
              <span style={{ fontWeight: 800 }}>Wear:</span> {existingSystem.wear ?? "—"}/5
            </div>
            <div>
              <span style={{ fontWeight: 800 }}>Maintenance:</span> {existingSystem.maintenance ?? "—"}
            </div>
          </div>

          <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 12 }}>
            This data was captured from the worksheet so your snapshot has context.
          </div>
        </div>
      </div>

      {/* Suggested upgrade */}
      <div className="rei-card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Suggested Upgrade (Proposed)</div>

        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 700 }}>
              Suggested system name <span style={{ color: "#ef4444" }}>(required)</span>
            </div>
            <input
              value={suggestedName}
              onChange={(e) => setSuggestedName(e.target.value)}
              placeholder="e.g., Heat Pump Upgrade"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
            />
            <div style={{ color: "var(--muted)", fontSize: 12 }}>
              Tip: use catalog + tweak later. Or type a custom upgrade name.
            </div>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 700 }}>Est. Cost ($)</div>
              <input
                value={estCost}
                onChange={(e) => setEstCost(e.target.value)}
                placeholder="e.g., 6000"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 700 }}>Est. Savings / yr ($)</div>
              <input
                value={estAnnualSavings}
                onChange={(e) => setEstAnnualSavings(e.target.value)}
                placeholder="e.g., 350"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 700 }}>Est. Payback (yrs)</div>
              <input
                value={estPaybackYears}
                onChange={(e) => setEstPaybackYears(e.target.value)}
                placeholder="e.g., 12"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 700 }}>Notes / highlights</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Short notes to appear on snapshot/report"
              rows={4}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="rei-btn rei-btnPrimary" type="button" onClick={onSave}>
              Save Snapshot
            </button>
          </div>

          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            Saved snapshots are stored in your browser (localStorage) for now.
          </div>
        </div>
      </div>
    </div>
  );
}
