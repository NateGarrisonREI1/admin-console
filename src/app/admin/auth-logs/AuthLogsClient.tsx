"use client";

import { useState, useTransition } from "react";
import type { AuthEventRow } from "./actions";
import { fetchAuthLogs } from "./actions";

// ─── Design tokens ──────────────────────────────────────────────────────────
const BG = "#0f172a";
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_MUTED = "#94a3b8";
const TEXT_DIM = "#64748b";
const EMERALD = "#10b981";

// ─── Action badge styling ───────────────────────────────────────────────────

function actionBadge(action: string): { bg: string; color: string; border: string; label: string } {
  switch (action) {
    case "login_success":
      return { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.25)", label: "Login Success" };
    case "login_failed":
      return { bg: "rgba(239,68,68,0.12)", color: "#ef4444", border: "rgba(239,68,68,0.25)", label: "Login Failed" };
    case "password_reset_request":
      return { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "rgba(245,158,11,0.25)", label: "Reset Request" };
    case "password_reset_complete":
      return { bg: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "rgba(59,130,246,0.25)", label: "Reset Complete" };
    case "logout":
      return { bg: "rgba(148,163,184,0.12)", color: "#94a3b8", border: "rgba(148,163,184,0.25)", label: "Logout" };
    case "role_change":
      return { bg: "rgba(139,92,246,0.12)", color: "#8b5cf6", border: "rgba(139,92,246,0.25)", label: "Role Change" };
    case "account_locked":
      return { bg: "rgba(239,68,68,0.12)", color: "#f87171", border: "rgba(239,68,68,0.25)", label: "Account Locked" };
    default:
      return { bg: "rgba(148,163,184,0.08)", color: TEXT_MUTED, border: "rgba(148,163,184,0.2)", label: action };
  }
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function fmtDateFull(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

// ─── Input style ────────────────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: `1px solid ${BORDER}`,
  background: CARD,
  color: TEXT,
  fontSize: 13,
  fontWeight: 500,
  outline: "none",
};

// ─── Actions ────────────────────────────────────────────────────────────────

const ACTION_OPTIONS = [
  { value: "all", label: "All Actions" },
  { value: "login_success", label: "Login Success" },
  { value: "login_failed", label: "Login Failed" },
  { value: "password_reset_request", label: "Reset Request" },
  { value: "password_reset_complete", label: "Reset Complete" },
  { value: "logout", label: "Logout" },
  { value: "role_change", label: "Role Change" },
  { value: "account_locked", label: "Account Locked" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function AuthLogsClient({
  initialEvents,
}: {
  initialEvents: AuthEventRow[];
}) {
  const [events, setEvents] = useState(initialEvents);
  const [emailFilter, setEmailFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  function applyFilters() {
    startTransition(async () => {
      const result = await fetchAuthLogs({
        limit: 200,
        emailFilter: emailFilter.trim() || undefined,
        actionFilter: actionFilter || undefined,
      });
      setEvents(result);
    });
  }

  // Stats
  const totalEvents = events.length;
  const successCount = events.filter((e) => e.action === "login_success").length;
  const failedCount = events.filter((e) => e.action === "login_failed").length;
  const uniqueEmails = new Set(events.map((e) => e.email)).size;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>
          Auth Event Logs
        </h1>
        <p style={{ fontSize: 13, color: TEXT_DIM, margin: "4px 0 0", fontWeight: 500 }}>
          Login attempts, password resets, and security events
        </p>
      </div>

      {/* Stats strip */}
      <div className="admin-kpi-grid">
        {[
          { label: "Total Events", value: totalEvents.toString(), color: EMERALD },
          { label: "Successful Logins", value: successCount.toString(), color: "#10b981" },
          { label: "Failed Attempts", value: failedCount.toString(), color: "#ef4444" },
          { label: "Unique Users", value: uniqueEmails.toString(), color: "#3b82f6" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {s.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, marginTop: 4 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Filter by email..."
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          style={{ ...INPUT_STYLE, flex: "1 1 200px", minWidth: 180 }}
        />

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{ ...INPUT_STYLE, minWidth: 160 }}
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={applyFilters}
          disabled={isPending}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: `1px solid rgba(16,185,129,0.3)`,
            background: "rgba(16,185,129,0.12)",
            color: EMERALD,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? "Loading..." : "Apply"}
        </button>
      </div>

      {/* Events table */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "160px 1fr 140px 1fr 120px",
            gap: 8,
            padding: "10px 16px",
            borderBottom: `1px solid ${BORDER}`,
            background: "rgba(15,23,42,0.5)",
          }}
        >
          {["Time", "Email", "Action", "Details", "User ID"].map((h) => (
            <div
              key={h}
              style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {events.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: TEXT_DIM, fontSize: 13 }}>
            No auth events found
          </div>
        ) : (
          events.map((ev) => {
            const badge = actionBadge(ev.action);
            const meta = ev.metadata as Record<string, unknown> | null;
            const reason = meta?.reason as string | undefined;

            return (
              <div
                key={ev.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr 140px 1fr 120px",
                  gap: 8,
                  padding: "10px 16px",
                  borderBottom: `1px solid rgba(51,65,85,0.5)`,
                  alignItems: "center",
                }}
              >
                {/* Time */}
                <div title={fmtDateFull(ev.created_at)} style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 500 }}>
                  {fmtDate(ev.created_at)}
                </div>

                {/* Email */}
                <div style={{ fontSize: 13, color: TEXT_SEC, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ev.email}
                </div>

                {/* Action badge */}
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Details / metadata */}
                <div style={{ fontSize: 12, color: TEXT_DIM, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {reason || (meta ? JSON.stringify(meta) : "\u2014")}
                </div>

                {/* User ID (truncated) */}
                <div
                  title={ev.user_id ?? undefined}
                  style={{ fontSize: 11, color: TEXT_DIM, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {ev.user_id ? ev.user_id.slice(0, 8) + "\u2026" : "\u2014"}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
