"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { MOCK_JOBS, type Job } from "../../_data/mockJobs";
import { findLocalJob } from "../../_data/localJobs";

import {
  deleteLocalSnapshot,
  loadLocalSnapshots,
  snapshotsForJob,
  type SnapshotDraft,
} from "../../_data/localSnapshots";

import SnapshotEditor from "./_components/SnapshotEditor";

/**
 * Job detail page
 * - Shows Existing Systems
 * - Shows Saved Snapshots (Edit/Delete)
 * - Inline SnapshotEditor (Create + Edit)
 */

function pretty(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

export default function JobPage() {
  const params = useParams();
  const jobId = (params?.jobId as string) || "";

  const job: Job | null = useMemo(() => {
    if (!jobId) return null;
    return findLocalJob(jobId) ?? MOCK_JOBS.find((j) => j.id === jobId) ?? null;
  }, [jobId]);

  const [snapshots, setSnapshots] = useState<SnapshotDraft[]>(() => {
    loadLocalSnapshots();
    return jobId ? snapshotsForJob(jobId) : [];
  });

  const [editingSystem, setEditingSystem] = useState<any | null>(null);
  const [editingSnapshot, setEditingSnapshot] = useState<SnapshotDraft | null>(null);

  function refreshSnapshots() {
    loadLocalSnapshots();
    setSnapshots(jobId ? snapshotsForJob(jobId) : []);
  }

  function onDeleteSnapshot(id: string) {
    const ok = confirm("Delete this snapshot? This cannot be undone (local only).");
    if (!ok) return;
    deleteLocalSnapshot(id);
    refreshSnapshots();
  }

  if (!job) {
    return (
      <div className="rei-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Job not found</div>
        <Link className="rei-btn" href="/admin/jobs">
          ← Back to Jobs
        </Link>
      </div>
    );
  }

  const addressLine =
    (job as any).address ??
    (job as any).propertyAddress ??
    (job as any).addressLine ??
    "";

  const reportId = (job as any).reportId ?? job.id;

  const existingSystems: any[] =
    (job as any).existingSystems ??
    (job as any).systems ??
    [];

  return (
    <div style={{ padding: 20, maxWidth: 1100 }}>
      {/* Header */}
      <div className="rei-card" style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>
            {(job as any).customerName
              ? `${(job as any).customerName} — ${reportId}`
              : reportId}
          </div>
          <div style={{ color: "var(--muted)", marginTop: 4 }}>{addressLine}</div>
        </div>

        <Link className="rei-btn" href="/admin/jobs">
          ← Jobs
        </Link>
      </div>

      {/* Existing Systems */}
      <div className="rei-card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Existing Systems</div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {existingSystems.map((sys: any, idx: number) => {
            const systemId = sys.id ?? `sys_${idx}`;

            return (
              <div
                key={systemId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>
                    {sys.type} • {sys.subtype}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    Age: {pretty(sys.ageYears)} yrs · Wear: {pretty(sys.wear)}
                  </div>
                </div>

                <button
                  className="rei-btn rei-btnPrimary"
                  onClick={() => {
                    setEditingSystem({
                      id: systemId,
                      type: sys.type,
                      subtype: sys.subtype,
                      ageYears: sys.ageYears,
                      operational: sys.operational,
                      wear: sys.wear,
                      maintenance: sys.maintenance,
                    });
                    setEditingSnapshot(null);
                  }}
                >
                  Create Snapshot
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Snapshot Editor */}
      {(editingSystem || editingSnapshot) && (
        <SnapshotEditor
          jobId={job.id}
          existingSystem={
            editingSnapshot
              ? { id: editingSnapshot.systemId, ...editingSnapshot.existing }
              : editingSystem
          }
          snapshot={editingSnapshot}
          onClose={() => {
            setEditingSystem(null);
            setEditingSnapshot(null);
          }}
          onSaved={() => {
            setEditingSystem(null);
            setEditingSnapshot(null);
            refreshSnapshots();
          }}
        />
      )}

      {/* Saved Snapshots */}
      <div className="rei-card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Saved Snapshots</div>

        {snapshots.length === 0 ? (
          <div style={{ marginTop: 10, color: "var(--muted)" }}>
            No snapshots yet.
          </div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {snapshots.map((s) => (
              <div
                key={s.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>
                    {s.existing.type} • {s.existing.subtype}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    Suggested: {s.suggested?.name ?? "—"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="rei-btn"
                    onClick={() => {
                      setEditingSnapshot(s);
                      setEditingSystem(null);
                    }}
                  >
                    Edit
                  </button>

                  <button
                    className="rei-btn"
                    onClick={() => onDeleteSnapshot(s.id)}
                    style={{ color: "#b91c1c", borderColor: "#fecaca" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
