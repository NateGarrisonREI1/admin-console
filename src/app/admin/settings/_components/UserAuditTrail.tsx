// src/app/admin/settings/_components/UserAuditTrail.tsx
"use client";

import * as React from "react";
import type { AuditEvent } from "../_actions/users";

// ─── Design tokens ──────────────────────────────────────────────────
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  login_success: { label: "Signed in", color: "#10b981", icon: "\u2713" },
  login_failed: { label: "Failed login", color: "#f87171", icon: "\u2717" },
  password_reset_request: { label: "Password reset requested", color: "#38bdf8", icon: "\u21BB" },
  password_reset_complete: { label: "Password reset completed", color: "#10b981", icon: "\u2713" },
  logout: { label: "Signed out", color: "#94a3b8", icon: "\u2190" },
  role_change: { label: "Role changed", color: "#fbbf24", icon: "\u21C4" },
  account_locked: { label: "Account locked", color: "#f87171", icon: "\u26A0" },
};

function fmtRelativeTime(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "\u2014";
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtFullDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

type Props = {
  events: AuditEvent[];
};

export default function UserAuditTrail({ events }: Props) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? events : events.slice(0, 10);

  if (events.length === 0) {
    return (
      <div style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24,
        textAlign: "center", color: TEXT_DIM, fontSize: 13, fontWeight: 500,
      }}>
        No activity recorded for this user.
      </div>
    );
  }

  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px", borderBottom: `1px solid ${BORDER}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Activity Log
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED }}>
          {events.length} {events.length === 1 ? "event" : "events"}
        </span>
      </div>

      {/* Timeline */}
      <div style={{ padding: "8px 0", maxHeight: expanded ? "none" : 440, overflowY: expanded ? "visible" : "auto" }}>
        {visible.map((event, idx) => {
          const config = ACTION_CONFIG[event.action] || { label: event.action, color: TEXT_MUTED, icon: "\u2022" };
          const isLast = idx === visible.length - 1;

          return (
            <div
              key={event.id}
              style={{
                display: "flex", gap: 12, padding: "8px 16px",
                position: "relative",
              }}
            >
              {/* Timeline dot + line */}
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                flexShrink: 0, width: 24,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: `${config.color}18`,
                  border: `1.5px solid ${config.color}44`,
                  display: "grid", placeItems: "center",
                  fontSize: 11, fontWeight: 800, color: config.color,
                }}>
                  {config.icon}
                </div>
                {!isLast && (
                  <div style={{
                    width: 1.5, flex: 1, minHeight: 16,
                    background: `linear-gradient(to bottom, ${config.color}33, transparent)`,
                  }} />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: isLast ? 0 : 8, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>
                    {config.label}
                  </div>
                  <div
                    title={fmtFullDate(event.created_at)}
                    style={{ fontSize: 11, fontWeight: 500, color: TEXT_DIM, whiteSpace: "nowrap", flexShrink: 0 }}
                  >
                    {fmtRelativeTime(event.created_at)}
                  </div>
                </div>

                {/* Metadata */}
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div style={{
                    marginTop: 4, fontSize: 11, color: TEXT_MUTED, fontWeight: 500,
                    display: "flex", flexWrap: "wrap", gap: 6,
                  }}>
                    {Object.entries(event.metadata).map(([k, v]) => (
                      <span key={k} style={{
                        padding: "2px 6px", borderRadius: 4,
                        background: "rgba(148,163,184,0.06)", border: `1px solid ${BORDER}`,
                      }}>
                        {k}: {String(v)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more */}
      {events.length > 10 && (
        <div style={{ padding: "8px 16px", borderTop: `1px solid ${BORDER}` }}>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{
              width: "100%", padding: "8px", borderRadius: 8,
              border: `1px solid ${BORDER}`, background: "transparent",
              color: TEXT_SEC, fontSize: 12, fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(148,163,184,0.06)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {expanded ? "Show less" : `Show all ${events.length} events`}
          </button>
        </div>
      )}
    </div>
  );
}
