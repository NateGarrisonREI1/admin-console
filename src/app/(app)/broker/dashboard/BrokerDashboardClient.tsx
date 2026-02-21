// src/app/(app)/broker/dashboard/BrokerDashboardClient.tsx
"use client";

import Link from "next/link";
import type {
  BrokerDashboardKPIs,
  UrgentTask,
  RecentActivity,
  QuickStats,
} from "./actions";

// ─── Design tokens ──────────────────────────────────────────────────

const BG_CARD = "#1e293b";
const BORDER = "#334155";
const RADIUS = 12;
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_MUTED = "#94a3b8";
const TEXT_DIM = "#64748b";
const EMERALD = "#10b981";
const BLUE = "#3b82f6";
const AMBER = "#f59e0b";
const PURPLE = "#8b5cf6";

// ─── Relative time ──────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const now = new Date();
  const d = new Date(iso);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── KPI Card ───────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div
      style={{
        background: BG_CARD,
        borderTop: `1px solid ${BORDER}`,
        borderRight: `1px solid ${BORDER}`,
        borderBottom: `1px solid ${BORDER}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: RADIUS,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: TEXT_DIM,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: TEXT,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Urgent Task Row ────────────────────────────────────────────────

function taskConfig(status: string): { color: string; icon: string; prefix: string } {
  switch (status) {
    case "pending_delivery":
      return { color: AMBER, icon: "\u26a0", prefix: "Out-of-network job needs delivery" };
    case "report_ready":
      return { color: BLUE, icon: "\ud83d\udcc4", prefix: "Report ready for" };
    case "pending":
      return { color: AMBER, icon: "\u23f3", prefix: "Job pending confirmation" };
    default:
      return { color: TEXT_DIM, icon: "\u2022", prefix: "Action needed" };
  }
}

function UrgentTaskRow({ task }: { task: UrgentTask }) {
  const cfg = taskConfig(task.status);
  return (
    <Link
      href="/broker/schedule"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 8,
        background: "rgba(30,41,59,0.5)",
        borderTop: `1px solid ${BORDER}`,
        borderRight: `1px solid ${BORDER}`,
        borderBottom: `1px solid ${BORDER}`,
        borderLeft: `3px solid ${cfg.color}`,
        textDecoration: "none",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(30,41,59,0.8)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(30,41,59,0.5)";
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{cfg.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: TEXT_SEC,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {cfg.prefix} — {task.address}
        </div>
      </div>
      <span style={{ fontSize: 11, color: TEXT_DIM, flexShrink: 0 }}>
        {relativeTime(task.created_at)}
      </span>
    </Link>
  );
}

// ─── Props ──────────────────────────────────────────────────────────

type Props = {
  brokerName: string;
  kpis: BrokerDashboardKPIs;
  urgentTasks: UrgentTask[];
  recentActivity: RecentActivity[];
  quickStats: QuickStats;
};

// ─── Main Component ─────────────────────────────────────────────────

export default function BrokerDashboardClient({
  brokerName,
  kpis,
  urgentTasks,
  recentActivity,
  quickStats,
}: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: TEXT,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Welcome back, {brokerName}
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: TEXT_MUTED, margin: "4px 0 0" }}>
            Here&apos;s your broker overview.
          </p>
        </div>
        <Link
          href="/broker/request"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 18px",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 13,
            color: "#fff",
            background: EMERALD,
            border: `1px solid rgba(16,185,129,0.5)`,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#059669";
            e.currentTarget.style.boxShadow = "0 0 12px rgba(16,185,129,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = EMERALD;
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          + New Request
        </Link>
      </div>

      {/* ── KPI Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 14,
        }}
      >
        <KPICard label="Active Jobs" value={kpis.activeJobs} accent={BLUE} />
        <KPICard label="Pending" value={kpis.pending} accent={AMBER} />
        <KPICard label="Completed This Month" value={kpis.completedThisMonth} accent={EMERALD} />
        <KPICard label="Total Jobs" value={kpis.totalJobs} accent={PURPLE} />
      </div>

      {/* ── Urgent Tasks ── */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: TEXT_DIM,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 10,
          }}
        >
          Urgent Tasks
        </div>
        {urgentTasks.length === 0 ? (
          <div
            style={{
              padding: "20px 16px",
              borderRadius: 8,
              background: "rgba(16,185,129,0.06)",
              border: "1px solid rgba(16,185,129,0.15)",
              fontSize: 13,
              color: EMERALD,
              fontWeight: 600,
            }}
          >
            All caught up!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {urgentTasks.slice(0, 8).map((t) => (
              <UrgentTaskRow key={t.id} task={t} />
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom two-column: Recent Activity + Quick Stats ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
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
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>
              Recent Activity
            </span>
          </div>

          {recentActivity.length === 0 ? (
            <div
              style={{
                padding: "32px 18px",
                textAlign: "center",
                color: TEXT_MUTED,
                fontSize: 13,
              }}
            >
              No recent activity. Submit a request to get started.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recentActivity.map((a, i) => (
                <div
                  key={a.id}
                  style={{
                    padding: "10px 18px",
                    borderBottom:
                      i < recentActivity.length - 1
                        ? `1px solid ${BORDER}44`
                        : "none",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: TEXT_DIM,
                      minWidth: 70,
                      flexShrink: 0,
                      paddingTop: 1,
                    }}
                  >
                    {relativeTime(a.created_at)}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: TEXT_SEC,
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Quick Stats ── */}
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
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>
              Quick Stats
            </span>
          </div>

          <div style={{ padding: "16px 18px" }}>
            {/* This Month */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: TEXT_DIM,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 10,
              }}
            >
              This Month
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              <StatRow label="Jobs ordered" value={quickStats.jobsOrderedThisMonth} />
              <StatRow label="Jobs completed" value={quickStats.jobsCompletedThisMonth} />
              <StatRow label="LEAF reports sent" value={quickStats.leafSentThisMonth} />
            </div>

            {/* Network Health */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: TEXT_DIM,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 10,
              }}
            >
              Network Health
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <StatRow
                label="In-network providers"
                value={quickStats.inNetworkProviders}
                accent={EMERALD}
              />
              <StatRow
                label="Out-of-network providers"
                value={quickStats.outOfNetworkProviders}
                accent={quickStats.outOfNetworkProviders > 0 ? AMBER : TEXT_DIM}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Row ───────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span style={{ fontSize: 13, color: TEXT_MUTED }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: accent || TEXT,
        }}
      >
        {value}
      </span>
    </div>
  );
}
