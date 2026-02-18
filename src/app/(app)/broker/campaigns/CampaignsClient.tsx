"use client";

import { useRouter } from "next/navigation";
import type { Broker, BrokerCampaign } from "@/types/broker";

// ─── Design tokens ──────────────────────────────────────────────────────────
const BG_CARD = "#1e293b";
const BORDER = "#334155";
const RADIUS = 16;
const TEXT_PRIMARY = "#f1f5f9";
const TEXT_SECONDARY = "#cbd5e1";
const TEXT_MUTED = "#94a3b8";
const TEXT_DIM = "#64748b";
const ACCENT_EMERALD = "#10b981";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusColor(status: string): string {
  switch (status) {
    case "draft":
      return "#94a3b8";
    case "sending":
      return "#f59e0b";
    case "sent":
      return "#10b981";
    case "archived":
      return "#64748b";
    default:
      return "#94a3b8";
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

function fmtRate(count: number, total: number): string {
  if (total <= 0) return "0%";
  return Math.round((count / total) * 100) + "%";
}

// ─── Props ──────────────────────────────────────────────────────────────────

type Props = {
  broker: Broker;
  campaigns: BrokerCampaign[];
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function CampaignsClient({ campaigns }: Props) {
  const router = useRouter();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
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
            LEAF Campaigns
          </h1>
          <p
            style={{
              marginTop: 4,
              fontSize: 13,
              color: TEXT_MUTED,
              margin: "4px 0 0",
            }}
          >
            Send home energy assessments to your contacts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/broker/campaigns/new")}
          style={{
            background: ACCENT_EMERALD,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.85";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M7 1v12M1 7h12"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          New Campaign
        </button>
      </div>

      {/* ── Empty State ── */}
      {campaigns.length === 0 && (
        <div
          style={{
            background: BG_CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: RADIUS,
            padding: "48px 32px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: ACCENT_EMERALD + "18",
              border: `1px solid ${ACCENT_EMERALD}44`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke={ACCENT_EMERALD}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: TEXT_PRIMARY,
              marginBottom: 8,
            }}
          >
            No campaigns yet
          </div>
          <div
            style={{
              fontSize: 13,
              color: TEXT_MUTED,
              maxWidth: 400,
              margin: "0 auto",
              lineHeight: 1.5,
            }}
          >
            Create your first LEAF campaign to start generating leads. Send
            personalized home energy assessments to your contacts and track
            engagement in real time.
          </div>
        </div>
      )}

      {/* ── Campaign Cards ── */}
      {campaigns.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {campaigns.map((c) => {
            const sc = statusColor(c.status);
            return (
              <div
                key={c.id}
                style={{
                  background: BG_CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: RADIUS,
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                {/* Top row: name + status */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: TEXT_PRIMARY,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.name}
                    </span>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                        background: sc + "22",
                        color: sc,
                        border: `1px solid ${sc}44`,
                        flexShrink: 0,
                      }}
                    >
                      {statusLabel(c.status)}
                    </span>
                  </div>
                  {c.sent_date && (
                    <span style={{ fontSize: 12, color: TEXT_DIM, flexShrink: 0 }}>
                      Sent {fmtDate(c.sent_date)}
                    </span>
                  )}
                </div>

                {/* Metrics row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 12,
                  }}
                >
                  <MetricCell
                    label="Sent"
                    value={String(c.sent_count)}
                    sub={null}
                  />
                  <MetricCell
                    label="Opened"
                    value={String(c.opened_count)}
                    sub={fmtRate(c.opened_count, c.sent_count)}
                  />
                  <MetricCell
                    label="Completed"
                    value={String(c.completed_count)}
                    sub={fmtRate(c.completed_count, c.sent_count)}
                  />
                  <MetricCell
                    label="HES Requested"
                    value={String(c.hes_requested_count)}
                    sub={fmtRate(c.hes_requested_count, c.sent_count)}
                  />
                </div>

                {/* Actions row */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => router.push(`/broker/campaigns/${c.id}`)}
                    style={{
                      background: "transparent",
                      color: ACCENT_EMERALD,
                      border: `1px solid ${ACCENT_EMERALD}44`,
                      borderRadius: 8,
                      padding: "7px 16px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = ACCENT_EMERALD + "18";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    View Results
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sub-component ──────────────────────────────────────────────────────────

function MetricCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string | null;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        borderRadius: 10,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
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
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: TEXT_PRIMARY }}>
          {value}
        </span>
        {sub && (
          <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
