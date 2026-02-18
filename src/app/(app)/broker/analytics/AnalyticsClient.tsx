"use client";

import type { Broker, BrokerAnalytics } from "@/types/broker";

function fmtMoney(v: number) {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function AnalyticsClient(props: { broker: Broker; analytics: BrokerAnalytics }) {
  const { analytics } = props;
  const { kpis, leads_by_system, top_contractors } = analytics;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>Analytics &amp; Performance</div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Last 30 days overview</div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPICard label="Homes Assessed" value={String(kpis.homes_assessed)} color="#10b981" />
        <KPICard label="Leads Posted" value={String(kpis.leads_posted)} color="#8b5cf6" />
        <KPICard label="Leads Sold" value={String(kpis.leads_sold)} color="#06b6d4" />
        <KPICard label="Jobs Closed" value={String(kpis.jobs_closed)} color="#10b981" />
        <KPICard label="Conversion Rate" value={`${kpis.conversion_rate}%`} color="#f59e0b" />
        <KPICard label="Revenue" value={fmtMoney(kpis.revenue)} color="#06b6d4" />
        <KPICard label="Avg Lead Price" value={fmtMoney(kpis.avg_lead_price)} color="#94a3b8" />
        <KPICard label="Active Contractors" value={String(kpis.active_contractors)} color="#8b5cf6" />
      </div>

      {/* Leads by System Type */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>Leads by System Type</div>
        {leads_by_system.length === 0 ? (
          <div style={{ fontSize: 13, color: "#94a3b8" }}>No leads posted yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {leads_by_system.map((item) => {
              const total = leads_by_system.reduce((s, i) => s + i.count, 0);
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={item.system_type}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", textTransform: "capitalize" }}>
                      {item.system_type.replace(/_/g, " ")}
                    </span>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>{item.count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "#334155", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        borderRadius: 4,
                        background: "#10b981",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Contractors */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #334155" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Top Contractors</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Ranked by jobs closed</div>
        </div>

        {top_contractors.length === 0 ? (
          <div style={{ padding: 20, fontSize: 13, color: "#94a3b8" }}>No contractor activity yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Contractor</th>
                  <th>Leads Sent</th>
                  <th>Jobs Closed</th>
                  <th>Conversion</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {top_contractors.map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, color: "#f1f5f9" }}>#{i + 1}</td>
                    <td style={{ fontWeight: 700, color: "#f1f5f9" }}>{c.name}</td>
                    <td style={{ color: "#cbd5e1" }}>{c.leads_sent}</td>
                    <td style={{ color: "#10b981", fontWeight: 700 }}>{c.jobs_closed}</td>
                    <td style={{ color: "#cbd5e1" }}>{c.conversion_rate}%</td>
                    <td style={{ color: "#06b6d4", fontWeight: 700 }}>{fmtMoney(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KPICard(props: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 16,
        borderLeft: `3px solid ${props.color}`,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {props.label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", marginTop: 4 }}>{props.value}</div>
    </div>
  );
}
