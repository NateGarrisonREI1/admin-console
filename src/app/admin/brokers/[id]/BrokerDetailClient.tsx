// src/app/admin/brokers/[id]/BrokerDetailClient.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/20/solid";
import { useToast } from "@/components/ui/Toast";
import { updateBrokerProfile, toggleBrokerStatus } from "../actions";
import type { BrokerDetailData } from "../data";

// ─── Design tokens ──────────────────────────────────────────────────
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

// ─── Helpers ────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return "\u2014";
  const d = iso.includes("T") ? new Date(iso) : new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function money(v: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function scoreColor(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

// ─── Sub-components ─────────────────────────────────────────────────

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px" }}>
      <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 700,
      background: isActive ? "rgba(16,185,129,0.12)" : "rgba(100,116,139,0.12)",
      color: isActive ? "#10b981" : "#64748b",
    }}>
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

// ─── Lead type badge ────────────────────────────────────────────────
const LEAD_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  hvac:         { bg: "rgba(16,185,129,0.12)", color: "#10b981" },
  water_heater: { bg: "rgba(59,130,246,0.12)", color: "#60a5fa" },
  insulation:   { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
  electrical:   { bg: "rgba(168,85,247,0.12)", color: "#a78bfa" },
  windows:      { bg: "rgba(6,182,212,0.12)",  color: "#06b6d4" },
  solar:        { bg: "rgba(234,179,8,0.12)",   color: "#eab308" },
};

// ─── Input style ────────────────────────────────────────────────────
const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${BORDER}`,
  background: CARD,
  color: TEXT,
  fontSize: 13,
  fontWeight: 500,
  outline: "none",
};

// ─── Edit Modal ─────────────────────────────────────────────────────

function EditModal({ broker, onClose, onSaved }: {
  broker: BrokerDetailData["broker"];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: broker.user_name || "",
    email: broker.user_email || "",
    phone: "",
    companyName: broker.company_name || "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateBrokerProfile({
        brokerId: broker.id,
        userId: broker.user_id,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        companyName: form.companyName,
      });
      if (result.ok) {
        toast.success("Broker profile updated");
        onSaved();
      } else {
        toast.error("Failed to update profile", result.error);
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.50)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 440, background: "#1e293b", border: "1px solid #334155",
        borderRadius: 12, padding: 24,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT, margin: 0 }}>Edit Broker Profile</h2>
          <button type="button" onClick={onClose} style={{
            background: "none", border: "none", color: TEXT_DIM, fontSize: 18, cursor: "pointer", padding: 4, lineHeight: 1,
          }}>{"\u2715"}</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "block" }}>
              Full Name
            </label>
            <input
              style={INPUT_STYLE}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Full name"
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "block" }}>
              Email
            </label>
            <input
              style={INPUT_STYLE}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email address"
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "block" }}>
              Phone
            </label>
            <input
              style={INPUT_STYLE}
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone number"
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "block" }}>
              Company Name
            </label>
            <input
              style={INPUT_STYLE}
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder="Company name"
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button type="button" onClick={onClose} style={{
            padding: "8px 16px", borderRadius: 8, border: `1px solid ${BORDER}`,
            background: "transparent", color: TEXT_SEC, fontSize: 13, fontWeight: 600,
            cursor: "pointer",
          }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving} style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: saving ? "#065f46" : EMERALD, color: "#fff",
            fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "Saving\u2026" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

type Props = { data: BrokerDetailData };

export default function BrokerDetailClient({ data }: Props) {
  const router = useRouter();
  const toast = useToast();
  const { broker, health_score, contractors, leads_last_30_days, leads_last_7_days, avg_days_to_close, revenue_by_type, alerts } = data;

  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [toggling, setToggling] = useState(false);

  const brokerStatus = broker.status || "active";
  const isActive = brokerStatus === "active";
  const displayName = broker.user_name || broker.user_email || broker.user_id;
  const showCompany = broker.company_name && broker.company_name !== displayName;
  const conversionRate = broker.homes_assessed > 0
    ? ((broker.leads_posted / broker.homes_assessed) * 100).toFixed(1)
    : "0.0";

  const contractorsList = contractors.filter((c) => c.provider_type === "contractor");
  const hesList = contractors.filter((c) => c.provider_type === "hes_assessor");
  const inspList = contractors.filter((c) => c.provider_type === "inspector");

  const subScores: { label: string; key: keyof typeof health_score; weight: string }[] = [
    { label: "Activity", key: "activity", weight: "30%" },
    { label: "Conversion", key: "conversion", weight: "25%" },
    { label: "Stickiness", key: "stickiness", weight: "20%" },
    { label: "Network", key: "network_quality", weight: "15%" },
    { label: "Revenue", key: "revenue_trend", weight: "10%" },
  ];

  // ── Action handlers ──

  const handleToggleStatus = useCallback(async () => {
    const newStatus = isActive ? "disabled" : "active";
    const msg = isActive
      ? `Are you sure you want to deactivate ${displayName}? They will lose access to their broker console.`
      : `Are you sure you want to activate ${displayName}? They will regain access to their broker console.`;
    if (!window.confirm(msg)) return;

    setToggling(true);
    try {
      const result = await toggleBrokerStatus({
        userId: broker.user_id,
        brokerId: broker.id,
        newStatus,
      });
      if (result.ok) {
        toast.success(isActive ? "Broker deactivated" : "Broker activated");
        router.refresh();
      } else {
        toast.error("Failed to update status", result.error);
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setToggling(false);
    }
  }, [isActive, displayName, broker.user_id, broker.id, toast, router]);

  const handleMessage = useCallback(() => {
    const email = broker.user_email ?? "";
    window.location.href = `mailto:${email}?subject=${encodeURIComponent("REI Admin \u2014 Follow Up")}`;
  }, [broker.user_email]);

  const handleExport = useCallback(() => {
    const convRate = broker.leads_posted > 0
      ? ((broker.leads_closed / broker.leads_posted) * 100).toFixed(1) + "%"
      : "0%";
    const rows = [
      ["Broker Name", "Email", "Phone", "Company", "Member Since", "Status"],
      [displayName, broker.user_email ?? "", "", broker.company_name ?? "", fmtDate(broker.created_at), brokerStatus],
      [],
      ["Health Score", "Risk Level"],
      [String(health_score.overall), health_score.risk_level],
      [],
      ["Homes Assessed", "Leads Posted", "Leads Closed", "Revenue Earned", "Conversion Rate"],
      [String(broker.homes_assessed), String(broker.leads_posted), String(broker.leads_closed), money(broker.revenue_earned), convRate],
      [],
      ["Contractors", "HES Assessors", "Inspectors"],
      [String(broker.contractor_count), String(broker.hes_assessor_count), String(broker.inspector_count)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = displayName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${safeName}_export_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [displayName, broker, health_score, brokerStatus, toast]);

  const handleViewAsBroker = useCallback(() => {
    router.push(`/broker/dashboard?broker_id=${broker.id}`);
  }, [router, broker.id]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Edit Modal */}
      {showEditModal && (
        <EditModal
          broker={broker}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            router.refresh();
          }}
        />
      )}

      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push("/admin/brokers")}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none", color: TEXT_MUTED,
          fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, width: "fit-content",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = TEXT)}
        onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_MUTED)}
      >
        <ArrowLeftIcon style={{ width: 14, height: 14 }} />
        Back to Brokers
      </button>

      {/* Header Card */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 20px",
      }}>
        {/* Avatar */}
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "rgba(16,185,129,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 700, color: EMERALD, flexShrink: 0,
        }}>
          {initials(displayName)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: 0 }}>{displayName}</h1>
            <span style={{
              padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
              background: "rgba(16,185,129,0.15)", color: "#10b981",
            }}>
              Broker
            </span>
            <StatusBadge status={brokerStatus} />
          </div>
          <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 3 }}>
            {broker.user_email ?? "No email"}{showCompany ? ` \u00b7 ${broker.company_name}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button type="button" onClick={() => setShowEditModal(true)} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8, border: `1px solid ${BORDER}`,
            background: "#334155", color: TEXT_SEC, fontSize: 12, fontWeight: 600,
            cursor: "pointer", transition: "all 0.12s",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#475569"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#334155"; }}
          >
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M14.5 2.5l3 3L6 17H3v-3L14.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
            Edit
          </button>
          {isActive ? (
            <button type="button" onClick={handleToggleStatus} disabled={toggling} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.25)",
              background: "rgba(239,68,68,0.06)", color: "#f87171", fontSize: 12, fontWeight: 600,
              cursor: toggling ? "not-allowed" : "pointer", transition: "all 0.12s",
              opacity: toggling ? 0.6 : 1,
            }}>
              {toggling ? "Deactivating\u2026" : "Deactivate"}
            </button>
          ) : (
            <button type="button" onClick={handleToggleStatus} disabled={toggling} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.30)",
              background: "rgba(16,185,129,0.08)", color: "#10b981", fontSize: 12, fontWeight: 600,
              cursor: toggling ? "not-allowed" : "pointer", transition: "all 0.12s",
              opacity: toggling ? 0.6 : 1,
            }}>
              {toggling ? "Activating\u2026" : "Activate"}
            </button>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Profile Card */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 20px" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Profile
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <ProfileField label="Email" value={broker.user_email ?? "\u2014"} />
              <ProfileField label="Phone" value="\u2014" />
              <ProfileField label="Company" value={broker.company_name ?? "\u2014"} />
              <ProfileField label="Member Since" value={fmtDate(broker.created_at)} />
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            <KpiCard label="Homes Assessed" value={broker.homes_assessed} color={EMERALD} />
            <KpiCard label="Leads Posted" value={broker.leads_posted} color={EMERALD} />
            <KpiCard label="Revenue Earned" value={money(broker.revenue_earned)} color="#a78bfa" />
            <KpiCard label="Conversion Rate" value={`${conversionRate}%`} color="#f59e0b" />
          </div>

          {/* Network Breakdown Card */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", borderBottom: `1px solid ${BORDER}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Network
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: TEXT_DIM }}>
                  ({broker.contractor_count + broker.hes_assessor_count + broker.inspector_count})
                </span>
              </h3>
            </div>
            <div style={{ padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid rgba(51,65,85,0.5)` }}>
                    {["Type", "Count", "Members"].map((h) => (
                      <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {([
                    { label: "Contractors", count: broker.contractor_count, members: contractorsList },
                    { label: "HES Assessors", count: broker.hes_assessor_count, members: hesList },
                    { label: "Inspectors", count: broker.inspector_count, members: inspList },
                  ]).map((row) => (
                    <tr key={row.label} style={{ borderBottom: `1px solid rgba(51,65,85,0.5)` }}>
                      <td style={{ padding: "10px 20px", fontSize: 13, color: TEXT, fontWeight: 600 }}>{row.label}</td>
                      <td style={{ padding: "10px 20px", fontSize: 13, color: EMERALD, fontWeight: 700 }}>{row.count}</td>
                      <td style={{ padding: "10px 20px", fontSize: 12, color: TEXT_MUTED }}>
                        {row.members.length > 0
                          ? row.members.map((m) => m.name).join(", ")
                          : "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Revenue Breakdown Card */}
          {revenue_by_type.length > 0 && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", borderBottom: `1px solid ${BORDER}` }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Lead Breakdown by Type
                  <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: TEXT_DIM }}>({revenue_by_type.reduce((s, r) => s + r.count, 0)})</span>
                </h3>
              </div>
              <div style={{ padding: 0 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid rgba(51,65,85,0.5)` }}>
                      {["Type", "Posted", "Closed", "Revenue"].map((h) => (
                        <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {revenue_by_type.map((r) => {
                      const tc = LEAD_TYPE_COLORS[r.type] ?? { bg: "rgba(100,116,139,0.12)", color: "#94a3b8" };
                      return (
                        <tr key={r.type} style={{ borderBottom: `1px solid rgba(51,65,85,0.5)` }}>
                          <td style={{ padding: "10px 20px" }}>
                            <span style={{
                              display: "inline-block", padding: "2px 8px", borderRadius: 6,
                              fontSize: 11, fontWeight: 700, background: tc.bg, color: tc.color, textTransform: "capitalize",
                            }}>
                              {r.type.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td style={{ padding: "10px 20px", fontSize: 13, color: TEXT, fontWeight: 600 }}>{r.count}</td>
                          <td style={{ padding: "10px 20px", fontSize: 13, color: TEXT, fontWeight: 600 }}>{r.closed}</td>
                          <td style={{ padding: "10px 20px", fontSize: 13, color: EMERALD, fontWeight: 700 }}>{money(r.revenue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Contractor Performance */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{
              padding: "12px 20px", borderBottom: `1px solid ${BORDER}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Contractor Performance
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: TEXT_DIM }}>({contractors.length})</span>
              </h3>
              {contractors.length > 5 && (
                <button type="button" onClick={() => setShowAllHistory(!showAllHistory)} style={{
                  background: "none", border: "none", color: EMERALD, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  {showAllHistory ? "Show less" : "Show all"}
                </button>
              )}
            </div>
            {contractors.length === 0 ? (
              <div style={{ padding: "24px 20px", color: TEXT_DIM, fontSize: 13, textAlign: "center" }}>
                No contractors connected yet.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid rgba(51,65,85,0.5)` }}>
                    {["Name", "Type", "Leads Sent", "Closed"].map((h) => (
                      <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(showAllHistory ? contractors : contractors.slice(0, 5)).map((c) => (
                    <tr key={c.id} style={{ borderBottom: `1px solid rgba(51,65,85,0.5)` }}>
                      <td style={{ padding: "10px 20px" }}>
                        <div style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{c.name}</div>
                        {c.company_name && <div style={{ fontSize: 11, color: TEXT_DIM }}>{c.company_name}</div>}
                      </td>
                      <td style={{ padding: "10px 20px", fontSize: 12, color: TEXT_MUTED, textTransform: "capitalize" }}>
                        {c.provider_type.replace(/_/g, " ")}
                      </td>
                      <td style={{ padding: "10px 20px", fontSize: 13, color: TEXT, fontWeight: 600 }}>{c.leads_sent}</td>
                      <td style={{ padding: "10px 20px", fontSize: 13, color: TEXT, fontWeight: 600 }}>{c.leads_closed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Health Score Card */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 20px" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Health Score
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: scoreColor(health_score.overall), lineHeight: 1 }}>
                {health_score.overall}
              </div>
              <div>
                <span style={{
                  display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                  textTransform: "capitalize",
                  ...(health_score.risk_level === "low"
                    ? { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.30)" }
                    : health_score.risk_level === "medium"
                    ? { background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.30)" }
                    : { background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.30)" }),
                }}>
                  {health_score.risk_level} risk
                </span>
                <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 4 }}>out of 100</div>
              </div>
            </div>

            {/* Score Breakdown Bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {subScores.map((s) => {
                const val = health_score[s.key] as number;
                return (
                  <div key={s.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: TEXT_SEC, fontWeight: 600 }}>{s.label}</span>
                      <span style={{ fontSize: 10, color: TEXT_DIM }}>{val}/100 ({s.weight})</span>
                    </div>
                    <div style={{ height: 6, background: "rgba(51,65,85,0.5)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(val, 100)}%`, background: scoreColor(val), borderRadius: 999, transition: "width 0.3s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Metrics Card */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 20px" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Key Metrics
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {([
                { label: "Leads (30 days)", value: String(leads_last_30_days) },
                { label: "Leads (7 days)", value: String(leads_last_7_days) },
                { label: "Avg Days to Close", value: avg_days_to_close > 0 ? avg_days_to_close.toFixed(1) : "\u2014" },
                { label: "Leads Closed", value: String(broker.leads_closed) },
              ]).map((m) => (
                <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(51,65,85,0.5)" }}>
                  <span style={{ fontSize: 12, color: TEXT_MUTED }}>{m.label}</span>
                  <span style={{ fontSize: 13, color: TEXT, fontWeight: 700 }}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts Card */}
          {alerts.length > 0 && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 20px" }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Alerts
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {alerts.map((a, i) => {
                  const alertColors = {
                    success: { bg: "rgba(16,185,129,0.08)", bd: "rgba(16,185,129,0.20)", tx: "#10b981" },
                    warning: { bg: "rgba(245,158,11,0.08)", bd: "rgba(245,158,11,0.20)", tx: "#f59e0b" },
                    info: { bg: "rgba(59,130,246,0.08)", bd: "rgba(59,130,246,0.20)", tx: "#60a5fa" },
                  };
                  const c = alertColors[a.type];
                  return (
                    <div key={i} style={{
                      padding: "8px 12px", borderRadius: 8,
                      background: c.bg, border: `1px solid ${c.bd}`,
                      fontSize: 12, color: c.tx, fontWeight: 600,
                    }}>
                      {a.message}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 20px" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Quick Actions
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button type="button" onClick={handleMessage} style={{
                width: "100%", padding: "9px 14px", borderRadius: 8,
                border: `1px solid ${BORDER}`, background: "transparent",
                color: TEXT_SEC, fontSize: 12, fontWeight: 600, cursor: "pointer",
                textAlign: "center", transition: "background 0.12s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(51,65,85,0.4)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                Message Broker
              </button>
              <button type="button" onClick={handleExport} style={{
                width: "100%", padding: "9px 14px", borderRadius: 8,
                border: `1px solid ${BORDER}`, background: "transparent",
                color: TEXT_SEC, fontSize: 12, fontWeight: 600, cursor: "pointer",
                textAlign: "center", transition: "background 0.12s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(51,65,85,0.4)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                Export Data
              </button>
              <button type="button" onClick={handleViewAsBroker} style={{
                width: "100%", padding: "9px 14px", borderRadius: 8,
                border: `1px solid ${BORDER}`, background: "transparent",
                color: TEXT_SEC, fontSize: 12, fontWeight: 600, cursor: "pointer",
                textAlign: "center", transition: "background 0.12s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(51,65,85,0.4)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                View as Broker
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
