"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import type { ActivityLogEntry } from "@/lib/activityLog";

const ROLE_DOT: Record<string, string> = {
  system: "#94a3b8",
  admin: "#60a5fa",
  field_tech: "#10b981",
  customer: "#f59e0b",
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

export default function ActivityLog({
  entries,
  isLoading,
  maxHeight,
  collapsible,
}: {
  entries: ActivityLogEntry[];
  isLoading?: boolean;
  maxHeight?: string;
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  // --- Collapsible wrapper for admin side panel ---
  if (collapsible) {
    return (
      <div>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "#94a3b8",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Activity Log
          </span>
          {!isLoading && (
            <span
              style={{
                fontSize: 10,
                color: "#f1f5f9",
                background: "#334155",
                borderRadius: 9999,
                padding: "1px 7px",
                fontWeight: 600,
              }}
            >
              {entries.length}
            </span>
          )}
          <span style={{ marginLeft: "auto", color: "#64748b" }}>
            {expanded ? (
              <ChevronUpIcon style={{ width: 16, height: 16 }} />
            ) : (
              <ChevronDownIcon style={{ width: 16, height: 16 }} />
            )}
          </span>
        </button>

        {expanded && (
          <div style={{ marginTop: 10 }}>
            <ActivityLogInner
              entries={entries}
              isLoading={isLoading}
              maxHeight="300px"
            />
          </div>
        )}
      </div>
    );
  }

  // --- Non-collapsible (portal) ---
  return (
    <ActivityLogInner
      entries={entries}
      isLoading={isLoading}
      maxHeight={maxHeight}
    />
  );
}

// ─── Inner timeline ───────────────────────────────────────────────────

function ActivityLogInner({
  entries,
  isLoading,
  maxHeight,
}: {
  entries: ActivityLogEntry[];
  isLoading?: boolean;
  maxHeight?: string;
}) {
  if (isLoading) {
    return (
      <div style={{ padding: "16px 0", color: "#64748b", fontSize: 13 }}>
        Loading activity...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div
        style={{
          padding: "16px 0",
          color: "#475569",
          fontSize: 13,
          fontStyle: "italic",
        }}
      >
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div
      style={{
        maxHeight: maxHeight || undefined,
        overflowY: maxHeight ? "auto" : undefined,
      }}
    >
      <div style={{ position: "relative", paddingLeft: 20 }}>
        {/* Vertical line */}
        <div
          style={{
            position: "absolute",
            left: 5,
            top: 4,
            bottom: 4,
            width: 2,
            background: "#334155",
            borderRadius: 1,
          }}
        />

        {entries.map((entry) => {
          const dotColor = ROLE_DOT[entry.actor_role] ?? ROLE_DOT.system;
          const noteText =
            entry.details && typeof entry.details === "object"
              ? (entry.details as Record<string, any>).note
              : null;

          return (
            <div
              key={entry.id}
              style={{
                position: "relative",
                paddingBottom: 14,
                marginBottom: 0,
              }}
            >
              {/* Dot */}
              <div
                style={{
                  position: "absolute",
                  left: -18,
                  top: 4,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: dotColor,
                  border: "2px solid #0f172a",
                }}
              />

              {/* Content */}
              <div style={{ fontSize: 13, color: "#f1f5f9", lineHeight: 1.4 }}>
                {entry.title}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginTop: 2,
                }}
              >
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  {entry.actor_name || "System"}
                </span>
                <span style={{ fontSize: 11, color: "#475569" }}>
                  {formatTimestamp(entry.created_at)}
                </span>
              </div>
              {noteText && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    fontStyle: "italic",
                    marginTop: 4,
                    paddingLeft: 8,
                    borderLeft: "2px solid #334155",
                  }}
                >
                  {noteText}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
