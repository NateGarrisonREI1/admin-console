"use client";

import { useState, useTransition } from "react";
import type { OpsDashboardData } from "../_actions/ops-dashboard";
import type { SystemLeadRow, HesRequestRow } from "../_actions/dashboard";
import { postLeadForSale, assignHesRequest } from "../_actions/dashboard";
import { StatusBadge, SystemTypeIcon, systemTypeLabel } from "@/components/dashboard";

const EMERALD = "#10b981";

function money(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function fmtDate(iso?: string | null) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmtTime(t?: string | null) {
  if (!t) return "\u2014";
  // t may be "HH:MM:SS" from postgres
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${m} ${suffix}`;
}

// ──────────────────────────────────────────
// KPI Card
// ──────────────────────────────────────────

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "leaf" | "warn" | "neutral";
}) {
  const border =
    tone === "leaf"
      ? "1px solid rgba(16,185,129,0.25)"
      : tone === "warn"
      ? "1px solid rgba(245,158,11,0.30)"
      : "1px solid #334155";
  const bg =
    tone === "leaf"
      ? "rgba(16,185,129,0.06)"
      : tone === "warn"
      ? "rgba(245,158,11,0.06)"
      : "#1e293b";
  const color =
    tone === "leaf" ? EMERALD : tone === "warn" ? "#f59e0b" : "#f1f5f9";

  return (
    <div
      style={{
        border,
        background: bg,
        borderRadius: 12,
        padding: 14,
        boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          marginTop: 6,
          letterSpacing: -0.4,
          color,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{hint}</div>
    </div>
  );
}

// ──────────────────────────────────────────
// Section Header
// ──────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{subtitle}</div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// Critical Alerts
// ──────────────────────────────────────────

function AlertsSection({ alerts }: { alerts: { type: "error" | "warning" | "info"; message: string }[] }) {
  if (alerts.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
      {alerts.map((alert, i) => {
        const borderColor =
          alert.type === "error"
            ? "#ef4444"
            : alert.type === "warning"
            ? "#f59e0b"
            : "#3b82f6";
        const bg =
          alert.type === "error"
            ? "rgba(239,68,68,0.08)"
            : alert.type === "warning"
            ? "rgba(245,158,11,0.08)"
            : "rgba(59,130,246,0.08)";
        const textColor =
          alert.type === "error"
            ? "#fca5a5"
            : alert.type === "warning"
            ? "#fcd34d"
            : "#93c5fd";
        const label =
          alert.type === "error" ? "Error" : alert.type === "warning" ? "Warning" : "Info";

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 8,
              border: `1px solid ${borderColor}`,
              background: bg,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: borderColor,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                minWidth: 48,
              }}
            >
              {label}
            </span>
            <span style={{ fontSize: 13, color: textColor }}>{alert.message}</span>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────
// Operational Status Card
// ──────────────────────────────────────────

function OpsStatusCard({
  title,
  staffCount,
  capacityPct,
  scheduledToday,
  color,
}: {
  title: string;
  staffCount: number;
  capacityPct: number;
  scheduledToday: number;
  color: string;
}) {
  const barColor =
    capacityPct >= 90
      ? "#ef4444"
      : capacityPct >= 70
      ? "#f59e0b"
      : EMERALD;

  return (
    <div
      style={{
        border: "1px solid #334155",
        background: "#1e293b",
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Staff</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>{staffCount}</span>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Capacity</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: barColor }}>{capacityPct}%</span>
          </div>
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: "#334155",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(capacityPct, 100)}%`,
                background: barColor,
                borderRadius: 2,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Today</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>
            {scheduledToday} scheduled
          </span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// Post for Sale Dialog
// ──────────────────────────────────────────

function PostForSaleDialog({
  lead,
  onClose,
  onDone,
}: {
  lead: SystemLeadRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [price, setPrice] = useState(
    lead.system_type === "solar" ? 75 : lead.system_type === "hvac" ? 50 : 25
  );
  const [days, setDays] = useState(30);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit() {
    startTransition(async () => {
      try {
        await postLeadForSale(lead.id, price, days);
        onDone();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md rounded-xl shadow-admin-xl"
        style={{ background: "#0f172a", border: "1px solid #334155" }}
      >
        <div style={{ borderBottom: "1px solid #334155", padding: "16px 20px" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>
            Post Lead for Sale
          </h3>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
            {systemTypeLabel(lead.system_type as "hvac" | "solar" | "water_heater")}{" "}
            &mdash; {lead.city}, {lead.state}
          </p>
        </div>
        <div
          style={{
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#cbd5e1",
                marginBottom: 6,
              }}
            >
              Price ($)
            </label>
            <input
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="admin-input"
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#cbd5e1",
                marginBottom: 6,
              }}
            >
              Expiration (days)
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="admin-input"
            />
          </div>
          {error && (
            <div style={{ fontSize: 13, color: "#ef4444" }}>{error}</div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "16px 20px",
            borderTop: "1px solid #334155",
          }}
        >
          <button
            onClick={onClose}
            disabled={pending}
            className="admin-btn-secondary"
            style={{ flex: 1, fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={pending}
            className="admin-btn-primary"
            style={{ flex: 1, fontSize: 13, opacity: pending ? 0.5 : 1 }}
          >
            {pending ? "Posting..." : `Post for ${money(price)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// Tab Button
// ──────────────────────────────────────────

function TabButton({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: active
          ? "1px solid rgba(16,185,129,0.25)"
          : "1px solid #334155",
        background: active ? "rgba(16,185,129,0.10)" : "transparent",
        color: active ? EMERALD : "#94a3b8",
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
        transition: "all 0.1s ease",
      }}
    >
      {label}
      <span
        style={{
          padding: "2px 8px",
          borderRadius: 999,
          background: active
            ? "rgba(16,185,129,0.15)"
            : "rgba(148,163,184,0.1)",
          fontSize: 11,
          fontWeight: 600,
          color: active ? EMERALD : "#64748b",
        }}
      >
        {count}
      </span>
    </button>
  );
}

// ──────────────────────────────────────────
// HES Requests Table
// ──────────────────────────────────────────

function HesRequestsTable({ requests }: { requests: HesRequestRow[] }) {
  const [pending, startTransition] = useTransition();

  function handleAction(id: string, action: "assign-internal" | "post-for-sale") {
    startTransition(async () => {
      await assignHesRequest(id, action);
      window.location.reload();
    });
  }

  return (
    <div
      style={{
        border: "1px solid #334155",
        background: "#1e293b",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Address</th>
              <th>Location</th>
              <th>Type</th>
              <th>Status</th>
              <th>Requested</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: "40px 16px",
                    textAlign: "center",
                    color: "#64748b",
                  }}
                >
                  No HES requests yet. Brokers submit these from their dashboard.
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id}>
                  <td style={{ color: "#f1f5f9", fontWeight: 500 }}>
                    {r.property_address}
                  </td>
                  <td style={{ color: "#cbd5e1" }}>
                    {r.city}, {r.state}
                  </td>
                  <td
                    style={{
                      color: "#cbd5e1",
                      textTransform: "capitalize",
                    }}
                  >
                    {r.property_type.replace("_", " ")}
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td style={{ color: "#64748b", fontSize: 13 }}>
                    {fmtDate(r.created_at)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {r.status === "pending" && (
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          onClick={() => handleAction(r.id, "assign-internal")}
                          disabled={pending}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 8,
                            border: "1px solid rgba(59,130,246,0.30)",
                            background: "rgba(59,130,246,0.10)",
                            color: "#3b82f6",
                            fontWeight: 600,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Assign REI
                        </button>
                        <button
                          onClick={() => handleAction(r.id, "post-for-sale")}
                          disabled={pending}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 8,
                            border: "1px solid rgba(16,185,129,0.30)",
                            background: "rgba(16,185,129,0.08)",
                            color: EMERALD,
                            fontWeight: 600,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Post $10
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// Main Dashboard Client
// ──────────────────────────────────────────

type Tab = "system-leads" | "hes-requests";

export default function AdminDashboardClient({ data }: { data: OpsDashboardData }) {
  const [tab, setTab] = useState<Tab>("system-leads");
  const [postingLead, setPostingLead] = useState<SystemLeadRow | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const { kpis, schedule, revenue, legacyData } = data;
  const { system_leads, hes_requests } = legacyData;

  const filteredLeads =
    filter === "all"
      ? system_leads
      : system_leads.filter((l) => l.system_type === filter);

  const allScheduleItems = [
    ...schedule.hes.map((h) => ({ ...h, _type: "hes" as const })),
    ...schedule.inspections.map((i) => ({ ...i, _type: "inspection" as const })),
  ].sort((a, b) => {
    const at = a.scheduled_time ?? "99:99";
    const bt = b.scheduled_time ?? "99:99";
    return at.localeCompare(bt);
  });

  return (
    <div>
      {/* ── Critical Alerts ── */}
      <AlertsSection alerts={kpis.alerts} />

      {/* ── Quick Stats Row (4 KPI cards) ── */}
      <div
        style={{
          border: "1px solid #334155",
          background: "#1e293b",
          borderRadius: 12,
          padding: 16,
          marginBottom: 14,
        }}
      >
        <SectionHeader
          title="Dashboard KPIs"
          subtitle="Live data from broker SaaS and in-house operations"
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          <KpiCard
            label="Active Brokers"
            value={String(kpis.active_brokers)}
            hint="Registered"
            tone="leaf"
          />
          <KpiCard
            label="Revenue This Month"
            value={money(kpis.revenue_this_month)}
            hint="All streams"
            tone="leaf"
          />
          <KpiCard
            label="Leads This Month"
            value={String(kpis.leads_posted)}
            hint={`${kpis.leads_purchased} purchased · ${kpis.leads_closed} closed`}
            tone="neutral"
          />
          <KpiCard
            label="Services Completed"
            value={String(kpis.services_completed)}
            hint="HES + Inspections"
            tone={kpis.services_completed > 0 ? "leaf" : "neutral"}
          />
        </div>
      </div>

      {/* ── Operational Status Row (3 cards) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <OpsStatusCard
          title="HES Team"
          staffCount={kpis.hes_staff_count}
          capacityPct={kpis.hes_capacity_pct}
          scheduledToday={kpis.hes_scheduled_today}
          color={EMERALD}
        />
        <OpsStatusCard
          title="Inspector Team"
          staffCount={kpis.inspector_staff_count}
          capacityPct={kpis.inspector_capacity_pct}
          scheduledToday={kpis.inspector_scheduled_today}
          color="#3b82f6"
        />
        <div
          style={{
            border: "1px solid #334155",
            background: "#1e293b",
            borderRadius: 12,
            padding: 16,
            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#a78bfa",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 12,
            }}
          >
            Partners
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, color: "#94a3b8" }}>Count</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>
                {kpis.partner_count}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, color: "#94a3b8" }}>Active %</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: EMERALD }}>
                {kpis.partner_active_pct}%
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, color: "#94a3b8" }}>Available</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>
                {kpis.partner_available}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Today's Schedule ── */}
      <div
        style={{
          border: "1px solid #334155",
          background: "#1e293b",
          borderRadius: 12,
          padding: 16,
          marginBottom: 14,
        }}
      >
        <SectionHeader
          title="Today's Schedule"
          subtitle="HES assessments and inspections"
        />
        {allScheduleItems.length === 0 ? (
          <div
            style={{
              padding: "20px 0",
              textAlign: "center",
              color: "#64748b",
              fontSize: 13,
            }}
          >
            No services scheduled today.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {allScheduleItems.map((item) => {
              const isHes = item._type === "hes";
              const typeColor = isHes ? EMERALD : "#3b82f6";
              const typeLabel = isHes ? "HES" : "Inspection";
              const assignedName = item.team_member?.name ?? "Unassigned";
              const addressParts = [item.address, item.city, item.state]
                .filter(Boolean)
                .join(", ");

              const statusColor =
                item.status === "completed"
                  ? EMERALD
                  : item.status === "in_progress"
                  ? "#f59e0b"
                  : item.status === "cancelled"
                  ? "#ef4444"
                  : "#94a3b8";

              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                  }}
                >
                  <div
                    style={{
                      minWidth: 48,
                      fontSize: 12,
                      fontWeight: 700,
                      color: typeColor,
                      textAlign: "center",
                    }}
                  >
                    {typeLabel}
                  </div>
                  <div
                    style={{
                      minWidth: 64,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#cbd5e1",
                    }}
                  >
                    {fmtTime(item.scheduled_time)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#f1f5f9",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.customer_name}
                    </div>
                    {addressParts && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {addressParts}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {assignedName}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: statusColor,
                      textTransform: "capitalize",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.status.replace("_", " ")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── This Week's Revenue Preview ── */}
      <div
        style={{
          border: "1px solid #334155",
          background: "#1e293b",
          borderRadius: 12,
          padding: 16,
          marginBottom: 14,
        }}
      >
        <SectionHeader
          title="Revenue Preview"
          subtitle="Month-to-date breakdown by stream"
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            {
              label: "Broker Commissions",
              value: money(revenue.broker_commissions),
              hint: `${revenue.broker_lead_count} leads`,
              color: EMERALD,
            },
            {
              label: "In-House Services",
              value: money(revenue.inhouse_hes_revenue + revenue.inhouse_inspection_revenue),
              hint: `${revenue.inhouse_hes_count} HES, ${revenue.inhouse_inspection_count} inspections`,
              color: "#3b82f6",
            },
            {
              label: "Partner Dispatch",
              value: money(revenue.partner_dispatch_revenue),
              hint: `${revenue.partner_dispatch_count} dispatches`,
              color: "#a78bfa",
            },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: "1px solid #334155",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>
                  {row.label}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {row.hint}
                </div>
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: row.color,
                }}
              >
                {row.value}
              </div>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 0 0",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>
              Total
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: EMERALD,
                letterSpacing: -0.4,
              }}
            >
              {money(revenue.total_revenue)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs: System Leads & HES Requests ── */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <TabButton
            label="System Leads"
            active={tab === "system-leads"}
            onClick={() => setTab("system-leads")}
            count={system_leads.length}
          />
          <TabButton
            label="HES Requests"
            active={tab === "hes-requests"}
            onClick={() => setTab("hes-requests")}
            count={hes_requests.length}
          />
        </div>

        {tab === "system-leads" && (
          <div
            style={{
              border: "1px solid #334155",
              background: "#1e293b",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {/* Filter bar */}
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #334155",
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {["all", "water_heater", "hvac", "solar"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 999,
                    border:
                      filter === f
                        ? "1px solid rgba(16,185,129,0.30)"
                        : "1px solid #334155",
                    background:
                      filter === f ? "rgba(16,185,129,0.10)" : "transparent",
                    color: filter === f ? EMERALD : "#94a3b8",
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 0.1s ease",
                  }}
                >
                  {f === "all"
                    ? "All Systems"
                    : systemTypeLabel(f as "hvac" | "solar" | "water_heater")}
                </button>
              ))}
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>System</th>
                    <th>Location</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: "40px 16px",
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        No system leads yet. They&apos;ll appear here when homeowners
                        request estimates.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id}>
                        <td>
                          <SystemTypeIcon
                            type={lead.system_type as "hvac" | "solar" | "water_heater"}
                            showLabel
                            size="sm"
                          />
                        </td>
                        <td style={{ color: "#cbd5e1" }}>
                          {[lead.city, lead.state].filter(Boolean).join(", ") ||
                            lead.zip}
                        </td>
                        <td style={{ fontWeight: 600, color: "#f1f5f9" }}>
                          {money(lead.price)}
                        </td>
                        <td>
                          <StatusBadge status={lead.status} />
                        </td>
                        <td style={{ color: "#64748b", fontSize: 13 }}>
                          {fmtDate(lead.created_at)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {lead.status !== "available" &&
                            lead.status !== "purchased" && (
                              <button
                                onClick={() => setPostingLead(lead)}
                                style={{
                                  padding: "4px 12px",
                                  borderRadius: 8,
                                  border:
                                    "1px solid rgba(16,185,129,0.30)",
                                  background: "rgba(16,185,129,0.08)",
                                  color: EMERALD,
                                  fontWeight: 600,
                                  fontSize: 12,
                                  cursor: "pointer",
                                  transition: "all 0.1s ease",
                                }}
                              >
                                Post
                              </button>
                            )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "hes-requests" && (
          <HesRequestsTable requests={hes_requests} />
        )}
      </div>

      {/* Post for Sale Dialog */}
      {postingLead && (
        <PostForSaleDialog
          lead={postingLead}
          onClose={() => setPostingLead(null)}
          onDone={() => {
            setPostingLead(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
