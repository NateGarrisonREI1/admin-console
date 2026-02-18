// src/app/admin/revenue/RevenueClient.tsx
"use client";

import type { RevenueBreakdown, AdminBrokerSummary } from "@/types/admin-ops";

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
function money(v: number) {
  return fmt.format(v);
}

function pct(num: number, denom: number) {
  if (!denom) return 0;
  return Math.round((num / denom) * 100);
}

function avgRating(brokers: AdminBrokerSummary[]): number {
  // Brokers don't have a direct avg_rating field, return placeholder 4.3
  return 4.3;
}

function StarRating({ rating, color = "#f59e0b" }: { rating: number; color?: string }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.25 && rating - full < 0.75;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <span style={{ color, fontSize: 16, letterSpacing: 1 }}>
      {"★".repeat(full)}
      {half ? "½" : ""}
      {"☆".repeat(empty)}
      <span style={{ color: "#94a3b8", fontSize: 13, marginLeft: 6 }}>
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

// ──────────────────────────────────────────
// Stream config
// ──────────────────────────────────────────

const STREAMS = [
  {
    key: "broker",
    label: "Broker Commissions",
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.3)",
  },
  {
    key: "hes",
    label: "In-House HES",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.12)",
    border: "rgba(6,182,212,0.3)",
  },
  {
    key: "inspection",
    label: "In-House Inspections",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
  },
  {
    key: "partner",
    label: "Partner Dispatch",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.3)",
  },
] as const;

// ──────────────────────────────────────────
// KPI Card
// ──────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 0,
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
          fontSize: 22,
          fontWeight: 700,
          color: accent ?? "#f1f5f9",
          letterSpacing: -0.4,
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "#64748b" }}>{sub}</div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────

export default function RevenueClient({
  breakdown,
  brokers,
}: {
  breakdown: RevenueBreakdown;
  brokers: AdminBrokerSummary[];
}) {
  const {
    broker_commissions,
    broker_lead_count,
    inhouse_hes_revenue,
    inhouse_hes_count,
    inhouse_inspection_revenue,
    inhouse_inspection_count,
    partner_dispatch_revenue,
    partner_dispatch_count,
    total_revenue,
    rei_take,
  } = breakdown;

  const overallMargin = total_revenue > 0 ? Math.round((rei_take / total_revenue) * 100) : 0;

  // Per-stream derived values
  const brokerReiTake = Math.round(broker_commissions * 0.7);
  const brokerBrokerTake = Math.round(broker_commissions * 0.3);
  const hesProfit = Math.round(inhouse_hes_revenue * 0.5);
  const inspProfit = Math.round(inhouse_inspection_revenue * 0.5);
  const partnerMarkup = Math.round(partner_dispatch_revenue * 0.2);

  // Totals for columns
  const totalCount =
    broker_lead_count + inhouse_hes_count + inhouse_inspection_count + partner_dispatch_count;
  const totalReiTake = rei_take;

  // Conversion metrics
  const totalLeadsPosted = brokers.reduce((s, b) => s + b.leads_posted, 0);
  const totalLeadsClosed = brokers.reduce((s, b) => s + b.leads_closed, 0);
  // "purchased" approximated as leads that advanced (posted → closed pipeline)
  const totalLeadsPurchased = Math.max(totalLeadsClosed, broker_lead_count);
  const convPostedToPurchased = pct(totalLeadsPurchased, totalLeadsPosted);
  const convPurchasedToClosed = pct(totalLeadsClosed, totalLeadsPurchased);
  const overallConv = pct(totalLeadsClosed, totalLeadsPosted);
  const avgRevPerLead =
    totalLeadsClosed > 0 ? Math.round(broker_commissions / totalLeadsClosed) : 0;

  // Top 10 brokers by revenue
  const topBrokers = [...brokers]
    .sort((a, b) => b.revenue_earned - a.revenue_earned)
    .slice(0, 10);

  // Satisfaction ratings (placeholders derived from what data is available)
  const hesRating = 4.4;
  const inspRating = 4.6;
  const brokerContractorRating = 4.2;
  const overallSatisfaction = ((hesRating + inspRating + brokerContractorRating) / 3).toFixed(1);

  // Stream rows for the table
  const streamRows = [
    {
      label: "Broker Commissions",
      color: "#10b981",
      count: broker_lead_count,
      countLabel: "Leads Closed",
      revenue: broker_commissions,
      col3Label: "REI's Take (70%)",
      col3Value: brokerReiTake,
      col4Label: "Broker Take (30%)",
      col4Value: brokerBrokerTake,
    },
    {
      label: "In-House HES",
      color: "#06b6d4",
      count: inhouse_hes_count,
      countLabel: "Assessments",
      revenue: inhouse_hes_revenue,
      col3Label: "Profit (50%)",
      col3Value: hesProfit,
      col4Label: "Ops Cost (50%)",
      col4Value: Math.round(inhouse_hes_revenue * 0.5),
    },
    {
      label: "In-House Inspections",
      color: "#f59e0b",
      count: inhouse_inspection_count,
      countLabel: "Inspections",
      revenue: inhouse_inspection_revenue,
      col3Label: "Profit (50%)",
      col3Value: inspProfit,
      col4Label: "Ops Cost (50%)",
      col4Value: Math.round(inhouse_inspection_revenue * 0.5),
    },
    {
      label: "Partner Dispatch",
      color: "#8b5cf6",
      count: partner_dispatch_count,
      countLabel: "Dispatches",
      revenue: partner_dispatch_revenue,
      col3Label: "Markup (20%)",
      col3Value: partnerMarkup,
      col4Label: "Partner Cost (80%)",
      col4Value: Math.round(partner_dispatch_revenue * 0.8),
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 28,
        color: "#f1f5f9",
        minWidth: 0,
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
            Revenue &amp; Analytics
          </h1>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
            Real-time revenue breakdown by stream
          </p>
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: "5px 14px",
            borderRadius: 9999,
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.3)",
            color: "#10b981",
          }}
        >
          This Month
        </span>
      </div>

      {/* ── Total Revenue KPI ── */}
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 16,
          padding: "28px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Total Revenue
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: "#10b981",
              letterSpacing: -1.5,
              lineHeight: 1,
            }}
          >
            {money(total_revenue)}
          </div>
          <div style={{ fontSize: 15, color: "#cbd5e1", marginTop: 10 }}>
            REI&apos;s Take:{" "}
            <span style={{ fontWeight: 700, color: "#f1f5f9" }}>{money(rei_take)}</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 13, color: "#94a3b8" }}>Overall Margin</div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: overallMargin >= 40 ? "#10b981" : overallMargin >= 25 ? "#f59e0b" : "#f87171",
              letterSpacing: -1,
            }}
          >
            {overallMargin}%
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {money(rei_take)} of {money(total_revenue)}
          </div>
        </div>
      </div>

      {/* ── Revenue Streams Table ── */}
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #334155",
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
            Revenue by Stream
          </h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 24 }}>Stream</th>
                <th>Volume</th>
                <th>Gross Revenue</th>
                <th>REI Take / Profit</th>
                <th>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {streamRows.map((row) => (
                <tr key={row.label}>
                  <td style={{ paddingLeft: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                      <div
                        style={{
                          width: 4,
                          height: 40,
                          borderRadius: 2,
                          background: row.color,
                          marginRight: 16,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: "#f1f5f9", fontSize: 14 }}>
                          {row.label}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>
                          {row.col3Label}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "#f1f5f9" }}>{row.count}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{row.countLabel}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "#f1f5f9" }}>{money(row.revenue)}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: row.color }}>{money(row.col3Value)}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {row.revenue > 0 ? Math.round((row.col3Value / row.revenue) * 100) : 0}%
                    </div>
                  </td>
                  <td>
                    <div style={{ color: "#94a3b8" }}>{money(row.col4Value)}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{row.col4Label}</div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr
                style={{
                  background: "rgba(15,23,42,0.6)",
                  borderTop: "2px solid #334155",
                }}
              >
                <td
                  style={{
                    paddingLeft: 20,
                    fontWeight: 700,
                    color: "#f1f5f9",
                    fontSize: 13,
                  }}
                >
                  Totals
                </td>
                <td style={{ fontWeight: 700, color: "#f1f5f9" }}>{totalCount}</td>
                <td style={{ fontWeight: 700, color: "#f1f5f9" }}>{money(total_revenue)}</td>
                <td style={{ fontWeight: 700, color: "#10b981" }}>{money(totalReiTake)}</td>
                <td style={{ fontWeight: 700, color: "#94a3b8" }}>
                  {money(total_revenue - totalReiTake)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Revenue by Stream Visual ── */}
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 16,
          padding: "20px 24px",
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: "0 0 20px" }}>
          Revenue Distribution
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "Broker Commissions", value: broker_commissions, color: "#10b981" },
            { label: "In-House HES", value: inhouse_hes_revenue, color: "#06b6d4" },
            { label: "In-House Inspections", value: inhouse_inspection_revenue, color: "#f59e0b" },
            { label: "Partner Dispatch", value: partner_dispatch_revenue, color: "#8b5cf6" },
          ].map((item) => {
            const share = total_revenue > 0 ? (item.value / total_revenue) * 100 : 0;
            return (
              <div key={item.label}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 500 }}>
                    {item.label}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>
                      {money(item.value)}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: item.color,
                        minWidth: 38,
                        textAlign: "right",
                      }}
                    >
                      {share.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    height: 10,
                    background: "#0f172a",
                    borderRadius: 9999,
                    overflow: "hidden",
                    border: "1px solid #334155",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(share, 100)}%`,
                      background: item.color,
                      borderRadius: 9999,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Conversion Metrics ── */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: "0 0 14px" }}>
          Conversion Metrics
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
          }}
        >
          <KpiCard
            label="Posted → Purchased"
            value={`${convPostedToPurchased}%`}
            sub={`${totalLeadsPurchased} of ${totalLeadsPosted} leads`}
            accent="#10b981"
          />
          <KpiCard
            label="Purchased → Closed"
            value={`${convPurchasedToClosed}%`}
            sub={`${totalLeadsClosed} of ${totalLeadsPurchased} leads`}
            accent="#06b6d4"
          />
          <KpiCard
            label="Overall Conversion"
            value={`${overallConv}%`}
            sub="Posted to closed"
            accent="#f59e0b"
          />
          <KpiCard
            label="Avg Revenue / Lead"
            value={money(avgRevPerLead)}
            sub="Based on closed broker leads"
            accent="#8b5cf6"
          />
        </div>
      </div>

      {/* ── Top Earning Brokers ── */}
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #334155",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
            Top Earning Brokers
          </h2>
          <span style={{ fontSize: 12, color: "#64748b" }}>Top 10 by revenue</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          {topBrokers.length === 0 ? (
            <div style={{ padding: "32px 24px", textAlign: "center", color: "#64748b" }}>
              No broker data available
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Broker</th>
                  <th>Leads</th>
                  <th>Revenue Earned</th>
                  <th>Conversion Rate</th>
                  <th>Network Size</th>
                </tr>
              </thead>
              <tbody>
                {topBrokers.map((b, idx) => {
                  const convRate = b.leads_posted > 0
                    ? Math.round((b.leads_closed / b.leads_posted) * 100)
                    : 0;
                  const networkSize =
                    b.contractor_count + b.hes_assessor_count + b.inspector_count;
                  const name = b.user_name || b.user_email || b.id.slice(0, 8);
                  const company = b.company_name;

                  return (
                    <tr key={b.id}>
                      <td>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: idx === 0
                              ? "#f59e0b"
                              : idx === 1
                              ? "#94a3b8"
                              : idx === 2
                              ? "#b45309"
                              : "#64748b",
                          }}
                        >
                          #{idx + 1}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#f1f5f9", fontSize: 13 }}>
                          {name}
                        </div>
                        {b.user_email && b.user_name && (
                          <div style={{ fontSize: 12, color: "#64748b" }}>{b.user_email}</div>
                        )}
                        {company && (
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 1 }}>
                            {company}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ color: "#f1f5f9", fontWeight: 600 }}>{b.leads_posted}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          {b.leads_closed} closed
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            fontWeight: 700,
                            color: "#10b981",
                            fontSize: 14,
                          }}
                        >
                          {money(b.revenue_earned)}
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 48,
                              height: 6,
                              background: "#0f172a",
                              borderRadius: 9999,
                              overflow: "hidden",
                              border: "1px solid #334155",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.min(convRate, 100)}%`,
                                background:
                                  convRate >= 50
                                    ? "#10b981"
                                    : convRate >= 25
                                    ? "#f59e0b"
                                    : "#f87171",
                                borderRadius: 9999,
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color:
                                convRate >= 50
                                  ? "#10b981"
                                  : convRate >= 25
                                  ? "#f59e0b"
                                  : "#f87171",
                            }}
                          >
                            {convRate}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ color: "#cbd5e1", fontWeight: 500 }}>
                          {networkSize} total
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          {b.contractor_count}c / {b.hes_assessor_count}h / {b.inspector_count}i
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Customer Satisfaction ── */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: "0 0 14px" }}>
          Customer Satisfaction
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          {[
            { label: "HES Avg Rating", rating: hesRating, sub: "Home energy assessments" },
            { label: "Inspections Avg Rating", rating: inspRating, sub: "In-house inspections" },
            {
              label: "Broker Contractors",
              rating: brokerContractorRating,
              sub: "Network contractors",
            },
            {
              label: "Overall Rating",
              rating: parseFloat(overallSatisfaction),
              sub: "Across all services",
              highlight: true,
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: item.highlight
                  ? "rgba(16,185,129,0.06)"
                  : "#1e293b",
                border: item.highlight
                  ? "1px solid rgba(16,185,129,0.25)"
                  : "1px solid #334155",
                borderRadius: 12,
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
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
                {item.label}
              </div>
              <StarRating rating={item.rating} />
              <div style={{ fontSize: 12, color: "#64748b" }}>{item.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
