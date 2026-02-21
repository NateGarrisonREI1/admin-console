// src/components/ui/BrokerDeliveryPanel.tsx
"use client";

import React, { useState, useRef, useCallback } from "react";
import type { BrokerScheduleJob } from "@/app/(app)/broker/assessments/actions";

// ─── Theme tokens ───────────────────────────────────────────────────

const CARD = "#1e293b";
const BORDER = "#334155";
const BG_DARK = "#0f172a";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const EMERALD = "#10b981";
const AMBER = "#f59e0b";

// ─── Helpers ────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })} at ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

// ─── Post-delivery state ────────────────────────────────────────────

function DeliveredState({ job }: { job: BrokerScheduleJob }) {
  const leafSent = job.leaf_tier === "basic" && job.leaf_report_url;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Delivered info */}
      <div style={{ fontSize: 13, color: TEXT_SEC }}>
        <span style={{ fontWeight: 700 }}>Delivered by:</span> You
        {job.reports_sent_at && (
          <span style={{ color: TEXT_DIM }}> ({fmtDateTime(job.reports_sent_at)})</span>
        )}
      </div>

      {/* LEAF status */}
      <div style={{ fontSize: 13, color: leafSent ? EMERALD : TEXT_DIM }}>
        {leafSent
          ? `✅ Basic LEAF — sent on ${job.reports_sent_at ? fmtDate(job.reports_sent_at) : "—"}`
          : "No LEAF included"
        }
      </div>

      {/* Links */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {job.hes_report_url && (
          <a
            href={job.hes_report_url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "6px 12px", borderRadius: 6,
              background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)",
              color: "#60a5fa", fontSize: 12, fontWeight: 600, textDecoration: "none",
            }}
          >
            View Report
          </a>
        )}
        {job.hes_report_url && (
          <a
            href={job.hes_report_url}
            download
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "6px 12px", borderRadius: 6,
              background: "rgba(148,163,184,0.08)", border: `1px solid ${BORDER}`,
              color: TEXT_SEC, fontSize: 12, fontWeight: 600, textDecoration: "none",
            }}
          >
            Download PDF
          </a>
        )}
      </div>

      {/* Invite nudge */}
      {job.external_assessor_name && (
        <div style={{
          marginTop: 4, padding: "10px 12px", borderRadius: 8,
          background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)",
          fontSize: 12, color: AMBER,
        }}>
          💡 Invite {job.external_assessor_name} to REI Network → Save time next job
        </div>
      )}
    </div>
  );
}

// ─── Main panel ─────────────────────────────────────────────────────

export default function BrokerDeliveryPanel({
  job,
  onUpload,
  onRemoveReport,
  onSend,
}: {
  job: BrokerScheduleJob;
  onUpload: (jobId: string, jobType: "hes" | "inspector", formData: FormData) => Promise<{ error?: string; url?: string }>;
  onRemoveReport: (jobId: string, jobType: "hes" | "inspector") => Promise<{ error?: string }>;
  onSend: (params: { jobId: string; jobType: "hes" | "inspector"; leafTier: "none" | "basic"; recipientEmail: string }) => Promise<{ error?: string }>;
}) {
  // ── State ──
  const [hesUploaded, setHesUploaded] = useState(!!job.hes_report_url);
  const [hesUrl, setHesUrl] = useState(job.hes_report_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [leafTier, setLeafTier] = useState<"none" | "basic">("basic");

  const [recipientEmail, setRecipientEmail] = useState(job.customer_email ?? "");
  const [editingEmail, setEditingEmail] = useState(false);

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── If delivered, show post-delivery state ──
  if (job.status === "delivered" || sent) {
    return (
      <div style={{
        padding: 16, borderRadius: 10,
        background: BG_DARK, border: `1px solid ${BORDER}`,
      }}>
        {/* Self-managed badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 10px", borderRadius: 9999,
            background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)",
            color: AMBER, fontSize: 11, fontWeight: 700,
          }}>
            🟡 SELF-MANAGED
          </span>
        </div>
        <DeliveredState job={sent ? { ...job, status: "delivered", reports_sent_at: new Date().toISOString(), leaf_tier: leafTier, leaf_report_url: leafTier === "basic" ? "pending" : null, hes_report_url: hesUrl || job.hes_report_url } : job} />
      </div>
    );
  }

  // ── File handling ──
  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files accepted");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setUploadError("File too large (max 25MB)");
      return;
    }

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    const result = await onUpload(job.id, job.type, formData);

    if (result.error) {
      setUploadError(result.error);
    } else if (result.url) {
      setHesUploaded(true);
      setHesUrl(result.url);
    }
    setUploading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemove() {
    setUploading(true);
    const result = await onRemoveReport(job.id, job.type);
    if (!result.error) {
      setHesUploaded(false);
      setHesUrl("");
    }
    setUploading(false);
  }

  // ── Send ──
  async function handleSend() {
    if (!hesUploaded) return;
    if (!recipientEmail) {
      setSendError("Recipient email required");
      return;
    }

    setSending(true);
    setSendError(null);

    const result = await onSend({
      jobId: job.id,
      jobType: job.type,
      leafTier,
      recipientEmail,
    });

    if (result.error) {
      setSendError(result.error);
      setSending(false);
    } else {
      setSent(true);
    }
  }

  const canSend = hesUploaded && recipientEmail && !sending;

  return (
    <div style={{
      padding: 16, borderRadius: 10,
      background: BG_DARK, border: `1px solid ${BORDER}`,
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      {/* Header */}
      <div style={{ fontSize: 13, fontWeight: 800, color: TEXT, letterSpacing: "-0.2px" }}>
        📤 DELIVER REPORTS
      </div>

      {/* ── STEP 1: HES Report Upload ── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          Step 1 — HES Report
        </div>

        {!hesUploaded ? (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? EMERALD : BORDER}`,
                borderRadius: 10,
                padding: "24px 16px",
                textAlign: "center",
                cursor: uploading ? "wait" : "pointer",
                background: dragOver ? "rgba(16,185,129,0.04)" : "transparent",
                transition: "all 0.15s",
              }}
            >
              {uploading ? (
                <div style={{ fontSize: 13, color: TEXT_SEC, fontWeight: 600 }}>
                  Uploading...
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>📄</div>
                  <div style={{ fontSize: 13, color: TEXT_SEC, fontWeight: 600 }}>
                    Drag & drop your HES report PDF
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 4 }}>
                    or click to browse — .pdf (max 25MB)
                  </div>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
          </>
        ) : (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 12px", borderRadius: 8,
            background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: EMERALD }}>✅</span>
              <span style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>HES-Report.pdf</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {hesUrl && (
                <a
                  href={hesUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 12, color: "#60a5fa", textDecoration: "none", fontWeight: 600 }}
                >
                  Preview
                </a>
              )}
              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                style={{
                  background: "none", border: "none", padding: 0,
                  fontSize: 12, color: "#f87171", fontWeight: 600, cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {uploadError && (
          <div style={{ fontSize: 12, color: "#f87171", fontWeight: 600, marginTop: 6 }}>
            {uploadError}
          </div>
        )}
      </div>

      {/* ── STEP 2: LEAF Report ── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          Step 2 — LEAF Energy Report
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Basic LEAF option */}
          <label style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "10px 12px", borderRadius: 8, cursor: "pointer",
            background: leafTier === "basic" ? "rgba(16,185,129,0.06)" : "transparent",
            border: `1px solid ${leafTier === "basic" ? "rgba(16,185,129,0.2)" : BORDER}`,
            transition: "all 0.15s",
          }}>
            <input
              type="radio"
              name="leafTier"
              checked={leafTier === "basic"}
              onChange={() => setLeafTier("basic")}
              style={{ marginTop: 2, accentColor: EMERALD }}
            />
            <div>
              <div style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>
                Include Basic LEAF (free)
              </div>
              <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>
                Homeowner gets energy dashboard
              </div>
              <div style={{ fontSize: 11, color: EMERALD, marginTop: 2 }}>
                Leads tracked to you for kickbacks
              </div>
            </div>
          </label>

          {/* No LEAF option */}
          <label style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "10px 12px", borderRadius: 8, cursor: "pointer",
            background: leafTier === "none" ? "rgba(148,163,184,0.06)" : "transparent",
            border: `1px solid ${leafTier === "none" ? "rgba(148,163,184,0.2)" : BORDER}`,
            transition: "all 0.15s",
          }}>
            <input
              type="radio"
              name="leafTier"
              checked={leafTier === "none"}
              onChange={() => setLeafTier("none")}
              style={{ marginTop: 2 }}
            />
            <div>
              <div style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>
                Don&apos;t include LEAF
              </div>
              <div style={{ fontSize: 11, color: AMBER, marginTop: 2 }}>
                No energy analysis. No lead tracking.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* ── STEP 3: Recipient ── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          Step 3 — Homeowner
        </div>

        <div style={{
          padding: "10px 12px", borderRadius: 8,
          background: `rgba(30,41,59,0.5)`, border: `1px solid ${BORDER}`,
        }}>
          <div style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>
            {job.customer_name}
          </div>

          {editingEmail ? (
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                autoFocus
                style={{
                  flex: 1, padding: "6px 10px", borderRadius: 6,
                  background: BG_DARK, border: `1px solid ${BORDER}`,
                  color: TEXT, fontSize: 13, outline: "none",
                }}
                onKeyDown={(e) => { if (e.key === "Enter") setEditingEmail(false); }}
              />
              <button
                type="button"
                onClick={() => setEditingEmail(false)}
                style={{
                  background: EMERALD, border: "none", borderRadius: 6,
                  padding: "4px 10px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 12, color: TEXT_DIM }}>
                {recipientEmail || "No email"}
              </span>
              <button
                type="button"
                onClick={() => setEditingEmail(true)}
                style={{
                  background: "none", border: "none", padding: 0,
                  color: "#60a5fa", fontSize: 12, cursor: "pointer",
                }}
              >
                ✏️
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {sendError && (
        <div style={{
          fontSize: 12, color: "#f87171", fontWeight: 600,
          padding: "8px 12px", borderRadius: 8,
          background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)",
        }}>
          {sendError}
        </div>
      )}

      {/* ── Send button ── */}
      <button
        type="button"
        disabled={!canSend}
        onClick={handleSend}
        style={{
          width: "100%",
          padding: "12px 0",
          borderRadius: 8,
          border: "none",
          background: canSend ? EMERALD : BORDER,
          color: canSend ? "#fff" : TEXT_DIM,
          fontSize: 14,
          fontWeight: 700,
          cursor: canSend ? "pointer" : "not-allowed",
          opacity: canSend ? 1 : 0.6,
          transition: "all 0.15s",
        }}
      >
        {sending ? "Sending..." : `Send to ${job.customer_name}`}
      </button>

      {/* Invite nudge (always visible on pending_delivery) */}
      {job.external_assessor_name && (
        <div style={{
          padding: "8px 12px", borderRadius: 8,
          background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)",
          fontSize: 12, color: AMBER,
        }}>
          💡 Invite {job.external_assessor_name} to join REI Network → Next time, they handle delivery automatically
        </div>
      )}
    </div>
  );
}
