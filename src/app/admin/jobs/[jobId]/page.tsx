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
  upsertLocalSnapshot,
  type SnapshotDraft,
} from "../../_data/localSnapshots";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function nowIso() {
  return new Date().toISOString();
}

export default function JobDetailPage() {
  const params = useParams();
  const jobId = (params?.jobId as string) || "";

  const job: Job | null = useMemo(() => {
    if (!jobId) return null;
    return findLocalJob(jobId) ?? MOCK_JOBS.find((j) => j.id === jobId) ?? null;
  }, [jobId]);

  // load snapshots (note: this reads localStorage at render time)
  const jobSnapshots: SnapshotDraft[] = useMemo(() => {
    loadLocalSnapshots();
    return jobId ? snapshotsForJob(jobId) : [];
  }, [jobId]);

  // editing state for snapshots
  const [editingSnapId, setEditingSnapId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState<string>("");
  const [draftCost, setDraftCost] = useState<string>("");
  const [draftSavings, setDraftSavings] = useState<string>("");
  const [draftPayback, setDraftPayback] = useState<string>("");
  const [draftNotes, setDraftNotes] = useState<string>("");

  // local re-render trigger after edits/deletes (lightweight)
  const [bump, setBump] = useState(0);

  const snapshots: SnapshotDraft[] = useMemo(() => {
    // re-read after bump
    loadLocalSnapshots();
    return jobId ? snapshotsForJob(jobId) : [];
  }, [jobId, bump]);

  function toNumberOrNull(v: string): number | null {
    const cleaned = v.trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function startEditSnapshot(snap: SnapshotDraft) {
    setEditingSnapId(snap.id);
    setDraftName(snap.suggested.name ?? "");
    setDraftCost(snap.suggested.estCost?.toString() ?? "");
    setDraftSavings(snap.suggested.estAnnualSavings?.toString() ?? "");
    setDraftPayback(snap.suggested.estPaybackYears?.toString() ?? "");
    setDraftNotes(snap.suggested.notes ?? "");
  }

  function cancelEditSnapshot() {
    setEditingSnapId(null);
    setDraftName("");
    setDraftCost("");
    setDraftSavings("");
    setDraftPayback("");
    setDraftNotes("");
  }

  function saveSnapshot(snap: SnapshotDraft) {
    const name = draftName.trim();
    if (!name) {
      alert("Suggested system name is required.");
      return;
    }

    const next: SnapshotDraft = {
      ...snap,
      suggested: {
        ...snap.suggested,
        name,
        estCost: toNumberOrNull(draftCost),
        estAnnualSavings: toNumberOrNull(draftSavings),
        estPaybackYears: toNumberOrNull(draftPayback),
        notes: draftNotes.trim(),
      },
      updatedAt: nowIso(),
    };

    upsertLocalSnapshot(next);
    setBump((n) => n + 1);
    cancelEditSnapshot();
  }

  function deleteSnapshot(snapshotId: string) {
    const ok = window.confirm("Delete this snapshot?");
    if (!ok) return;

    deleteLocalSnapshot(snapshotId);
    setBump((n) => n + 1);

    if (editingSnapId === snapshotId) cancelEditSnapshot();
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

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* HEADER */}
      <div className="rei-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>
              {job.customerName} — {job.reportId}
            </div>
            <div style={{ color: "var(--muted)" }}>{job.address ?? "—"}</div>

            <div style={{ height: 10 }} />

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", color: "var(--muted)", fontSize: 12 }}>
              <div>
                <b style={{ color: "var(--text)" }}>Sq Ft:</b> {job.sqft ?? "—"}
              </div>
              <div>
                <b style={{ color: "var(--text)" }}>Year Built:</b> {job.yearBuilt ?? "—"}
              </div>
              <div>
                <b style={{ color: "var(--text)" }}>Systems:</b> {job.systems.length}
              </div>
              <div>
                <b style={{ color: "var(--text)" }}>Snapshots:</b> {snapshots.length}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href="/admin/jobs" className="rei-btn" style={{ textDecoration: "none", color: "inherit" }}>
              ← Jobs
            </Link>
            <button className="rei-btn rei-btnPrimary" type="button">
              Generate Mock Report
            </button>
          </div>
        </div>
      </div>

      {/* INSPECTION UPLOAD PLACEHOLDER */}
      <div className="rei-card">
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Inspection Upload</div>
        <div style={{ color: "var(--muted)" }}>
          Placeholder: upload inspection/HES PDFs here (Supabase Storage later).
        </div>
        <div style={{ height: 10 }} />
        <button className="rei-btn" type="button" disabled style={{ opacity: 0.6 }}>
          Upload Inspection PDF (coming next)
        </button>
      </div>

      {/* EXISTING SYSTEMS */}
      <div className="rei-card">
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Existing Systems</div>
        <div style={{ color: "var(--muted)" }}>
          Create a snapshot from any existing system.
        </div>

        <div style={{ height: 12 }} />

        <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.4fr 0.8fr 0.9fr 0.8fr 0.9fr 160px",
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
            <div>Maint.</div>
            <div />
          </div>

          {job.systems.length === 0 ? (
            <div style={{ padding: 14, color: "var(--muted)" }}>No systems added yet.</div>
          ) : (
            job.systems.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.4fr 0.8fr 0.9fr 0.8fr 0.9fr 160px",
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
                <div style={{ color: "var(--muted)" }}>{s.maintenance}</div>

                <Link
                  className="rei-btn rei-btnPrimary"
                  href={`/admin/snapshots/new?jobId=${job.id}&systemId=${s.id}`}
                  style={{ textDecoration: "none", textAlign: "center" }}
                >
                  Create Snapshot
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SNAPSHOTS FOR THIS JOB (EDIT/DELETE HERE) */}
      <div className="rei-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Saved Snapshots</div>
            <div style={{ color: "var(--muted)" }}>
              Edit and delete snapshots here (localStorage for now).
            </div>
          </div>

          <Link href="/admin/snapshots" className="rei-btn" style={{ textDecoration: "none", color: "inherit" }}>
            View all snapshots
          </Link>
        </div>

        <div style={{ height: 12 }} />

        {snapshots.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>No snapshots saved for this job yet.</div>
        ) : (
          <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.5fr 0.9fr 0.9fr 0.8fr 1.4fr",
                gap: 10,
                padding: "12px 14px",
                background: "rgba(16,24,40,.03)",
                fontWeight: 900,
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              <div>Existing</div>
              <div>Suggested</div>
              <div>Cost</div>
              <div>Savings/yr</div>
              <div>Updated</div>
              <div style={{ textAlign: "right" }}>Actions</div>
            </div>

            {snapshots.map((snap) => {
              const isEditing = editingSnapId === snap.id;

              return (
                <div
                  key={snap.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1.5fr 0.9fr 0.9fr 0.8fr 1.4fr",
                    gap: 10,
                    padding: "12px 14px",
                    borderTop: "1px solid var(--border)",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900 }}>{snap.existing.type}</div>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>{snap.existing.subtype}</div>
                  </div>

                  <div>
                    {isEditing ? (
                      <div style={{ display: "grid", gap: 6 }}>
                        <input
                          className="rei-input"
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          placeholder="Suggested system name"
                        />
                        <textarea
                          className="rei-input"
                          value={draftNotes}
                          onChange={(e) => setDraftNotes(e.target.value)}
                          placeholder="Notes"
                          style={{ minHeight: 60, resize: "vertical" }}
                        />
                      </div>
                    ) : (
                      <>
                        <div style={{ fontWeight: 900 }}>{snap.suggested.name}</div>
                        <div style={{ color: "var(--muted)", fontSize: 12 }}>
                          {snap.suggested.catalogSystemId ? "From catalog" : "Manual"}
                          {snap.suggested.notes ? ` • ${snap.suggested.notes}` : ""}
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ color: "var(--muted)" }}>
                    {isEditing ? (
                      <input
                        className="rei-input"
                        value={draftCost}
                        onChange={(e) => setDraftCost(e.target.value)}
                        placeholder="Cost"
                        inputMode="numeric"
                      />
                    ) : (
                      snap.suggested.estCost ?? "—"
                    )}
                  </div>

                  <div style={{ color: "var(--muted)" }}>
                    {isEditing ? (
                      <input
                        className="rei-input"
                        value={draftSavings}
                        onChange={(e) => setDraftSavings(e.target.value)}
                        placeholder="Savings/yr"
                        inputMode="numeric"
                      />
                    ) : (
                      snap.suggested.estAnnualSavings ?? "—"
                    )}
                  </div>

                  <div style={{ color: "var(--muted)" }}>{formatDate(snap.updatedAt)}</div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
                    {isEditing ? (
                      <>
                        <button className="rei-btn rei-btnPrimary" type="button" onClick={() => saveSnapshot(snap)}>
                          Save
                        </button>
                        <button className="rei-btn" type="button" onClick={cancelEditSnapshot}>
                          Cancel
                        </button>
                        <button className="rei-btn" type="button" onClick={() => deleteSnapshot(snap.id)}>
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="rei-btn" type="button" onClick={() => startEditSnapshot(snap)}>
                          Edit
                        </button>
                        <button className="rei-btn" type="button" onClick={() => deleteSnapshot(snap.id)}>
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ height: 10 }} />
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          Next: wire “Generate Mock Report” to a report preview page that uses these snapshots.
        </div>
      </div>
    </div>
  );
}
