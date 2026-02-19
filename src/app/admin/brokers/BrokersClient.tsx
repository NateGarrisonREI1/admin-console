// src/app/admin/brokers/BrokersClient.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import type { AdminBrokerSummary, BrokerHealthSummary, BrokerHealthAudit } from "@/types/admin-ops";
import { fetchBrokerAudit } from "../contractor-leads/actions";

// ─── Helpers ─────────────────────────────────────────────────

function fmtDate(iso?: string | null) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function money(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

const INACTIVE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

function isInactive(broker: AdminBrokerSummary): boolean {
  const ts = broker.last_activity ?? broker.updated_at;
  if (!ts) return true;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return true;
  return Date.now() - d.getTime() > INACTIVE_THRESHOLD_MS;
}

function brokerDisplayName(b: AdminBrokerSummary): string {
  return b.user_name || b.user_email || b.user_id;
}

function scoreColor(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function riskBadgeStyle(risk: "low" | "medium" | "high"): CSSProperties {
  const map = {
    low: { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.30)", tx: "#10b981" },
    medium: { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.30)", tx: "#fbbf24" },
    high: { bg: "rgba(239,68,68,0.12)", bd: "rgba(239,68,68,0.35)", tx: "#ef4444" },
  };
  const t = map[risk];
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    border: `1px solid ${t.bd}`,
    background: t.bg,
    color: t.tx,
    fontSize: 12,
    fontWeight: 900,
    textTransform: "capitalize",
  };
}

const fmtCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// ─── Types ───────────────────────────────────────────────────

type ActiveTab = "all-brokers" | "health-audit";
type FilterStatus = "all" | "active" | "inactive";
type BrokerRiskFilter = "all" | "low" | "medium" | "high";

type Props = {
  brokers: AdminBrokerSummary[];
  healthData: BrokerHealthSummary[];
};

// ─── Sub-components ───────────────────────────────────────────

function StatusBadge({ inactive }: { inactive: boolean }) {
  if (inactive) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 9999,
        border: "1px solid rgba(245,158,11,0.30)", background: "rgba(245,158,11,0.10)",
        color: "#fbbf24", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
      }}>
        Inactive
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 9999,
      border: "1px solid rgba(16,185,129,0.30)", background: "rgba(16,185,129,0.10)",
      color: "#10b981", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
    }}>
      Active
    </span>
  );
}

function IconButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: 32, height: 32, borderRadius: 8, border: "1px solid #334155",
        background: "transparent", color: "#94a3b8", cursor: "pointer",
        display: "grid", placeItems: "center", transition: "all 0.12s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(51,65,85,0.5)"; e.currentTarget.style.color = "#f1f5f9"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
    >
      {children}
    </button>
  );
}

function HealthBadge({ score, riskLevel }: { score: number; riskLevel: "low" | "medium" | "high" }) {
  const riskMap = {
    low: { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.30)", tx: "#10b981" },
    medium: { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.30)", tx: "#fbbf24" },
    high: { bg: "rgba(239,68,68,0.12)", bd: "rgba(239,68,68,0.35)", tx: "#ef4444" },
  };
  const t = riskMap[riskLevel];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 14, fontWeight: 950, color: scoreColor(score) }}>{score}</span>
      <span style={{
        padding: "2px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700,
        background: t.bg, border: `1px solid ${t.bd}`, color: t.tx, textTransform: "capitalize",
      }}>
        {riskLevel}
      </span>
    </div>
  );
}

// ─── Filter Tab ───────────────────────────────────────────────

function FilterTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "8px 14px", borderRadius: 999,
      border: active ? "1px solid rgba(16,185,129,0.30)" : "1px solid #334155",
      background: active ? "rgba(16,185,129,0.12)" : "#1e293b",
      color: active ? "#10b981" : "#cbd5e1", fontWeight: 900, fontSize: 13, cursor: "pointer",
      display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s ease",
    }}>
      {label}
      <span style={{
        padding: "1px 7px", borderRadius: 999,
        background: active ? "rgba(16,185,129,0.18)" : "rgba(51,65,85,0.6)",
        color: active ? "#10b981" : "#94a3b8", fontSize: 11, fontWeight: 950,
      }}>
        {count}
      </span>
    </button>
  );
}

// ─── Health Audit Sub-components ──────────────────────────────

function HealthBrokerCard({ broker, onViewAudit }: { broker: BrokerHealthSummary; onViewAudit: () => void }) {
  const hs = broker.health_score;
  const sc = scoreColor(hs.overall);

  return (
    <div style={{ border: "1px solid #334155", background: "#1e293b", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 950, color: "#f1f5f9" }}>{broker.user_name || broker.user_email || "Unknown"}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{broker.company_name || "No company"}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 950, color: sc, lineHeight: 1 }}>{hs.overall}</div>
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 800, marginTop: 2 }}>SCORE</div>
        </div>
      </div>
      <div><span style={riskBadgeStyle(hs.risk_level)}>{hs.risk_level} risk</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <MiniMetric label="Homes" value={String(broker.homes_assessed)} />
        <MiniMetric label="Leads" value={String(broker.leads_posted)} />
        <MiniMetric label="Revenue" value={fmtCurrency.format(broker.revenue_earned)} />
      </div>
      <div style={{ fontSize: 12, color: "#64748b" }}>
        {broker.contractor_count} contractors, {broker.hes_assessor_count} HES, {broker.inspector_count} inspectors
      </div>
      <button type="button" onClick={onViewAudit} style={btnPrimary}>View Audit</button>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "rgba(51,65,85,0.3)", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 950, color: "#f1f5f9" }}>{value}</div>
      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 800, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function HealthStatCard({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div style={{ border: "1px solid #334155", background: "#1e293b", borderRadius: 16, padding: "16px 18px" }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 950, color: alert ? "#ef4444" : "#f1f5f9", marginTop: 4 }}>{value}</div>
    </div>
  );
}

function HealthNetworkCard({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ border: "1px solid #334155", background: "#1e293b", borderRadius: 16, padding: "16px 18px", textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 950, color: "#f1f5f9" }}>{count}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 800, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "rgba(51,65,85,0.3)", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 950, color: "#f1f5f9" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 800, marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ─── Broker Audit View ─────────────────────────────────────────

function BrokerAuditView({ audit, loading, onBack }: { audit: BrokerHealthAudit | null; loading: boolean; onBack: () => void }) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, gap: 14 }}>
        <div style={{ fontSize: 14, color: "#94a3b8", fontWeight: 800 }}>Loading audit data...</div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div style={{ padding: 20, color: "#ef4444", fontSize: 13 }}>
        Failed to load audit data.{" "}
        <button type="button" onClick={onBack} style={{ ...btnSecondary, marginLeft: 8 }}>Back to List</button>
      </div>
    );
  }

  const { broker, health_score: hs, contractors, alerts } = audit;
  const conversionRate = audit.leads_last_30_days > 0
    ? ((audit.leads_last_30_days - (audit.leads_last_30_days - broker.leads_closed)) / audit.leads_last_30_days) * 100
    : 0;

  const subScores: { label: string; key: keyof typeof hs; weight: string }[] = [
    { label: "Activity", key: "activity", weight: "30%" },
    { label: "Conversion", key: "conversion", weight: "25%" },
    { label: "Stickiness", key: "stickiness", weight: "20%" },
    { label: "Network Quality", key: "network_quality", weight: "15%" },
    { label: "Revenue Trend", key: "revenue_trend", weight: "10%" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <button type="button" onClick={onBack} style={{ ...btnSecondary, alignSelf: "flex-start" }}>
        {"\u2190"} Back to List
      </button>

      <div style={{ border: "1px solid #334155", background: "#1e293b", borderRadius: 16, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 950, color: "#f1f5f9" }}>{broker.user_name || broker.user_email || "Unknown Broker"}</div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
            {broker.company_name || "No company"} &middot; Status: {broker.status} &middot; Since {fmtDate(broker.created_at)}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, fontWeight: 950, color: scoreColor(hs.overall), lineHeight: 1 }}>{hs.overall}</div>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 800, marginTop: 4 }}>OVERALL</div>
          <span style={{ ...riskBadgeStyle(hs.risk_level), marginTop: 6 }}>{hs.risk_level} risk</span>
        </div>
      </div>

      <div style={{ border: "1px solid #334155", background: "#1e293b", borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 950, color: "#f1f5f9", marginBottom: 16 }}>Health Score Breakdown</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {subScores.map((s) => {
            const val = hs[s.key] as number;
            return (
              <div key={s.key}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 800 }}>{s.label}</span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{val}/100 ({s.weight})</span>
                </div>
                <div style={{ height: 8, background: "rgba(51,65,85,0.5)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(val, 100)}%`, background: scoreColor(val), borderRadius: 999, transition: "width 0.3s" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <HealthNetworkCard label="Contractors" count={broker.contractor_count} />
        <HealthNetworkCard label="HES Assessors" count={broker.hes_assessor_count} />
        <HealthNetworkCard label="Inspectors" count={broker.inspector_count} />
      </div>

      <div style={{ border: "1px solid #334155", background: "#1e293b", borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 950, color: "#f1f5f9", marginBottom: 16 }}>Key Metrics</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
          <MetricBox label="Leads (30d)" value={String(audit.leads_last_30_days)} />
          <MetricBox label="Leads (7d)" value={String(audit.leads_last_7_days)} />
          <MetricBox label="Avg Days to Close" value={audit.avg_days_to_close.toFixed(1)} />
          <MetricBox label="Conversion Rate" value={`${conversionRate.toFixed(1)}%`} />
        </div>
      </div>

      {audit.revenue_by_type.length > 0 && (
        <div style={{ border: "1px solid #334155", background: "#1e293b", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 950, color: "#f1f5f9", marginBottom: 16 }}>Revenue Breakdown</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 120px", gap: 10, padding: "8px 0", fontSize: 12, fontWeight: 900, color: "#94a3b8", borderBottom: "1px solid rgba(51,65,85,0.5)" }}>
            <div>Type</div><div>Count</div><div>Closed</div><div>Revenue</div>
          </div>
          {audit.revenue_by_type.map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 120px", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(51,65,85,0.3)", fontSize: 13 }}>
              <div style={{ color: "#f1f5f9", fontWeight: 800, textTransform: "capitalize" }}>{r.type}</div>
              <div style={{ color: "#cbd5e1" }}>{r.count}</div>
              <div style={{ color: "#cbd5e1" }}>{r.closed}</div>
              <div style={{ color: "#10b981", fontWeight: 800 }}>{fmtCurrency.format(r.revenue)}</div>
            </div>
          ))}
        </div>
      )}

      {contractors.length > 0 && (
        <div style={{ border: "1px solid #334155", background: "#1e293b", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 950, color: "#f1f5f9", marginBottom: 16 }}>Contractor Performance</div>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 80px 80px 80px 100px", gap: 10, padding: "8px 0", fontSize: 12, fontWeight: 900, color: "#94a3b8", borderBottom: "1px solid rgba(51,65,85,0.5)" }}>
            <div>Name</div><div>Sent</div><div>Closed</div><div>Rating</div><div>Type</div>
          </div>
          {contractors.map((c) => (
            <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 80px 80px 80px 100px", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(51,65,85,0.3)", fontSize: 13 }}>
              <div>
                <div style={{ color: "#f1f5f9", fontWeight: 800 }}>{c.name}</div>
                {c.company_name && <div style={{ color: "#64748b", fontSize: 11 }}>{c.company_name}</div>}
              </div>
              <div style={{ color: "#cbd5e1" }}>{c.leads_sent}</div>
              <div style={{ color: "#cbd5e1" }}>{c.leads_closed}</div>
              <div style={{ color: "#fbbf24", fontWeight: 800 }}>{c.avg_rating.toFixed(1)}</div>
              <div style={{ color: "#94a3b8", textTransform: "capitalize" }}>{c.provider_type}</div>
            </div>
          ))}
        </div>
      )}

      {alerts.length > 0 && (
        <div style={{ border: "1px solid #334155", background: "#1e293b", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 950, color: "#f1f5f9", marginBottom: 16 }}>Alerts & Opportunities</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.map((a, i) => {
              const alertColors = {
                success: { bg: "rgba(16,185,129,0.10)", bd: "rgba(16,185,129,0.25)", tx: "#10b981" },
                warning: { bg: "rgba(245,158,11,0.10)", bd: "rgba(245,158,11,0.25)", tx: "#fbbf24" },
                info: { bg: "rgba(59,130,246,0.10)", bd: "rgba(59,130,246,0.25)", tx: "#60a5fa" },
              };
              const c = alertColors[a.type];
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: c.bg, border: `1px solid ${c.bd}` }}>
                  <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 999, border: `1px solid ${c.bd}`, background: c.bg, color: c.tx, fontSize: 11, fontWeight: 900, textTransform: "capitalize", flexShrink: 0 }}>
                    {a.type}
                  </span>
                  <span style={{ fontSize: 13, color: "#cbd5e1" }}>{a.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "10px 0" }}>
        <button type="button" style={btnPrimary}>Message Broker</button>
        <button type="button" style={btnSecondary}>View Dashboard</button>
        <button type="button" style={btnSecondary}>Export Data</button>
      </div>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────

export default function BrokersClient({ brokers, healthData }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>("all-brokers");
  const [filter, setFilter] = useState<FilterStatus>("all");

  // Health audit state
  const [brokerRiskFilter, setBrokerRiskFilter] = useState<BrokerRiskFilter>("all");
  const [brokerSortDesc, setBrokerSortDesc] = useState(true);
  const [selectedBrokerId, setSelectedBrokerId] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<BrokerHealthAudit | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // Build health score lookup
  const healthMap = useMemo(() => {
    const m = new Map<string, { overall: number; risk_level: "low" | "medium" | "high" }>();
    for (const h of healthData) {
      m.set(h.id, { overall: h.health_score.overall, risk_level: h.health_score.risk_level });
    }
    return m;
  }, [healthData]);

  const activeBrokers = brokers.filter((b) => !isInactive(b));
  const inactiveBrokers = brokers.filter((b) => isInactive(b));

  const filtered = filter === "all" ? brokers : filter === "active" ? activeBrokers : inactiveBrokers;

  // Health audit filtering
  const filteredHealthBrokers = useMemo(() => {
    let list = [...healthData];
    if (brokerRiskFilter !== "all") list = list.filter((b) => b.health_score.risk_level === brokerRiskFilter);
    list.sort((a, b) => brokerSortDesc ? b.health_score.overall - a.health_score.overall : a.health_score.overall - b.health_score.overall);
    return list;
  }, [healthData, brokerRiskFilter, brokerSortDesc]);

  const avgHealthScore = useMemo(() => {
    if (healthData.length === 0) return 0;
    return Math.round(healthData.reduce((s, b) => s + b.health_score.overall, 0) / healthData.length);
  }, [healthData]);

  const atRiskBrokers = useMemo(() => healthData.filter((b) => b.health_score.overall < 40).length, [healthData]);

  async function handleViewAudit(brokerId: string) {
    setSelectedBrokerId(brokerId);
    setAuditLoading(true);
    setAuditData(null);
    try {
      const data = await fetchBrokerAudit(brokerId);
      setAuditData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: -0.3, color: "#f1f5f9" }}>Brokers</div>
          <div style={{ color: "#94a3b8", marginTop: 3, fontSize: 13 }}>Manage all broker accounts, network activity, and health audits.</div>
        </div>
        <span style={{
          marginLeft: "auto", padding: "4px 12px", borderRadius: 999,
          border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.08)",
          color: "#10b981", fontWeight: 950, fontSize: 13,
        }}>
          {brokers.length} total
        </span>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" onClick={() => setActiveTab("all-brokers")} style={{
          padding: "8px 16px", borderRadius: 999,
          border: activeTab === "all-brokers" ? "1px solid rgba(16,185,129,0.30)" : "1px solid #334155",
          background: activeTab === "all-brokers" ? "rgba(16,185,129,0.12)" : "#1e293b",
          color: activeTab === "all-brokers" ? "#10b981" : "#cbd5e1", fontWeight: 900, fontSize: 13, cursor: "pointer",
        }}>
          All Brokers
        </button>
        <button type="button" onClick={() => { setActiveTab("health-audit"); setSelectedBrokerId(null); setAuditData(null); }} style={{
          padding: "8px 16px", borderRadius: 999,
          border: activeTab === "health-audit" ? "1px solid rgba(16,185,129,0.30)" : "1px solid #334155",
          background: activeTab === "health-audit" ? "rgba(16,185,129,0.12)" : "#1e293b",
          color: activeTab === "health-audit" ? "#10b981" : "#cbd5e1", fontWeight: 900, fontSize: 13, cursor: "pointer",
        }}>
          Health Audit
        </button>
      </div>

      {/* TAB 1: ALL BROKERS */}
      {activeTab === "all-brokers" && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <FilterTab label="All" count={brokers.length} active={filter === "all"} onClick={() => setFilter("all")} />
            <FilterTab label="Active" count={activeBrokers.length} active={filter === "active"} onClick={() => setFilter("active")} />
            <FilterTab label="Inactive" count={inactiveBrokers.length} active={filter === "inactive"} onClick={() => setFilter("inactive")} />
          </div>

          {/* Count label */}
          <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>
            {filtered.length} {filtered.length === 1 ? "broker" : "brokers"}
          </div>

          {filtered.length === 0 ? (
            <div style={{ borderRadius: 12, border: "1px dashed #334155", background: "rgba(30,41,59,0.4)", padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 15, color: "#64748b", fontWeight: 700 }}>
                {brokers.length === 0 ? "No brokers yet. Brokers will appear here when they sign up." : `No ${filter} brokers found.`}
              </div>
            </div>
          ) : (
            <div style={{ background: "rgba(30,41,59,0.5)", border: "1px solid rgba(51,65,85,0.5)", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(51,65,85,0.5)" }}>
                    {["Name", "Status", "Health", "Assessed", "Leads", "Revenue", "Network", ""].map((h) => (
                      <th key={h} style={{
                        padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600,
                        color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((broker) => {
                    const inactive = isInactive(broker);
                    const hs = healthMap.get(broker.id);
                    return (
                      <tr
                        key={broker.id}
                        style={{ borderBottom: "1px solid rgba(51,65,85,0.5)", cursor: "pointer", transition: "background 0.12s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(51,65,85,0.3)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        onClick={() => router.push(`/admin/brokers/${broker.id}`)}
                      >
                        {/* Name */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                            {brokerDisplayName(broker)}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Since {fmtDate(broker.created_at)}</div>
                        </td>
                        {/* Status */}
                        <td style={{ padding: "14px 16px" }}><StatusBadge inactive={inactive} /></td>
                        {/* Health */}
                        <td style={{ padding: "14px 16px" }}>
                          {hs ? <HealthBadge score={hs.overall} riskLevel={hs.risk_level} /> : <span style={{ color: "#475569", fontSize: 12 }}>&mdash;</span>}
                        </td>
                        {/* Assessed */}
                        <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{broker.homes_assessed}</td>
                        {/* Leads */}
                        <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{broker.leads_posted}</td>
                        {/* Revenue */}
                        <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700, color: "#10b981" }}>{money(broker.revenue_earned)}</td>
                        {/* Network */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", whiteSpace: "nowrap" }}>
                            {broker.contractor_count} / {broker.hes_assessor_count} / {broker.inspector_count}
                          </div>
                          <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>Con / HES / Insp</div>
                        </td>
                        {/* Actions */}
                        <td style={{ padding: "14px 16px" }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: 4 }}>
                            <IconButton onClick={() => router.push(`/admin/brokers/${broker.id}`)} title="View">
                              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 4C4 4 1 10 1 10s3 6 9 6 9-6 9-6-3-6-9-6Z" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" /></svg>
                            </IconButton>
                            <IconButton onClick={() => {}} title="Message">
                              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M3 4h14a1 1 0 011 1v8a1 1 0 01-1 1H6l-3 3V5a1 1 0 011-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
                            </IconButton>
                            <IconButton onClick={() => {}} title="Export">
                              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 3v10M6 9l4 4 4-4M4 15h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </>
      )}

      {/* TAB 2: HEALTH AUDIT */}
      {activeTab === "health-audit" && (
        <>
          {selectedBrokerId && (auditData || auditLoading) ? (
            <BrokerAuditView audit={auditData} loading={auditLoading} onBack={() => { setSelectedBrokerId(null); setAuditData(null); }} />
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <HealthStatCard label="Total Brokers" value={String(healthData.length)} />
                <HealthStatCard label="Avg Health Score" value={String(avgHealthScore)} />
                <HealthStatCard label="At-Risk Brokers" value={String(atRiskBrokers)} alert={atRiskBrokers > 0} />
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 900 }}>Filter by risk:</span>
                {(["all", "low", "medium", "high"] as BrokerRiskFilter[]).map((r) => (
                  <button key={r} type="button" onClick={() => setBrokerRiskFilter(r)} style={{
                    padding: "5px 12px", borderRadius: 999,
                    border: brokerRiskFilter === r ? "1px solid rgba(16,185,129,0.30)" : "1px solid #334155",
                    background: brokerRiskFilter === r ? "rgba(16,185,129,0.12)" : "#1e293b",
                    color: brokerRiskFilter === r ? "#10b981" : "#cbd5e1",
                    fontWeight: 800, fontSize: 12, cursor: "pointer", textTransform: "capitalize",
                  }}>
                    {r}
                  </button>
                ))}
                <div style={{ marginLeft: "auto" }} />
                <button type="button" onClick={() => setBrokerSortDesc((p) => !p)} style={{
                  padding: "5px 12px", borderRadius: 999, border: "1px solid #334155",
                  background: "#1e293b", color: "#cbd5e1", fontWeight: 800, fontSize: 12, cursor: "pointer",
                }}>
                  Score {brokerSortDesc ? "\u2193" : "\u2191"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {filteredHealthBrokers.length === 0 ? (
                  <div style={{ gridColumn: "1 / -1", padding: 20, color: "#64748b", fontSize: 13, textAlign: "center" }}>
                    No brokers match the current filter.
                  </div>
                ) : (
                  filteredHealthBrokers.map((broker) => (
                    <HealthBrokerCard key={broker.id} broker={broker} onViewAudit={() => handleViewAudit(broker.id)} />
                  ))
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Shared Styles ────────────────────────────────────────────

const btnPrimary: CSSProperties = {
  padding: "10px 16px", borderRadius: 12, border: "1px solid rgba(16,185,129,0.30)",
  background: "rgba(16,185,129,0.12)", color: "#10b981", fontWeight: 950, fontSize: 13,
  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
  width: "100%", textAlign: "center", justifyContent: "center",
};

const btnSecondary: CSSProperties = {
  padding: "10px 16px", borderRadius: 12, border: "1px solid #334155",
  background: "#1e293b", color: "#cbd5e1", fontWeight: 950, fontSize: 13,
  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
};
