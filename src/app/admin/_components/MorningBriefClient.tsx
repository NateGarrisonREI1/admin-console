// src/app/admin/_components/MorningBriefClient.tsx
"use client";

import Link from "next/link";
import type { MorningBriefData, ScheduleItem, AttentionItem, RevenueStream } from "../_actions/morning-brief";

// ─── Design tokens ──────────────────────────────────────────────────
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

// ─── Helpers ────────────────────────────────────────────────────────

function money(v: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function fmtTime(t: string | null): string {
  if (!t) return "\u2014";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${m} ${suffix}`;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function fmtTodayDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

// ─── Stat Card ──────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color, marginTop: 6, lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, fontWeight: 600, color: sub.startsWith("+") ? EMERALD : sub.startsWith("-") ? "#f87171" : TEXT_MUTED, marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Status badge ───────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  confirmed: { bg: "rgba(16,185,129,0.15)", text: "#34d399" },
  completed: { bg: "rgba(34,197,94,0.15)", text: "#4ade80" },
  in_progress: { bg: "rgba(251,191,36,0.15)", text: "#fbbf24" },
  no_show: { bg: "rgba(239,68,68,0.15)", text: "#f87171" },
  cancelled: { bg: "rgba(100,116,139,0.15)", text: "#94a3b8" },
  rescheduled: { bg: "rgba(168,85,247,0.15)", text: "#c084fc" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] || { bg: "rgba(148,163,184,0.1)", text: TEXT_MUTED };
  return (
    <span style={{
      padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
      background: s.bg, color: s.text, textTransform: "capitalize",
    }}>
      {status.replace("_", " ")}
    </span>
  );
}

function TypeBadge({ type }: { type: "hes" | "inspection" }) {
  const isHes = type === "hes";
  return (
    <span style={{
      padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
      background: isHes ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
      color: isHes ? "#10b981" : "#f59e0b",
      border: `1px solid ${isHes ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)"}`,
    }}>
      {isHes ? "HES" : "Inspection"}
    </span>
  );
}

// ─── Urgency colors ─────────────────────────────────────────────────

const URGENCY_COLORS: Record<string, string> = {
  normal: TEXT_MUTED,
  amber: "#f59e0b",
  red: "#f87171",
};

const URGENCY_BG: Record<string, string> = {
  normal: "rgba(148,163,184,0.06)",
  amber: "rgba(245,158,11,0.06)",
  red: "rgba(248,113,113,0.06)",
};

const KIND_ICONS: Record<string, string> = {
  pending_lead: "\u25CF",
  overdue_project: "\u25B2",
  at_risk_broker: "\u26A0",
};

// ─── Component ──────────────────────────────────────────────────────

export default function MorningBriefClient({ data }: { data: MorningBriefData }) {
  const changeStr = data.revenueMtdChange > 0
    ? `+${data.revenueMtdChange}% vs last month`
    : data.revenueMtdChange < 0
      ? `${data.revenueMtdChange}% vs last month`
      : "Same as last month";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: TEXT, margin: 0 }}>
          {greeting()}
        </h1>
        <p style={{ fontSize: 13, color: TEXT_DIM, margin: "4px 0 0", fontWeight: 500 }}>
          {fmtTodayDate(data.todayDate)}
        </p>
      </div>

      {/* Row 1: Key Numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatCard label="Revenue (MTD)" value={money(data.revenueMtd)} sub={changeStr} color={EMERALD} />
        <StatCard label="Open Projects" value={String(data.openProjects)} color="#38bdf8" />
        <StatCard label="Team Capacity" value={data.teamAvailableToday} color="#fbbf24" />
        <StatCard label="Active Brokers" value={String(data.activeBrokers)} color="#a78bfa" />
      </div>

      {/* Row 2: Today's Schedule */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{
          padding: "14px 18px", borderBottom: `1px solid ${BORDER}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Today&apos;s Schedule</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: TEXT_DIM, marginTop: 2 }}>
              {fmtTodayDate(data.todayDate)}
            </div>
          </div>
          <Link
            href="/admin/team"
            style={{
              fontSize: 12, fontWeight: 600, color: EMERALD, textDecoration: "none",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            View all {"\u2192"}
          </Link>
        </div>

        {data.todaySchedule.length === 0 ? (
          <div style={{ padding: "32px 18px", textAlign: "center", color: TEXT_DIM, fontSize: 13, fontWeight: 500 }}>
            No services scheduled today.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr>
                  {["Time", "Type", "Customer", "Address", "Team Member", "Status"].map((h) => (
                    <th key={h} style={{
                      padding: "8px 14px", textAlign: "left", fontSize: 10, fontWeight: 700,
                      color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em",
                      borderBottom: `1px solid ${BORDER}`,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.todaySchedule.map((item) => (
                  <tr key={item.id} style={{ borderBottom: `1px solid rgba(51,65,85,0.5)` }}>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: TEXT, whiteSpace: "nowrap" }}>
                      {fmtTime(item.time)}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <TypeBadge type={item.type} />
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 500, color: TEXT_SEC }}>
                      {item.customerName}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: TEXT_MUTED }}>
                      {[item.address, item.city].filter(Boolean).join(", ") || "\u2014"}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, color: TEXT_SEC }}>
                      {item.teamMember || "\u2014"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row 3: Two column — Needs Attention + This Week */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        {/* LEFT: Needs Attention */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Needs Attention</div>
          </div>

          {data.attentionItems.length === 0 ? (
            <div style={{
              padding: "28px 18px", textAlign: "center",
            }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{"\u2713"}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: EMERALD }}>All clear</div>
              <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>No items need your attention right now.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {data.attentionItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 18px", textDecoration: "none",
                    borderBottom: `1px solid rgba(51,65,85,0.4)`,
                    background: URGENCY_BG[item.urgency],
                    transition: "background 0.1s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(148,163,184,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = URGENCY_BG[item.urgency]; }}
                >
                  <span style={{ fontSize: 10, color: URGENCY_COLORS[item.urgency], flexShrink: 0 }}>
                    {KIND_ICONS[item.kind] || "\u25CF"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.label}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: URGENCY_COLORS[item.urgency], flexShrink: 0, whiteSpace: "nowrap" }}>
                    {item.detail}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: This Week */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>This Week</div>
          </div>

          <div style={{ padding: "6px 0" }}>
            <SummaryRow label="HES Completed" value={String(data.weekSummary.hesCompleted)} />
            <SummaryRow label="Inspections Completed" value={String(data.weekSummary.inspectionsCompleted)} />
            <SummaryRow label="Revenue This Week" value={money(data.weekSummary.revenueThisWeek)} highlight />
            <SummaryRow label="New Direct Leads" value={String(data.weekSummary.newDirectLeads)} />
            {data.weekSummary.newBrokers > 0 && (
              <SummaryRow label="New Brokers" value={String(data.weekSummary.newBrokers)} />
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Revenue Snapshot */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{
          padding: "14px 18px", borderBottom: `1px solid ${BORDER}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Revenue Snapshot (MTD)</div>
          <Link
            href="/admin/revenue"
            style={{ fontSize: 12, fontWeight: 600, color: EMERALD, textDecoration: "none" }}
          >
            Details {"\u2192"}
          </Link>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
            <thead>
              <tr>
                {["Stream", "Count", "Gross", "REI Take", "Margin"].map((h) => (
                  <th key={h} style={{
                    padding: "8px 18px", textAlign: h === "Stream" ? "left" : "right",
                    fontSize: 10, fontWeight: 700, color: TEXT_DIM,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    borderBottom: `1px solid ${BORDER}`,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.revenueStreams.map((stream) => {
                const marginPct = stream.gross > 0 ? Math.round((stream.reiTake / stream.gross) * 100) : 0;
                return (
                  <tr key={stream.label} style={{ borderBottom: `1px solid rgba(51,65,85,0.4)` }}>
                    <td style={{ padding: "10px 18px", fontSize: 13, fontWeight: 600, color: TEXT }}>
                      {stream.label}
                    </td>
                    <td style={{ padding: "10px 18px", fontSize: 13, color: TEXT_MUTED, textAlign: "right" }}>
                      {stream.count}
                    </td>
                    <td style={{ padding: "10px 18px", fontSize: 13, fontWeight: 600, color: TEXT_SEC, textAlign: "right" }}>
                      {money(stream.gross)}
                    </td>
                    <td style={{ padding: "10px 18px", fontSize: 13, fontWeight: 700, color: EMERALD, textAlign: "right" }}>
                      {money(stream.reiTake)}
                    </td>
                    <td style={{ padding: "10px 18px", fontSize: 12, color: TEXT_MUTED, textAlign: "right" }}>
                      {marginPct}%
                    </td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr style={{ borderTop: `1px solid ${BORDER}` }}>
                <td style={{ padding: "10px 18px", fontSize: 13, fontWeight: 700, color: TEXT }}>
                  Total
                </td>
                <td style={{ padding: "10px 18px", fontSize: 13, fontWeight: 600, color: TEXT_SEC, textAlign: "right" }}>
                  {data.revenueStreams.reduce((s, r) => s + r.count, 0)}
                </td>
                <td style={{ padding: "10px 18px", fontSize: 13, fontWeight: 700, color: TEXT, textAlign: "right" }}>
                  {money(data.revenueStreams.reduce((s, r) => s + r.gross, 0))}
                </td>
                <td style={{ padding: "10px 18px", fontSize: 13, fontWeight: 800, color: EMERALD, textAlign: "right" }}>
                  {money(data.revenueStreams.reduce((s, r) => s + r.reiTake, 0))}
                </td>
                <td style={{ padding: "10px 18px", fontSize: 12, color: TEXT_MUTED, textAlign: "right" }}>
                  {(() => {
                    const totalGross = data.revenueStreams.reduce((s, r) => s + r.gross, 0);
                    const totalTake = data.revenueStreams.reduce((s, r) => s + r.reiTake, 0);
                    return totalGross > 0 ? `${Math.round((totalTake / totalGross) * 100)}%` : "\u2014";
                  })()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Small helpers ──────────────────────────────────────────────────

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "9px 18px",
      borderBottom: `1px solid rgba(51,65,85,0.3)`,
    }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: TEXT_SEC }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: highlight ? EMERALD : TEXT }}>{value}</span>
    </div>
  );
}
