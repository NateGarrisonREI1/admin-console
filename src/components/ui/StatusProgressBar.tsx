// src/components/ui/StatusProgressBar.tsx
// Reusable workflow progress bar — used in admin side panel AND tech portal.
"use client";

import React from "react";

// ─── Status pipeline ─────────────────────────────────────────────────

const STAGES = [
  { key: "pending",        label: "Pending" },
  { key: "scheduled",      label: "Scheduled" },
  { key: "en_route",       label: "En Route" },
  { key: "on_site",        label: "On Site" },
  { key: "field_complete",  label: "Field Done" },
  { key: "report_ready",   label: "Report Ready" },
  { key: "delivered",      label: "Delivered" },
] as const;

/** Map legacy statuses to their current equivalents */
function normalizeStatus(status: string): string {
  if (status === "in_progress") return "on_site";
  if (status === "completed") return "delivered";
  if (status === "rescheduled") return "scheduled";
  return status;
}

// ─── Colors ──────────────────────────────────────────────────────────

const GREEN = "#10b981";
const GREY_TRACK = "#334155";
const TEXT_DIM = "#64748b";

// ─── Component ───────────────────────────────────────────────────────

export default function StatusProgressBar({
  status,
  paymentStatus,
}: {
  status: string;
  paymentStatus: string;
}) {
  const normalized = normalizeStatus(status);
  const currentIdx = STAGES.findIndex((s) => s.key === normalized);

  // Don't render for cancelled/archived
  if (status === "cancelled" || status === "archived") return null;

  const prevStage = currentIdx > 0 ? STAGES[currentIdx - 1] : null;
  const currStage = currentIdx >= 0 ? STAGES[currentIdx] : null;
  const nextStage = currentIdx >= 0 && currentIdx < STAGES.length - 1 ? STAGES[currentIdx + 1] : null;
  const isComplete = currStage?.key === "delivered";

  return (
    <div
      style={{
        padding: 16,
        border: `1px solid ${GREY_TRACK}`,
        borderRadius: 10,
        background: "rgba(15,23,42,0.4)",
      }}
    >
      {/* Track + nodes */}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {STAGES.map((stage, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isDeliveredCurrent = isCurrent && stage.key === "delivered";

          const nodeSize = isCurrent ? 16 : 12;
          const nodeColor = isDone || isCurrent ? GREEN : "transparent";
          const nodeBorder = isDone || isCurrent ? "none" : `2px solid ${GREY_TRACK}`;

          return (
            <React.Fragment key={stage.key}>
              {/* Node */}
              <div
                style={{
                  width: nodeSize,
                  height: nodeSize,
                  borderRadius: "50%",
                  background: nodeColor,
                  border: nodeBorder,
                  boxShadow: isCurrent ? `0 0 0 4px rgba(16,185,129,0.2)` : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  zIndex: 1,
                  transition: "all 0.2s",
                }}
              >
                {isDeliveredCurrent && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5.5L4 7.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Connector line */}
              {i < STAGES.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: isDone ? GREEN : GREY_TRACK,
                    minWidth: 8,
                    transition: "background 0.2s",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Prev / Current / Next row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginTop: 10,
        }}
      >
        {/* Previous */}
        <div style={{ flex: "0 0 auto", fontSize: 11, color: TEXT_DIM, minWidth: 0 }}>
          {prevStage ? `\u2190 ${prevStage.label}` : ""}
        </div>

        {/* Current */}
        <div style={{ fontSize: 14, fontWeight: 600, color: GREEN, textAlign: "center" }}>
          {currStage?.label ?? status}
        </div>

        {/* Next */}
        <div style={{ flex: "0 0 auto", fontSize: 11, color: TEXT_DIM, textAlign: "right", minWidth: 0 }}>
          {isComplete ? "" : nextStage ? `${nextStage.label} \u2192` : ""}
        </div>
      </div>

      {/* Payment badge — right-aligned under progress bar */}
      {paymentStatus && paymentStatus !== "unpaid" && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          {paymentStatus === "paid" && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 10px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                background: "rgba(16,185,129,0.15)",
                color: "#34d399",
                border: "1px solid rgba(16,185,129,0.35)",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Paid
            </span>
          )}
          {paymentStatus === "invoiced" && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 10px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                background: "rgba(245,158,11,0.15)",
                color: "#fbbf24",
                border: "1px solid rgba(245,158,11,0.35)",
              }}
            >
              Invoiced
            </span>
          )}
        </div>
      )}
    </div>
  );
}
