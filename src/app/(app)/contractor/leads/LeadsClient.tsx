// src/app/(app)/contractor/leads/LeadsClient.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { LeadsPageData, PurchasedLead } from "./actions";
import { STATUS_CONFIG } from "./constants";

// ─── Design tokens ──────────────────────────────────────────────────

const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

const SYSTEM_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  hvac: { bg: "rgba(249,115,22,0.15)", text: "#f97316", label: "HVAC" },
  water_heater: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6", label: "Water Heater" },
  solar: { bg: "rgba(234,179,8,0.15)", text: "#eab308", label: "Solar" },
  electrical: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b", label: "Electrical" },
  plumbing: { bg: "rgba(6,182,212,0.15)", text: "#06b6d4", label: "Plumbing" },
  general_handyman: { bg: "rgba(148,163,184,0.15)", text: "#94a3b8", label: "General Handyman" },
};

// ─── Helpers ────────────────────────────────────────────────────────

function money(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Sub-components ─────────────────────────────────────────────────

function TypeBadge({ systemType }: { systemType: string }) {
  const cfg = SYSTEM_TYPE_COLORS[systemType] ?? {
    bg: "rgba(148,163,184,0.15)",
    text: TEXT_MUTED,
    label: systemType,
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 700,
        background: cfg.bg,
        color: cfg.text,
        letterSpacing: "0.02em",
      }}
    >
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    color: TEXT_MUTED,
    bg: "rgba(148,163,184,0.15)",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 700,
        background: cfg.bg,
        color: cfg.color,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}

function EyeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={TEXT_DIM}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function LeadsClient({ data }: { data: LeadsPageData }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");

  // Build counts per status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: data.leads.length };
    for (const key of Object.keys(STATUS_CONFIG)) {
      counts[key] = 0;
    }
    for (const lead of data.leads) {
      if (counts[lead.status] !== undefined) {
        counts[lead.status]++;
      } else {
        counts[lead.status] = 1;
      }
    }
    return counts;
  }, [data.leads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    if (statusFilter === "all") return data.leads;
    return data.leads.filter((l) => l.status === statusFilter);
  }, [data.leads, statusFilter]);

  return (
    <div style={{ padding: 28 }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 700, margin: 0 }}>My Leads</h1>
        <p style={{ color: TEXT_DIM, fontSize: 13, margin: "4px 0 0" }}>
          Track purchased leads through your sales pipeline
        </p>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Total Purchased", value: data.stats.totalPurchased, color: TEXT },
          { label: "Active", value: data.stats.active, color: "#3b82f6" },
          { label: "Completed", value: data.stats.completed, color: EMERALD },
          { label: "Total Spent", value: money(data.stats.totalSpent), color: "#f59e0b" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginTop: 2 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Status Filter Pills ────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 20,
        }}
      >
        {/* "All" pill */}
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          style={{
            padding: "6px 14px",
            borderRadius: 16,
            border: `1px solid ${statusFilter === "all" ? EMERALD : BORDER}`,
            background: statusFilter === "all" ? "rgba(16,185,129,0.12)" : "transparent",
            color: statusFilter === "all" ? EMERALD : TEXT_MUTED,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          All{" "}
          <span style={{ opacity: 0.7, marginLeft: 4 }}>{statusCounts.all}</span>
        </button>

        {/* Status pills */}
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const active = statusFilter === key;
          const count = statusCounts[key] ?? 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              style={{
                padding: "6px 14px",
                borderRadius: 16,
                border: `1px solid ${active ? EMERALD : BORDER}`,
                background: active ? "rgba(16,185,129,0.12)" : "transparent",
                color: active ? EMERALD : TEXT_MUTED,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {cfg.label}{" "}
              <span style={{ opacity: 0.7, marginLeft: 4 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Leads Table ────────────────────────────────────────────── */}
      {filteredLeads.length > 0 ? (
        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <table
            className="admin-table"
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead>
              <tr>
                {["Customer", "Service", "Area", "Purchased", "Status", "Paid", "Actions"].map(
                  (col) => (
                    <th
                      key={col}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: 12,
                        fontWeight: 600,
                        color: TEXT_DIM,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  onClick={() => router.push(`/contractor/leads/${lead.id}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Empty State ─────────────────────────────────────────── */
        <div
          style={{
            background: CARD,
            border: `2px dashed ${BORDER}`,
            borderRadius: 12,
            padding: 48,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 14, color: TEXT_DIM, fontWeight: 600 }}>
            {statusFilter === "all"
              ? "You haven't purchased any leads yet."
              : "No leads match this filter."}
          </div>
          <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 6 }}>
            Browse available leads on the{" "}
            <a
              href="/contractor/job-board"
              style={{ color: EMERALD, textDecoration: "underline", fontWeight: 600 }}
            >
              Job Board
            </a>{" "}
            to get started.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Table Row ──────────────────────────────────────────────────────

function LeadRow({ lead, onClick }: { lead: PurchasedLead; onClick: () => void }) {
  const sl = lead.system_lead;
  const location = [sl.city, sl.state].filter(Boolean).join(", ");

  return (
    <tr
      onClick={onClick}
      style={{
        cursor: "pointer",
        borderBottom: `1px solid ${BORDER}`,
        transition: "background 0.1s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Customer */}
      <td style={{ padding: "12px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>
          {sl.homeowner_name ?? "—"}
        </div>
        {sl.homeowner_phone && (
          <a
            href={`tel:${sl.homeowner_phone}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "block",
              fontSize: 12,
              color: TEXT_DIM,
              textDecoration: "none",
              marginTop: 2,
            }}
          >
            {sl.homeowner_phone}
          </a>
        )}
      </td>

      {/* Service */}
      <td style={{ padding: "12px 16px" }}>
        <TypeBadge systemType={sl.system_type} />
      </td>

      {/* Area */}
      <td style={{ padding: "12px 16px", fontSize: 13, color: TEXT_SEC }}>
        {location || "—"}
      </td>

      {/* Purchased */}
      <td style={{ padding: "12px 16px" }}>
        <div style={{ fontSize: 13, color: TEXT }}>{formatDate(sl.purchased_date)}</div>
        <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>
          {timeAgo(sl.purchased_date)}
        </div>
      </td>

      {/* Status */}
      <td style={{ padding: "12px 16px" }}>
        <StatusBadge status={lead.status} />
      </td>

      {/* Paid */}
      <td style={{ padding: "12px 16px", fontSize: 13, color: TEXT, fontWeight: 700 }}>
        {money(sl.price)}
      </td>

      {/* Actions */}
      <td style={{ padding: "12px 16px" }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            borderRadius: 4,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="View lead"
        >
          <EyeIcon />
        </button>
      </td>
    </tr>
  );
}
