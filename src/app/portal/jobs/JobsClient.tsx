"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BriefcaseIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  MapPinIcon,
  ClockIcon,
  ReceiptPercentIcon,
} from "@heroicons/react/24/outline";
import { fetchTechJobs, type PortalScheduleJob } from "../actions";

// ─── Helpers ────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string | null): string {
  if (!time) return "TBD";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

type TabKey = "upcoming" | "in_progress" | "completed";

const TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  pending: { bg: "rgba(148,163,184,0.15)", text: "#94a3b8" },
  confirmed: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  rescheduled: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  en_route: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  on_site: { bg: "rgba(16,185,129,0.15)", text: "#10b981" },
  in_progress: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  completed: { bg: "rgba(16,185,129,0.15)", text: "#10b981" },
  paid: { bg: "rgba(16,185,129,0.20)", text: "#34d399" },
};

const SERVICE_BORDER: Record<string, string> = {
  hes: "#10b981",
  inspector: "#f59e0b",
};

// ─── Component ──────────────────────────────────────────────────────

export default function JobsClient() {
  const [tab, setTab] = useState<TabKey>("upcoming");
  const [jobs, setJobs] = useState<PortalScheduleJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadJobs = useCallback(async (filter: TabKey) => {
    setLoading(true);
    try {
      const data = await fetchTechJobs(filter);
      setJobs(data);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs(tab);
  }, [tab, loadJobs]);

  const filtered = search.trim()
    ? jobs.filter(
        (j) =>
          j.customer_name.toLowerCase().includes(search.toLowerCase()) ||
          (j.address ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (j.city ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : jobs;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
          My Jobs
        </h1>
        <div style={{ fontSize: 13, color: "#64748b" }}>
          {filtered.length} job{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 16,
          background: "rgba(15,23,42,0.5)",
          borderRadius: 10,
          padding: 4,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background:
                tab === t.key ? "rgba(16,185,129,0.15)" : "transparent",
              color: tab === t.key ? "#10b981" : "#64748b",
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <MagnifyingGlassIcon
          style={{
            width: 16,
            height: 16,
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#475569",
          }}
        />
        <input
          type="text"
          placeholder="Search by name, address, or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px 10px 36px",
            borderRadius: 10,
            border: "1px solid rgba(51,65,85,0.5)",
            background: "rgba(15,23,42,0.5)",
            color: "#f1f5f9",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#64748b" }}>
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 16px" }}>
          <BriefcaseIcon
            style={{
              width: 48,
              height: 48,
              color: "#334155",
              margin: "0 auto 16px",
            }}
          />
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#94a3b8",
              marginBottom: 8,
            }}
          >
            {search.trim()
              ? "No matching jobs found"
              : tab === "upcoming"
              ? "No upcoming jobs"
              : tab === "in_progress"
              ? "No jobs in progress"
              : "No completed jobs yet"}
          </h2>
          <p style={{ fontSize: 13, color: "#475569" }}>
            {search.trim()
              ? "Try a different search term."
              : "Jobs will appear here as they are assigned to you."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Job Row ────────────────────────────────────────────────────────

function JobRow({ job }: { job: PortalScheduleJob }) {
  const isPaidCompleted_ = job.status === "completed" && job.payment_status === "paid";
  const statusColor = isPaidCompleted_ ? STATUS_COLORS.paid : (STATUS_COLORS[job.status] ?? STATUS_COLORS.pending);
  const statusLabel = isPaidCompleted_ ? "PAID" : job.status.replace(/_/g, " ");
  const borderColor = SERVICE_BORDER[job.type] ?? "#10b981";
  const addr = [job.address, job.city, job.state].filter(Boolean).join(", ");
  const serviceLine = [job.service_name, job.tier_name]
    .filter(Boolean)
    .join(" — ");
  const isTestMode = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_");
  const isPaidCompleted = job.status === "completed" && job.payment_status === "paid";
  const receiptUrl = isPaidCompleted
    ? job.receipt_url || (job.payment_id ? `${isTestMode ? "https://dashboard.stripe.com/test/payments" : "https://dashboard.stripe.com/payments"}/${job.payment_id}` : null)
    : null;

  return (
    <Link
      href={`/portal/jobs/${job.id}`}
      style={{
        display: "block",
        textDecoration: "none",
        background: "rgba(30,41,59,0.5)",
        border: "1px solid rgba(51,65,85,0.5)",
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 12,
        padding: 16,
        transition: "background 0.15s",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + status */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#f1f5f9",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {job.customer_name}
            </span>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 9999,
                fontSize: 10,
                fontWeight: 700,
                background: statusColor.bg,
                color: statusColor.text,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {statusLabel}
            </span>
            {receiptUrl && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.open(receiptUrl, "_blank"); }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  padding: "2px 7px",
                  borderRadius: 9999,
                  fontSize: 10,
                  fontWeight: 600,
                  background: "rgba(167,139,250,0.1)",
                  color: "#a78bfa",
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <ReceiptPercentIcon style={{ width: 11, height: 11 }} />
                Receipt
              </button>
            )}
          </div>

          {/* Service */}
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
            {serviceLine ||
              (job.type === "hes" ? "HES Assessment" : "Home Inspection")}
          </div>

          {/* Date/time + address */}
          <div
            style={{
              display: "flex",
              gap: 12,
              fontSize: 12,
              color: "#64748b",
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <ClockIcon style={{ width: 13, height: 13 }} />
              {formatDate(job.scheduled_date)} at {formatTime(job.scheduled_time)}
            </span>
            {addr && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <MapPinIcon style={{ width: 13, height: 13 }} />
                {addr}
              </span>
            )}
          </div>
        </div>

        <ChevronRightIcon
          style={{ width: 18, height: 18, color: "#475569", flexShrink: 0 }}
        />
      </div>
    </Link>
  );
}
