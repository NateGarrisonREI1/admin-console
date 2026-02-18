"use client";

import { useRouter } from "next/navigation";
import type { BrokerKPIs, BrokerContractor, BrokerLead, Broker } from "@/types/broker";

// ─── Design tokens ──────────────────────────────────────────────────────────
const BG_CARD = "#1e293b";
const BORDER = "#334155";
const RADIUS = 12;
const TEXT_PRIMARY = "#f1f5f9";
const TEXT_SECONDARY = "#cbd5e1";
const TEXT_MUTED = "#94a3b8";
const TEXT_DIM = "#64748b";
const ACCENT_EMERALD = "#10b981";
const ACCENT_CYAN = "#06b6d4";
const ACCENT_VIOLET = "#8b5cf6";
const ACCENT_AMBER = "#f59e0b";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function fmtCurrency(value: number): string {
  if (value >= 1000) {
    return "$" + (value / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return "$" + value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function systemLabel(type: string): string {
  const map: Record<string, string> = {
    hvac: "HVAC",
    solar: "Solar",
    water_heater: "Water Heater",
    electrical: "Electrical",
    insulation: "Insulation",
  };
  return map[type] ?? type.replace(/_/g, " ");
}

function leadStatusColor(status: string): string {
  switch (status) {
    case "active": return ACCENT_EMERALD;
    case "sold": return ACCENT_CYAN;
    case "in_progress": return ACCENT_AMBER;
    case "closed": return "#10b981";
    case "expired": return TEXT_DIM;
    case "lost": return "#ef4444";
    default: return TEXT_MUTED;
  }
}

function leadStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "Active",
    sold: "Sold",
    in_progress: "In Progress",
    closed: "Closed",
    expired: "Expired",
    lost: "Lost",
  };
  return map[status] ?? status;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

type KPICardProps = {
  label: string;
  value: string;
  accent: string;
  dotChar: string;
};

function KPICard({ label, value, accent, dotChar }: KPICardProps) {
  return (
    <div
      style={{
        background: BG_CARD,
        border: `1px solid ${BORDER}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: RADIUS,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: accent + "22",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {dotChar}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: TEXT_PRIMARY, lineHeight: 1, letterSpacing: "-0.02em" }}>
        {value}
      </div>
    </div>
  );
}

type StatusPillProps = { color: string; label: string };

function StatusPill({ color, label }: StatusPillProps) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 9px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: color + "22",
        color: color,
        border: `1px solid ${color}44`,
      }}
    >
      {label}
    </span>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

type TopContractor = {
  id: string;
  name: string;
  leads_sent: number;
  jobs_closed: number;
  conversion_rate: number;
  revenue: number;
};

type Props = {
  broker: Broker;
  kpis: BrokerKPIs;
  contractors: BrokerContractor[];
  recentLeads: BrokerLead[];
  topContractors: TopContractor[];
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BrokerDashboardClient({
  broker,
  kpis,
  recentLeads,
  topContractors,
}: Props) {
  const router = useRouter();
  const companyName = broker.company_name || "Your Company";

  const kpiCards: KPICardProps[] = [
    {
      label: "Homes Assessed",
      value: String(kpis.homes_assessed),
      accent: ACCENT_EMERALD,
      dotChar: "🏠",
    },
    {
      label: "Revenue",
      value: fmtCurrency(kpis.revenue),
      accent: ACCENT_CYAN,
      dotChar: "💰",
    },
    {
      label: "Leads Posted",
      value: String(kpis.leads_posted),
      accent: ACCENT_VIOLET,
      dotChar: "📋",
    },
    {
      label: "Jobs Closed",
      value: String(kpis.jobs_closed),
      accent: ACCENT_AMBER,
      dotChar: "✅",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Header ── */}
      <div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: TEXT_PRIMARY,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Welcome back, {companyName}
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: TEXT_MUTED, margin: "4px 0 0" }}>
          Here is a summary of your broker activity for the last 30 days.
        </p>
      </div>

      {/* ── Quick Actions ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 14,
        }}
      >
        <button
          type="button"
          onClick={() => router.push("/broker/assessments")}
          style={{
            background: `linear-gradient(135deg, ${ACCENT_EMERALD}18, ${ACCENT_EMERALD}08)`,
            border: `1px solid ${ACCENT_EMERALD}44`,
            borderRadius: RADIUS,
            padding: "20px 24px",
            cursor: "pointer",
            textAlign: "left",
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = `0 8px 24px ${ACCENT_EMERALD}22`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `${ACCENT_EMERALD}22`,
              border: `1px solid ${ACCENT_EMERALD}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 3v14M3 10h14" stroke={ACCENT_EMERALD} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: ACCENT_EMERALD }}>
              + New Assessment
            </div>
            <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4, lineHeight: 1.4 }}>
              Send an assessment link to a homeowner customer
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/broker/network")}
          style={{
            background: `linear-gradient(135deg, ${ACCENT_VIOLET}18, ${ACCENT_VIOLET}08)`,
            border: `1px solid ${ACCENT_VIOLET}44`,
            borderRadius: RADIUS,
            padding: "20px 24px",
            cursor: "pointer",
            textAlign: "left",
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = `0 8px 24px ${ACCENT_VIOLET}22`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `${ACCENT_VIOLET}22`,
              border: `1px solid ${ACCENT_VIOLET}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 7a3 3 0 11-6 0 3 3 0 016 0zM4 17a6 6 0 0112 0" stroke={ACCENT_VIOLET} strokeWidth="1.8" strokeLinecap="round" />
              <path d="M16 8v4M14 10h4" stroke={ACCENT_VIOLET} strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: ACCENT_VIOLET }}>
              + Add Contractor
            </div>
            <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4, lineHeight: 1.4 }}>
              Expand your contractor network to sell more leads
            </div>
          </div>
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        {kpiCards.map((card) => (
          <KPICard key={card.label} {...card} />
        ))}
      </div>

      {/* ── Bottom two-column layout ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* ── Top Performers ── */}
        <div
          style={{
            background: BG_CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: RADIUS,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: `1px solid ${BORDER}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: TEXT_PRIMARY }}>
              Top Performers
            </span>
            <span style={{ fontSize: 11, color: TEXT_DIM }}>Active Contractors</span>
          </div>

          {topContractors.length === 0 ? (
            <div style={{ padding: "32px 18px", textAlign: "center", color: TEXT_MUTED, fontSize: 13 }}>
              No contractor activity yet. Add contractors to your network to get started.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <th
                      style={{
                        padding: "10px 18px",
                        textAlign: "left",
                        fontSize: 10,
                        fontWeight: 700,
                        color: TEXT_DIM,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Contractor
                    </th>
                    <th
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        fontSize: 10,
                        fontWeight: 700,
                        color: TEXT_DIM,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Leads Sent
                    </th>
                    <th
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        fontSize: 10,
                        fontWeight: 700,
                        color: TEXT_DIM,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Closed
                    </th>
                    <th
                      style={{
                        padding: "10px 18px 10px 12px",
                        textAlign: "right",
                        fontSize: 10,
                        fontWeight: 700,
                        color: TEXT_DIM,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Conv. Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topContractors.map((c, i) => (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: i < topContractors.length - 1 ? `1px solid ${BORDER}44` : "none",
                      }}
                    >
                      <td style={{ padding: "11px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: "50%",
                              background: ACCENT_EMERALD + "22",
                              border: `1px solid ${ACCENT_EMERALD}44`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              fontWeight: 700,
                              color: ACCENT_EMERALD,
                              flexShrink: 0,
                            }}
                          >
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
                            {c.name}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "11px 12px", textAlign: "right", color: TEXT_SECONDARY, fontWeight: 500 }}>
                        {c.leads_sent}
                      </td>
                      <td style={{ padding: "11px 12px", textAlign: "right", color: ACCENT_EMERALD, fontWeight: 600 }}>
                        {c.jobs_closed}
                      </td>
                      <td style={{ padding: "11px 18px 11px 12px", textAlign: "right" }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: c.conversion_rate >= 50 ? ACCENT_EMERALD : c.conversion_rate >= 25 ? ACCENT_AMBER : TEXT_MUTED,
                          }}
                        >
                          {c.conversion_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Recent Activity ── */}
        <div
          style={{
            background: BG_CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: RADIUS,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: `1px solid ${BORDER}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: TEXT_PRIMARY }}>
              Recent Leads
            </span>
            <button
              className="admin-btn-secondary"
              style={{ fontSize: 11, padding: "4px 10px" }}
              onClick={() => router.push("/broker/leads")}
            >
              View All
            </button>
          </div>

          {recentLeads.length === 0 ? (
            <div style={{ padding: "32px 18px", textAlign: "center", color: TEXT_MUTED, fontSize: 13 }}>
              No leads yet. Post your first lead to start connecting with contractors.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recentLeads.map((lead, i) => (
                <div
                  key={lead.id}
                  style={{
                    padding: "12px 18px",
                    borderBottom: i < recentLeads.length - 1 ? `1px solid ${BORDER}44` : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: ACCENT_VIOLET,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          flexShrink: 0,
                        }}
                      >
                        {systemLabel(lead.system_type)}
                      </span>
                      <StatusPill color={leadStatusColor(lead.status)} label={leadStatusLabel(lead.status)} />
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: TEXT_SECONDARY,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {lead.description || lead.assessment?.customer_name || "Lead #" + lead.id.slice(0, 8)}
                    </div>
                    <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>
                      {fmtDate(lead.created_at)}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: ACCENT_CYAN,
                      flexShrink: 0,
                      textAlign: "right",
                    }}
                  >
                    {fmtCurrency(lead.price)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Secondary Stats Row ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}
      >
        <div
          style={{
            background: BG_CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: RADIUS,
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Active Contractors
          </span>
          <span style={{ fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY }}>
            {kpis.active_contractors}
          </span>
          <span style={{ fontSize: 11, color: TEXT_MUTED }}>In your network</span>
        </div>

        <div
          style={{
            background: BG_CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: RADIUS,
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Conversion Rate
          </span>
          <span style={{ fontSize: 24, fontWeight: 700, color: kpis.conversion_rate >= 25 ? ACCENT_EMERALD : ACCENT_AMBER }}>
            {kpis.conversion_rate}%
          </span>
          <span style={{ fontSize: 11, color: TEXT_MUTED }}>Leads to closed jobs</span>
        </div>

        <div
          style={{
            background: BG_CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: RADIUS,
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Avg. Lead Price
          </span>
          <span style={{ fontSize: 24, fontWeight: 700, color: ACCENT_CYAN }}>
            {fmtCurrency(kpis.avg_lead_price)}
          </span>
          <span style={{ fontSize: 11, color: TEXT_MUTED }}>Per lead posted</span>
        </div>
      </div>

    </div>
  );
}
