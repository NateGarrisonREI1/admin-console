"use client";

import { CSSProperties, useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Broker, BrokerLead, BrokerAssessment, BrokerContractor, ManualLeadType } from "@/types/broker";
import {
  postLead,
  updateLead,
  markLeadClosed,
  deleteLead,
} from "./actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAD_TYPE_OPTIONS: { value: ManualLeadType; label: string; accent: string }[] = [
  { value: "hes_assessment", label: "HES Assessment", accent: "#10b981" },
  { value: "home_inspection", label: "Home Inspection", accent: "#f59e0b" },
];

const LEAD_TYPE_LABELS: Record<string, string> = {
  system_lead: "System Lead",
  hes_assessment: "HES Assessment",
  home_inspection: "Home Inspection",
};

const LEAD_TYPE_COLORS: Record<string, { bg: string; bd: string; tx: string }> = {
  system_lead: { bg: "rgba(139,92,246,0.12)", bd: "rgba(139,92,246,0.35)", tx: "#8b5cf6" },
  hes_assessment: { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.35)", tx: "#10b981" },
  home_inspection: { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.35)", tx: "#f59e0b" },
};

const STATUS_COLORS: Record<string, { bg: string; bd: string; tx: string }> = {
  active: { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.30)", tx: "#10b981" },
  sold: { bg: "rgba(6,182,212,0.12)", bd: "rgba(6,182,212,0.30)", tx: "#06b6d4" },
  closed: { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.30)", tx: "#10b981" },
  expired: { bg: "rgba(148,163,184,0.12)", bd: "rgba(148,163,184,0.30)", tx: "#94a3b8" },
  in_progress: { bg: "rgba(251,191,36,0.12)", bd: "rgba(251,191,36,0.30)", tx: "#fbbf24" },
  lost: { bg: "rgba(248,113,113,0.12)", bd: "rgba(248,113,113,0.30)", tx: "#f87171" },
};

const INPUT_STYLE: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#f1f5f9",
  outline: "none",
  fontSize: 13,
  fontWeight: 600,
  boxSizing: "border-box",
};

const LABEL_STYLE: CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 6,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function fmtMoney(amount?: number | null): string {
  if (amount == null || !Number.isFinite(amount)) return "\u2014";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function assessmentAddress(a?: BrokerAssessment | null): string {
  if (!a) return "\u2014";
  const parts = [a.address, a.city, a.state, a.zip].filter(Boolean);
  return parts.join(", ") || a.customer_name || "\u2014";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_COLORS[status] ?? { bg: "rgba(51,65,85,0.5)", bd: "#475569", tx: "#cbd5e1" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        border: `1px solid ${tone.bd}`,
        background: tone.bg,
        color: tone.tx,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function LeadTypeBadge({ leadType }: { leadType: string }) {
  const tone = LEAD_TYPE_COLORS[leadType] ?? LEAD_TYPE_COLORS.system_lead;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 999,
        border: `1px solid ${tone.bd}`,
        background: tone.bg,
        color: tone.tx,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {LEAD_TYPE_LABELS[leadType] ?? leadType}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={LABEL_STYLE}>{label}</label>
      {children}
    </div>
  );
}

// ─── Edit Lead Modal ──────────────────────────────────────────────────────────

type EditModalProps = {
  lead: BrokerLead;
  onClose: () => void;
  onSaved: () => void;
};

function EditLeadModal({ lead, onClose, onSaved }: EditModalProps) {
  const [isPending, startTransition] = useTransition();
  const [price, setPrice] = useState(String(lead.price));
  const [expirationDate, setExpirationDate] = useState(
    lead.expiration_date ? lead.expiration_date.slice(0, 10) : ""
  );
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [error, setError] = useState("");

  function handleSave() {
    const priceNum = parseFloat(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError("Price must be a positive number.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await updateLead(lead.id, {
          price: priceNum,
          expiration_date: expirationDate ? new Date(expirationDate).toISOString() : undefined,
          notes: notes.trim() || undefined,
        });
        onSaved();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to save.");
      }
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99990, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <button
        type="button"
        aria-label="Close modal"
        onClick={() => !isPending && onClose()}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", border: "none", cursor: "default" }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          borderRadius: 20,
          background: "#0f172a",
          border: "1px solid #334155",
          boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #334155" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9" }}>Edit Lead</div>
          <div style={{ marginTop: 4, fontSize: 13, color: "#94a3b8" }}>
            {assessmentAddress(lead.assessment)} &mdash; {LEAD_TYPE_LABELS[lead.lead_type] ?? lead.system_type}
          </div>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Price (USD)">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#64748b", fontSize: 14 }}>$</span>
              <input value={price} onChange={(e) => setPrice(e.target.value)} className="admin-input" style={INPUT_STYLE} placeholder="0" type="number" min="1" />
            </div>
          </Field>

          <Field label="Expiration Date">
            <input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} className="admin-input" style={INPUT_STYLE} />
          </Field>

          <Field label="Notes (optional)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="admin-input" style={{ ...INPUT_STYLE, height: 88, resize: "vertical" }} placeholder="Internal notes..." />
          </Field>

          {error && (
            <div style={{ fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 10, padding: "8px 12px" }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ padding: "16px 20px", borderTop: "1px solid #334155", display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={() => !isPending && onClose()}
            disabled={isPending}
            style={{ flex: 1, padding: "12px 16px", borderRadius: 10, fontSize: 14, fontWeight: 600, background: "#334155", color: "#cbd5e1", border: "1px solid #475569", cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.5 : 1 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            style={{ flex: 1, padding: "12px 16px", borderRadius: 10, fontSize: 14, fontWeight: 700, background: isPending ? "#10b98166" : "#10b981", color: "#fff", border: "none", cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.7 : 1 }}
          >
            {isPending ? "Saving\u2026" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Post Lead Modal ──────────────────────────────────────────────────────────

type PostLeadModalProps = {
  brokerId: string;
  assessments: BrokerAssessment[];
  providers: BrokerContractor[];
  onClose: () => void;
  onPosted: () => void;
};

function PostLeadModal({ brokerId, assessments, providers, onClose, onPosted }: PostLeadModalProps) {
  const [isPending, startTransition] = useTransition();
  const [leadType, setLeadType] = useState<ManualLeadType>("hes_assessment");
  const [assessmentId, setAssessmentId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [postMode, setPostMode] = useState<"network" | "assigned">("network");
  const [assignedProviderId, setAssignedProviderId] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  // Auto-fill from assessment when HES
  const selectedAssessment = assessments.find((a) => a.id === assessmentId) ?? null;

  useEffect(() => {
    if (selectedAssessment) {
      setCustomerName(selectedAssessment.customer_name || "");
      setAddress(assessmentAddress(selectedAssessment));
    }
  }, [selectedAssessment]);

  // Reset form when switching lead type
  useEffect(() => {
    setAssessmentId("");
    setCustomerName("");
    setAddress("");
    setPrice(leadType === "hes_assessment" ? "20" : "35");
    setPostMode("network");
    setAssignedProviderId("");
    setDescription("");
    setError("");
  }, [leadType]);

  // Filter providers for current lead type
  const matchingProviders = providers.filter((p) =>
    leadType === "hes_assessment" ? p.provider_type === "hes_assessor" : p.provider_type === "inspector"
  );

  const currentLeadConfig = LEAD_TYPE_OPTIONS.find((o) => o.value === leadType)!;

  function handlePost() {
    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }
    const priceNum = parseFloat(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError("Price must be a positive number.");
      return;
    }
    if (postMode === "assigned" && !assignedProviderId) {
      setError("Please select a provider to assign this lead to.");
      return;
    }
    setError("");

    startTransition(async () => {
      try {
        await postLead({
          broker_id: brokerId,
          assessment_id: assessmentId || undefined,
          lead_type: leadType,
          system_type: leadType,
          price: priceNum,
          visibility: postMode === "assigned" ? "network" : "public",
          assigned_to_provider_id: postMode === "assigned" ? assignedProviderId : undefined,
          description: description.trim() || undefined,
          notes: [
            customerName.trim() ? `Customer: ${customerName.trim()}` : "",
            address.trim() ? `Address: ${address.trim()}` : "",
          ]
            .filter(Boolean)
            .join("\n") || undefined,
        });
        onPosted();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to post lead.");
      }
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99990, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <button
        type="button"
        aria-label="Close modal"
        onClick={() => !isPending && onClose()}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", border: "none", cursor: "default" }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 520,
          borderRadius: 20,
          background: "#0f172a",
          border: "1px solid #334155",
          boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #334155", flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9" }}>
            Post Manual Lead
          </div>
          <div style={{ marginTop: 4, fontSize: 13, color: "#94a3b8" }}>
            Post an HES assessment or home inspection lead to your network.
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1 }}>
          {/* Lead Type Selector */}
          <Field label="Lead Type">
            <div style={{ display: "flex", gap: 8 }}>
              {LEAD_TYPE_OPTIONS.map((opt) => {
                const selected = leadType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLeadType(opt.value)}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      background: selected ? `${opt.accent}1a` : "#1e293b",
                      color: selected ? opt.accent : "#64748b",
                      border: selected ? `2px solid ${opt.accent}` : "1px solid #334155",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Assessment link (HES only) */}
          {leadType === "hes_assessment" && assessments.length > 0 && (
            <Field label="Link to Assessment (optional)">
              <select
                value={assessmentId}
                onChange={(e) => setAssessmentId(e.target.value)}
                className="admin-select"
                style={INPUT_STYLE}
              >
                <option value="">&mdash; No Assessment &mdash;</option>
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.customer_name}
                    {a.address ? ` \u2014 ${a.address}` : ""}
                    {a.city ? `, ${a.city}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {/* Customer Name */}
          <Field label="Customer Name">
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="admin-input"
              style={INPUT_STYLE}
              placeholder="Homeowner name"
            />
          </Field>

          {/* Address */}
          <Field label="Address">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="admin-input"
              style={INPUT_STYLE}
              placeholder="Property address"
            />
          </Field>

          {/* Price */}
          <Field label={leadType === "hes_assessment" ? "Assessment Cost (USD)" : "Inspection Cost (USD)"}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#64748b", fontSize: 14, fontWeight: 700 }}>$</span>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="admin-input"
                style={INPUT_STYLE}
                placeholder={leadType === "hes_assessment" ? "20" : "35"}
                type="number"
                min="1"
              />
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: "#475569" }}>
              {leadType === "hes_assessment" ? "Suggested: $20\u2013$30" : "Suggested: $30\u2013$50"}
            </div>
          </Field>

          {/* Post Visibility */}
          <Field label="Post Visibility">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Network option */}
              <button
                type="button"
                onClick={() => {
                  setPostMode("network");
                  setAssignedProviderId("");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 10,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                  background: postMode === "network" ? `${currentLeadConfig.accent}12` : "#1e293b",
                  border: postMode === "network" ? `2px solid ${currentLeadConfig.accent}` : "1px solid #334155",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    border: postMode === "network" ? `2px solid ${currentLeadConfig.accent}` : "2px solid #475569",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {postMode === "network" && (
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: currentLeadConfig.accent }} />
                  )}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: postMode === "network" ? currentLeadConfig.accent : "#cbd5e1" }}>
                    Post to Network
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    Any matching {leadType === "hes_assessment" ? "HES assessor" : "home inspector"} can purchase this lead
                  </div>
                </div>
              </button>

              {/* Assigned option */}
              <button
                type="button"
                onClick={() => setPostMode("assigned")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 10,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                  background: postMode === "assigned" ? `${currentLeadConfig.accent}12` : "#1e293b",
                  border: postMode === "assigned" ? `2px solid ${currentLeadConfig.accent}` : "1px solid #334155",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    border: postMode === "assigned" ? `2px solid ${currentLeadConfig.accent}` : "2px solid #475569",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {postMode === "assigned" && (
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: currentLeadConfig.accent }} />
                  )}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: postMode === "assigned" ? currentLeadConfig.accent : "#cbd5e1" }}>
                    Assign to Specific Provider
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    Only the assigned provider can see and purchase this lead
                  </div>
                </div>
              </button>

              {/* Provider dropdown (when assigned) */}
              {postMode === "assigned" && (
                <div style={{ marginTop: 4, paddingLeft: 30 }}>
                  {matchingProviders.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#64748b", padding: "8px 0" }}>
                      No {leadType === "hes_assessment" ? "HES assessors" : "home inspectors"} in your network yet.
                      Add them in the Network page first.
                    </div>
                  ) : (
                    <select
                      value={assignedProviderId}
                      onChange={(e) => setAssignedProviderId(e.target.value)}
                      className="admin-select"
                      style={INPUT_STYLE}
                    >
                      <option value="">&mdash; Select provider &mdash;</option>
                      {matchingProviders.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.contractor_name}
                          {p.lead_cost_override != null ? ` ($${p.lead_cost_override})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </Field>

          {/* Description */}
          <Field label="Description (optional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="admin-input"
              style={{ ...INPUT_STYLE, height: 80, resize: "vertical" }}
              placeholder="Any additional notes about this lead..."
            />
          </Field>

          {error && (
            <div style={{ fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 10, padding: "8px 12px" }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer — large visible buttons */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #334155", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              onClick={() => !isPending && onClose()}
              disabled={isPending}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                background: "#334155",
                color: "#cbd5e1",
                border: "1px solid #475569",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.5 : 1,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { if (!isPending) e.currentTarget.style.background = "#3d4f68"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#334155"; }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePost}
              disabled={isPending}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                background: isPending ? "#10b98166" : "#10b981",
                color: "#fff",
                border: "none",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.7 : 1,
                transition: "background 0.15s, opacity 0.15s",
              }}
            >
              {isPending ? "Posting\u2026" : "Post Lead"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

type Props = {
  broker: Broker;
  leads: BrokerLead[];
  assessments: BrokerAssessment[];
  providers: BrokerContractor[];
};

export default function LeadsClient({ broker, leads, assessments, providers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modals
  const [showPostModal, setShowPostModal] = useState(false);
  const [editLead, setEditLead] = useState<BrokerLead | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  function refresh() {
    router.refresh();
  }

  async function handleMarkClosed(lead: BrokerLead) {
    if (!confirm(`Mark this lead as closed and calculate commission?`)) return;
    startTransition(async () => {
      try {
        await markLeadClosed(lead.id, broker.id);
        refresh();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Failed to mark closed.");
      }
    });
  }

  async function handleRepost(lead: BrokerLead) {
    if (!confirm("Repost this lead as active?")) return;
    startTransition(async () => {
      try {
        await updateLead(lead.id, {
          status: "active",
          expiration_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        } as any);
        refresh();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Failed to repost lead.");
      }
    });
  }

  async function handleDelete(lead: BrokerLead) {
    if (!confirm("Remove this lead permanently? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deleteLead(lead.id);
        refresh();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Failed to delete lead.");
      }
    });
  }

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (typeFilter !== "all" && (l.lead_type ?? "system_lead") !== typeFilter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      return true;
    });
  }, [leads, typeFilter, statusFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: 24, minHeight: "100%" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", color: "#f1f5f9", margin: 0 }}>
          Leads Marketplace
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: "#64748b", margin: "4px 0 0", fontWeight: 500 }}>
          Post manual leads (HES assessments and home inspections) for your provider network.
        </p>
      </div>

      {/* Quick Action */}
      <button
        type="button"
        onClick={() => setShowPostModal(true)}
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.09), rgba(16,185,129,0.03))",
          border: "1px solid rgba(16,185,129,0.27)",
          borderRadius: 12,
          padding: "20px 24px",
          cursor: "pointer",
          textAlign: "left",
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          width: "100%",
          maxWidth: 420,
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(16,185,129,0.13)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
      >
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "rgba(16,185,129,0.13)",
            border: "1px solid rgba(16,185,129,0.27)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3v14M3 10h14" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#10b981" }}>+ Post Manual Lead</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, lineHeight: 1.4 }}>
            Post an HES assessment or home inspection lead to your provider network
          </div>
        </div>
      </button>

      {/* Filter Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderRadius: 14,
          border: "1px solid #334155",
          background: "#1e293b",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginRight: 4 }}>
          Filter:
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="admin-select"
          style={{
            padding: "7px 12px",
            borderRadius: 10,
            border: "1px solid #334155",
            background: "#0f172a",
            color: "#cbd5e1",
            fontSize: 13,
            fontWeight: 600,
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="all">All Types</option>
          <option value="hes_assessment">HES Assessment</option>
          <option value="home_inspection">Home Inspection</option>
          <option value="system_lead">System Lead</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="admin-select"
          style={{
            padding: "7px 12px",
            borderRadius: 10,
            border: "1px solid #334155",
            background: "#0f172a",
            color: "#cbd5e1",
            fontSize: 13,
            fontWeight: 600,
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="sold">Sold</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Closed</option>
          <option value="expired">Expired</option>
          <option value="lost">Lost</option>
        </select>

        <div style={{ marginLeft: "auto", fontSize: 13, color: "#64748b", fontWeight: 600 }}>
          Showing{" "}
          <span style={{ color: "#cbd5e1", fontWeight: 800 }}>{filtered.length}</span>{" "}
          lead{filtered.length !== 1 ? "s" : ""}
          {filtered.length !== leads.length && (
            <span style={{ color: "#475569" }}> of {leads.length}</span>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ border: "1px solid #334155", background: "#1e293b", borderRadius: 16, overflow: "hidden" }}>
        {/* Table Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 130px 110px 130px 160px 130px 180px",
            gap: 12,
            padding: "10px 16px",
            fontSize: 11,
            fontWeight: 800,
            color: "#64748b",
            borderBottom: "1px solid #334155",
            background: "#1e293b",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <div>Customer / Address</div>
          <div>Lead Type</div>
          <div>Price</div>
          <div>Status</div>
          <div>Assigned To</div>
          <div>Posted</div>
          <div style={{ textAlign: "right" }}>Actions</div>
        </div>

        {/* Table Body */}
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#64748b", fontSize: 14 }}>
            {leads.length === 0
              ? 'No leads posted yet. Click "+ Post Manual Lead" to get started.'
              : "No leads match your current filters."}
          </div>
        ) : (
          filtered.map((lead, idx) => {
            const address = assessmentAddress(lead.assessment);
            const assignedName = lead.assigned_provider?.contractor_name ?? null;
            const buyerName = lead.contractor?.contractor_name ?? null;
            const displayProvider = assignedName || buyerName;
            const isLast = idx === filtered.length - 1;

            return (
              <div
                key={lead.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 130px 110px 130px 160px 130px 180px",
                  gap: 12,
                  padding: "14px 16px",
                  borderBottom: isLast ? "none" : "1px solid rgba(51,65,85,0.5)",
                  alignItems: "center",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(30,41,59,0.6)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                {/* Customer / Address */}
                <div>
                  <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 13, lineHeight: 1.3 }}>
                    {address}
                  </div>
                  {lead.expiration_date && (
                    <div style={{ marginTop: 3, fontSize: 11, color: "#64748b" }}>
                      Expires {fmtDate(lead.expiration_date)}
                    </div>
                  )}
                  {lead.broker_commission != null && lead.status === "closed" && (
                    <div style={{ marginTop: 3, fontSize: 11, fontWeight: 700, color: "#10b981" }}>
                      Commission: {fmtMoney(lead.broker_commission)}
                    </div>
                  )}
                </div>

                {/* Lead Type */}
                <div>
                  <LeadTypeBadge leadType={lead.lead_type ?? "system_lead"} />
                </div>

                {/* Price */}
                <div style={{ fontSize: 14, fontWeight: 800, color: "#06b6d4" }}>
                  {fmtMoney(lead.price)}
                </div>

                {/* Status */}
                <div>
                  <StatusBadge status={lead.status} />
                </div>

                {/* Assigned To */}
                <div style={{ fontSize: 13, color: displayProvider ? "#cbd5e1" : "#475569", fontWeight: displayProvider ? 600 : 400 }}>
                  {displayProvider ?? "\u2014"}
                  {assignedName && !buyerName && (
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>assigned</div>
                  )}
                  {buyerName && (
                    <div style={{ fontSize: 10, color: "#06b6d4", marginTop: 2 }}>purchased</div>
                  )}
                </div>

                {/* Posted Date */}
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {fmtDate(lead.created_at)}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" }}>
                  {(lead.status === "active" || lead.status === "in_progress") && (
                    <ActionButton onClick={() => setEditLead(lead)} disabled={isPending} variant="secondary">
                      Edit
                    </ActionButton>
                  )}
                  {lead.status === "sold" && (
                    <ActionButton onClick={() => handleMarkClosed(lead)} disabled={isPending} variant="primary">
                      Mark Closed
                    </ActionButton>
                  )}
                  {(lead.status === "expired" || lead.status === "lost") && (
                    <ActionButton onClick={() => handleRepost(lead)} disabled={isPending} variant="secondary">
                      Repost
                    </ActionButton>
                  )}
                  <ActionButton onClick={() => handleDelete(lead)} disabled={isPending} variant="danger">
                    Remove
                  </ActionButton>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Empty state */}
      {leads.length === 0 && (
        <div style={{ borderRadius: 16, border: "1px dashed #334155", padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>&#9741;</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#cbd5e1", marginBottom: 6 }}>
            No Leads Yet
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
            Post your first manual lead to start assigning work to your provider network.
          </div>
          <button
            type="button"
            onClick={() => setShowPostModal(true)}
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              background: "#10b981",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
            }}
          >
            + Post Manual Lead
          </button>
        </div>
      )}

      {/* Post Lead Modal */}
      {showPostModal && (
        <PostLeadModal
          brokerId={broker.id}
          assessments={assessments}
          providers={providers}
          onClose={() => setShowPostModal(false)}
          onPosted={() => { setShowPostModal(false); refresh(); }}
        />
      )}

      {/* Edit Lead Modal */}
      {editLead && (
        <EditLeadModal
          lead={editLead}
          onClose={() => setEditLead(null)}
          onSaved={() => { setEditLead(null); refresh(); }}
        />
      )}
    </div>
  );
}

// ─── Action Button Helper ────────────────────────────────────────────────────

function ActionButton({
  onClick,
  disabled,
  variant,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  variant: "primary" | "secondary" | "danger";
  children: React.ReactNode;
}) {
  const styles: Record<string, CSSProperties> = {
    primary: { border: "1px solid rgba(16,185,129,0.30)", background: "rgba(16,185,129,0.12)", color: "#10b981" },
    secondary: { border: "1px solid #334155", background: "transparent", color: "#94a3b8" },
    danger: { border: "1px solid rgba(239,68,68,0.30)", background: "rgba(239,68,68,0.08)", color: "#ef4444" },
  };

  const classNames: Record<string, string> = {
    primary: "admin-btn-primary",
    secondary: "admin-btn-secondary",
    danger: "admin-btn-danger",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classNames[variant]}
      style={{
        ...styles[variant],
        padding: "6px 12px",
        borderRadius: 8,
        fontWeight: 700,
        fontSize: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}
