"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LeadDetailData, NoteEntry, CommEntry } from "./actions";
import {
  updateLeadStatus,
  addLeadNote,
  addCommunicationLog,
  requestRefund,
  completeLead,
} from "./actions";

// ─── Design tokens ───────────────────────────────────────────────────
const BG = "#0f172a";
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

// ─── Status config ───────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "Purchased", color: "#3b82f6" },
  contacted: { label: "Contacted", color: "#eab308" },
  quoted: { label: "Quoted", color: "#f59e0b" },
  scheduled: { label: "Scheduled", color: "#a855f7" },
  in_progress: { label: "In Progress", color: "#06b6d4" },
  closed: { label: "Completed", color: "#10b981" },
  lost: { label: "Closed - Lost", color: "#ef4444" },
};

const PIPELINE_ORDER = [
  "new",
  "contacted",
  "quoted",
  "scheduled",
  "in_progress",
  "closed",
];

// ─── System type colors ──────────────────────────────────────────────
const SYSTEM_TYPE_COLORS: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  hvac: { bg: "rgba(249,115,22,0.15)", text: "#f97316", label: "HVAC" },
  water_heater: {
    bg: "rgba(59,130,246,0.15)",
    text: "#3b82f6",
    label: "Water Heater",
  },
  solar: { bg: "rgba(234,179,8,0.15)", text: "#eab308", label: "Solar" },
  electrical: {
    bg: "rgba(245,158,11,0.15)",
    text: "#f59e0b",
    label: "Electrical",
  },
  plumbing: { bg: "rgba(6,182,212,0.15)", text: "#06b6d4", label: "Plumbing" },
  general_handyman: { bg: "rgba(148,163,184,0.15)", text: "#94a3b8", label: "General Handyman" },
};

// ─── Refund reasons ──────────────────────────────────────────────────
const REFUND_REASONS = [
  { value: "no_response", label: "No homeowner response" },
  { value: "competitor", label: "Already working with competitor" },
  { value: "bad_quality", label: "Invalid / bad lead quality" },
  { value: "not_interested", label: "Customer not interested" },
  { value: "duplicate", label: "Duplicate lead" },
  { value: "other", label: "Other" },
];

// ─── Helpers ─────────────────────────────────────────────────────────
function money(n: number | null | undefined): string {
  if (n == null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "N/A";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── Component ───────────────────────────────────────────────────────
export default function LeadDetailClient({ data }: { data: LeadDetailData }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  // State — notes
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  // State — communication log
  const [commType, setCommType] = useState<"call" | "email" | "text">("call");
  const [commNote, setCommNote] = useState("");
  const [commSaving, setCommSaving] = useState(false);

  // State — advance status
  const [advancing, setAdvancing] = useState(false);

  // State — complete lead
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [finalValue, setFinalValue] = useState("");
  const [ratingValue, setRatingValue] = useState("");
  const [completing, setCompleting] = useState(false);

  // State — refund modal
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState(REFUND_REASONS[0].value);
  const [refundDescription, setRefundDescription] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  // Derived
  const currentIndex = PIPELINE_ORDER.indexOf(data.status);
  const isLost = data.status === "lost";
  const isClosed = data.status === "closed";
  const nextStatus =
    currentIndex >= 0 && currentIndex < PIPELINE_ORDER.length - 1
      ? PIPELINE_ORDER[currentIndex + 1]
      : null;

  const sl = data.system_lead;
  const stc = SYSTEM_TYPE_COLORS[sl.system_type] ?? {
    bg: "rgba(148,163,184,0.15)",
    text: TEXT_MUTED,
    label: sl.system_type,
  };
  const leaf = sl.leaf_report_data;
  const hasLeaf = leaf != null && Object.keys(leaf).length > 0;

  const fullAddress = [sl.address, sl.city, sl.state, sl.zip]
    .filter(Boolean)
    .join(", ");

  // ─── Handlers ────────────────────────────────────────────────────
  async function handleAdvanceStatus() {
    if (!nextStatus) return;
    const label = STATUS_CONFIG[nextStatus]?.label ?? nextStatus;
    if (!window.confirm(`Advance status to "${label}"?`)) return;
    setAdvancing(true);
    try {
      await updateLeadStatus(data.id, nextStatus);
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setAdvancing(false);
    }
  }

  async function handlePipelineClick(stepIndex: number) {
    if (isLost || isClosed) return;
    if (stepIndex !== currentIndex + 1) return;
    const target = PIPELINE_ORDER[stepIndex];
    const label = STATUS_CONFIG[target]?.label ?? target;
    if (!window.confirm(`Advance status to "${label}"?`)) return;
    setAdvancing(true);
    try {
      await updateLeadStatus(data.id, target);
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setAdvancing(false);
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      await addLeadNote(data.id, noteText.trim());
      setNoteText("");
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add note");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddComm() {
    if (!commNote.trim()) return;
    setCommSaving(true);
    try {
      await addCommunicationLog(data.id, commType, commNote.trim());
      setCommNote("");
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to log communication");
    } finally {
      setCommSaving(false);
    }
  }

  async function handleCompleteLead() {
    setCompleting(true);
    try {
      const fv = finalValue ? parseFloat(finalValue) : undefined;
      const rv = ratingValue ? parseInt(ratingValue, 10) : undefined;
      await completeLead(data.id, fv, rv);
      setShowCompleteForm(false);
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to complete lead");
    } finally {
      setCompleting(false);
    }
  }

  async function handleRefundSubmit() {
    if (refundDescription.trim().length < 10) {
      alert("Please provide a description with at least 10 characters.");
      return;
    }
    setRefundSubmitting(true);
    try {
      await requestRefund(data.id, refundReason, refundDescription.trim());
      setShowRefundModal(false);
      setRefundDescription("");
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to request refund");
    } finally {
      setRefundSubmitting(false);
    }
  }

  // ─── Shared styles ──────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: 20,
  };

  const cardTitle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 700,
    color: TEXT,
    margin: 0,
    marginBottom: 14,
  };

  const inputStyle: React.CSSProperties = {
    background: BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    color: TEXT,
    padding: "8px 10px",
    fontSize: 13,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const btnPrimary: React.CSSProperties = {
    background: EMERALD,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div style={{ padding: 28 }}>
      {/* ── Back button ─────────────────────────────────────────── */}
      <button
        onClick={() => router.push("/contractor/leads")}
        style={{
          background: "none",
          border: "none",
          color: TEXT_DIM,
          fontSize: 13,
          cursor: "pointer",
          padding: 0,
          marginBottom: 20,
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = TEXT)}
        onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_DIM)}
      >
        &larr; Back to My Leads
      </button>

      {/* ── Pipeline Stepper ────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          marginBottom: 28,
          position: "relative",
        }}
      >
        {PIPELINE_ORDER.map((step, i) => {
          const sc = STATUS_CONFIG[step];
          const isCompleted = !isLost && currentIndex > i;
          const isCurrent = !isLost && currentIndex === i;
          const isNext = !isLost && !isClosed && i === currentIndex + 1;

          return (
            <div
              key={step}
              style={{
                display: "flex",
                alignItems: "center",
                flex: i < PIPELINE_ORDER.length - 1 ? 1 : undefined,
              }}
            >
              {/* Step */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: isNext ? "pointer" : "default",
                  minWidth: 40,
                }}
                onClick={() => isNext && handlePipelineClick(i)}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isLost
                      ? BORDER
                      : isCompleted || isCurrent
                        ? EMERALD
                        : BORDER,
                    boxShadow: isCurrent
                      ? `0 0 0 3px rgba(16,185,129,0.3)`
                      : "none",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                >
                  {isCompleted && !isLost ? (
                    <svg
                      width={14}
                      height={14}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: isCurrent && !isLost ? "#fff" : TEXT_DIM,
                      }}
                    >
                      {i + 1}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    marginTop: 5,
                    color: isLost
                      ? TEXT_DIM
                      : isCurrent
                        ? EMERALD
                        : isCompleted
                          ? TEXT_SEC
                          : TEXT_DIM,
                    fontWeight: isCurrent ? 700 : 400,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  {sc?.label ?? step}
                </span>
              </div>

              {/* Connector */}
              {i < PIPELINE_ORDER.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background:
                      !isLost && currentIndex > i ? EMERALD : BORDER,
                    marginTop: -10,
                    marginLeft: 4,
                    marginRight: 4,
                    alignSelf: "center",
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Lost badge */}
        {isLost && (
          <div
            style={{
              position: "absolute",
              top: -6,
              right: 0,
              background: "rgba(239,68,68,0.15)",
              color: "#ef4444",
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 10,
            }}
          >
            LOST
          </div>
        )}
      </div>

      {/* ── Two-column layout ───────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 20,
        }}
      >
        {/* ─── LEFT COLUMN ───────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* A. Customer Info */}
          <div style={cardStyle}>
            <h3 style={cardTitle}>Customer Information</h3>

            {sl.homeowner_name && (
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: TEXT,
                  marginBottom: 10,
                }}
              >
                {sl.homeowner_name}
              </div>
            )}

            {sl.homeowner_phone && (
              <div style={{ marginBottom: 6 }}>
                <a
                  href={`tel:${sl.homeowner_phone}`}
                  style={{
                    color: "#3b82f6",
                    fontSize: 14,
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.textDecoration = "underline")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.textDecoration = "none")
                  }
                >
                  {sl.homeowner_phone}
                </a>
              </div>
            )}

            {sl.homeowner_email && (
              <div style={{ marginBottom: 10 }}>
                <a
                  href={`mailto:${sl.homeowner_email}`}
                  style={{
                    color: "#3b82f6",
                    fontSize: 14,
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.textDecoration = "underline")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.textDecoration = "none")
                  }
                >
                  {sl.homeowner_email}
                </a>
              </div>
            )}

            {fullAddress && (
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: TEXT_SEC }}>
                  {fullAddress}
                </span>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 11,
                    color: "#3b82f6",
                    marginLeft: 8,
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.textDecoration = "underline")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.textDecoration = "none")
                  }
                >
                  Open in Maps
                </a>
              </div>
            )}

            {sl.best_contact_time && (
              <div style={{ fontSize: 13, color: TEXT_DIM, marginTop: 6 }}>
                Best Contact Time: {sl.best_contact_time}
              </div>
            )}
          </div>

          {/* B. LEAF Executive Summary */}
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <h3 style={{ ...cardTitle, marginBottom: 0 }}>
                LEAF Report Summary
              </h3>
              <span
                style={{
                  background: "rgba(16,185,129,0.15)",
                  color: EMERALD,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 8,
                }}
              >
                LEAF
              </span>
            </div>

            {hasLeaf ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  {leaf.current_system != null && (
                    <LeafField
                      label="Current System"
                      value={String(leaf.current_system)}
                    />
                  )}
                  {leaf.system_age != null && (
                    <LeafField
                      label="System Age"
                      value={`${leaf.system_age} years`}
                    />
                  )}
                  {leaf.efficiency != null && (
                    <LeafField
                      label="Efficiency"
                      value={String(leaf.efficiency)}
                    />
                  )}
                  {leaf.recommendation != null && (
                    <LeafField
                      label="Recommendation"
                      value={String(leaf.recommendation)}
                      valueColor={EMERALD}
                    />
                  )}
                  {leaf.estimated_cost != null && (
                    <LeafField
                      label="Estimated Cost"
                      value={String(leaf.estimated_cost)}
                    />
                  )}
                  {leaf.annual_savings != null && (
                    <LeafField
                      label="Annual Savings"
                      value={String(leaf.annual_savings)}
                      valueColor={EMERALD}
                    />
                  )}
                  {leaf.payback_years != null && (
                    <LeafField
                      label="Payback Period"
                      value={`${leaf.payback_years} years`}
                    />
                  )}
                  {leaf.priority != null && (
                    <LeafField
                      label="Priority"
                      value={String(leaf.priority)}
                      valueColor={
                        String(leaf.priority) === "Urgent" ? "#ef4444"
                          : String(leaf.priority) === "High" ? "#f59e0b"
                          : EMERALD
                      }
                    />
                  )}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: TEXT_DIM }}>
                No LEAF report available for this lead
              </div>
            )}
          </div>

          {/* C. Job Notes */}
          <div style={cardStyle}>
            <h3 style={cardTitle}>Job Notes</h3>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 14,
                alignItems: "flex-start",
              }}
            >
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note..."
                style={{
                  ...inputStyle,
                  height: 80,
                  resize: "vertical",
                }}
              />
              <button
                onClick={handleAddNote}
                disabled={saving || !noteText.trim()}
                style={{
                  ...btnPrimary,
                  opacity: saving || !noteText.trim() ? 0.5 : 1,
                }}
              >
                {saving ? "Saving..." : "Add Note"}
              </button>
            </div>

            {data.notes_log.length === 0 && (
              <div style={{ fontSize: 13, color: TEXT_DIM }}>
                No notes yet.
              </div>
            )}

            {data.notes_log.map((note: NoteEntry, i: number) => (
              <div
                key={i}
                style={{
                  paddingBottom: 10,
                  marginBottom: 10,
                  borderBottom:
                    i < data.notes_log.length - 1
                      ? `1px solid ${BORDER}`
                      : "none",
                }}
              >
                <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 3 }}>
                  {formatDateTime(note.date)}
                </div>
                <div style={{ fontSize: 13, color: TEXT_SEC }}>{note.text}</div>
              </div>
            ))}
          </div>

          {/* D. Communication Log */}
          <div style={cardStyle}>
            <h3 style={cardTitle}>Communication Log</h3>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 14,
                alignItems: "flex-start",
              }}
            >
              <select
                value={commType}
                onChange={(e) =>
                  setCommType(e.target.value as "call" | "email" | "text")
                }
                style={{
                  ...inputStyle,
                  width: 110,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="text">Text</option>
              </select>
              <textarea
                value={commNote}
                onChange={(e) => setCommNote(e.target.value)}
                placeholder="Communication details..."
                style={{
                  ...inputStyle,
                  height: 60,
                  resize: "vertical",
                }}
              />
              <button
                onClick={handleAddComm}
                disabled={commSaving || !commNote.trim()}
                style={{
                  ...btnPrimary,
                  opacity: commSaving || !commNote.trim() ? 0.5 : 1,
                }}
              >
                {commSaving ? "Saving..." : "Log"}
              </button>
            </div>

            {data.communication_log.length === 0 && (
              <div style={{ fontSize: 13, color: TEXT_DIM }}>
                No communication logged yet.
              </div>
            )}

            {data.communication_log.map((entry: CommEntry, i: number) => {
              const badgeMap: Record<
                string,
                { bg: string; text: string }
              > = {
                call: {
                  bg: "rgba(59,130,246,0.15)",
                  text: "#3b82f6",
                },
                email: {
                  bg: "rgba(245,158,11,0.15)",
                  text: "#f59e0b",
                },
                text: {
                  bg: "rgba(6,182,212,0.15)",
                  text: "#06b6d4",
                },
              };
              const badge = badgeMap[entry.type] ?? badgeMap.call;
              return (
                <div
                  key={i}
                  style={{
                    paddingBottom: 10,
                    marginBottom: 10,
                    borderBottom:
                      i < data.communication_log.length - 1
                        ? `1px solid ${BORDER}`
                        : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{ fontSize: 11, color: TEXT_DIM }}
                    >
                      {formatDateTime(entry.date)}
                    </span>
                    <span
                      style={{
                        background: badge.bg,
                        color: badge.text,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 8px",
                        borderRadius: 8,
                        textTransform: "capitalize",
                      }}
                    >
                      {entry.type}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: TEXT_SEC }}>
                    {entry.note}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── RIGHT COLUMN ──────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* E. Lead Info */}
          <div style={cardStyle}>
            <h3 style={cardTitle}>Lead Info</h3>

            <div style={{ marginBottom: 12 }}>
              <span
                style={{
                  background: stc.bg,
                  color: stc.text,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: 10,
                }}
              >
                {stc.label}
              </span>
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: TEXT,
                marginBottom: 12,
              }}
            >
              {money(sl.price)}
            </div>

            <div style={{ fontSize: 13, color: TEXT_SEC, marginBottom: 6 }}>
              <span style={{ color: TEXT_DIM }}>Purchased:</span>{" "}
              {formatDate(sl.purchased_date)}
            </div>

            <div style={{ fontSize: 13, color: TEXT_SEC }}>
              <span style={{ color: TEXT_DIM }}>Lead Age:</span>{" "}
              {timeAgo(sl.purchased_date)}
            </div>
          </div>

          {/* F. Actions */}
          <div style={cardStyle}>
            <h3 style={cardTitle}>Actions</h3>

            {!isClosed && !isLost && nextStatus && (
              <button
                onClick={handleAdvanceStatus}
                disabled={advancing}
                style={{
                  ...btnPrimary,
                  width: "100%",
                  marginBottom: 10,
                  opacity: advancing ? 0.5 : 1,
                }}
              >
                {advancing
                  ? "Updating..."
                  : `Mark as ${STATUS_CONFIG[nextStatus]?.label ?? nextStatus}`}
              </button>
            )}

            {data.status === "in_progress" && !showCompleteForm && (
              <button
                onClick={() => setShowCompleteForm(true)}
                style={{
                  ...btnPrimary,
                  width: "100%",
                  marginBottom: 10,
                }}
              >
                Mark Complete
              </button>
            )}

            {showCompleteForm && (
              <div
                style={{
                  background: BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: TEXT,
                    marginBottom: 10,
                  }}
                >
                  Complete Job
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label
                    style={{
                      fontSize: 11,
                      color: TEXT_DIM,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Final Job Value (optional)
                  </label>
                  <input
                    type="number"
                    value={finalValue}
                    onChange={(e) => setFinalValue(e.target.value)}
                    placeholder="$0.00"
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label
                    style={{
                      fontSize: 11,
                      color: TEXT_DIM,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Rating 1-5 (optional)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={ratingValue}
                    onChange={(e) => setRatingValue(e.target.value)}
                    placeholder="1-5"
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setShowCompleteForm(false)}
                    style={{
                      background: "transparent",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 6,
                      color: TEXT_SEC,
                      padding: "7px 14px",
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCompleteLead}
                    disabled={completing}
                    style={{
                      ...btnPrimary,
                      flex: 1,
                      opacity: completing ? 0.5 : 1,
                    }}
                  >
                    {completing ? "Completing..." : "Complete Job"}
                  </button>
                </div>
              </div>
            )}

            {data.can_request_refund && (
              <button
                onClick={() => setShowRefundModal(true)}
                style={{
                  background: "transparent",
                  border: "1px solid #ef4444",
                  borderRadius: 6,
                  color: "#ef4444",
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  width: "100%",
                  marginBottom: 10,
                  fontFamily: "inherit",
                }}
              >
                Request Refund
              </button>
            )}

            {data.refund_request && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <span style={{ fontSize: 13, color: TEXT_SEC }}>
                  Refund Requested
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 8,
                    textTransform: "capitalize",
                    ...(data.refund_request.status === "pending"
                      ? {
                          background: "rgba(234,179,8,0.15)",
                          color: "#eab308",
                        }
                      : data.refund_request.status === "approved"
                        ? {
                            background: "rgba(16,185,129,0.15)",
                            color: EMERALD,
                          }
                        : {
                            background: "rgba(239,68,68,0.15)",
                            color: "#ef4444",
                          }),
                  }}
                >
                  {data.refund_request.status}
                </span>
              </div>
            )}

            {isClosed && !data.can_request_refund && !data.refund_request && (
              <div style={{ fontSize: 13, color: TEXT_DIM }}>
                This lead has been completed.
              </div>
            )}

            {isLost && !data.can_request_refund && !data.refund_request && (
              <div style={{ fontSize: 13, color: TEXT_DIM }}>
                This lead has been marked as lost.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── G. Refund Modal ──────────────────────────────────────── */}
      {showRefundModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRefundModal(false);
          }}
        >
          <div
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: 24,
              width: 420,
              maxWidth: "90vw",
            }}
          >
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: TEXT,
                margin: 0,
                marginBottom: 18,
              }}
            >
              Request Refund
            </h3>

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  fontSize: 12,
                  color: TEXT_DIM,
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Reason
              </label>
              <select
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                }}
              >
                {REFUND_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label
                style={{
                  fontSize: 12,
                  color: TEXT_DIM,
                  display: "block",
                  marginBottom: 5,
                }}
              >
                Description (min 10 characters)
              </label>
              <textarea
                value={refundDescription}
                onChange={(e) => setRefundDescription(e.target.value)}
                placeholder="Please describe why you are requesting a refund..."
                style={{
                  ...inputStyle,
                  height: 100,
                  resize: "vertical",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                onClick={() => setShowRefundModal(false)}
                style={{
                  background: "transparent",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 6,
                  color: TEXT_SEC,
                  padding: "8px 18px",
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRefundSubmit}
                disabled={
                  refundSubmitting ||
                  refundDescription.trim().length < 10
                }
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity:
                    refundSubmitting ||
                    refundDescription.trim().length < 10
                      ? 0.5
                      : 1,
                }}
              >
                {refundSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-component: LEAF field ───────────────────────────────────────
function LeafField({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 2 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: valueColor ?? TEXT,
        }}
      >
        {value}
      </div>
    </div>
  );
}
