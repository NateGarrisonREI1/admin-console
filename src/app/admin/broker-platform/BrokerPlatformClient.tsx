// src/app/admin/broker-platform/BrokerPlatformClient.tsx
"use client";

import type { BrokerPlatformData, PipelineStage, BrokerActivityRow, RevenueStreamRow, AttentionItem } from "./actions";

// ─── Design Tokens ───────────────────────────────────────────
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

function money(v: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function scoreColor(score: number): string {
  if (score >= 70) return EMERALD;
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function riskColor(risk: "low" | "medium" | "high"): { bg: string; bd: string; tx: string } {
  const map = {
    low: { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.30)", tx: EMERALD },
    medium: { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.30)", tx: "#fbbf24" },
    high: { bg: "rgba(239,68,68,0.12)", bd: "rgba(239,68,68,0.35)", tx: "#ef4444" },
  };
  return map[risk];
}

// ─── Sub-components ──────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function PipelineFunnel({ stages }: { stages: PipelineStage[] }) {
  if (stages.length === 0) return null;
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 16 }}>
        Broker Pipeline
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {stages.map((stage, i) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, 8);
          return (
            <div key={stage.label}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: TEXT_SEC, fontWeight: 600 }}>{stage.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{stage.count.toLocaleString()}</span>
                  {stage.conversionPct !== null && (
                    <span style={{
                      padding: "1px 6px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                      background: stage.conversionPct >= 50 ? "rgba(16,185,129,0.12)" : stage.conversionPct >= 25 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)",
                      color: stage.conversionPct >= 50 ? EMERALD : stage.conversionPct >= 25 ? "#fbbf24" : "#ef4444",
                    }}>
                      {stage.conversionPct}%
                    </span>
                  )}
                </div>
              </div>
              <div style={{ height: 6, background: "rgba(51,65,85,0.5)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${widthPct}%`,
                  background: i === 0 ? "#38bdf8" : i < 3 ? "#60a5fa" : i < 5 ? "#a78bfa" : EMERALD,
                  borderRadius: 999,
                  transition: "width 0.3s ease",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BrokerActivityList({ rows, total }: { rows: BrokerActivityRow[]; total: number }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden", flex: 1 }}>
      <div style={{
        padding: "12px 16px", borderBottom: `1px solid ${BORDER}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Broker Activity</span>
        <span style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600 }}>Top 10 of {total}</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
          <thead>
            <tr>
              {["Broker", "Health", "Risk", "Leads", "Last Active"].map((h) => (
                <th key={h} style={{
                  padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700,
                  color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em",
                  borderBottom: `1px solid ${BORDER}`,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "24px 12px", textAlign: "center", color: TEXT_DIM, fontSize: 13 }}>
                  No broker activity data.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rc = riskColor(row.riskLevel);
                return (
                  <tr key={row.id} style={{ borderBottom: "1px solid rgba(51,65,85,0.4)" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{row.name}</div>
                      {row.company && <div style={{ fontSize: 11, color: TEXT_DIM }}>{row.company}</div>}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: scoreColor(row.healthScore) }}>
                        {row.healthScore}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        padding: "3px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                        background: rc.bg, border: `1px solid ${rc.bd}`, color: rc.tx,
                        textTransform: "capitalize",
                      }}>
                        {row.riskLevel}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: TEXT_SEC }}>{row.leadsThisMonth}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: TEXT_MUTED }}>
                      {row.lastActivity ? new Date(row.lastActivity).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "\u2014"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RevenueStreamsList({ streams, total }: { streams: RevenueStreamRow[]; total: number }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden", flex: 1 }}>
      <div style={{
        padding: "12px 16px", borderBottom: `1px solid ${BORDER}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Platform Revenue</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: EMERALD }}>{money(total)}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {streams.map((s) => {
          const pct = total > 0 ? Math.round((s.amount / total) * 100) : 0;
          return (
            <div key={s.label} style={{ padding: "14px 16px", borderBottom: "1px solid rgba(51,65,85,0.4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{s.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: EMERALD }}>{money(s.amount)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 4, background: "rgba(51,65,85,0.5)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.max(pct, 2)}%`,
                    background: EMERALD,
                    borderRadius: 999,
                  }} />
                </div>
                <span style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600, flexShrink: 0 }}>{pct}%</span>
              </div>
              <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>{s.detail}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AttentionSection({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null;

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Needs Attention</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.map((item) => {
          const rc = riskColor(item.riskLevel);
          return (
            <div key={item.id} style={{
              padding: "14px 16px", borderBottom: "1px solid rgba(51,65,85,0.4)",
              display: "flex", alignItems: "flex-start", gap: 12,
            }}>
              {/* Score circle */}
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                border: `2px solid ${rc.tx}`, background: rc.bg,
                display: "grid", placeItems: "center", flexShrink: 0,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: rc.tx }}>{item.score}</span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{item.brokerName}</span>
                  <span style={{
                    padding: "2px 6px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                    background: rc.bg, border: `1px solid ${rc.bd}`, color: rc.tx,
                    textTransform: "capitalize",
                  }}>
                    {item.riskLevel}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>{item.issue}</div>
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>{item.suggestion}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function BrokerPlatformClient({ data }: { data: BrokerPlatformData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>Broker Platform</h1>
        <p style={{ fontSize: 13, color: TEXT_DIM, margin: "4px 0 0", fontWeight: 500 }}>
          SaaS platform overview — pipeline, broker health, and revenue streams.
        </p>
      </div>

      {/* ROW 1: KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
        <KpiCard label="Active Brokers" value={data.activeBrokers} color={EMERALD} />
        <KpiCard label="New This Month" value={data.newThisMonth} color="#38bdf8" />
        <KpiCard label="Revenue MTD" value={money(data.platformRevenueMtd)} color={EMERALD} />
        <KpiCard label="Campaigns MTD" value={data.campaignsSentMtd} color="#a78bfa" />
        <KpiCard label="Lead Conversion" value={`${data.leadConversionPct}%`} color="#fbbf24" />
        <KpiCard label="Leads Generated" value={data.leadsGenerated} color="#38bdf8" />
      </div>

      {/* ROW 2: Pipeline Funnel */}
      <PipelineFunnel stages={data.pipeline} />

      {/* ROW 3: Broker Activity + Revenue Streams */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        <BrokerActivityList rows={data.brokerActivity} total={data.totalBrokers} />
        <RevenueStreamsList streams={data.revenueStreams} total={data.totalRevenueStreams} />
      </div>

      {/* ROW 4: Attention */}
      <AttentionSection items={data.attentionItems} />
    </div>
  );
}
