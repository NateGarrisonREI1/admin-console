// src/app/(app)/broker/schedule/BrokerScheduleClient.tsx
"use client";

import React, { useState } from "react";
import type { BrokerJob } from "./actions";
import { useNewRequestModal } from "../_components/NewRequestModalProvider";
import StatusProgressBar from "@/components/ui/StatusProgressBar";

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

// ─── Status display ─────────────────────────────────────────────────

const STATUS_DISPLAY: Record<string, { bg: string; color: string; border: string; label: string }> = {
  pending:          { bg: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "rgba(245,158,11,0.35)", label: "Pending" },
  pending_delivery: { bg: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "rgba(245,158,11,0.35)", label: "Pending Delivery" },
  scheduled:        { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.35)", label: "Scheduled" },
  rescheduled:      { bg: "rgba(37,99,235,0.15)", color: "#60a5fa", border: "rgba(37,99,235,0.35)", label: "Rescheduled" },
  en_route:         { bg: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "rgba(59,130,246,0.35)", label: "En Route" },
  on_site:          { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.35)", label: "On Site" },
  field_complete:   { bg: "rgba(217,119,6,0.15)", color: "#fbbf24", border: "rgba(217,119,6,0.35)", label: "Field Complete" },
  report_ready:     { bg: "rgba(8,145,178,0.15)", color: "#22d3ee", border: "rgba(8,145,178,0.35)", label: "Report Ready" },
  delivered:        { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.35)", label: "Delivered" },
  in_progress:      { bg: "rgba(217,119,6,0.15)", color: "#fbbf24", border: "rgba(217,119,6,0.35)", label: "In Progress" },
  completed:        { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.35)", label: "Completed" },
};

const JOB_TYPE_BADGE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  hes:       { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.3)", label: "HES" },
  inspector: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "rgba(245,158,11,0.3)", label: "Inspection" },
};

const NETWORK_BADGE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  in_network:      { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.3)", label: "In-Network" },
  out_of_network:  { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "rgba(245,158,11,0.3)", label: "Out-of-Network" },
  self_managed:    { bg: "rgba(234,179,8,0.12)",  color: "#eab308", border: "rgba(234,179,8,0.3)",  label: "Self-Managed" },
};

const SOURCE_BADGE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  broker_portal:   { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.3)", label: "You requested" },
  client_link:     { bg: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "rgba(59,130,246,0.3)", label: "Client request" },
};

function Badge({ bg, color, border, label }: { bg: string; color: string; border: string; label: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, background: bg, color, border: `1px solid ${border}`,
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Filter tabs ────────────────────────────────────────────────────

type FilterTab = "all" | "in_progress" | "completed";

const ACTIVE_STATUSES = new Set(["scheduled", "en_route", "on_site", "field_complete", "report_ready", "in_progress", "rescheduled"]);
const COMPLETED_STATUSES = new Set(["delivered", "completed"]);

function filterJobs(jobs: BrokerJob[], tab: FilterTab): BrokerJob[] {
  switch (tab) {
    case "in_progress":
      return jobs.filter((j) => ACTIVE_STATUSES.has(j.status));
    case "completed":
      return jobs.filter((j) => COMPLETED_STATUSES.has(j.status));
    default:
      return jobs;
  }
}

// ─── KPI Card ───────────────────────────────────────────────────────

function KPICard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{
      background: BG_CARD,
      borderTop: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: RADIUS, padding: "16px 20px",
      display: "flex", flexDirection: "column", gap: 4, minWidth: 0,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ fontSize: 24, fontWeight: 700, color: TEXT, lineHeight: 1 }}>{value}</span>
    </div>
  );
}

// ─── Expanded Row Detail ────────────────────────────────────────────

function JobDetailPanel({ job }: { job: BrokerJob }) {
  const fullAddr = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");
  const isDelivered = job.status === "delivered" || job.status === "completed";

  return (
    <div style={{ padding: "16px 20px", background: "rgba(15,23,42,0.6)", borderTop: `1px solid ${BORDER}` }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Address</div>
          <div style={{ fontSize: 13, color: TEXT_SEC }}>{fullAddr || "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Homeowner</div>
          <div style={{ fontSize: 13, color: TEXT_SEC }}>{job.customer_name}</div>
          {job.customer_email && <div style={{ fontSize: 12, color: TEXT_DIM }}>{job.customer_email}</div>}
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Assessor</div>
          <div style={{ fontSize: 13, color: TEXT_SEC }}>{job.team_member_name || "TBD"}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Payment</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: job.payment_status === "paid" ? EMERALD : AMBER }}>
            {job.payment_status === "paid" ? "Paid" : job.payment_status === "invoiced" ? "Invoiced" : "Unpaid"}
          </div>
        </div>
      </div>

      {/* Progress bar + report downloads */}
      <div style={{ marginBottom: 12 }}>
        <StatusProgressBar status={job.status} paymentStatus={job.payment_status ?? ""} />
        {isDelivered && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {job.hes_report_url && (
              <a href={job.hes_report_url} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: "#60a5fa", fontWeight: 600, textDecoration: "none" }}>
                Download HES Report
              </a>
            )}
            {job.leaf_report_url && (
              <a href={job.leaf_report_url} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: EMERALD, fontWeight: 600, textDecoration: "none" }}>
                View LEAF Report
              </a>
            )}
            {job.reports_sent_at && (
              <div style={{ fontSize: 11, color: EMERALD, fontWeight: 600 }}>
                Reports delivered {new Date(job.reports_sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

type Props = {
  jobs: BrokerJob[];
};

export default function BrokerScheduleClient({ jobs: initialJobs }: Props) {
  const [tab, setTab] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { open: openNewRequest } = useNewRequestModal();

  const today = todayStr();
  const filtered = filterJobs(initialJobs, tab);

  // KPI counts
  const inProgress = initialJobs.filter((j) => ACTIVE_STATUSES.has(j.status)).length;
  const completed = initialJobs.filter((j) => COMPLETED_STATUSES.has(j.status)).length;
  const allTime = initialJobs.length;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "in_progress", label: "In Progress" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, letterSpacing: "-0.02em", margin: 0 }}>Schedule</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={openNewRequest}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8,
              fontWeight: 700, fontSize: 13, color: "#fff",
              background: EMERALD, border: "1px solid rgba(16,185,129,0.5)",
              cursor: "pointer", transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#059669"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = EMERALD; }}
          >
            + New Request
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="broker-kpi-grid-3">
        <KPICard label="In Progress" value={inProgress} accent={BLUE} />
        <KPICard label="Completed" value={completed} accent={EMERALD} />
        <KPICard label="All Time" value={allTime} accent={PURPLE} />
      </div>

      {/* ── Filter Tabs ── */}
      <div style={{ display: "flex", gap: 4, background: "rgba(30,41,59,0.5)", borderRadius: 8, padding: 3 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setTab(t.key); setExpandedId(null); }}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 6,
              border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              transition: "all 0.15s",
              background: tab === t.key ? "rgba(16,185,129,0.12)" : "transparent",
              color: tab === t.key ? TEXT : TEXT_MUTED,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Jobs Table ── */}
      {filtered.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center", color: TEXT_MUTED, fontSize: 14, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS }}>
          No jobs found for this filter.
        </div>
      ) : (
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS, overflow: "hidden" }}>
          {/* Table header */}
          <div className="broker-table-desktop" style={{
            display: "grid", gridTemplateColumns: "90px 1fr 80px 140px 120px 120px",
            padding: "10px 20px", borderBottom: `1px solid ${BORDER}`,
            gap: 12,
          }}>
            {["Date", "Address", "Service", "Assessor", "Source", "Status"].map((h) => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
            ))}
          </div>

          {/* Table rows (desktop) */}
          {filtered.map((job) => {
            const isExpanded = expandedId === job.id;
            const isToday = job.scheduled_date === today;
            const statusBadge = STATUS_DISPLAY[job.status] ?? STATUS_DISPLAY.pending;
            const typeBadge = JOB_TYPE_BADGE[job.type] ?? JOB_TYPE_BADGE.hes;
            const sourceBadge = SOURCE_BADGE[job.source ?? "broker_portal"] ?? SOURCE_BADGE.broker_portal;
            const assessorName = job.network_status === "out_of_network"
              ? (job.external_assessor_name || "External")
              : (job.team_member_name || "TBD");

            return (
              <React.Fragment key={job.id}>
                {/* Desktop row */}
                <div
                  className="broker-table-desktop"
                  onClick={() => setExpandedId(isExpanded ? null : job.id)}
                  style={{
                    display: "grid", gridTemplateColumns: "90px 1fr 80px 140px 120px 120px",
                    padding: "12px 20px", gap: 12, cursor: "pointer",
                    borderBottom: `1px solid ${BORDER}44`,
                    background: isExpanded ? "rgba(16,185,129,0.04)" : "transparent",
                    transition: "background 0.1s",
                    alignItems: "center",
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded) e.currentTarget.style.background = "rgba(148,163,184,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Date */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_SEC }}>{formatDate(job.scheduled_date)}</span>
                    {isToday && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: EMERALD, background: "rgba(16,185,129,0.12)", padding: "1px 5px", borderRadius: 4 }}>TODAY</span>
                    )}
                  </div>

                  {/* Address */}
                  <div style={{ fontSize: 13, fontWeight: 500, color: TEXT_SEC, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {job.address || "—"}
                    {job.city && <span style={{ color: TEXT_DIM }}>, {job.city}</span>}
                  </div>

                  {/* Service */}
                  <Badge {...typeBadge} />

                  {/* Assessor */}
                  <div style={{ fontSize: 13, color: TEXT_MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {assessorName}
                  </div>

                  {/* Source */}
                  <Badge {...sourceBadge} />

                  {/* Status */}
                  <Badge {...statusBadge} />
                </div>

                {/* Mobile card */}
                <div
                  className="broker-card-mobile"
                  onClick={() => setExpandedId(isExpanded ? null : job.id)}
                  style={{
                    padding: "14px 16px", cursor: "pointer",
                    borderBottom: `1px solid ${BORDER}44`,
                    background: isExpanded ? "rgba(16,185,129,0.04)" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_SEC, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {job.address || "—"}{job.city && `, ${job.city}`}
                      </div>
                      <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 2 }}>
                        {formatDate(job.scheduled_date)}
                        {isToday && <span style={{ color: EMERALD, fontWeight: 700, marginLeft: 6 }}>TODAY</span>}
                        {" \u00B7 "}{assessorName}
                      </div>
                    </div>
                    <Badge {...statusBadge} />
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Badge {...typeBadge} />
                    <Badge {...sourceBadge} />
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <JobDetailPanel job={job} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

    </div>
  );
}
