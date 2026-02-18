"use client";

import { useState } from "react";
import type { CustomersPageData, CustomerRow } from "./actions";

// ── Design Tokens ────────────────────────────────────────────────────

const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

// ── System Type Colors ───────────────────────────────────────────────

const SYSTEM_TYPE_COLORS: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  hvac: { bg: "rgba(249,115,22,0.15)", text: "#f97316", label: "HVAC" },
  water_heater: {
    bg: "rgba(59,130,246,0.15)",
    text: "#3b82f6",
    label: "Water Heater",
  },
  solar: { bg: "rgba(234,179,8,0.15)", text: "#eab308", label: "Solar" },
  electrical: {
    bg: "rgba(245,158,11,0.15)",
    text: "#f59e0b",
    label: "Electrical",
  },
  plumbing: { bg: "rgba(6,182,212,0.15)", text: "#06b6d4", label: "Plumbing" },
};

// ── Helpers ──────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function systemBadge(type: string) {
  const key = type.toLowerCase();
  const entry = SYSTEM_TYPE_COLORS[key] ?? {
    bg: "rgba(148,163,184,0.15)",
    text: TEXT_MUTED,
    label: type,
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: entry.bg,
        color: entry.text,
        whiteSpace: "nowrap",
      }}
    >
      {entry.label}
    </span>
  );
}

function statusBadge(status: string) {
  let bg: string;
  let text: string;
  const normalized = status.toLowerCase();

  if (normalized === "completed") {
    bg = "rgba(16,185,129,0.15)";
    text = EMERALD;
  } else if (normalized === "purchased") {
    bg = "rgba(59,130,246,0.15)";
    text = "#3b82f6";
  } else {
    bg = "rgba(148,163,184,0.15)";
    text = TEXT_MUTED;
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color: text,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

// ── Eye Icon (SVG) ───────────────────────────────────────────────────

function EyeIcon({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────────

export default function CustomersClient({
  data,
}: {
  data: CustomersPageData;
}) {
  const { customers, stats } = data;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // ── Empty State ──────────────────────────────────────────────────

  if (customers.length === 0) {
    return (
      <div style={{ padding: 28 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}
          >
            Customers
          </h1>
          <p style={{ fontSize: 13, color: TEXT_DIM, margin: "4px 0 0 0" }}>
            Homeowners from your completed jobs
          </p>
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <StatCard label="Total Customers" value={stats.total} />
          <StatCard
            label="Completed Jobs"
            value={stats.completed}
            valueColor={EMERALD}
          />
          <StatCard
            label="In Progress"
            value={stats.inProgress}
            valueColor="#3b82f6"
          />
        </div>

        {/* Empty Card */}
        <div
          style={{
            border: `2px dashed ${BORDER}`,
            borderRadius: 12,
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 14,
              color: TEXT_DIM,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            No customers yet. Complete purchased leads to build your customer
            book.
          </p>
        </div>
      </div>
    );
  }

  // ── Main View ────────────────────────────────────────────────────

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>
          Customers
        </h1>
        <p style={{ fontSize: 13, color: TEXT_DIM, margin: "4px 0 0 0" }}>
          Homeowners from your completed jobs
        </p>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard label="Total Customers" value={stats.total} />
        <StatCard
          label="Completed Jobs"
          value={stats.completed}
          valueColor={EMERALD}
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          valueColor="#3b82f6"
        />
      </div>

      {/* Customer Table */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {/* Table Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 48px",
            gap: 8,
            padding: "12px 18px",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          {["Name", "Address", "Job Type", "Date", "Status", ""].map(
            (heading) => (
              <span
                key={heading || "actions"}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: TEXT_DIM,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {heading}
              </span>
            ),
          )}
        </div>

        {/* Table Rows */}
        {customers.map((customer: CustomerRow, i: number) => {
          const isExpanded = expandedId === customer.id;
          const isLast = i === customers.length - 1;

          return (
            <div key={customer.id}>
              {/* Row */}
              <div
                onClick={() => toggleExpand(customer.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 48px",
                  gap: 8,
                  padding: "12px 18px",
                  alignItems: "center",
                  borderBottom:
                    !isLast || isExpanded ? `1px solid ${BORDER}` : "none",
                  cursor: "pointer",
                  transition: "background 150ms",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "rgba(255,255,255,0.03)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "none";
                }}
              >
                {/* Name + Phone */}
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: TEXT,
                      lineHeight: 1.4,
                    }}
                  >
                    {customer.homeowner_name}
                  </div>
                  {customer.homeowner_phone && (
                    <div
                      style={{ fontSize: 12, color: TEXT_DIM, marginTop: 2 }}
                    >
                      {customer.homeowner_phone}
                    </div>
                  )}
                </div>

                {/* Address (truncated) */}
                <div
                  style={{
                    fontSize: 13,
                    color: TEXT_SEC,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {customer.homeowner_address ?? "\u2014"}
                </div>

                {/* Job Type Badge */}
                <div>{systemBadge(customer.job_type)}</div>

                {/* Date */}
                <div style={{ fontSize: 12, color: TEXT_DIM }}>
                  {formatDate(customer.job_date)}
                </div>

                {/* Status Badge */}
                <div>{statusBadge(customer.job_status)}</div>

                {/* Actions - Eye Icon */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <EyeIcon color={isExpanded ? TEXT : TEXT_DIM} />
                </div>
              </div>

              {/* Expanded Detail Row */}
              {isExpanded && (
                <div
                  style={{
                    padding: "16px 18px",
                    background: "rgba(0,0,0,0.15)",
                    borderBottom: !isLast ? `1px solid ${BORDER}` : "none",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  {/* Email */}
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: TEXT_DIM,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 4,
                      }}
                    >
                      Email
                    </div>
                    <div style={{ fontSize: 13, color: TEXT_SEC }}>
                      {customer.homeowner_email ?? "\u2014"}
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: TEXT_DIM,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 4,
                      }}
                    >
                      Phone
                    </div>
                    <div style={{ fontSize: 13, color: TEXT_SEC }}>
                      {customer.homeowner_phone ? (
                        <a
                          href={`tel:${customer.homeowner_phone}`}
                          style={{ color: EMERALD, textDecoration: "none" }}
                        >
                          {customer.homeowner_phone}
                        </a>
                      ) : (
                        "\u2014"
                      )}
                    </div>
                  </div>

                  {/* Full Address */}
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: TEXT_DIM,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 4,
                      }}
                    >
                      Full Address
                    </div>
                    <div style={{ fontSize: 13, color: TEXT_SEC }}>
                      {customer.homeowner_address ?? "\u2014"}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: TEXT_DIM,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 4,
                      }}
                    >
                      Notes
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: TEXT_SEC,
                        lineHeight: 1.5,
                      }}
                    >
                      {customer.notes ?? "\u2014"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────

function StatCard({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: number;
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
