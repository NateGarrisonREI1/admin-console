// src/app/admin/brokers/BrokersClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 2, padding: "10px 12px", borderRadius: 10,
      background: "rgba(15,23,42,0.5)", border: "1px solid rgba(51,65,85,0.6)",
    }}>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 950, color: "#f1f5f9" }}>{value}</div>
    </div>
  );
}

function ActionButton({ onClick, variant = "secondary", children }: {
  onClick: () => void; variant?: "primary" | "secondary" | "ghost"; children: React.ReactNode;
}) {
  const styles: Record<string, CSSProperties> = {
    primary: {
      padding: "7px 14px", borderRadius: 9, border: "1px solid rgba(16,185,129,0.30)",
      background: "rgba(16,185,129,0.12)", color: "#10b981", fontWeight: 950, fontSize: 12, cursor: "pointer",
    },
    secondary: {
      padding: "7px 14px", borderRadius: 9, border: "1px solid #334155",
      background: "#1e293b", color: "#cbd5e1", fontWeight: 900, fontSize: 12, cursor: "pointer",
    },
    ghost: {
      padding: "7px 14px", borderRadius: 9, border: "1px solid rgba(51,65,85,0.5)",
      background: "transparent", color: "#94a3b8", fontWeight: 900, fontSize: 12, cursor: "pointer",
    },
  };
  return <button type="button" onClick={onClick} style={styles[variant]}>{children}</button>;
}

// ─── Broker Card ──────────────────────────────────────────────

function BrokerCard({ broker, healthScore, onView }: {
  broker: AdminBrokerSummary;
  healthScore?: { overall: number; risk_level: "low" | "medium" | "high" };
  onView: (b: AdminBrokerSummary) => void;
}) {
  const inactive = isInactive(broker);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#1e293b", border: "1px solid #334155", borderRadius: 12,
        padding: 18, display: "flex", flexDirection: "column", gap: 14,
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "0 12px 32px rgba(0,0,0,0.35)" : "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 950, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {brokerDisplayName(broker)}
          </div>
          {broker.company_name ? (
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {broker.company_name}
            </div>
          ) : null}
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Since: {fmtDate(broker.created_at)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <StatusBadge inactive={inactive} />
          {healthScore && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 950, color: scoreColor(healthScore.overall) }}>
                {healthScore.overall}
              </span>
              <span style={{
                padding: "2px 6px", borderRadius: 999, fontSize: 9, fontWeight: 700,
                ...(() => {
                  const m = { low: { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.30)", tx: "#10b981" }, medium: { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.30)", tx: "#fbbf24" }, high: { bg: "rgba(239,68,68,0.12)", bd: "rgba(239,68,68,0.35)", tx: "#ef4444" } };
                  const t = m[healthScore.risk_level];
                  return { background: t.bg, border: `1px solid ${t.bd}`, color: t.tx, textTransform: "capitalize" as const };
                })(),
              }}>
                {healthScore.risk_level}
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatCell label="Homes Assessed" value={broker.homes_assessed} />
        <StatCell label="Leads Posted" value={broker.leads_posted} />
        <StatCell label="Revenue Earned" value={money(broker.revenue_earned)} />
        <StatCell label="Contractors" value={broker.contractor_count + broker.hes_assessor_count + broker.inspector_count} />
      </div>

      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", padding: "10px 12px", borderRadius: 10,
        background: "rgba(15,23,42,0.4)", border: "1px solid rgba(51,65,85,0.5)",
      }}>
        <NetworkTag count={broker.contractor_count} label="Contractors" />
        <div style={{ width: 1, background: "#334155", alignSelf: "stretch" }} />
        <NetworkTag count={broker.hes_assessor_count} label="HES Assessors" />
        <div style={{ width: 1, background: "#334155", alignSelf: "stretch" }} />
        <NetworkTag count={broker.inspector_count} label="Inspectors" />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <ActionButton variant="primary" onClick={() => onView(broker)}>View</ActionButton>
        <ActionButton variant="secondary" onClick={() => {}}>Message</ActionButton>
        <ActionButton variant="ghost" onClick={() => {}}>Export</ActionButton>
      </div>
    </div>
  );
}

function NetworkTag({ count, label }: { count: number; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 950, color: "#f1f5f9" }}>{count}</div>
      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textAlign: "center" }}>{label}</div>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────

function DetailDrawer({ broker, onClose }: { broker: AdminBrokerSummary; onClose: () => void }) {
  const inactive = isInactive(broker);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const totalNetwork = broker.contractor_count + broker.hes_assessor_count + broker.inspector_count;
  const conversionRate = broker.leads_posted > 0 ? ((broker.leads_closed / broker.leads_posted) * 100).toFixed(1) : "0.0";
  const avgLeadCost = broker.leads_closed > 0 ? money(broker.revenue_earned / broker.leads_closed) : money(0);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "absolute", right: 0, top: 0, height: "100%", width: "min(540px, 100%)",
        background: "#0f172a", borderLeft: "1px solid #334155", boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #334155", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Broker Profile</div>
            <div style={{ fontSize: 20, fontWeight: 950, color: "#f1f5f9", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{brokerDisplayName(broker)}</div>
            {broker.company_name ? <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>{broker.company_name}</div> : null}
            <div style={{ marginTop: 8 }}><StatusBadge inactive={inactive} /></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close detail panel" style={{
            width: 32, height: 32, borderRadius: 8, border: "1px solid #334155", background: "#1e293b",
            color: "#94a3b8", cursor: "pointer", fontWeight: 900, fontSize: 16, display: "grid", placeItems: "center", flexShrink: 0,
          }}>
            &times;
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 18 }}>
          <Section title="Profile">
            <DetailRow label="Email" value={broker.user_email ?? "\u2014"} />
            <DetailRow label="Member Since" value={fmtDate(broker.created_at)} />
            <DetailRow label="Last Activity" value={fmtDate(broker.last_activity ?? broker.updated_at)} />
            <DetailRow label="User ID" value={broker.user_id} dim />
          </Section>
          <Section title="Network Breakdown">
            <div style={{ display: "flex", gap: 8 }}>
              <DrawerNetworkCard count={broker.contractor_count} label="Contractors" color="#10b981" />
              <DrawerNetworkCard count={broker.hes_assessor_count} label="HES Assessors" color="#10b981" />
              <DrawerNetworkCard count={broker.inspector_count} label="Inspectors" color="#f59e0b" />
            </div>
            <DetailRow label="Total Network Size" value={String(totalNetwork)} />
          </Section>
          <Section title="Lead Activity">
            <DetailRow label="Leads Posted" value={String(broker.leads_posted)} />
            <DetailRow label="Leads Closed" value={String(broker.leads_closed)} />
            <DetailRow label="Open / In Progress" value={String(Math.max(0, broker.leads_posted - broker.leads_closed))} />
          </Section>
          <Section title="Revenue">
            <DetailRow label="Revenue Earned" value={money(broker.revenue_earned)} bold />
          </Section>
          <Section title="KPIs">
            <DetailRow label="Conversion Rate" value={`${conversionRate}%`} />
            <DetailRow label="Avg. Lead Cost" value={avgLeadCost} />
            <DetailRow label="Homes Assessed" value={String(broker.homes_assessed)} />
          </Section>
        </div>

        <div style={{ padding: "14px 20px", borderTop: "1px solid #334155", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{
            padding: "10px 18px", borderRadius: 10, border: "1px solid #334155", background: "#1e293b",
            color: "#cbd5e1", fontWeight: 950, cursor: "pointer", fontSize: 13,
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
      <div style={{
        padding: "10px 14px", borderBottom: "1px solid rgba(51,65,85,0.6)", fontSize: 11, fontWeight: 700,
        color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", background: "rgba(15,23,42,0.4)",
      }}>
        {title}
      </div>
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

function DetailRow({ label, value, bold, dim }: { label: string; value: string; bold?: boolean; dim?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, gap: 12 }}>
      <span style={{ color: "#64748b", flexShrink: 0 }}>{label}</span>
      <span style={{
        color: dim ? "#475569" : "#f1f5f9", fontWeight: bold ? 950 : 500, textAlign: "right",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%",
        fontFamily: dim ? "monospace" : undefined, fontSize: dim ? 11 : undefined,
      }}>
        {value}
      </span>
    </div>
  );
}

function DrawerNetworkCard({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div style={{
      flex: 1, padding: "12px 10px", borderRadius: 10, border: "1px solid rgba(51,65,85,0.6)",
      background: "rgba(15,23,42,0.5)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    }}>
      <div style={{ fontSize: 20, fontWeight: 950, color }}>{count}</div>
      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textAlign: "center" }}>{label}</div>
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
  const [activeTab, setActiveTab] = useState<ActiveTab>("all-brokers");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [activeDetail, setActiveDetail] = useState<AdminBrokerSummary | null>(null);

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

          {filtered.length === 0 ? (
            <div style={{ borderRadius: 12, border: "1px dashed #334155", background: "rgba(30,41,59,0.4)", padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 15, color: "#64748b", fontWeight: 700 }}>
                {brokers.length === 0 ? "No brokers yet. Brokers will appear here when they sign up." : `No ${filter} brokers found.`}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
              {filtered.map((broker) => (
                <BrokerCard
                  key={broker.id}
                  broker={broker}
                  healthScore={healthMap.get(broker.id)}
                  onView={(b) => setActiveDetail(b)}
                />
              ))}
            </div>
          )}

          {activeDetail ? <DetailDrawer broker={activeDetail} onClose={() => setActiveDetail(null)} /> : null}
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
