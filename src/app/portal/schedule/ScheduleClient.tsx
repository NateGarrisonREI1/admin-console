"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  PhoneIcon,
  ChevronRightIcon as ArrowIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import {
  fetchTechSchedule,
  fetchTechWeekSchedule,
  type PortalScheduleJob,
} from "../actions";

// ─── Helpers ────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLong(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
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

function fullAddress(job: PortalScheduleJob): string {
  const parts = [job.address, job.city, job.state, job.zip].filter(Boolean);
  return parts.join(", ");
}

function mapsUrl(job: PortalScheduleJob): string {
  return `https://maps.google.com/?q=${encodeURIComponent(fullAddress(job))}`;
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type StatusDot = { bg: string; border: string };
function getStatusDot(job: PortalScheduleJob): StatusDot {
  switch (job.status) {
    case "completed":
      return { bg: "#10b981", border: "#10b981" };
    case "in_progress":
    case "confirmed":
      return { bg: "#f59e0b", border: "#f59e0b" };
    default: {
      // Check if overdue (past time, not completed)
      const now = new Date();
      const jobDate = new Date(job.scheduled_date + "T" + (job.scheduled_time || "23:59"));
      if (jobDate < now && job.status !== "completed")
        return { bg: "#ef4444", border: "#ef4444" };
      return { bg: "transparent", border: "#94a3b8" };
    }
  }
}

const SERVICE_BORDER: Record<string, string> = {
  hes: "#10b981",
  inspector: "#f59e0b",
};

// ─── Component ──────────────────────────────────────────────────────

export default function ScheduleClient() {
  const [view, setView] = useState<"day" | "week">("day");
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [jobs, setJobs] = useState<PortalScheduleJob[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDayJobs = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const data = await fetchTechSchedule(date);
      setJobs(data);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWeekJobs = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const monday = getMonday(date);
      const data = await fetchTechWeekSchedule(monday);
      setJobs(data);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "day") loadDayJobs(selectedDate);
    else loadWeekJobs(selectedDate);
  }, [selectedDate, view, loadDayJobs, loadWeekJobs]);

  function navigateDay(delta: number) {
    setSelectedDate((d) => addDays(d, delta));
  }

  function navigateWeek(delta: number) {
    setSelectedDate((d) => addDays(d, delta * 7));
  }

  const isToday = selectedDate === todayStr();

  return (
    <div>
      {/* ── Header: date + nav ── */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#f1f5f9",
              margin: 0,
            }}
          >
            {formatDateLong(selectedDate)}
          </h1>
          <div style={{ display: "flex", gap: 6 }}>
            {/* View toggle */}
            {(["day", "week"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background:
                    view === v ? "rgba(16,185,129,0.15)" : "#1e293b",
                  color: view === v ? "#10b981" : "#94a3b8",
                  transition: "all 0.15s",
                }}
              >
                {v === "day" ? "Day" : "Week"}
              </button>
            ))}
          </div>
        </div>

        {/* Date navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() =>
              view === "day" ? navigateDay(-1) : navigateWeek(-1)
            }
            style={navBtnStyle}
          >
            <ChevronLeftIcon style={{ width: 18, height: 18 }} />
          </button>
          {!isToday && (
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr())}
              style={{
                padding: "6px 14px",
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid rgba(16,185,129,0.3)",
                cursor: "pointer",
                background: "transparent",
                color: "#10b981",
                transition: "all 0.15s",
              }}
            >
              Today
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              view === "day" ? navigateDay(1) : navigateWeek(1)
            }
            style={navBtnStyle}
          >
            <ChevronRightIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#64748b" }}>
          Loading...
        </div>
      ) : view === "day" ? (
        <DayView jobs={jobs} date={selectedDate} />
      ) : (
        <WeekView
          jobs={jobs}
          weekStart={getMonday(selectedDate)}
          today={todayStr()}
        />
      )}
    </div>
  );
}

// ─── Day View ───────────────────────────────────────────────────────

function DayView({
  jobs,
  date,
}: {
  jobs: PortalScheduleJob[];
  date: string;
}) {
  if (jobs.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "64px 16px" }}>
        <CalendarDaysIcon
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
          No jobs scheduled for{" "}
          {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h2>
        <p style={{ fontSize: 13, color: "#475569" }}>
          Check back later or contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}

// ─── Job Card ───────────────────────────────────────────────────────

function JobCard({ job }: { job: PortalScheduleJob }) {
  const dot = getStatusDot(job);
  const borderColor = SERVICE_BORDER[job.type] ?? "#10b981";
  const addr = fullAddress(job);
  const price = job.catalog_total_price ?? job.invoice_amount;
  const serviceLine = [job.service_name, job.tier_name]
    .filter(Boolean)
    .join(" — ");

  return (
    <div
      style={{
        background: "rgba(30,41,59,0.5)",
        border: "1px solid rgba(51,65,85,0.5)",
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 12,
        padding: 16,
      }}
    >
      {/* Top row: status dot + time + service */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: dot.bg,
            border: `2px solid ${dot.border}`,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>
          {formatTime(job.scheduled_time)}
        </span>
        <span style={{ fontSize: 13, color: "#94a3b8" }}>
          {serviceLine || (job.type === "hes" ? "HES Assessment" : "Home Inspection")}
        </span>
      </div>

      {/* Customer + address */}
      <div style={{ marginBottom: 10, paddingLeft: 20 }}>
        <div style={{ fontSize: 14, color: "#e2e8f0", marginBottom: 2 }}>
          {job.customer_name}
          {addr && (
            <span style={{ color: "#64748b" }}>
              {" "}
              &middot; {addr}
            </span>
          )}
        </div>
        {price != null && price > 0 && (
          <div style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa" }}>
            ${price}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          gap: 8,
          paddingLeft: 20,
          flexWrap: "wrap",
        }}
      >
        {addr && (
          <a
            href={mapsUrl(job)}
            target="_blank"
            rel="noopener noreferrer"
            style={actionBtnStyle}
          >
            <MapPinIcon style={{ width: 14, height: 14 }} />
            Navigate
          </a>
        )}
        {job.customer_phone && (
          <a href={`tel:${job.customer_phone}`} style={actionBtnStyle}>
            <PhoneIcon style={{ width: 14, height: 14 }} />
            Call
          </a>
        )}
        <Link href={`/portal/jobs/${job.id}`} style={actionBtnStyle}>
          Details
          <ArrowIcon style={{ width: 14, height: 14 }} />
        </Link>
      </div>
    </div>
  );
}

// ─── Week View ──────────────────────────────────────────────────────

function WeekView({
  jobs,
  weekStart,
  today,
}: {
  jobs: PortalScheduleJob[];
  weekStart: string;
  today: string;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group jobs by date
  const jobsByDate: Record<string, PortalScheduleJob[]> = {};
  for (const day of days) jobsByDate[day] = [];
  for (const job of jobs) {
    if (jobsByDate[job.scheduled_date]) {
      jobsByDate[job.scheduled_date].push(job);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 6,
        overflowX: "auto",
        minWidth: 560,
      }}
    >
      {days.map((day) => {
        const isToday = day === today;
        const dayJobs = jobsByDate[day] || [];
        const d = new Date(day + "T12:00:00");
        const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
        const dayNum = d.getDate();

        return (
          <div
            key={day}
            style={{
              background: isToday
                ? "rgba(16,185,129,0.06)"
                : "rgba(15,23,42,0.5)",
              border: isToday
                ? "1px solid rgba(16,185,129,0.3)"
                : "1px solid rgba(51,65,85,0.3)",
              borderRadius: 10,
              padding: 8,
              minHeight: 120,
            }}
          >
            {/* Day header */}
            <div
              style={{
                textAlign: "center",
                marginBottom: 6,
                paddingBottom: 6,
                borderBottom: "1px solid rgba(51,65,85,0.3)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: isToday ? "#10b981" : "#64748b",
                  textTransform: "uppercase",
                }}
              >
                {dayName}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: isToday ? "#10b981" : "#e2e8f0",
                }}
              >
                {dayNum}
              </div>
              {dayJobs.length > 0 && (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#94a3b8",
                    marginTop: 2,
                  }}
                >
                  {dayJobs.length} job{dayJobs.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>

            {/* Job pills */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {dayJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/portal/jobs/${job.id}`}
                  style={{
                    display: "block",
                    padding: "4px 6px",
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 600,
                    textDecoration: "none",
                    borderLeft: `3px solid ${SERVICE_BORDER[job.type] ?? "#10b981"}`,
                    background: "rgba(30,41,59,0.5)",
                    color: "#cbd5e1",
                    transition: "background 0.15s",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                  }}
                >
                  {formatTime(job.scheduled_time)}{" "}
                  <span style={{ color: "#64748b" }}>
                    {job.type === "hes" ? "HES" : "INSP"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared styles ──────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  border: "1px solid rgba(51,65,85,0.5)",
  background: "transparent",
  color: "#94a3b8",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  transition: "all 0.15s",
};

const actionBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "6px 12px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
  textDecoration: "none",
  background: "#1e293b",
  border: "1px solid rgba(51,65,85,0.5)",
  color: "#94a3b8",
  cursor: "pointer",
  transition: "all 0.15s",
  minHeight: 36,
};
