"use client";

import { useState } from "react";
import Link from "next/link";
import type { ContractorDashboardData, LeadPreview, ActiveJob } from "./actions";

// ─── Design Tokens ──────────────────────────────────────────────────

const BG = "#0f172a";
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

// ─── Helpers ────────────────────────────────────────────────────────

const SYSTEM_COLORS: Record<string, { bg: string; text: string }> = {
  hvac: { bg: "rgba(251,146,60,0.15)", text: "#fb923c" },
  water_heater: { bg: "rgba(96,165,250,0.15)", text: "#60a5fa" },
  solar: { bg: "rgba(250,204,21,0.15)", text: "#facc15" },
  electrical: { bg: "rgba(251,191,36,0.15)", text: "#fbbf24" },
  plumbing: { bg: "rgba(34,211,238,0.15)", text: "#22d3ee" },
};

const SYSTEM_LABELS: Record<string, string> = {
  hvac: "HVAC",
  water_heater: "Water Heater",
  solar: "Solar",
  electrical: "Electrical",
  plumbing: "Plumbing",
};

function systemBadge(type: string) {
  const key = type.toLowerCase();
  const colors = SYSTEM_COLORS[key] ?? { bg: "rgba(148,163,184,0.15)", text: TEXT_MUTED };
  const label = SYSTEM_LABELS[key] ?? type;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: colors.bg,
        color: colors.text,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: "rgba(96,165,250,0.15)", text: "#60a5fa" },
  contacted: { bg: "rgba(251,191,36,0.15)", text: "#fbbf24" },
  quoted: { bg: "rgba(168,85,247,0.15)", text: "#a855f7" },
};

function statusBadge(status: string) {
  const colors = STATUS_COLORS[status] ?? { bg: "rgba(148,163,184,0.15)", text: TEXT_MUTED };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: colors.bg,
        color: colors.text,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return "";
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function money(v: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function firstName(name: string | null): string {
  if (!name) return "\u2014";
  const first = name.trim().split(/\s+/)[0];
  return first || "\u2014";
}

// ─── Component ──────────────────────────────────────────────────────

export default function ContractorDashboardClient({ data }: { data: ContractorDashboardData }) {
  const { stats, newLeads, activeJobs, network } = data;

  // Hover state for link elements
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  const linkStyle = (key: string): React.CSSProperties => ({
    color: EMERALD,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
    opacity: hoveredLink === key ? 0.8 : 1,
    transition: "opacity 150ms",
  });

  return (
    <div style={{ background: BG, minHeight: "100vh", padding: 28 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: TEXT_DIM, margin: "4px 0 0 0" }}>Your contractor overview</p>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard label="Available Leads" value={String(stats.availableLeads)} />
        <StatCard label="Active Jobs" value={String(stats.activeJobs)} />
        <StatCard label="Spend This Month" value={`$${stats.spendThisMonth.toLocaleString()}`} valueColor={EMERALD} />
        <StatCard label="Completed This Month" value={String(stats.completedThisMonth)} />
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 20,
        }}
      >
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* New Leads Preview */}
          <div
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 18px",
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>New Leads in Your Area</span>
              <Link
                href="/contractor/job-board"
                style={linkStyle("viewAllLeads")}
                onMouseEnter={() => setHoveredLink("viewAllLeads")}
                onMouseLeave={() => setHoveredLink(null)}
              >
                View All &rarr;
              </Link>
            </div>
            {newLeads.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: TEXT_DIM, fontSize: 14 }}>
                No leads available in your area right now.
              </div>
            ) : (
              <div>
                {newLeads.map((lead: LeadPreview, i: number) => (
                  <div
                    key={lead.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 18px",
                      borderBottom: i < newLeads.length - 1 ? `1px solid ${BORDER}` : "none",
                    }}
                  >
                    {systemBadge(lead.system_type)}
                    <span style={{ flex: 1, fontSize: 13, color: TEXT_SEC }}>
                      {lead.city ? `${lead.city}, ${lead.state}` : lead.zip}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: EMERALD, marginRight: 12 }}>
                      {money(lead.price)}
                    </span>
                    <span style={{ fontSize: 12, color: TEXT_DIM, minWidth: 60, textAlign: "right" }}>
                      {timeAgo(lead.posted_date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Jobs */}
          <div
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 18px",
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Active Jobs</span>
              <Link
                href="/contractor/leads"
                style={linkStyle("viewAllJobs")}
                onMouseEnter={() => setHoveredLink("viewAllJobs")}
                onMouseLeave={() => setHoveredLink(null)}
              >
                View All &rarr;
              </Link>
            </div>
            {activeJobs.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: TEXT_DIM, fontSize: 14 }}>
                No active jobs. Purchase leads from the Job Board to get started.
              </div>
            ) : (
              <div>
                {activeJobs.map((job: ActiveJob, i: number) => (
                  <div
                    key={job.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 18px",
                      borderBottom: i < activeJobs.length - 1 ? `1px solid ${BORDER}` : "none",
                    }}
                  >
                    <span style={{ fontSize: 13, color: TEXT, fontWeight: 600, minWidth: 80 }}>
                      {firstName(job.system_lead.homeowner_name)}
                    </span>
                    <span style={{ fontSize: 12, color: TEXT_DIM }}>
                      {job.system_lead.city ?? ""}
                    </span>
                    {systemBadge(job.system_lead.system_type)}
                    <span style={{ flex: 1 }} />
                    {statusBadge(job.status)}
                    <span style={{ fontSize: 12, color: TEXT_DIM, minWidth: 60, textAlign: "right" }}>
                      {timeAgo(job.updated_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Network Summary */}
          <div
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Network</span>
            </div>
            <div>
              <NetworkRow label="Broker Connections" count={network.brokerCount} />
              <div style={{ borderBottom: `1px solid ${BORDER}` }} />
              <NetworkRow label="Contractor Network" count={network.contractorCount} />
              <div style={{ borderBottom: `1px solid ${BORDER}` }} />
              <NetworkRow label="Past Customers" count={network.customerCount} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function StatCard({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: TEXT_DIM,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: valueColor ?? TEXT,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function NetworkRow({ label, count }: { label: string; count: number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 18px",
      }}
    >
      <span style={{ fontSize: 14, color: TEXT_MUTED }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{count}</span>
    </div>
  );
}
