"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { Broker, BrokerAssessment } from "@/types/broker";
import { createAssessment, logOutOfNetworkJob, uploadHesReport, removeHesReport, sendBrokerDelivery } from "./actions";
import type { BrokerScheduleJob } from "./actions";
import BrokerDeliveryPanel from "@/components/ui/BrokerDeliveryPanel";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

type StatusFilter = "all" | "completed" | "in_progress" | "not_started" | "expired";

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  completed: {
    label: "Completed",
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.30)",
  },
  in_progress: {
    label: "In Progress",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.12)",
    border: "rgba(6,182,212,0.30)",
  },
  not_started: {
    label: "Not Started",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.10)",
    border: "rgba(148,163,184,0.25)",
  },
  expired: {
    label: "Expired",
    color: "#f87171",
    bg: "rgba(248,113,113,0.10)",
    border: "rgba(248,113,113,0.25)",
  },
};

const SYSTEM_TYPES = [
  { value: "hvac", label: "HVAC" },
  { value: "solar", label: "Solar" },
  { value: "water_heater", label: "Water Heater" },
  { value: "electrical", label: "Electrical" },
  { value: "insulation", label: "Insulation" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG["not_started"];
}

function formatAddress(a: BrokerAssessment): string {
  const parts = [a.address, a.city, a.state, a.zip].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function getRecommendations(assessment: BrokerAssessment): string[] {
  const data = assessment.assessment_data;
  if (!data || typeof data !== "object") return [];
  const recs = (data as Record<string, unknown>).recommendations;
  if (Array.isArray(recs)) return recs.map(String);
  return [];
}

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusConfig(status);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 9999,
        border: `1px solid ${cfg.border}`,
        background: cfg.bg,
        color: cfg.color,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
        textTransform: "capitalize",
      }}
    >
      {cfg.label}
    </span>
  );
}

function HesScore({ score }: { score: number | null }) {
  if (score === null) {
    return <span style={{ color: "#64748b", fontSize: 13 }}>—</span>;
  }
  const color =
    score >= 7 ? "#10b981" : score >= 4 ? "#fbbf24" : "#f87171";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontWeight: 700,
        fontSize: 14,
        color,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>HES</span>
      {score}
      <span style={{ fontSize: 11, color: "#64748b" }}>/10</span>
    </span>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 9999,
        border: active ? "1px solid rgba(16,185,129,0.30)" : "1px solid #334155",
        background: active ? "rgba(16,185,129,0.12)" : "#1e293b",
        color: active ? "#10b981" : "#94a3b8",
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          color: "#94a3b8",
          marginBottom: 6,
        }}
      >
        {label}
        {required && (
          <span style={{ color: "#f87171", marginLeft: 3 }}>*</span>
        )}
      </label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Post Lead Modal
// ─────────────────────────────────────────────────────────

function PostLeadModal({
  assessment,
  brokerId,
  onClose,
}: {
  assessment: BrokerAssessment;
  brokerId: string;
  onClose: () => void;
}) {
  const [systemType, setSystemType] = useState("hvac");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("network");
  const [submitting, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  function handleSubmit() {
    const priceNum = parseFloat(price);
    if (!systemType) {
      setError("System type is required.");
      return;
    }
    if (!price || Number.isNaN(priceNum) || priceNum <= 0) {
      setError("A valid price greater than $0 is required.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        const res = await fetch("/api/broker/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            broker_id: brokerId,
            assessment_id: assessment.id,
            system_type: systemType,
            description: description.trim() || null,
            price: priceNum,
            visibility,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? "Failed to post lead.");
        }
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1200);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to post lead.");
      }
    });
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.60)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: 16,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid #334155",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9" }}>
              Post Lead
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 3 }}>
              {assessment.customer_name} &mdash; {formatAddress(assessment)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
              padding: 4,
            }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {success ? (
            <div
              style={{
                padding: 16,
                borderRadius: 10,
                background: "rgba(16,185,129,0.10)",
                border: "1px solid rgba(16,185,129,0.25)",
                color: "#10b981",
                fontWeight: 700,
                fontSize: 14,
                textAlign: "center",
              }}
            >
              Lead posted successfully!
            </div>
          ) : (
            <>
              <FormField label="System Type" required>
                <select
                  className="admin-select"
                  value={systemType}
                  onChange={(e) => setSystemType(e.target.value)}
                >
                  {SYSTEM_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Lead Price (USD)" required>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#64748b",
                      fontSize: 14,
                      pointerEvents: "none",
                    }}
                  >
                    $
                  </span>
                  <input
                    className="admin-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="99.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={{ paddingLeft: 26 }}
                  />
                </div>
              </FormField>

              <FormField label="Visibility">
                <select
                  className="admin-select"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                >
                  <option value="network">Network (my contractors only)</option>
                  <option value="public">Public (all contractors)</option>
                </select>
              </FormField>

              <FormField label="Description (optional)">
                <textarea
                  className="admin-input"
                  placeholder="Brief description of the opportunity..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  style={{ resize: "vertical", minHeight: 72 }}
                />
              </FormField>

              {error && (
                <div
                  style={{
                    fontSize: 13,
                    color: "#f87171",
                    fontWeight: 600,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(248,113,113,0.08)",
                    border: "1px solid rgba(248,113,113,0.20)",
                  }}
                >
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div
            style={{
              padding: "14px 20px",
              borderTop: "1px solid #334155",
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="admin-btn-secondary"
              disabled={submitting}
              style={{ opacity: submitting ? 0.6 : 1 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="admin-btn-primary"
              disabled={submitting}
              style={{ opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? "Posting..." : "Post Lead"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Assessment Detail Panel (inline expand)
// ─────────────────────────────────────────────────────────

function AssessmentDetail({
  assessment,
  brokerId,
}: {
  assessment: BrokerAssessment;
  brokerId: string;
}) {
  const [postLeadOpen, setPostLeadOpen] = useState(false);
  const recommendations = getRecommendations(assessment);

  const dataEntries = Object.entries(assessment.assessment_data ?? {}).filter(
    ([key]) => key !== "recommendations"
  );

  return (
    <div
      style={{
        borderTop: "1px solid #334155",
        padding: "20px 20px 16px",
        background: "#0f172a",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      {/* KPI row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <KpiTile
          label="HES Score"
          value={
            assessment.hes_score !== null
              ? `${assessment.hes_score} / 10`
              : "Not scored"
          }
          highlight={assessment.hes_score !== null}
        />
        <KpiTile
          label="Home Age"
          value={
            assessment.home_age !== null
              ? `${assessment.home_age} years`
              : "Unknown"
          }
        />
        <KpiTile
          label="Status"
          value={getStatusConfig(assessment.status).label}
        />
        <KpiTile label="Created" value={fmtDate(assessment.created_at)} />
        {assessment.completed_at && (
          <KpiTile label="Completed" value={fmtDate(assessment.completed_at)} />
        )}
        {assessment.expires_at && (
          <KpiTile label="Expires" value={fmtDate(assessment.expires_at)} />
        )}
      </div>

      {/* Contact info */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 8,
          }}
        >
          Contact Information
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          {assessment.customer_email && (
            <div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>
                Email
              </div>
              <a
                href={`mailto:${assessment.customer_email}`}
                style={{ color: "#06b6d4", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
              >
                {assessment.customer_email}
              </a>
            </div>
          )}
          {assessment.customer_phone && (
            <div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>
                Phone
              </div>
              <a
                href={`tel:${assessment.customer_phone}`}
                style={{ color: "#06b6d4", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
              >
                {assessment.customer_phone}
              </a>
            </div>
          )}
          {(assessment.address || assessment.city) && (
            <div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>
                Address
              </div>
              <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 600 }}>
                {formatAddress(assessment)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assessment link */}
      {assessment.assessment_link && (
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Assessment Link
          </div>
          <a
            href={assessment.assessment_link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#10b981",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              wordBreak: "break-all",
            }}
          >
            {assessment.assessment_link}
          </a>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Recommendations
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {recommendations.map((rec, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: 13,
                  color: "#cbd5e1",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#10b981",
                    flexShrink: 0,
                    marginTop: 5,
                  }}
                />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Extra assessment data fields */}
      {dataEntries.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Assessment Data
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 8,
            }}
          >
            {dataEntries.map(([key, val]) => (
              <div
                key={key}
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  padding: "8px 12px",
                }}
              >
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>
                  {key.replace(/_/g, " ")}
                </div>
                <div style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 600 }}>
                  {typeof val === "object" ? JSON.stringify(val) : String(val ?? "—")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
        <button
          type="button"
          onClick={() => setPostLeadOpen(true)}
          className="admin-btn-primary"
          style={{ fontSize: 13 }}
        >
          + Post Lead
        </button>
        {assessment.assessment_link && (
          <a
            href={assessment.assessment_link}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn-secondary"
            style={{
              fontSize: 13,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            View Assessment
          </a>
        )}
      </div>

      {/* Post Lead Modal */}
      {postLeadOpen && (
        <PostLeadModal
          assessment={assessment}
          brokerId={brokerId}
          onClose={() => setPostLeadOpen(false)}
        />
      )}
    </div>
  );
}

function KpiTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        background: "#1e293b",
        border: `1px solid ${highlight ? "rgba(16,185,129,0.25)" : "#334155"}`,
        borderRadius: 10,
        padding: "10px 14px",
        minWidth: 100,
      }}
    >
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{label}</div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: highlight ? "#10b981" : "#f1f5f9",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Assessment Row (table row + expandable detail)
// ─────────────────────────────────────────────────────────

function AssessmentRow({
  assessment,
  brokerId,
  expanded,
  onToggle,
}: {
  assessment: BrokerAssessment;
  brokerId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = getStatusConfig(assessment.status);

  return (
    <div
      style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 12,
        overflow: "hidden",
        transition: "border-color 0.15s ease",
      }}
    >
      {/* Main row */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "2fr 2fr 130px 90px 90px 40px",
          gap: 12,
          padding: "14px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          alignItems: "center",
          textAlign: "left",
        }}
      >
        {/* Customer name */}
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#f1f5f9",
            }}
          >
            {assessment.customer_name}
          </div>
          {(assessment.customer_email || assessment.customer_phone) && (
            <div
              style={{
                fontSize: 12,
                color: "#64748b",
                marginTop: 2,
              }}
            >
              {assessment.customer_email ?? assessment.customer_phone}
            </div>
          )}
        </div>

        {/* Address */}
        <div style={{ fontSize: 13, color: "#94a3b8" }}>
          {formatAddress(assessment)}
        </div>

        {/* Status */}
        <div>
          <StatusBadge status={assessment.status} />
        </div>

        {/* HES Score */}
        <div>
          <HesScore score={assessment.hes_score} />
        </div>

        {/* Home age */}
        <div style={{ fontSize: 13, color: "#94a3b8" }}>
          {assessment.home_age !== null ? `${assessment.home_age}y` : "—"}
        </div>

        {/* Expand chevron */}
        <div
          style={{
            color: "#64748b",
            fontSize: 16,
            transition: "transform 0.2s ease",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          &#8964;
        </div>
      </button>

      {/* Expandable detail */}
      {expanded && (
        <AssessmentDetail assessment={assessment} brokerId={brokerId} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// New Assessment Modal
// ─────────────────────────────────────────────────────────

function NewAssessmentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("OR");
  const [zip, setZip] = useState("");
  const [submitting, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current && !submitting) onClose();
  }

  function handleSubmit() {
    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await createAssessment({
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim() || undefined,
          customer_phone: customerPhone.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          zip: zip.trim() || undefined,
        });
        setSuccess(true);
        setTimeout(() => {
          onCreated();
        }, 900);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to create assessment.");
      }
    });
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: 16,
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid #334155",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9" }}>
              New Assessment
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>
              Add a new home assessment record
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              fontSize: 22,
              cursor: "pointer",
              lineHeight: 1,
              padding: 4,
              opacity: submitting ? 0.5 : 1,
            }}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "20px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {success ? (
            <div
              style={{
                padding: 20,
                borderRadius: 10,
                background: "rgba(16,185,129,0.10)",
                border: "1px solid rgba(16,185,129,0.25)",
                color: "#10b981",
                fontWeight: 700,
                fontSize: 14,
                textAlign: "center",
              }}
            >
              Assessment created successfully!
            </div>
          ) : (
            <>
              {/* Customer section */}
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Customer Details
              </div>

              <FormField label="Customer Name" required>
                <input
                  className="admin-input"
                  type="text"
                  placeholder="Jane Smith"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  autoFocus
                />
              </FormField>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <FormField label="Email">
                  <input
                    className="admin-input"
                    type="email"
                    placeholder="jane@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </FormField>
                <FormField label="Phone">
                  <input
                    className="admin-input"
                    type="tel"
                    placeholder="(503) 555-0100"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </FormField>
              </div>

              {/* Address section */}
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginTop: 4,
                }}
              >
                Property Address
              </div>

              <FormField label="Street Address">
                <input
                  className="admin-input"
                  type="text"
                  placeholder="123 Main St"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </FormField>

              <FormField label="City">
                <input
                  className="admin-input"
                  type="text"
                  placeholder="Portland"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </FormField>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <FormField label="State">
                  <select
                    className="admin-select"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  >
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="ZIP Code">
                  <input
                    className="admin-input"
                    type="text"
                    placeholder="97201"
                    maxLength={10}
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                  />
                </FormField>
              </div>

              {error && (
                <div
                  style={{
                    fontSize: 13,
                    color: "#f87171",
                    fontWeight: 600,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(248,113,113,0.08)",
                    border: "1px solid rgba(248,113,113,0.20)",
                  }}
                >
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div
            style={{
              padding: "14px 20px",
              borderTop: "1px solid #334155",
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="admin-btn-secondary"
              disabled={submitting}
              style={{ opacity: submitting ? 0.6 : 1 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="admin-btn-primary"
              disabled={submitting}
              style={{ opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? "Creating..." : "Create Assessment"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Out-of-Network Job Card
// ─────────────────────────────────────────────────────────

function OutOfNetworkJobCard({ job }: { job: BrokerScheduleJob }) {
  const isDelivered = job.status === "delivered";
  const address = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");

  return (
    <div
      style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Card header */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Top row: badge + date */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {isDelivered ? (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 10px", borderRadius: 9999,
              background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)",
              color: "#f59e0b", fontSize: 11, fontWeight: 700,
            }}>
              🟡 SELF-MANAGED
            </span>
          ) : (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 10px", borderRadius: 9999,
              background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)",
              color: "#f59e0b", fontSize: 11, fontWeight: 700,
            }}>
              ⚠️ OUT-OF-NETWORK
            </span>
          )}
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {fmtDate(job.scheduled_date)}
          </span>
        </div>

        {/* Address & service */}
        {address && (
          <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 600 }}>
            📍 {address}
          </div>
        )}
        <div style={{ fontSize: 13, color: "#94a3b8" }}>
          🏠 {job.service_name || (job.type === "inspector" ? "Home Inspection" : "HES Assessment")}
        </div>

        {/* Customer */}
        <div style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 600 }}>
          {job.customer_name}
          {job.customer_email && (
            <span style={{ color: "#64748b", fontWeight: 400, marginLeft: 6 }}>{job.customer_email}</span>
          )}
        </div>

        {/* Assessor */}
        {job.external_assessor_name && (
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Assessor: {job.external_assessor_name}
            {job.external_assessor_company && ` (${job.external_assessor_company})`}
            <span style={{ color: "#475569" }}> — not in REI network</span>
          </div>
        )}

        {/* LEAF + Leads status (pending) */}
        {!isDelivered && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
            <div style={{ fontSize: 12, color: "#f59e0b" }}>
              🌿 LEAF: ⚠️ Awaiting your delivery
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              📊 Leads: Inactive until LEAF is sent
            </div>
          </div>
        )}
      </div>

      {/* Delivery panel */}
      <div style={{ padding: "0 16px 16px" }}>
        <BrokerDeliveryPanel
          job={job}
          onUpload={uploadHesReport}
          onRemoveReport={removeHesReport}
          onSend={sendBrokerDelivery}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Log Out-of-Network Job Modal
// ─────────────────────────────────────────────────────────

function LogOutOfNetworkJobModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [serviceType, setServiceType] = useState<"hes" | "inspector">("hes");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("OR");
  const [zip, setZip] = useState("");
  const [dateCompleted, setDateCompleted] = useState(new Date().toISOString().slice(0, 10));
  const [assessorName, setAssessorName] = useState("");
  const [assessorCompany, setAssessorCompany] = useState("");
  const [assessorEmail, setAssessorEmail] = useState("");

  const [submitting, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current && !submitting) onClose();
  }

  function handleSubmit() {
    if (!customerName.trim()) { setError("Customer name is required."); return; }
    if (!address.trim()) { setError("Address is required."); return; }
    if (!city.trim()) { setError("City is required."); return; }
    if (!assessorName.trim()) { setError("Assessor name is required."); return; }

    setError("");
    startTransition(async () => {
      try {
        const result = await logOutOfNetworkJob({
          serviceType,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim() || undefined,
          customer_phone: customerPhone.trim() || undefined,
          address: address.trim(),
          city: city.trim(),
          state,
          zip: zip.trim(),
          scheduled_date: dateCompleted,
          external_assessor_name: assessorName.trim(),
          external_assessor_company: assessorCompany.trim() || undefined,
          external_assessor_email: assessorEmail.trim() || undefined,
        });
        if (result.error) throw new Error(result.error);
        setSuccess(true);
        setTimeout(() => onCreated(), 900);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to log job.");
      }
    });
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div style={{
        background: "#0f172a", border: "1px solid #334155", borderRadius: 16,
        width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "hidden",
        display: "flex", flexDirection: "column",
        boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 20px", borderBottom: "1px solid #334155",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9" }}>
              Log Out-of-Network Job
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>
              Record a job done by an assessor outside the REI network
            </div>
          </div>
          <button
            type="button" onClick={onClose} disabled={submitting}
            style={{
              background: "transparent", border: "none", color: "#64748b",
              fontSize: 22, cursor: "pointer", lineHeight: 1, padding: 4,
              opacity: submitting ? 0.5 : 1,
            }}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: 20, overflowY: "auto", flex: 1,
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          {success ? (
            <div style={{
              padding: 20, borderRadius: 10,
              background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)",
              color: "#10b981", fontWeight: 700, fontSize: 14, textAlign: "center",
            }}>
              Job logged! You can now upload the HES report and deliver.
            </div>
          ) : (
            <>
              {/* Service type */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Service Type
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {(["hes", "inspector"] as const).map((t) => (
                  <label key={t} style={{
                    flex: 1, display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                    background: serviceType === t ? "rgba(16,185,129,0.06)" : "transparent",
                    border: `1px solid ${serviceType === t ? "rgba(16,185,129,0.2)" : "#334155"}`,
                  }}>
                    <input
                      type="radio" name="serviceType"
                      checked={serviceType === t}
                      onChange={() => setServiceType(t)}
                      style={{ accentColor: "#10b981" }}
                    />
                    <span style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 600 }}>
                      {t === "hes" ? "HES Assessment" : "Home Inspection"}
                    </span>
                  </label>
                ))}
              </div>

              {/* Homeowner */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>
                Homeowner
              </div>
              <FormField label="Name" required>
                <input className="admin-input" type="text" placeholder="Jane Smith" value={customerName} onChange={(e) => setCustomerName(e.target.value)} autoFocus />
              </FormField>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormField label="Email">
                  <input className="admin-input" type="email" placeholder="jane@email.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                </FormField>
                <FormField label="Phone">
                  <input className="admin-input" type="tel" placeholder="(503) 555-0100" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </FormField>
              </div>

              {/* Property */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>
                Property Address
              </div>
              <FormField label="Street" required>
                <input className="admin-input" type="text" placeholder="123 Main St" value={address} onChange={(e) => setAddress(e.target.value)} />
              </FormField>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
                <FormField label="City" required>
                  <input className="admin-input" type="text" placeholder="Portland" value={city} onChange={(e) => setCity(e.target.value)} />
                </FormField>
                <FormField label="State">
                  <select className="admin-select" value={state} onChange={(e) => setState(e.target.value)}>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormField>
                <FormField label="ZIP">
                  <input className="admin-input" type="text" placeholder="97201" maxLength={10} value={zip} onChange={(e) => setZip(e.target.value)} />
                </FormField>
              </div>

              {/* Date */}
              <FormField label="Date Completed" required>
                <input className="admin-input" type="date" value={dateCompleted} onChange={(e) => setDateCompleted(e.target.value)} />
              </FormField>

              {/* External assessor */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>
                External Assessor
              </div>
              <FormField label="Assessor Name" required>
                <input className="admin-input" type="text" placeholder="Joe's Energy" value={assessorName} onChange={(e) => setAssessorName(e.target.value)} />
              </FormField>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormField label="Company">
                  <input className="admin-input" type="text" placeholder="Energy Co." value={assessorCompany} onChange={(e) => setAssessorCompany(e.target.value)} />
                </FormField>
                <FormField label="Email">
                  <input className="admin-input" type="email" placeholder="joe@energy.com" value={assessorEmail} onChange={(e) => setAssessorEmail(e.target.value)} />
                </FormField>
              </div>

              {error && (
                <div style={{
                  fontSize: 13, color: "#f87171", fontWeight: 600,
                  padding: "8px 12px", borderRadius: 8,
                  background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.20)",
                }}>
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div style={{
            padding: "14px 20px", borderTop: "1px solid #334155",
            display: "flex", gap: 10, justifyContent: "flex-end",
          }}>
            <button type="button" onClick={onClose} className="admin-btn-secondary" disabled={submitting} style={{ opacity: submitting ? 0.6 : 1 }}>
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} className="admin-btn-primary" disabled={submitting} style={{ opacity: submitting ? 0.6 : 1 }}>
              {submitting ? "Creating..." : "Log Job"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main Client Component
// ─────────────────────────────────────────────────────────

export default function AssessmentsClient({
  broker,
  assessments: initialAssessments,
  outOfNetworkJobs: initialOonJobs,
}: {
  broker: Broker;
  assessments: BrokerAssessment[];
  outOfNetworkJobs: BrokerScheduleJob[];
}) {
  const [assessments, setAssessments] = useState<BrokerAssessment[]>(initialAssessments);
  const [oonJobs] = useState<BrokerScheduleJob[]>(initialOonJobs);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showOonModal, setShowOonModal] = useState(false);

  const filterOptions: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "completed", label: "Completed" },
    { key: "in_progress", label: "In Progress" },
    { key: "not_started", label: "Not Started" },
    { key: "expired", label: "Expired" },
  ];

  const filtered =
    statusFilter === "all"
      ? assessments
      : assessments.filter((a) => a.status === statusFilter);

  function handleToggle(id: string) {
    setExpandedId((cur) => (cur === id ? null : id));
  }

  async function handleCreated() {
    // Reload the page to get fresh server data
    window.location.reload();
  }

  // Summary counts
  const counts = {
    total: assessments.length,
    completed: assessments.filter((a) => a.status === "completed").length,
    in_progress: assessments.filter((a) => a.status === "in_progress").length,
    not_started: assessments.filter((a) => a.status === "not_started").length,
    expired: assessments.filter((a) => a.status === "expired").length,
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          maxWidth: 1100,
        }}
      >
        {/* Page header */}
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: "#f1f5f9",
              letterSpacing: "-0.3px",
              margin: 0,
            }}
          >
            Homes Assessed
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#94a3b8",
              marginTop: 4,
              marginBottom: 0,
            }}
          >
            {broker.company_name
              ? `${broker.company_name} — `
              : ""}
            {counts.total} assessment{counts.total !== 1 ? "s" : ""} total
          </p>
        </div>

        {/* ── Quick Actions ── */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            style={{
              background: "linear-gradient(135deg, rgba(16,185,129,0.09), rgba(16,185,129,0.03))",
              border: "1px solid rgba(16,185,129,0.27)",
              borderRadius: 12,
              padding: "16px 20px",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              flex: "1 1 280px",
              maxWidth: 380,
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(16,185,129,0.13)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span style={{
              width: 36, height: 36, borderRadius: 9,
              background: "rgba(16,185,129,0.13)", border: "1px solid rgba(16,185,129,0.27)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M10 3v14M3 10h14" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>+ New Assessment</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3, lineHeight: 1.4 }}>
                Send an assessment link to a homeowner
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowOonModal(true)}
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.09), rgba(245,158,11,0.03))",
              border: "1px solid rgba(245,158,11,0.27)",
              borderRadius: 12,
              padding: "16px 20px",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              flex: "1 1 280px",
              maxWidth: 380,
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(245,158,11,0.13)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span style={{
              width: 36, height: 36, borderRadius: 9,
              background: "rgba(245,158,11,0.13)", border: "1px solid rgba(245,158,11,0.27)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M10 3v14M3 10h14" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>Log Out-of-Network Job</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3, lineHeight: 1.4 }}>
                Record a job done outside the REI network
              </div>
            </div>
          </button>
        </div>

        {/* KPI summary strip */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <SummaryTile
            label="Completed"
            count={counts.completed}
            color="#10b981"
          />
          <SummaryTile
            label="In Progress"
            count={counts.in_progress}
            color="#06b6d4"
          />
          <SummaryTile
            label="Not Started"
            count={counts.not_started}
            color="#94a3b8"
          />
          {counts.expired > 0 && (
            <SummaryTile
              label="Expired"
              count={counts.expired}
              color="#f87171"
            />
          )}
        </div>

        {/* ── Out-of-Network Jobs ── */}
        {oonJobs.length > 0 && (
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "#64748b",
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10,
            }}>
              Out-of-Network Jobs ({oonJobs.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {oonJobs.map((j) => (
                <OutOfNetworkJobCard key={j.id} job={j} />
              ))}
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {filterOptions.map((opt) => (
            <FilterPill
              key={opt.key}
              label={opt.label}
              active={statusFilter === opt.key}
              onClick={() => setStatusFilter(opt.key)}
            />
          ))}
        </div>

        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 2fr 130px 90px 90px 40px",
            gap: 12,
            padding: "8px 16px",
            fontSize: 11,
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          <div>Customer</div>
          <div>Address</div>
          <div>Status</div>
          <div>HES</div>
          <div>Home Age</div>
          <div />
        </div>

        {/* Assessment list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 ? (
            <div
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 12,
                padding: "40px 20px",
                textAlign: "center",
                color: "#64748b",
                fontSize: 14,
              }}
            >
              {statusFilter === "all"
                ? "No assessments yet. Click \u201C+ New Assessment\u201D to add one."
                : `No ${getStatusConfig(statusFilter).label.toLowerCase()} assessments.`}
            </div>
          ) : (
            filtered.map((assessment) => (
              <AssessmentRow
                key={assessment.id}
                assessment={assessment}
                brokerId={broker.id}
                expanded={expandedId === assessment.id}
                onToggle={() => handleToggle(assessment.id)}
              />
            ))
          )}
        </div>

        {/* Footer count */}
        {filtered.length > 0 && (
          <div
            style={{
              fontSize: 12,
              color: "#475569",
              textAlign: "center",
              paddingTop: 4,
            }}
          >
            Showing {filtered.length} of {counts.total} assessment
            {counts.total !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* New Assessment Modal */}
      {showNewModal && (
        <NewAssessmentModal
          onClose={() => setShowNewModal(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Log Out-of-Network Job Modal */}
      {showOonModal && (
        <LogOutOfNetworkJobModal
          onClose={() => setShowOonModal(false)}
          onCreated={() => { setShowOonModal(false); window.location.reload(); }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────
// Summary Tile
// ─────────────────────────────────────────────────────────

function SummaryTile({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 10,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>
          {count}
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}
