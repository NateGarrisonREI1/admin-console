"use client";

import { useState, useTransition, useEffect } from "react";
import type { CSSProperties } from "react";
import type { PartnerContractor, PartnerDispatch, PartnerType } from "@/types/admin-ops";
import { addPartner, updatePartner, deletePartner, markDispatchPaid } from "./actions";
import { useRouter } from "next/navigation";

// ─── Style constants ────────────────────────────────────────────────────────

const BG_BASE = "#0f172a";
const BG_SURFACE = "#1e293b";
const BORDER = "#334155";
const TEXT_PRIMARY = "#f1f5f9";
const TEXT_SECONDARY = "#cbd5e1";
const TEXT_MUTED = "#94a3b8";
const TEXT_DIM = "#64748b";
const EMERALD = "#10b981";

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${BORDER}`,
  background: BG_SURFACE,
  color: TEXT_PRIMARY,
  outline: "none",
  fontSize: 13,
  fontWeight: 600,
  boxSizing: "border-box",
};

const btnPrimary: CSSProperties = {
  flex: 1,
  padding: "12px 12px",
  borderRadius: 10,
  border: "1px solid rgba(16,185,129,0.30)",
  background: "rgba(16,185,129,0.12)",
  color: EMERALD,
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const btnSecondary: CSSProperties = {
  flex: 1,
  padding: "12px 12px",
  borderRadius: 10,
  border: `1px solid ${BORDER}`,
  background: BG_SURFACE,
  color: TEXT_SECONDARY,
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function fmtCurrency(n: number | null | undefined) {
  if (n == null) return "—";
  return `$${Number(n).toFixed(2)}`;
}

function statusTone(status: string): { bg: string; bd: string; tx: string } {
  switch (status) {
    case "active":
      return { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.30)", tx: EMERALD };
    case "inactive":
    case "suspended":
      return { bg: "rgba(100,116,139,0.12)", bd: "rgba(100,116,139,0.30)", tx: TEXT_DIM };
    default:
      return { bg: "rgba(51,65,85,0.5)", bd: "#475569", tx: TEXT_SECONDARY };
  }
}

function paymentTone(status: string): { bg: string; bd: string; tx: string } {
  switch (status) {
    case "paid":
      return { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.30)", tx: EMERALD };
    case "invoiced":
      return { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.30)", tx: "#fbbf24" };
    case "unpaid":
    case "pending":
      return { bg: "rgba(239,68,68,0.12)", bd: "rgba(239,68,68,0.30)", tx: "#f87171" };
    case "overdue":
      return { bg: "rgba(239,68,68,0.18)", bd: "rgba(239,68,68,0.40)", tx: "#ef4444" };
    default:
      return { bg: "rgba(51,65,85,0.5)", bd: "#475569", tx: TEXT_SECONDARY };
  }
}

function dispatchStatusTone(status: string): { bg: string; bd: string; tx: string } {
  switch (status) {
    case "completed":
      return { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.30)", tx: EMERALD };
    case "in_progress":
      return { bg: "rgba(6,182,212,0.12)", bd: "rgba(6,182,212,0.30)", tx: "#22d3ee" };
    case "accepted":
      return { bg: "rgba(59,130,246,0.12)", bd: "rgba(59,130,246,0.30)", tx: "#60a5fa" };
    case "declined":
    case "cancelled":
      return { bg: "rgba(100,116,139,0.12)", bd: "rgba(100,116,139,0.30)", tx: TEXT_DIM };
    case "pending":
      return { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.30)", tx: "#fbbf24" };
    default:
      return { bg: "rgba(51,65,85,0.5)", bd: "#475569", tx: TEXT_SECONDARY };
  }
}

// ─── Partner type helpers ──────────────────────────────────────────────

const PARTNER_TYPE_CONFIG: Record<PartnerType, { label: string; color: string; bg: string; bd: string }> = {
  contractor: { label: "Contractor", color: "#fbbf24", bg: "rgba(251,191,36,0.12)", bd: "rgba(251,191,36,0.30)" },
  hes_assessor: { label: "HES Assessor", color: "#10b981", bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.30)" },
  home_inspector: { label: "Inspector", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.30)" },
};

const PARTNER_TYPES: PartnerType[] = ["contractor", "hes_assessor", "home_inspector"];

function partnerTypeLabel(type: PartnerType): string {
  return PARTNER_TYPE_CONFIG[type]?.label ?? "Contractor";
}

function PartnerTypeBadge({ type }: { type: PartnerType }) {
  const cfg = PARTNER_TYPE_CONFIG[type] ?? PARTNER_TYPE_CONFIG.contractor;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "3px 10px",
      borderRadius: 999,
      border: `1px solid ${cfg.bd}`,
      background: cfg.bg,
      color: cfg.color,
      fontSize: 11,
      fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
}

function Badge({ label, tone }: { label: string; tone: { bg: string; bd: string; tx: string } }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "3px 10px",
      borderRadius: 999,
      border: `1px solid ${tone.bd}`,
      background: tone.bg,
      color: tone.tx,
      fontSize: 11,
      fontWeight: 700,
      textTransform: "capitalize",
      whiteSpace: "nowrap",
    }}>
      {label.replace("_", " ")}
    </span>
  );
}

function StarRating({ rating }: { rating: number }) {
  const stars = Math.round(rating);
  return (
    <span style={{ color: "#fbbf24", fontSize: 13, letterSpacing: 1 }}>
      {Array.from({ length: 5 }, (_, i) => (i < stars ? "\u2605" : "\u2606")).join("")}
      <span style={{ color: TEXT_DIM, fontSize: 11, marginLeft: 4 }}>({rating.toFixed(1)})</span>
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

// ─── Toast ─────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      zIndex: 100,
      padding: "12px 20px",
      borderRadius: 10,
      background: EMERALD,
      color: "#fff",
      fontWeight: 700,
      fontSize: 13,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    }}>
      {message}
    </div>
  );
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────

function ConfirmDeleteModal({
  partnerName,
  onConfirm,
  onCancel,
  isPending,
}: {
  partnerName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.60)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 0" }}>
      <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, width: "100%", maxWidth: 400, padding: 24, display: "flex", flexDirection: "column", gap: 16, margin: "auto" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: TEXT_PRIMARY }}>Remove Partner</div>
        <div style={{ fontSize: 14, color: TEXT_SECONDARY, lineHeight: 1.5 }}>
          Are you sure you want to remove <strong>{partnerName}</strong>? This will also delete their dispatch history. This action cannot be undone.
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onCancel} style={btnSecondary} disabled={isPending}>Cancel</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            style={{
              flex: 1,
              padding: "12px 12px",
              borderRadius: 10,
              border: "1px solid rgba(239,68,68,0.30)",
              background: "rgba(239,68,68,0.12)",
              color: "#f87171",
              fontWeight: 700,
              fontSize: 14,
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.5 : 1,
            }}
          >
            {isPending ? "Removing\u2026" : "Remove Partner"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Partner Modal ───────────────────────────────────────────────────────

const TRADE_OPTIONS = ["HVAC", "Water Heater", "Solar", "Electrical", "Plumbing", "General Handyman", "Insulation"];

function AddPartnerModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [partnerType, setPartnerType] = useState<PartnerType>("contractor");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [license, setLicense] = useState("");
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set());

  function toggleTrade(trade: string) {
    setSelectedTrades((prev) => {
      const next = new Set(prev);
      if (next.has(trade)) next.delete(trade); else next.add(trade);
      return next;
    });
  }

  const btnLabel =
    partnerType === "contractor" ? "Add Contractor"
    : partnerType === "hes_assessor" ? "Add HES Assessor"
    : "Add Inspector";

  function handleAdd() {
    if (!name.trim()) { alert("Partner name is required."); return; }
    startTransition(async () => {
      try {
        await addPartner({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          company_name: company.trim() || undefined,
          license_number: license.trim() || undefined,
          partner_type: partnerType,
          service_types: partnerType === "contractor" ? Array.from(selectedTrades) : undefined,
        });
        onAdded();
      } catch (e: any) {
        alert(e?.message ?? "Failed to add partner.");
      }
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.60)", display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto", padding: "20px 0" }}>
      <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, width: "100%", maxWidth: 500, padding: 24, display: "flex", flexDirection: "column", gap: 16, margin: "auto" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: TEXT_PRIMARY }}>Add Partner</div>

        {/* Partner Type selector */}
        <Field label="Partner Type">
          <div style={{ display: "flex", gap: 8 }}>
            {PARTNER_TYPES.map((pt) => {
              const cfg = PARTNER_TYPE_CONFIG[pt];
              const active = partnerType === pt;
              return (
                <button
                  key={pt}
                  type="button"
                  onClick={() => setPartnerType(pt)}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1.5px solid ${active ? cfg.color : "#475569"}`,
                    background: active ? cfg.bg : "transparent",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.12s",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: active ? cfg.color : TEXT_SECONDARY }}>{cfg.label}</div>
                </button>
              );
            })}
          </div>
        </Field>

        <div style={{ height: 1, background: BORDER }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Name *">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="admin-input" style={inputStyle} />
          </Field>
          <Field label="Company Name">
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company LLC" className="admin-input" style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" type="email" className="admin-input" style={inputStyle} />
          </Field>
          <Field label="Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(503) 000-0000" type="tel" className="admin-input" style={inputStyle} />
          </Field>
        </div>

        <Field label="License #">
          <input value={license} onChange={(e) => setLicense(e.target.value)} placeholder="CCB-000000" className="admin-input" style={inputStyle} />
        </Field>

        {partnerType === "contractor" && (
          <Field label="Trade / Specialty">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TRADE_OPTIONS.map((trade) => {
                const active = selectedTrades.has(trade);
                return (
                  <button
                    key={trade}
                    type="button"
                    onClick={() => toggleTrade(trade)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 999,
                      border: `1px solid ${active ? "rgba(251,191,36,0.40)" : BORDER}`,
                      background: active ? "rgba(251,191,36,0.12)" : BG_SURFACE,
                      color: active ? "#fbbf24" : TEXT_MUTED,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      transition: "all 0.12s",
                    }}
                  >
                    {trade}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onClose} style={btnSecondary} disabled={isPending}>Cancel</button>
          <button type="button" onClick={handleAdd} style={{ ...btnPrimary, opacity: isPending ? 0.5 : 1 }} disabled={isPending}>
            {isPending ? "Adding\u2026" : btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Partner Card ────────────────────────────────────────────────────────────

function PartnerCard({
  partner,
  onDisable,
  onDelete,
}: {
  partner: PartnerContractor;
  onDisable: (p: PartnerContractor) => void;
  onDelete: (p: PartnerContractor) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      background: BG_SURFACE,
      overflow: "hidden",
    }}>
      <div style={{ padding: "14px 16px" }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: TEXT_PRIMARY }}>{partner.name}</span>
              <PartnerTypeBadge type={partner.partner_type ?? "contractor"} />
              <Badge label={partner.status} tone={statusTone(partner.status)} />
            </div>
            {partner.company_name && (
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{partner.company_name}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT_SECONDARY, fontWeight: 700, fontSize: 12, cursor: "pointer" }}
            >
              {expanded ? "Hide" : "View"}
            </button>
            <a
              href={`mailto:${partner.email ?? ""}`}
              style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT_SECONDARY, fontWeight: 700, fontSize: 12, textDecoration: "none", display: "inline-flex", alignItems: "center" }}
            >
              Contact
            </a>
            {partner.status === "active" && (
              <button
                type="button"
                onClick={() => onDisable(partner)}
                style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
              >
                Disable
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(partner)}
              title="Delete partner"
              style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center" }}
            >
              {"\u2715"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 20, marginTop: 12, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: TEXT_PRIMARY }}>{partner.total_leads_sent ?? 0}</div>
            <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 0.4 }}>Leads Sent</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: TEXT_PRIMARY }}>{partner.total_closed ?? 0}</div>
            <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 0.4 }}>Closed</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: TEXT_PRIMARY }}>
              {partner.avg_response_hours != null ? `${partner.avg_response_hours}h` : "\u2014"}
            </div>
            <div style={{ fontSize: 10, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 0.4 }}>Avg Response</div>
          </div>
          <div style={{ alignSelf: "center" }}>
            <StarRating rating={partner.avg_rating ?? 0} />
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: "14px 16px", background: "rgba(15,23,42,0.6)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Contact</div>
            <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>{partner.email || "\u2014"}</div>
            <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>{partner.phone || "\u2014"}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>License</div>
            <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>{partner.license_number || "\u2014"}</div>
          </div>
          {partner.notes && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Notes</div>
              <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>{partner.notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Client Component ───────────────────────────────────────────────────

type DispatchStatusFilter = "all" | "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
type PartnerTypeFilter = "all" | PartnerType;

export default function PartnersClient({
  partners,
  dispatches,
  embedded = false,
}: {
  partners: PartnerContractor[];
  dispatches: PartnerDispatch[];
  embedded?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [dispatchFilter, setDispatchFilter] = useState<DispatchStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<PartnerTypeFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<PartnerContractor | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filteredPartners = typeFilter === "all"
    ? partners
    : partners.filter((p) => (p.partner_type ?? "contractor") === typeFilter);

  const filteredDispatches =
    dispatchFilter === "all"
      ? dispatches
      : dispatches.filter((d) => d.status === dispatchFilter);

  // Payment tracking: aggregate per partner
  const paymentRows = partners.map((p) => {
    const partnerDispatches = dispatches.filter((d) => d.partner_id === p.id);
    const leadsCount = partnerDispatches.length;
    const revenueOwed = partnerDispatches.filter((d) => d.payment_status !== "paid").reduce((s, d) => s + (d.amount_owed ?? 0), 0);
    const lastPaid = partnerDispatches
      .filter((d) => d.payment_status === "paid")
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

    const unpaid = partnerDispatches.filter((d) => d.payment_status === "unpaid" || d.payment_status === "pending").length;
    const invoiced = partnerDispatches.filter((d) => d.payment_status === "invoiced").length;
    const payStatus = unpaid > 0 ? "unpaid" : invoiced > 0 ? "invoiced" : "paid";

    return { partner: p, leadsCount, revenueOwed, lastPaid, payStatus };
  }).filter((r) => r.leadsCount > 0);

  function handleDisable(partner: PartnerContractor) {
    const ok = confirm(`Disable ${partner.name}? They will no longer receive dispatches.`);
    if (!ok) return;
    startTransition(async () => {
      try {
        await updatePartner(partner.id, { status: "inactive" });
        router.refresh();
      } catch (e: any) {
        alert(e?.message ?? "Failed to disable partner.");
      }
    });
  }

  function handleDelete(partner: PartnerContractor) {
    setDeleteTarget(partner);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    startTransition(async () => {
      try {
        await deletePartner(deleteTarget.id);
        setDeleteTarget(null);
        setToast(`${name} has been removed.`);
        router.refresh();
      } catch (e: any) {
        alert(e?.message ?? "Failed to delete partner.");
      }
    });
  }

  function handleMarkPaid(dispatchId: string) {
    startTransition(async () => {
      try {
        await markDispatchPaid(dispatchId);
        router.refresh();
      } catch (e: any) {
        alert(e?.message ?? "Failed to mark paid.");
      }
    });
  }

  function handleRefresh() {
    router.refresh();
    setShowAddPartner(false);
  }

  // Count by type
  const typeCounts: Record<string, number> = { all: partners.length };
  for (const pt of PARTNER_TYPES) {
    typeCounts[pt] = partners.filter((p) => (p.partner_type ?? "contractor") === pt).length;
  }

  const TYPE_FILTER_TABS: { key: PartnerTypeFilter; label: string }[] = [
    { key: "all", label: "All" },
    ...PARTNER_TYPES.map((pt) => ({ key: pt as PartnerTypeFilter, label: partnerTypeLabel(pt) })),
  ];

  const DISPATCH_STATUS_TABS: DispatchStatusFilter[] = ["all", "pending", "accepted", "in_progress", "completed", "cancelled"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      {!embedded && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT_PRIMARY, letterSpacing: -0.3 }}>Partner Network</h1>
            <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 4 }}>
              {partners.length} partners &bull; {partners.filter((p) => p.status === "active").length} active
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddPartner(true)}
            className="admin-btn-primary"
            style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(16,185,129,0.30)", background: "rgba(16,185,129,0.12)", color: EMERALD, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            + Add Partner
          </button>
        </div>
      )}
      {embedded && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontSize: 13, color: TEXT_MUTED }}>
            {partners.length} partners &bull; {partners.filter((p) => p.status === "active").length} active
          </div>
          <button
            type="button"
            onClick={() => setShowAddPartner(true)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: EMERALD, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            + Add Partner
          </button>
        </div>
      )}

      {/* Type filter tabs */}
      <div style={{ display: "flex", gap: 0, background: BG_SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
        {TYPE_FILTER_TABS.map((tab, idx, arr) => {
          const active = typeFilter === tab.key;
          const count = typeCounts[tab.key] ?? 0;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTypeFilter(tab.key)}
              style={{
                padding: "7px 14px",
                border: "none",
                borderRight: idx < arr.length - 1 ? `1px solid ${BORDER}` : "none",
                background: active ? "rgba(16,185,129,0.1)" : "transparent",
                color: active ? EMERALD : TEXT_MUTED,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {tab.label}
              <span style={{ marginLeft: 5, padding: "1px 6px", borderRadius: 9999, fontSize: 10, fontWeight: 700, background: active ? "rgba(16,185,129,0.15)" : "rgba(148,163,184,0.08)", color: active ? EMERALD : TEXT_DIM }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Partner Cards */}
      {filteredPartners.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: TEXT_DIM, fontSize: 14, border: `1px dashed ${BORDER}`, borderRadius: 12 }}>
          No partners found. Add your first partner to get started.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 12 }}>
          {filteredPartners.map((partner) => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              onDisable={handleDisable}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Payment Tracking */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", background: BG_SURFACE, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: TEXT_PRIMARY }}>Payment Tracking</div>
          <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 2 }}>Revenue owed to partners per dispatched lead</div>
        </div>

        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 80px 140px 130px 130px 160px",
          gap: 12,
          padding: "10px 16px",
          fontSize: 11,
          fontWeight: 700,
          color: TEXT_DIM,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          borderBottom: `1px solid ${BORDER}`,
          background: BG_SURFACE,
        }}>
          <div>Partner</div>
          <div>Leads</div>
          <div>Revenue Owed</div>
          <div>Payment Status</div>
          <div>Last Paid</div>
          <div>Actions</div>
        </div>

        {paymentRows.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: TEXT_DIM, fontSize: 14 }}>
            No dispatch history yet.
          </div>
        ) : (
          paymentRows.map((row) => (
            <div key={row.partner.id} style={{
              display: "grid",
              gridTemplateColumns: "2fr 80px 140px 130px 130px 160px",
              gap: 12,
              padding: "12px 16px",
              borderBottom: `1px solid ${BORDER}`,
              alignItems: "center",
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: TEXT_PRIMARY }}>{row.partner.name}</div>
                <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 1 }}>{row.partner.company_name || ""}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_SECONDARY }}>{row.leadsCount}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: row.revenueOwed > 0 ? "#f87171" : TEXT_SECONDARY }}>
                {fmtCurrency(row.revenueOwed)}
              </div>
              <div>
                <Badge label={row.payStatus} tone={paymentTone(row.payStatus)} />
              </div>
              <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>
                {row.lastPaid ? fmtDate(row.lastPaid.updated_at) : "\u2014"}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {row.payStatus !== "paid" && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      const unpaid = dispatches.filter((d) => d.partner_id === row.partner.id && d.payment_status !== "paid");
                      for (const d of unpaid) handleMarkPaid(d.id);
                    }}
                    style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.30)", background: "rgba(16,185,129,0.10)", color: EMERALD, fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                  >
                    Mark Paid
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const partnerDispatches = dispatches.filter((d) => d.partner_id === row.partner.id);
                    alert(`${row.partner.name} \u2014 ${partnerDispatches.length} dispatches total.\n\nPaid: ${partnerDispatches.filter((d) => d.payment_status === "paid").length}\nUnpaid: ${partnerDispatches.filter((d) => d.payment_status !== "paid").length}`);
                  }}
                  style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT_SECONDARY, fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                >
                  View History
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dispatch History */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", background: BG_SURFACE, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: TEXT_PRIMARY }}>Dispatch History</div>
          <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 2 }}>All partner dispatches</div>
        </div>

        {/* Filter tabs */}
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: 8, flexWrap: "wrap", background: BG_SURFACE }}>
          {DISPATCH_STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setDispatchFilter(tab)}
              style={{
                padding: "5px 12px",
                borderRadius: 999,
                border: `1px solid ${dispatchFilter === tab ? "rgba(16,185,129,0.30)" : BORDER}`,
                background: dispatchFilter === tab ? "rgba(16,185,129,0.12)" : "transparent",
                color: dispatchFilter === tab ? EMERALD : TEXT_SECONDARY,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {tab === "all" ? "All" : tab.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.5fr 1.5fr 100px 100px 130px",
          gap: 12,
          padding: "10px 16px",
          fontSize: 11,
          fontWeight: 700,
          color: TEXT_DIM,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          borderBottom: `1px solid ${BORDER}`,
          background: BG_SURFACE,
        }}>
          <div>Date</div>
          <div>Lead</div>
          <div>Partner</div>
          <div>Status</div>
          <div>Amount</div>
          <div>Payment</div>
        </div>

        {filteredDispatches.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: TEXT_DIM, fontSize: 14 }}>
            No dispatches found.
          </div>
        ) : (
          filteredDispatches.map((dispatch) => {
            const pt = paymentTone(dispatch.payment_status);
            const dt = dispatchStatusTone(dispatch.status);
            const leadName = dispatch.direct_lead?.customer_name ?? dispatch.direct_lead_id?.slice(0, 8) ?? "\u2014";
            const partnerName = dispatch.partner?.name ?? dispatch.partner_id?.slice(0, 8) ?? "\u2014";
            return (
              <div
                key={dispatch.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.5fr 1.5fr 100px 100px 130px",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: `1px solid ${BORDER}`,
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>{fmtDate(dispatch.dispatched_at || dispatch.created_at)}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY }}>{leadName}</div>
                <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>{partnerName}</div>
                <div><Badge label={dispatch.status} tone={dt} /></div>
                <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>{fmtCurrency(dispatch.amount_owed)}</div>
                <div>
                  <Badge label={dispatch.payment_status || "pending"} tone={pt} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Partner Modal */}
      {showAddPartner && (
        <AddPartnerModal
          onClose={() => setShowAddPartner(false)}
          onAdded={handleRefresh}
        />
      )}

      {/* Confirm Delete Modal */}
      {deleteTarget && (
        <ConfirmDeleteModal
          partnerName={deleteTarget.name}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          isPending={isPending}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
