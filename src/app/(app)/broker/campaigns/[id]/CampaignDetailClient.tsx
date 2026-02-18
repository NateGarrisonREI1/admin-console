"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { CampaignPerformance, CampaignRecipient } from "@/types/broker";

// ─── Design tokens ──────────────────────────────────────────────────────────
const BG_PAGE = "#0f172a";
const BG_CARD = "#1e293b";
const BORDER = "#334155";
const RADIUS = 16;
const TEXT_PRIMARY = "#f1f5f9";
const TEXT_SECONDARY = "#cbd5e1";
const TEXT_MUTED = "#94a3b8";
const TEXT_DIM = "#64748b";
const ACCENT_EMERALD = "#10b981";
const ACCENT_BLUE = "#3b82f6";
const ACCENT_AMBER = "#f59e0b";
const ACCENT_CYAN = "#06b6d4";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusColor(status: string): string {
  switch (status) {
    case "draft":
      return "#94a3b8";
    case "sending":
      return ACCENT_AMBER;
    case "sent":
      return ACCENT_EMERALD;
    case "archived":
      return TEXT_DIM;
    default:
      return TEXT_MUTED;
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Draft",
    sending: "Sending",
    sent: "Sent",
    archived: "Archived",
  };
  return map[status] ?? status;
}

function recipientStatusColor(status: string): string {
  switch (status) {
    case "sent":
      return TEXT_MUTED;
    case "opened":
      return ACCENT_BLUE;
    case "clicked":
      return ACCENT_CYAN;
    case "completed":
      return ACCENT_EMERALD;
    case "hes_requested":
      return "#22c55e";
    default:
      return TEXT_DIM;
  }
}

function recipientStatusLabel(status: string): string {
  const map: Record<string, string> = {
    queued: "Queued",
    sent: "Sent",
    opened: "Opened",
    clicked: "Clicked",
    completed: "Completed",
    hes_requested: "HES Requested",
  };
  return map[status] ?? status;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso);
}

function rateColor(rate: number): string {
  if (rate >= 40) return ACCENT_EMERALD;
  if (rate >= 20) return ACCENT_AMBER;
  return "#ef4444";
}

// ─── Props ──────────────────────────────────────────────────────────────────

type Props = {
  performance: CampaignPerformance;
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function CampaignDetailClient({ performance }: Props) {
  const router = useRouter();
  const { campaign, recipients, funnel, rates } = performance;

  // Build activity feed from recipient events
  const activityFeed = useMemo(() => {
    type ActivityEvent = {
      recipientName: string;
      action: string;
      timestamp: string;
    };
    const events: ActivityEvent[] = [];

    for (const r of recipients) {
      const name = r.contact?.name ?? r.email ?? "Unknown";

      if (r.hes_requested_at) {
        events.push({
          recipientName: name,
          action: "requested a HES assessment",
          timestamp: r.hes_requested_at,
        });
      }
      if (r.completed_at) {
        events.push({
          recipientName: name,
          action: "completed their assessment",
          timestamp: r.completed_at,
        });
      }
      if (r.clicked_at) {
        events.push({
          recipientName: name,
          action: "clicked the assessment link",
          timestamp: r.clicked_at,
        });
      }
      if (r.opened_at) {
        events.push({
          recipientName: name,
          action: "opened the email",
          timestamp: r.opened_at,
        });
      }
    }

    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    return events.slice(0, 20);
  }, [recipients]);

  const sc = statusColor(campaign.status);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Back + Header ── */}
      <button
        type="button"
        onClick={() => router.push("/broker/campaigns")}
        style={{
          background: "none",
          border: "none",
          color: TEXT_MUTED,
          fontSize: 13,
          cursor: "pointer",
          padding: 0,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontWeight: 500,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M9 2L4 7l5 5"
            stroke={TEXT_MUTED}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to Campaigns
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: TEXT_PRIMARY,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            {campaign.name}
          </h1>
          <span
            style={{
              display: "inline-block",
              padding: "3px 12px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              background: sc + "22",
              color: sc,
              border: `1px solid ${sc}44`,
            }}
          >
            {statusLabel(campaign.status)}
          </span>
        </div>
        {campaign.sent_date && (
          <span style={{ fontSize: 13, color: TEXT_DIM }}>
            Sent {fmtDate(campaign.sent_date)}
          </span>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        <KPICard
          label="Total Sent"
          value={String(funnel.sent)}
          accent={TEXT_SECONDARY}
        />
        <KPICard
          label="Open Rate"
          value={rates.open_rate + "%"}
          accent={rateColor(rates.open_rate)}
        />
        <KPICard
          label="Completion Rate"
          value={rates.completion_rate + "%"}
          accent={rateColor(rates.completion_rate)}
        />
        <KPICard
          label="HES Request Rate"
          value={rates.hes_rate + "%"}
          accent={rateColor(rates.hes_rate)}
        />
      </div>

      {/* ── Funnel Visualization ── */}
      <div
        style={{
          background: BG_CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: RADIUS,
          padding: "24px 28px",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: TEXT_PRIMARY,
            marginBottom: 20,
          }}
        >
          Engagement Funnel
        </div>
        <FunnelChart funnel={funnel} />
      </div>

      {/* ── Two-column: Recipients + Activity ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Recipients Table */}
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
              padding: "14px 20px",
              borderBottom: `1px solid ${BORDER}`,
              fontSize: 14,
              fontWeight: 700,
              color: TEXT_PRIMARY,
            }}
          >
            Recipients ({recipients.length})
          </div>
          <RecipientsTable recipients={recipients} />
        </div>

        {/* Activity Feed */}
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
              padding: "14px 20px",
              borderBottom: `1px solid ${BORDER}`,
              fontSize: 14,
              fontWeight: 700,
              color: TEXT_PRIMARY,
            }}
          >
            Recent Activity
          </div>
          {activityFeed.length === 0 ? (
            <div
              style={{
                padding: "32px 20px",
                textAlign: "center",
                color: TEXT_MUTED,
                fontSize: 13,
              }}
            >
              No activity yet. Events will appear here as recipients interact
              with your campaign.
            </div>
          ) : (
            <div style={{ maxHeight: 480, overflowY: "auto" }}>
              {activityFeed.map((event, i) => (
                <div
                  key={`${event.recipientName}-${event.action}-${i}`}
                  style={{
                    padding: "12px 20px",
                    borderBottom:
                      i < activityFeed.length - 1
                        ? `1px solid ${BORDER}44`
                        : "none",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: ACCENT_EMERALD,
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{ fontSize: 13, color: TEXT_SECONDARY, lineHeight: 1.4 }}
                    >
                      <span style={{ fontWeight: 600, color: TEXT_PRIMARY }}>
                        {event.recipientName}
                      </span>{" "}
                      {event.action}
                    </div>
                    <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>
                      {timeAgo(event.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// KPI Card
// ═════════════════════════════════════════════════════════════════════════════

function KPICard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        background: BG_CARD,
        border: `1px solid ${BORDER}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 12,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
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
          color: accent,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Funnel Chart
// ═════════════════════════════════════════════════════════════════════════════

function FunnelChart({
  funnel,
}: {
  funnel: CampaignPerformance["funnel"];
}) {
  const steps: { label: string; count: number; color: string }[] = [
    { label: "Sent", count: funnel.sent, color: TEXT_SECONDARY },
    { label: "Delivered", count: funnel.delivered, color: ACCENT_BLUE },
    { label: "Opened", count: funnel.opened, color: ACCENT_CYAN },
    { label: "Clicked", count: funnel.clicked, color: "#8b5cf6" },
    { label: "Completed", count: funnel.completed, color: ACCENT_EMERALD },
    { label: "HES Requested", count: funnel.hes_requested, color: "#22c55e" },
  ];

  const maxCount = Math.max(funnel.sent, 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {steps.map((s, i) => {
        const widthPct = Math.max((s.count / maxCount) * 100, 4);
        const rate =
          i === 0 ? 100 : funnel.sent > 0 ? Math.round((s.count / funnel.sent) * 100) : 0;

        return (
          <div
            key={s.label}
            style={{ display: "flex", alignItems: "center", gap: 14 }}
          >
            {/* Label */}
            <div
              style={{
                width: 110,
                fontSize: 12,
                fontWeight: 600,
                color: TEXT_MUTED,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {s.label}
            </div>
            {/* Bar */}
            <div
              style={{
                flex: 1,
                height: 32,
                background: BG_PAGE,
                borderRadius: 6,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${widthPct}%`,
                  background: `linear-gradient(90deg, ${s.color}cc, ${s.color}88)`,
                  borderRadius: 6,
                  transition: "width 0.5s ease",
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 10,
                }}
              >
                {widthPct > 12 && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#fff",
                      textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    }}
                  >
                    {s.count}
                  </span>
                )}
              </div>
              {widthPct <= 12 && (
                <span
                  style={{
                    position: "absolute",
                    left: `calc(${widthPct}% + 8px)`,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: TEXT_MUTED,
                  }}
                >
                  {s.count}
                </span>
              )}
            </div>
            {/* Percentage */}
            <div
              style={{
                width: 48,
                fontSize: 12,
                fontWeight: 700,
                color: s.color,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {rate}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Recipients Table
// ═════════════════════════════════════════════════════════════════════════════

function RecipientsTable({
  recipients,
}: {
  recipients: CampaignRecipient[];
}) {
  if (recipients.length === 0) {
    return (
      <div
        style={{
          padding: "32px 20px",
          textAlign: "center",
          color: TEXT_MUTED,
          fontSize: 13,
        }}
      >
        No recipients yet.
      </div>
    );
  }

  const thStyle: React.CSSProperties = {
    padding: "10px 14px",
    textAlign: "left",
    fontSize: 10,
    fontWeight: 700,
    color: TEXT_DIM,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "11px 14px",
    fontSize: 13,
    color: TEXT_SECONDARY,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  return (
    <div style={{ overflowX: "auto", maxHeight: 480, overflowY: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Opened At</th>
            <th style={thStyle}>Completed At</th>
            <th style={thStyle}>HES Requested</th>
          </tr>
        </thead>
        <tbody>
          {recipients.map((r, i) => {
            const rsc = recipientStatusColor(r.status);
            return (
              <tr
                key={r.id}
                style={{
                  borderBottom:
                    i < recipients.length - 1
                      ? `1px solid ${BORDER}44`
                      : "none",
                }}
              >
                <td style={tdStyle}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
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
                      {(r.contact?.name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <span
                      style={{
                        fontWeight: 600,
                        color: TEXT_PRIMARY,
                        maxWidth: 150,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {r.contact?.name ?? "Unknown"}
                    </span>
                  </div>
                </td>
                <td style={{ ...tdStyle, maxWidth: 180 }}>
                  {r.email ?? "--"}
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 10px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      background: rsc + "22",
                      color: rsc,
                      border: `1px solid ${rsc}44`,
                    }}
                  >
                    {recipientStatusLabel(r.status)}
                  </span>
                </td>
                <td style={tdStyle}>{fmtDateTime(r.opened_at)}</td>
                <td style={tdStyle}>{fmtDateTime(r.completed_at)}</td>
                <td style={tdStyle}>
                  {r.hes_requested_at ? (
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                        background: "#22c55e22",
                        color: "#22c55e",
                        border: "1px solid #22c55e44",
                      }}
                    >
                      Yes
                    </span>
                  ) : (
                    <span style={{ color: TEXT_DIM }}>--</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
