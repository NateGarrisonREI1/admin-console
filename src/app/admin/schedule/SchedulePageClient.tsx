// src/app/admin/schedule/SchedulePageClient.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SchedulePageData, ScheduleJob, MemberType } from "./data";
import {
  createScheduleJob,
  cancelScheduleJob,
  updateScheduleJobStatus,
  rescheduleJob,
  archiveScheduleJob,
  deleteScheduleJob,
  getJobActivityLog,
  getTeamMembersByType,
  updateJobCustomerInfo,
  updateJobField,
  confirmPendingJob,
  sendReportDelivery,
  uploadAdminHesReport,
  removeAdminHesReport,
} from "./actions";
import type { ServiceCatalog } from "../_actions/services";
import { fetchServiceCatalog } from "../_actions/services";
import FilterableHeader, { ActiveFilterBar, type ActiveFilter, type SortDir, type OptionColor } from "@/components/ui/FilterableHeader";
import ActivityLog from "@/components/ui/ActivityLog";
import type { ActivityLogEntry } from "@/lib/activityLog";
import { useIsMobile, useIsSmallMobile } from "@/lib/useMediaQuery";
import { PlusIcon, AdjustmentsHorizontalIcon, ChevronDownIcon, PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import StatusProgressBar from "@/components/ui/StatusProgressBar";
import TimePicker from "@/components/ui/TimePicker";
import ReportDeliveryModal from "@/components/ui/ReportDeliveryModal";
import type { SendReportDeliveryParams } from "@/components/ui/ReportDeliveryModal";
const PANEL_WIDTH = 420;

// ─── Design tokens ──────────────────────────────────────────────────
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";
const PURPLE = "#7c3aed";

// ─── Helpers ────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  const d = iso.includes("T") ? new Date(iso) : new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit", timeZone: "America/Los_Angeles" });
}

function formatTime(time: string | null): string {
  if (!time) return "\u2014";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return time;
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function makeMapHref(address: string | null, city: string | null, state: string | null, zip: string | null): string {
  const q = encodeURIComponent([address, city, state, zip].filter(Boolean).join(", "));
  return `https://maps.google.com/?q=${q}`;
}

function makeMapEmbed(address: string | null, city: string | null, state: string | null, zip: string | null): string {
  const q = encodeURIComponent([address, city, state, zip].filter(Boolean).join(", "));
  return `https://maps.google.com/maps?q=${q}&output=embed`;
}

function fullAddress(job: ScheduleJob): string {
  return [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");
}

function getWeekBounds(): { monday: string; sunday: string } {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { monday: mon.toISOString().slice(0, 10), sunday: sun.toISOString().slice(0, 10) };
}

function getMonthBounds(): { monthStart: string; monthEnd: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { monthStart: start.toISOString().slice(0, 10), monthEnd: end.toISOString().slice(0, 10) };
}

function typeLabel(type: string): string {
  if (type === "hes") return "HES Assessment";
  if (type === "inspector") return "Home Inspection";
  if (type === "leaf_followup") return "LEAF Follow-up";
  return type;
}

// ─── Workflow helpers ────────────────────────────────────────────────

/** Normalize legacy statuses to current workflow values */
function normalizeStatus(status: string): string {
  if (status === "in_progress") return "on_site";
  if (status === "completed") return "delivered";
  if (status === "rescheduled") return "scheduled";
  return status;
}


// ─── Calendar Helpers ────────────────────────────────────────────────

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function getMonthGridDays(year: number, month: number): string[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const days: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function getWeekDayDates(anchor: Date): string[] {
  const day = anchor.getDay();
  const mon = new Date(anchor);
  mon.setDate(anchor.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function buildGoogleCalendarUrl(job: ScheduleJob): string {
  const title = `${typeLabel(job.type)} - ${job.customer_name}`;
  const location = fullAddress(job);
  const dateStr = job.scheduled_date.replace(/-/g, "");
  let startDt: string, endDt: string;
  if (job.scheduled_time) {
    const ts = job.scheduled_time.replace(":", "") + "00";
    startDt = `${dateStr}T${ts}`;
    const [h, m] = job.scheduled_time.split(":").map(Number);
    endDt = `${dateStr}T${String(Math.min(h + 1, 23)).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
  } else {
    startDt = dateStr;
    endDt = dateStr;
  }
  const params = new URLSearchParams({
    action: "TEMPLATE", text: title, dates: `${startDt}/${endDt}`,
    location, details: [typeLabel(job.type), `Customer: ${job.customer_name}`,
      job.customer_phone ? `Phone: ${job.customer_phone}` : "",
      job.customer_email ? `Email: ${job.customer_email}` : "",
      job.special_notes ? `Notes: ${job.special_notes}` : "",
    ].filter(Boolean).join("\n"),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function monthYearLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function weekRangeLabel(dates: string[]): string {
  if (dates.length < 7) return "";
  const s = new Date(dates[0] + "T12:00:00");
  const e = new Date(dates[6] + "T12:00:00");
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} \u2013 ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

// ─── Status pill colors ─────────────────────────────────────────────

const PILL_COLORS = {
  schedule:       { bg: "#7c3aed", hover: "#6d28d9", text: "#fff" },
  scheduled:      { bg: "#059669", hover: "#047857", text: "#fff" },
  reschedule:     { bg: "#2563eb", hover: "#1d4ed8", text: "#fff" },
  en_route:       { bg: "#2563eb", hover: "#1d4ed8", text: "#fff" },
  on_site:        { bg: "#059669", hover: "#047857", text: "#fff" },
  field_complete: { bg: "#d97706", hover: "#b45309", text: "#fff" },
  report_ready:   { bg: "#0891b2", hover: "#0e7490", text: "#fff" },
  delivered:      { bg: "#059669", hover: "#047857", text: "#fff" },
  in_progress:    { bg: "#d97706", hover: "#b45309", text: "#fff" },
  completed:      { bg: "#059669", hover: "#047857", text: "#fff" },
  cancelled:      { bg: "#dc2626", hover: "#b91c1c", text: "#fff" },
  archived:       { bg: "#475569", hover: "#374151", text: "#fff" },
} as const;

// ─── Display badge config (table rows — not clickable) ──────────────

const STATUS_DISPLAY: Record<string, { bg: string; color: string; border: string; label: string }> = {
  pending:        { bg: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "rgba(245,158,11,0.35)", label: "Pending" },
  scheduled:      { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.35)", label: "Scheduled" },
  rescheduled:    { bg: "rgba(37,99,235,0.15)", color: "#60a5fa", border: "rgba(37,99,235,0.35)", label: "Rescheduled" },
  en_route:       { bg: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "rgba(59,130,246,0.35)", label: "En Route" },
  on_site:        { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.35)", label: "On Site" },
  field_complete: { bg: "rgba(217,119,6,0.15)", color: "#fbbf24", border: "rgba(217,119,6,0.35)", label: "Field Complete" },
  report_ready:   { bg: "rgba(8,145,178,0.15)", color: "#22d3ee", border: "rgba(8,145,178,0.35)", label: "Report Ready" },
  delivered:      { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.35)", label: "Delivered" },
  // Legacy + special
  in_progress:    { bg: "rgba(217,119,6,0.15)", color: "#fbbf24", border: "rgba(217,119,6,0.35)", label: "In Progress" },
  completed:      { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.35)", label: "Completed" },
  paid:           { bg: "rgba(16,185,129,0.20)", color: "#34d399", border: "rgba(16,185,129,0.5)",  label: "Paid" },
  cancelled:      { bg: "rgba(100,116,139,0.12)", color: "#94a3b8", border: "rgba(100,116,139,0.3)", label: "Cancelled" },
  archived:       { bg: "rgba(71,85,105,0.15)", color: "#94a3b8", border: "rgba(71,85,105,0.3)", label: "Archived" },
};

function resolveStatusBadge(job: ScheduleJob) {
  if ((job.status === "completed" || job.status === "delivered") && job.payment_status === "paid") {
    return STATUS_DISPLAY.paid;
  }
  return STATUS_DISPLAY[job.status] ?? STATUS_DISPLAY.pending;
}

// ─── Status transition map ──────────────────────────────────────────

type TransitionDef = { status: string; label: string; colorKey: keyof typeof PILL_COLORS; action?: "cancel" | "reschedule" | "archive" };

const STATUS_TRANSITIONS: Record<string, TransitionDef[]> = {
  pending: [
    { status: "scheduled", label: "Schedule", colorKey: "schedule" },
    { status: "cancelled", label: "Cancel", colorKey: "cancelled", action: "cancel" },
  ],
  scheduled: [
    { status: "rescheduled", label: "Re-Schedule", colorKey: "reschedule", action: "reschedule" },
    { status: "en_route", label: "En Route", colorKey: "en_route" },
    { status: "cancelled", label: "Cancel", colorKey: "cancelled", action: "cancel" },
  ],
  rescheduled: [
    { status: "rescheduled", label: "Re-Schedule", colorKey: "reschedule", action: "reschedule" },
    { status: "en_route", label: "En Route", colorKey: "en_route" },
    { status: "cancelled", label: "Cancel", colorKey: "cancelled", action: "cancel" },
  ],
  en_route: [
    { status: "on_site", label: "On Site", colorKey: "on_site" },
    { status: "cancelled", label: "Cancel", colorKey: "cancelled", action: "cancel" },
  ],
  on_site: [
    { status: "field_complete", label: "Field Complete", colorKey: "field_complete" },
    { status: "cancelled", label: "Cancel", colorKey: "cancelled", action: "cancel" },
  ],
  field_complete: [
    { status: "report_ready", label: "Report Ready", colorKey: "report_ready" },
    { status: "cancelled", label: "Cancel", colorKey: "cancelled", action: "cancel" },
  ],
  report_ready: [
    { status: "delivered", label: "Delivered", colorKey: "delivered" },
    { status: "cancelled", label: "Cancel", colorKey: "cancelled", action: "cancel" },
  ],
  delivered: [
    { status: "rescheduled", label: "Re-Schedule", colorKey: "reschedule", action: "reschedule" },
    { status: "archived", label: "Archive", colorKey: "archived", action: "archive" },
  ],
  // Legacy statuses
  in_progress: [
    { status: "field_complete", label: "Field Complete", colorKey: "field_complete" },
    { status: "cancelled", label: "Cancel", colorKey: "cancelled", action: "cancel" },
  ],
  completed: [
    { status: "rescheduled", label: "Re-Schedule", colorKey: "reschedule", action: "reschedule" },
    { status: "archived", label: "Archive", colorKey: "archived", action: "archive" },
  ],
  cancelled: [
    { status: "rescheduled", label: "Re-Schedule", colorKey: "reschedule", action: "reschedule" },
    { status: "archived", label: "Archive", colorKey: "archived", action: "archive" },
  ],
  archived: [],
};

const JOB_TYPE_BADGE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  hes:           { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.3)", label: "HES" },
  inspector:     { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "rgba(245,158,11,0.3)", label: "Inspection" },
  leaf_followup: { bg: "rgba(99,102,241,0.12)", color: "#818cf8", border: "rgba(99,102,241,0.3)", label: "LEAF" },
};

const BROKER_BADGE = { bg: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "rgba(139,92,246,0.3)", label: "Broker" };

// Filter option lists (for column headers)
const TYPE_OPTIONS = [
  { value: "hes", label: "HES Assessment" },
  { value: "inspector", label: "Home Inspection" },
  { value: "leaf_followup", label: "LEAF Follow-up" },
  { value: "broker", label: "Broker" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "en_route", label: "En Route" },
  { value: "on_site", label: "On Site" },
  { value: "field_complete", label: "Field Complete" },
  { value: "report_ready", label: "Report Ready" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "archived", label: "Archived" },
];

const TIME_SEGMENT_OPTIONS = [
  { value: "morning", label: "Morning (6am – 12pm)" },
  { value: "afternoon", label: "Afternoon (12pm – 6pm)" },
  { value: "evening", label: "Evening (6pm – 12am)" },
];

const TIME_SEGMENT_COLORS: Record<string, OptionColor> = {
  morning:   { bg: "rgba(251,191,36,0.15)", text: "#fbbf24", border: "rgba(251,191,36,0.3)", activeBg: "#f59e0b", activeText: "#fff" },
  afternoon: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", border: "rgba(59,130,246,0.3)", activeBg: "#3b82f6", activeText: "#fff" },
  evening:   { bg: "rgba(139,92,246,0.15)", text: "#a78bfa", border: "rgba(139,92,246,0.3)", activeBg: "#7c3aed", activeText: "#fff" },
};

const TYPE_OPTION_COLORS: Record<string, OptionColor> = {
  hes:           { bg: "rgba(16,185,129,0.2)", text: "#34d399", border: "rgba(16,185,129,0.3)", activeBg: "#10b981", activeText: "#fff" },
  inspector:     { bg: "rgba(249,115,22,0.2)", text: "#fb923c", border: "rgba(249,115,22,0.3)", activeBg: "#f97316", activeText: "#fff" },
  leaf_followup: { bg: "rgba(59,130,246,0.2)", text: "#60a5fa", border: "rgba(59,130,246,0.3)", activeBg: "#3b82f6", activeText: "#fff" },
};

// ─── Column Visibility ──────────────────────────────────────────────

type ColumnKey = "date" | "time" | "customer" | "phone" | "address" | "type" | "assigned" | "status" | "amount";

const ALL_COLUMNS: { key: ColumnKey; label: string; required?: boolean }[] = [
  { key: "date", label: "Date" },
  { key: "time", label: "Time" },
  { key: "customer", label: "Customer", required: true },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "type", label: "Type" },
  { key: "assigned", label: "Assigned To" },
  { key: "status", label: "Status", required: true },
  { key: "amount", label: "Amount" },
];

const ALL_COLUMN_KEYS = ALL_COLUMNS.map((c) => c.key);
const LS_KEY = "schedule_visible_columns";

function loadVisibleColumns(): Set<ColumnKey> {
  if (typeof window === "undefined") return new Set(ALL_COLUMN_KEYS);
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as ColumnKey[];
      // Always include required columns
      const set = new Set(arr.filter((k) => ALL_COLUMN_KEYS.includes(k)));
      for (const c of ALL_COLUMNS) { if (c.required) set.add(c.key); }
      return set;
    }
  } catch {}
  return new Set(ALL_COLUMN_KEYS);
}

function ColumnVisibilityDropdown({
  visible,
  onChange,
}: {
  visible: Set<ColumnKey>;
  onChange: (next: Set<ColumnKey>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggle(key: ColumnKey) {
    const col = ALL_COLUMNS.find((c) => c.key === key);
    if (col?.required) return;
    const next = new Set(visible);
    if (next.has(key)) next.delete(key); else next.add(key);
    onChange(next);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "7px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: "transparent", color: TEXT_MUTED,
          border: `1px solid ${BORDER}`, cursor: "pointer",
          transition: "all 0.12s",
        }}
        title="Toggle column visibility"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
        </svg>
        Columns
        {visible.size < ALL_COLUMN_KEYS.length && (
          <span style={{ fontSize: 10, fontWeight: 700, color: EMERALD }}>
            {visible.size}/{ALL_COLUMN_KEYS.length}
          </span>
        )}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
          width: 200, padding: "8px 0", borderRadius: 10,
          background: "#1e293b", border: `1px solid ${BORDER}`,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}>
          <div style={{ padding: "4px 12px 8px", fontSize: 10, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Visible Columns
          </div>
          {ALL_COLUMNS.map((col) => {
            const checked = visible.has(col.key);
            const isRequired = !!col.required;
            return (
              <label
                key={col.key}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 12px", cursor: isRequired ? "default" : "pointer",
                  opacity: isRequired ? 0.5 : 1,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { if (!isRequired) e.currentTarget.style.background = "rgba(148,163,184,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  border: checked ? "none" : `2px solid ${BORDER}`,
                  background: checked ? EMERALD : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.12s",
                }}>
                  {checked && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5.5L4 7.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isRequired}
                  onChange={() => toggle(col.key)}
                  style={{ display: "none" }}
                />
                <span style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{col.label}</span>
                {isRequired && <span style={{ fontSize: 9, color: TEXT_DIM, marginLeft: "auto" }}>Required</span>}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Clickable Status Pill ──────────────────────────────────────────

function StatusPill({
  label,
  colorKey,
  onClick,
  disabled,
}: {
  label: string;
  colorKey: keyof typeof PILL_COLORS;
  onClick: () => void;
  disabled?: boolean;
}) {
  const c = PILL_COLORS[colorKey];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 16px",
        borderRadius: 9999,
        border: "none",
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        background: c.bg,
        color: c.text,
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.12s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget.style.background = c.hover); }}
      onMouseLeave={(e) => { (e.currentTarget.style.background = c.bg); }}
    >
      {label}
    </button>
  );
}

// ─── Display Badge (non-clickable, table rows) ──────────────────────

function DisplayBadge({ config }: { config: { bg: string; color: string; border: string; label: string } }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 700,
      background: config.bg,
      color: config.color,
      border: `1px solid ${config.border}`,
      whiteSpace: "nowrap",
    }}>
      {config.label}
    </span>
  );
}



// ─── Mobile Card (< 640px) ──────────────────────────────────────────

function ScheduleMobileCard({
  job, isSelected, overdue, onClick,
}: {
  job: ScheduleJob; isSelected: boolean; overdue: boolean; onClick: () => void;
}) {
  const isMuted = job.status === "completed" || job.status === "cancelled" || job.status === "archived";
  const todayRow = job.scheduled_date === todayStr();
  const typeBadge = JOB_TYPE_BADGE[job.type] ?? JOB_TYPE_BADGE.hes;
  const statusBadge = resolveStatusBadge(job);
  const addr = [job.address, job.city].filter(Boolean).join(", ");

  return (
    <div
      onClick={onClick}
      style={{
        background: "rgba(30,41,59,0.5)",
        borderRadius: 12,
        padding: 16,
        borderTop: isSelected ? "1px solid rgba(16,185,129,0.5)" : "1px solid rgba(51,65,85,0.5)",
        borderRight: isSelected ? "1px solid rgba(16,185,129,0.5)" : "1px solid rgba(51,65,85,0.5)",
        borderBottom: isSelected ? "1px solid rgba(16,185,129,0.5)" : "1px solid rgba(51,65,85,0.5)",
        borderLeft: job.status === "pending" && !isSelected ? "4px solid rgba(245,158,11,0.6)" : isSelected ? "1px solid rgba(16,185,129,0.5)" : "1px solid rgba(51,65,85,0.5)",
        marginBottom: 12,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: overdue ? "#f87171" : isMuted ? TEXT_DIM : TEXT }}>
            {formatDate(job.scheduled_date)}
          </span>
          <span style={{ fontSize: 12, color: isMuted ? TEXT_DIM : TEXT_SEC }}>{formatTime(job.scheduled_time)}</span>
          {todayRow && !isMuted && (
            <span style={{ display: "inline-flex", alignItems: "center", fontSize: 9, fontWeight: 800, color: "#fff", background: EMERALD, padding: "2px 6px", borderRadius: 4, lineHeight: 1, flexShrink: 0 }}>TODAY</span>
          )}
          {overdue && (
            <span style={{ display: "inline-flex", alignItems: "center", fontSize: 9, fontWeight: 800, color: "#fff", background: "#ef4444", padding: "2px 6px", borderRadius: 4, lineHeight: 1, flexShrink: 0 }}>OVERDUE</span>
          )}
        </div>
        <DisplayBadge config={statusBadge} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: isMuted ? TEXT_DIM : TEXT, marginBottom: 4 }}>
        {job.customer_name}
      </div>
      {addr && <div style={{ fontSize: 12, color: TEXT_SEC, marginBottom: 6 }}>{addr}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <DisplayBadge config={typeBadge} />
          {job.requested_by === "broker" && <DisplayBadge config={BROKER_BADGE} />}
        </div>
        <span style={{ fontSize: 12, color: job.team_member_name ? TEXT_SEC : TEXT_DIM }}>
          {job.team_member_name || "Unassigned"}
        </span>
      </div>
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────

function KpiCard({
  label, value, color, onClick, isActive, showPulse,
}: {
  label: string; value: string | number; color: string;
  onClick?: () => void; isActive?: boolean; showPulse?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: CARD,
        border: `1px solid ${isActive ? color : BORDER}`,
        borderRadius: 10,
        padding: "10px 14px",
        cursor: onClick ? "pointer" : undefined,
        transition: "border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
        {showPulse && (
          <span className="kpi-pulse-dot" style={{
            display: "inline-block", width: 6, height: 6, borderRadius: "50%",
            background: color, flexShrink: 0,
          }} />
        )}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: (typeof value === "number" && value > 0) ? color : TEXT_DIM, marginTop: 2 }}>{value}</div>
    </div>
  );
}

// ─── Toast ──────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 100,
      padding: "12px 20px", borderRadius: 10, background: EMERALD,
      color: "#fff", fontWeight: 700, fontSize: 13,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    }}>
      {message}
    </div>
  );
}

// ─── Modal Components ───────────────────────────────────────────────

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.60)",
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 50, padding: 20,
      }}
    >
      <div className="admin-modal-content" style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16,
        padding: 28, maxHeight: "85vh", overflowY: "auto",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
      }}>
        {children}
      </div>
    </div>
  );
}

function ModalField({ label, value, onChange, type = "text", placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}{required ? " *" : ""}
      </label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} className="admin-input"
        style={{ fontSize: 13, padding: "9px 12px" }}
      />
    </div>
  );
}

function ModalTextarea({ label, value, onChange, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      <textarea
        value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className="admin-input" style={{ fontSize: 13, padding: "9px 12px", resize: "vertical" }}
      />
    </div>
  );
}

const modalBtnCancel: React.CSSProperties = {
  padding: "9px 20px", borderRadius: 8, border: "none",
  background: "#334155", color: TEXT_SEC, fontSize: 13, fontWeight: 600, cursor: "pointer",
};

const modalBtnPrimary: React.CSSProperties = {
  padding: "9px 20px", borderRadius: 8, border: "none",
  background: PURPLE, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
};

// ─── Reschedule Modal ───────────────────────────────────────────────

function RescheduleModal({
  job,
  onClose,
  onDone,
}: {
  job: ScheduleJob;
  onClose: () => void;
  onDone: () => void;
}) {
  const [date, setDate] = useState(job.scheduled_date);
  const [time, setTime] = useState(job.scheduled_time ?? "");
  const [memberId, setMemberId] = useState(job.team_member_id ?? "");
  const [saving, setSaving] = useState(false);
  const [typeMembers, setTypeMembers] = useState<{ id: string; name: string }[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  useEffect(() => {
    setMembersLoading(true);
    getTeamMembersByType(job.type)
      .then(setTypeMembers)
      .catch(() => setTypeMembers([]))
      .finally(() => setMembersLoading(false));
  }, [job.type]);

  async function handleConfirm() {
    if (!date) return;
    setSaving(true);
    try {
      const newMemberName = typeMembers.find((m) => m.id === memberId)?.name;
      await rescheduleJob(job.id, job.type, {
        scheduled_date: date,
        scheduled_time: time || undefined,
        team_member_id: memberId || undefined,
        previous_member_id: job.team_member_id ?? undefined,
        previous_member_name: job.team_member_name ?? undefined,
        new_member_name: newMemberName,
      });
      onDone();
    } catch (err: any) {
      alert(err?.message ?? "Failed to reschedule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ width: 400 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: TEXT, margin: "0 0 6px" }}>Re-Schedule Job</h3>
        <p style={{ fontSize: 13, color: TEXT_MUTED, margin: "0 0 18px" }}>
          {job.customer_name} &mdash; {typeLabel(job.type)}
        </p>

        <ModalField label="New Date" value={date} onChange={setDate} type="date" required />
        <ModalField label="New Time" value={time} onChange={setTime} type="time" />

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Assign To
          </label>
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="admin-input" style={{ fontSize: 13, padding: "9px 12px" }} disabled={membersLoading}>
            <option value="">Unassigned</option>
            {typeMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {membersLoading && <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>Loading team members...</div>}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onClose} style={modalBtnCancel}>Cancel</button>
          <button
            type="button" onClick={handleConfirm} disabled={saving || !date}
            style={{ ...modalBtnPrimary, background: "#2563eb", opacity: saving || !date ? 0.5 : 1, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Saving..." : "Confirm Re-Schedule"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Schedule Service Modal ─────────────────────────────────────────

function ScheduleServiceModal({
  members, catalog, onClose, onScheduled,
}: {
  members: { id: string; name: string; type: MemberType }[];
  catalog: ServiceCatalog; onClose: () => void; onScheduled: () => void;
}) {
  const [serviceType, setServiceType] = useState<MemberType>("hes");
  const [memberId, setMemberId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("OR");
  const [zip, setZip] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState("");
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());
  const [manualPrice, setManualPrice] = useState("");

  const hesCat = catalog.find((c) => c.slug === "hes");
  const inspCat = catalog.find((c) => c.slug === "inspection");
  const activeCat = serviceType === "hes" ? hesCat : inspCat;
  const activeTiers = (activeCat?.tiers ?? []).filter((t) => t.is_active);
  const activeAddons = (activeCat?.addons ?? []).filter((a) => a.is_active);
  const catalogEmpty = activeTiers.length === 0;

  function toggleAddon(addonId: string) {
    setSelectedAddonIds((prev) => {
      const next = new Set(prev);
      if (next.has(addonId)) next.delete(addonId); else next.add(addonId);
      return next;
    });
  }

  const selectedTier = activeTiers.find((t) => t.id === selectedTierId);
  const basePrice = selectedTier?.price ?? 0;
  const addonsTotal = activeAddons.filter((a) => selectedAddonIds.has(a.id)).reduce((sum, a) => sum + a.price, 0);
  const totalPrice = catalogEmpty ? (parseFloat(manualPrice) || 0) : basePrice + addonsTotal;
  const typeMembers = members.filter((m) => m.type === serviceType);

  function handleTypeSwitch(newType: MemberType) {
    setServiceType(newType); setMemberId(""); setSelectedTierId(""); setSelectedAddonIds(new Set()); setManualPrice("");
  }

  async function handleSubmit() {
    if (!customerName.trim() || !date) return;
    setSaving(true);
    try {
      const catLabel = serviceType === "hes" ? "HES Assessment" : "Home Inspection";
      const payload = {
        type: serviceType, team_member_id: memberId || undefined,
        customer_name: customerName.trim(), customer_email: customerEmail.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined, address: address.trim() || undefined,
        city: city.trim() || undefined, state: state.trim() || undefined, zip: zip.trim() || undefined,
        scheduled_date: date, scheduled_time: time || undefined,
        special_notes: notes.trim() || undefined, invoice_amount: totalPrice > 0 ? totalPrice : undefined,
        service_category_id: activeCat?.id,
        service_tier_id: selectedTierId || undefined,
        addon_ids: selectedAddonIds.size > 0 ? Array.from(selectedAddonIds) : undefined,
        catalog_base_price: basePrice > 0 ? basePrice : undefined,
        catalog_addon_total: addonsTotal > 0 ? addonsTotal : undefined,
        catalog_total_price: totalPrice > 0 ? totalPrice : undefined,
        service_name: catLabel,
        tier_name: selectedTier?.name || selectedTier?.size_label || undefined,
      };
      console.log("[ScheduleServiceModal] submitting payload:", JSON.stringify(payload, null, 2));
      const result = await createScheduleJob(payload);
      if (result?.error) {
        console.error("[ScheduleServiceModal] server returned error:", result.error);
        alert(`Failed to schedule: ${result.error}`);
      } else {
        console.log("[ScheduleServiceModal] success");
        onScheduled();
      }
    } catch (err: any) {
      console.error("[ScheduleServiceModal] caught error:", err);
      alert(err?.message ?? "Failed to schedule service.");
    } finally { setSaving(false); }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ width: 520 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: TEXT, margin: "0 0 18px" }}>Schedule Service</h3>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {([
            { type: "hes" as MemberType, label: "HES Assessment", desc: "Home energy score evaluation" },
            { type: "inspector" as MemberType, label: "Home Inspection", desc: "Property condition inspection" },
          ]).map((opt) => (
            <button key={opt.type} type="button" onClick={() => handleTypeSwitch(opt.type)} style={{
              flex: 1, padding: "12px 14px", borderRadius: 10,
              border: `1px solid ${serviceType === opt.type ? (opt.type === "hes" ? "rgba(16,185,129,0.5)" : "rgba(245,158,11,0.5)") : BORDER}`,
              background: serviceType === opt.type ? (opt.type === "hes" ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)") : "transparent",
              color: serviceType === opt.type ? (opt.type === "hes" ? "#10b981" : "#f59e0b") : TEXT_MUTED,
              textAlign: "left", cursor: "pointer", transition: "all 0.12s",
            }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{opt.label}</div>
              <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
        <div style={{ height: 1, background: BORDER, margin: "0 0 18px" }} />
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Assign To</label>
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="admin-input" style={{ fontSize: 13, padding: "9px 12px" }}>
            <option value="">Unassigned</option>
            {typeMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Customer</div>
        <ModalField label="Name" value={customerName} onChange={setCustomerName} placeholder="Customer name" required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <ModalField label="Email" value={customerEmail} onChange={setCustomerEmail} />
          <ModalField label="Phone" value={customerPhone} onChange={setCustomerPhone} />
        </div>
        <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Address</div>
        <ModalField label="Street" value={address} onChange={setAddress} placeholder="123 Main St" />
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
          <ModalField label="City" value={city} onChange={setCity} />
          <ModalField label="State" value={state} onChange={setState} />
          <ModalField label="ZIP" value={zip} onChange={setZip} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <ModalField label="Date" value={date} onChange={setDate} type="date" required />
          <ModalField label="Time" value={time} onChange={setTime} type="time" />
        </div>
        <div style={{ height: 1, background: BORDER, margin: "4px 0 16px" }} />
        <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Pricing</div>
        {catalogEmpty ? (
          <div style={{ marginBottom: 14 }}>
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", marginBottom: 12, fontSize: 12, color: "#f59e0b" }}>
              Service catalog is empty — using manual entry
            </div>
            <ModalField label="Invoice Amount ($)" value={manualPrice} onChange={setManualPrice} placeholder="0.00" />
          </div>
        ) : (
          <>
            {activeTiers.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Home Size</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {activeTiers.map((tier) => (
                    <button key={tier.id} type="button" onClick={() => setSelectedTierId(tier.id)} style={{
                      padding: "8px 14px", borderRadius: 10,
                      border: `1px solid ${selectedTierId === tier.id ? "rgba(124,58,237,0.5)" : BORDER}`,
                      background: selectedTierId === tier.id ? "rgba(124,58,237,0.08)" : "transparent",
                      color: selectedTierId === tier.id ? "#a78bfa" : TEXT_MUTED,
                      cursor: "pointer", transition: "all 0.12s", textAlign: "center",
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>{tier.size_label || tier.name}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>${tier.price}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {activeAddons.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Add-On Services</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {activeAddons.map((addon) => {
                    const isSelected = selectedAddonIds.has(addon.id);
                    return (
                      <button key={addon.id} type="button" onClick={() => toggleAddon(addon.id)} style={{
                        padding: "5px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                        transition: "all 0.12s", background: isSelected ? PURPLE : "#334155", color: isSelected ? "#fff" : TEXT_SEC,
                      }}>{addon.name} ${addon.price}</button>
                    );
                  })}
                </div>
              </div>
            )}
            {selectedTierId && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", marginBottom: 14, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: TEXT_MUTED }}>
                  Base: <span style={{ fontWeight: 700, color: TEXT_SEC }}>${basePrice}</span>
                  {addonsTotal > 0 && <>{" + "}Add-Ons: <span style={{ fontWeight: 700, color: TEXT_SEC }}>${addonsTotal}</span></>}
                </span>
                <span style={{ fontWeight: 700, color: "#a78bfa", fontSize: 15 }}>Total: ${totalPrice}</span>
              </div>
            )}
          </>
        )}
        <ModalTextarea label="Notes" value={notes} onChange={setNotes} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onClose} style={modalBtnCancel}>Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={saving || !customerName.trim() || !date}
            style={{ ...modalBtnPrimary, opacity: saving || !customerName.trim() || !date ? 0.5 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Scheduling..." : "Schedule"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Job Detail Panel Content ────────────────────────────────────────

// ─── Inline Editable Field ──────────────────────────────────────────

function EditableField({
  label,
  value,
  jobId,
  jobType,
  field,
  onSaved,
  isLink,
  linkPrefix,
}: {
  label: string;
  value: string | null;
  jobId: string;
  jobType: MemberType;
  field: "customer_name" | "customer_email" | "customer_phone";
  onSaved: (msg: string) => void;
  isLink?: boolean;
  linkPrefix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(value ?? ""); setEditing(false); }, [value]);

  function validate(v: string): string | null {
    const trimmed = v.trim();
    if (field === "customer_name") {
      if (!trimmed) return "Name is required";
    } else if (field === "customer_email") {
      if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Invalid email address";
    } else if (field === "customer_phone") {
      if (trimmed && trimmed.replace(/\D/g, "").length < 10) return "Invalid phone number";
    }
    return null;
  }

  const validationError = editing ? validate(draft) : null;
  const canSave = !saving && !validationError;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await updateJobCustomerInfo(jobId, jobType, field, draft.trim());
      onSaved(`${label} updated.`);
      setEditing(false);
    } catch (err: any) {
      alert(err?.message ?? "Failed to update.");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div>
        <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            className="admin-input"
            style={{ fontSize: 13, padding: "5px 8px", flex: 1, minWidth: 0, borderColor: validationError ? "#ef4444" : undefined }}
            onKeyDown={(e) => { if (e.key === "Enter" && canSave) handleSave(); if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); } }}
          />
          <button type="button" onClick={handleSave} disabled={!canSave}
            style={{ background: canSave ? "rgba(16,185,129,0.15)" : "rgba(51,65,85,0.2)", border: `1px solid ${canSave ? "rgba(16,185,129,0.3)" : "rgba(51,65,85,0.3)"}`, borderRadius: 6, padding: "4px 6px", cursor: canSave ? "pointer" : "not-allowed", display: "flex", opacity: canSave ? 1 : 0.4 }}>
            <CheckIcon style={{ width: 14, height: 14, color: canSave ? "#10b981" : "#475569" }} />
          </button>
          <button type="button" onClick={() => { setDraft(value ?? ""); setEditing(false); }}
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "4px 6px", cursor: "pointer", display: "flex" }}>
            <XMarkIcon style={{ width: 14, height: 14, color: "#f87171" }} />
          </button>
        </div>
        {validationError && (
          <div style={{ fontSize: 11, color: "#ef4444", marginTop: 3 }}>{validationError}</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
        {value ? (
          isLink && linkPrefix ? (
            <a href={`${linkPrefix}${value}`} style={{ fontSize: 13, color: "#60a5fa", textDecoration: "none", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{value}</a>
          ) : (
            <span style={{ fontSize: 13, color: TEXT_SEC, fontWeight: field === "customer_name" ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{value}</span>
          )
        ) : (
          <span style={{ fontSize: 13, color: TEXT_DIM }}>{"\u2014"}</span>
        )}
        <button type="button" onClick={() => setEditing(true)}
          style={{ background: "none", border: "none", padding: 2, cursor: "pointer", display: "flex", opacity: 0.5, transition: "opacity 0.15s", flexShrink: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.5"; }}
        >
          <PencilIcon style={{ width: 12, height: 12, color: "#64748b" }} />
        </button>
      </div>
    </div>
  );
}

// ─── Payer / Generic Editable Field ──────────────────────────────────

function PayerField({
  label,
  value,
  jobId,
  jobType,
  field,
  onSaved,
  isLink,
  linkPrefix,
  compact,
}: {
  label: string;
  value: string | null;
  jobId: string;
  jobType: MemberType;
  field: string;
  onSaved: (msg: string) => void;
  isLink?: boolean;
  linkPrefix?: string;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(value ?? ""); setEditing(false); }, [value]);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await updateJobField(jobId, jobType, field, draft.trim() || null);
      const fieldLabel = label || field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      onSaved(`${fieldLabel} updated.`);
      setEditing(false);
    } catch (err: any) {
      alert(err?.message ?? "Failed to update.");
    } finally {
      setSaving(false);
    }
  }

  if (compact) {
    // Compact mode: just an edit pencil button
    return (
      <button type="button" onClick={() => setEditing(!editing)}
        style={{ background: "none", border: "none", padding: 2, cursor: "pointer", display: "flex", opacity: 0.5 }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.5"; }}
      >
        <PencilIcon style={{ width: 12, height: 12, color: "#64748b" }} />
      </button>
    );
  }

  if (editing) {
    return (
      <div>
        {label && <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            className="admin-input"
            style={{ fontSize: 13, padding: "5px 8px", flex: 1, minWidth: 0 }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); } }}
          />
          <button type="button" onClick={handleSave} disabled={saving}
            style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 6, padding: "4px 6px", cursor: "pointer", display: "flex" }}>
            <CheckIcon style={{ width: 14, height: 14, color: "#10b981" }} />
          </button>
          <button type="button" onClick={() => { setDraft(value ?? ""); setEditing(false); }}
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "4px 6px", cursor: "pointer", display: "flex" }}>
            <XMarkIcon style={{ width: 14, height: 14, color: "#f87171" }} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minWidth: 0 }}>
      {label && <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
        {value ? (
          isLink && linkPrefix ? (
            <a href={`${linkPrefix}${value}`} style={{ fontSize: 13, color: "#60a5fa", textDecoration: "none", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{value}</a>
          ) : (
            <span style={{ fontSize: 13, color: TEXT_SEC, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{value}</span>
          )
        ) : (
          <span style={{ fontSize: 13, color: TEXT_DIM }}>{"\u2014"}</span>
        )}
        <button type="button" onClick={() => setEditing(true)}
          style={{ background: "none", border: "none", padding: 2, cursor: "pointer", display: "flex", opacity: 0.5, transition: "opacity 0.15s", flexShrink: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.5"; }}
        >
          <PencilIcon style={{ width: 12, height: 12, color: "#64748b" }} />
        </button>
      </div>
    </div>
  );
}

function JobDetailContent({
  job,
  members,
  onStatusUpdated,
  onCancelRequest,
  onRescheduleRequest,
  onArchiveRequest,
  onDeleteRequest,
  onSendReports,
}: {
  job: ScheduleJob;
  members: { id: string; name: string; type: MemberType }[];
  onStatusUpdated: (msg: string) => void;
  onCancelRequest: (job: ScheduleJob) => void;
  onRescheduleRequest: (job: ScheduleJob) => void;
  onArchiveRequest: (job: ScheduleJob) => void;
  onDeleteRequest: (job: ScheduleJob) => void;
  onSendReports: (job: ScheduleJob) => void;
}) {
  const [notes, setNotes] = useState(job.special_notes ?? "");
  const [busy, setBusy] = useState(false);

  // HES report upload state
  const hesFileRef = useRef<HTMLInputElement>(null);
  const [hesUploading, setHesUploading] = useState(false);
  const [hesRemoving, setHesRemoving] = useState(false);
  const [showPasteUrl, setShowPasteUrl] = useState(false);
  const [pasteUrlDraft, setPasteUrlDraft] = useState("");
  const [localHesUrl, setLocalHesUrl] = useState(job.hes_report_url ?? "");

  useEffect(() => { setLocalHesUrl(job.hes_report_url ?? ""); }, [job.hes_report_url]);

  async function handleHesUpload(file: File) {
    setHesUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadAdminHesReport(job.id, job.type, fd);
      if (res.error) { alert(res.error); return; }
      if (res.url) setLocalHesUrl(res.url);
      onStatusUpdated("HES report uploaded.");
    } catch { alert("Upload failed"); } finally { setHesUploading(false); }
  }

  async function handleHesRemove() {
    if (!confirm("Remove the HES report PDF?")) return;
    setHesRemoving(true);
    try {
      const res = await removeAdminHesReport(job.id, job.type);
      if (res.error) { alert(res.error); return; }
      setLocalHesUrl("");
      onStatusUpdated("HES report removed.");
    } catch { alert("Remove failed"); } finally { setHesRemoving(false); }
  }

  async function handlePasteUrlSave() {
    const url = pasteUrlDraft.trim();
    if (!url) return;
    await updateJobField(job.id, job.type, "hes_report_url", url);
    setLocalHesUrl(url);
    setShowPasteUrl(false);
    setPasteUrlDraft("");
    onStatusUpdated("HES report URL saved.");
  }

  // Pending job confirmation state
  const [confirmDate, setConfirmDate] = useState(job.scheduled_date ?? "");
  const [confirmTime, setConfirmTime] = useState("");
  const [confirmTechId, setConfirmTechId] = useState(job.team_member_id ?? "");
  const defaultPrice = job.catalog_total_price ?? job.invoice_amount ?? null;
  const [confirmAmount, setConfirmAmount] = useState(defaultPrice !== null ? String(defaultPrice) : "");
  const canConfirm = confirmDate !== "" && confirmTime !== "" && confirmTechId !== "";

  // Tier selection state for pending jobs
  const [tierDropdownOpen, setTierDropdownOpen] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState(job.service_tier_id ?? "");
  const [selectedTierName, setSelectedTierName] = useState(job.tier_name ?? "");
  const [selectedTierSizeLabel, setSelectedTierSizeLabel] = useState(job.home_sqft_range ?? "");
  const [categoryTiers, setCategoryTiers] = useState<{ id: string; name: string; size_label: string; price: number }[]>([]);
  const [tiersLoading, setTiersLoading] = useState(false);

  // Load tiers for this job's category when component mounts (pending jobs only)
  useEffect(() => {
    if (job.status !== "pending" || !job.service_category_id) return;
    setTiersLoading(true);
    fetchServiceCatalog()
      .then((catalog) => {
        const cat = catalog.find((c) => c.id === job.service_category_id);
        if (cat) {
          setCategoryTiers(cat.tiers.filter((t) => t.is_active).map((t) => ({ id: t.id, name: t.name, size_label: t.size_label, price: t.price })));
        }
      })
      .catch(() => {})
      .finally(() => setTiersLoading(false));
  }, [job.id, job.status, job.service_category_id]);
  const [activityEntries, setActivityEntries] = useState<ActivityLogEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    setActivityLoading(true);
    getJobActivityLog(job.id)
      .then(setActivityEntries)
      .catch(() => setActivityEntries([]))
      .finally(() => setActivityLoading(false));
  }, [job.id]);

  const addr = fullAddress(job);
  const mapUrl = makeMapEmbed(job.address, job.city, job.state, job.zip);
  const directionsUrl = makeMapHref(job.address, job.city, job.state, job.zip);
  const typeBadge = JOB_TYPE_BADGE[job.type] ?? JOB_TYPE_BADGE.hes;
  // Always show real status badge in header (paid badge moved to progress bar)
  const statusBadge = STATUS_DISPLAY[job.status] ?? STATUS_DISPLAY.pending;

  async function handlePillAction(newStatus: string, label: string) {
    if (busy) return;
    setBusy(true);
    try {
      await updateScheduleJobStatus(job.id, job.type, newStatus);
      onStatusUpdated(`Status updated to ${label}.`);
    } catch (err: any) {
      alert(err?.message ?? "Failed to update status.");
    } finally {
      setBusy(false);
    }
  }

  function renderActionPills() {
    const transitions = STATUS_TRANSITIONS[job.status] ?? [];
    const pills: React.ReactNode[] = [];

    for (const t of transitions) {
      if (t.action === "cancel") {
        pills.push(<StatusPill key="cancel" label={t.label} colorKey={t.colorKey} disabled={busy} onClick={() => onCancelRequest(job)} />);
      } else if (t.action === "reschedule") {
        pills.push(<StatusPill key="reschedule" label={t.label} colorKey={t.colorKey} disabled={busy} onClick={() => onRescheduleRequest(job)} />);
      } else if (t.action === "archive") {
        pills.push(<StatusPill key="archive" label={t.label} colorKey={t.colorKey} disabled={busy} onClick={() => onArchiveRequest(job)} />);
      } else {
        pills.push(<StatusPill key={t.status} label={t.label} colorKey={t.colorKey} disabled={busy} onClick={() => handlePillAction(t.status, t.label)} />);
      }
    }

    if (job.status === "archived") {
      pills.push(
        <button key="delete" type="button" onClick={() => onDeleteRequest(job)} disabled={busy}
          style={{
            padding: "6px 16px", borderRadius: 9999, fontSize: 13, fontWeight: 600,
            cursor: busy ? "not-allowed" : "pointer", border: "1px solid rgba(239,68,68,0.4)",
            background: "transparent", color: "#f87171", opacity: busy ? 0.5 : 1,
            transition: "all 0.12s", whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => { if (!busy) e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >Delete Permanently</button>,
      );
    }

    return pills;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header badges + customer name */}
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <DisplayBadge config={typeBadge} />
          {job.requested_by === "broker" && (
            <span title={job.payer_name ? `Broker: ${job.payer_name}` : "Broker referral"}>
              <DisplayBadge config={BROKER_BADGE} />
            </span>
          )}
          <DisplayBadge config={statusBadge} />
        </div>
        <EditableField label="Customer" value={job.customer_name} jobId={job.id} jobType={job.type} field="customer_name" onSaved={onStatusUpdated} />
        <p style={{ fontSize: 13, color: TEXT_SEC, margin: "4px 0 0" }}>{typeLabel(job.type)}</p>
      </div>

      {/* Status Progress Bar */}
      <StatusProgressBar status={job.status} paymentStatus={job.payment_status ?? "unpaid"} />

      {/* Pending actions — inline confirm fields + buttons */}
      {job.status === "pending" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Scheduled Date */}
          <div>
            <label style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
              Scheduled Date
            </label>
            <input
              type="date"
              value={confirmDate}
              onChange={(e) => setConfirmDate(e.target.value)}
              className="admin-input"
              style={{ fontSize: 13, padding: "8px 12px", width: "100%" }}
            />
          </div>

          {/* Scheduled Time */}
          <div>
            <label style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
              Scheduled Time
            </label>
            <TimePicker value={confirmTime} onChange={setConfirmTime} />
          </div>

          {/* Assign To */}
          <div>
            <label style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
              Assign To
            </label>
            <select
              value={confirmTechId}
              onChange={(e) => setConfirmTechId(e.target.value)}
              className="admin-input"
              style={{ fontSize: 13, padding: "8px 12px", width: "100%" }}
            >
              <option value="">Select team member...</option>
              {members
                .filter((m) => m.type === job.type)
                .map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
            </select>
          </div>

          {/* Amount — tier-driven */}
          <div>
            <label style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
              Amount
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>
                {confirmAmount ? `$${parseFloat(confirmAmount).toLocaleString()}` : "\u2014"}
              </span>
              {categoryTiers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTierDropdownOpen(!tierDropdownOpen)}
                  style={{ background: "none", border: "none", padding: 2, cursor: "pointer", display: "flex", opacity: 0.5, transition: "opacity 0.15s", flexShrink: 0 }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.5"; }}
                  title="Change tier"
                >
                  <PencilIcon style={{ width: 13, height: 13, color: "#64748b" }} />
                </button>
              )}
            </div>
            {selectedTierSizeLabel && (
              <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>
                {selectedTierName ? `${selectedTierName} (${selectedTierSizeLabel})` : selectedTierSizeLabel}
              </div>
            )}
            {tierDropdownOpen && categoryTiers.length > 0 && (
              <div style={{
                marginTop: 6, border: `1px solid ${BORDER}`, borderRadius: 8,
                background: "rgba(15,23,42,0.95)", overflow: "hidden",
              }}>
                {categoryTiers.map((t) => {
                  const isSelected = t.id === selectedTierId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTierId(t.id);
                        setSelectedTierName(t.name);
                        setSelectedTierSizeLabel(t.size_label);
                        setConfirmAmount(String(t.price));
                        setTierDropdownOpen(false);
                      }}
                      style={{
                        display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
                        background: isSelected ? "rgba(16,185,129,0.1)" : "transparent",
                        border: "none", borderBottom: `1px solid ${BORDER}`,
                        color: isSelected ? EMERALD : TEXT, fontSize: 12, cursor: "pointer",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ fontWeight: 600 }}>{t.size_label}</span>
                      <span style={{ color: TEXT_DIM }}> — ${t.price.toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {tiersLoading && (
              <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>Loading tiers…</div>
            )}
          </div>

          {/* Hint when disabled */}
          {!canConfirm && (
            <div style={{ fontSize: 11, color: TEXT_DIM, fontStyle: "italic" }}>
              Set date, time, and assign tech to confirm
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              disabled={busy || !canConfirm}
              onClick={async () => {
                if (busy || !canConfirm) return;
                setBusy(true);
                try {
                  const amt = confirmAmount ? parseFloat(confirmAmount) : null;
                  const tierOverride = selectedTierId && selectedTierName && selectedTierSizeLabel
                    ? { service_tier_id: selectedTierId, tier_name: selectedTierName, home_sqft_range: selectedTierSizeLabel, catalog_base_price: amt ?? 0 }
                    : undefined;
                  await confirmPendingJob(job.id, job.type, confirmDate, confirmTime, confirmTechId, amt, tierOverride);
                  onStatusUpdated("Job confirmed and scheduled.");
                } catch (err: any) {
                  alert(err?.message ?? "Failed to schedule job.");
                } finally {
                  setBusy(false);
                }
              }}
              style={{
                flex: 1, padding: "10px 16px", borderRadius: 8, border: "none",
                background: canConfirm ? EMERALD : "#334155", color: canConfirm ? "#fff" : TEXT_DIM,
                fontSize: 14, fontWeight: 700,
                cursor: busy || !canConfirm ? "not-allowed" : "pointer",
                opacity: busy ? 0.6 : 1,
                transition: "all 0.15s",
              }}
            >
              Confirm &amp; Schedule
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onCancelRequest(job)}
              style={{
                padding: "10px 16px", borderRadius: 8,
                border: "1px solid rgba(239,68,68,0.4)", background: "transparent",
                color: "#f87171", fontSize: 14, fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
                transition: "all 0.12s",
              }}
            >
              Cancel Request
            </button>
          </div>
        </div>
      )}

      <div style={{ height: 1, background: BORDER }} />

      {/* Job Details */}
      <div>
        <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
          Job Details
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
          <EditableField label="Phone" value={job.customer_phone} jobId={job.id} jobType={job.type} field="customer_phone" onSaved={onStatusUpdated} isLink linkPrefix="tel:" />
          <EditableField label="Email" value={job.customer_email} jobId={job.id} jobType={job.type} field="customer_email" onSaved={onStatusUpdated} isLink linkPrefix="mailto:" />
          <div>
            <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Address</div>
            <div style={{ fontSize: 13, color: TEXT_SEC }}>{addr || "\u2014"}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Assigned To</div>
            <div style={{ fontSize: 13, color: job.team_member_name ? TEXT_SEC : TEXT_DIM }}>{job.team_member_name || "Unassigned"}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>
              {job.status === "pending" ? "Requested Date" : "Scheduled"}
            </div>
            {job.scheduled_time ? (
              <div style={{ fontSize: 13, color: TEXT_SEC }}>{formatDate(job.scheduled_date)} at {formatTime(job.scheduled_time)}</div>
            ) : (
              <div style={{ fontSize: 13, color: TEXT_SEC }}>{formatDate(job.scheduled_date)}</div>
            )}
          </div>
          {(() => {
            const prefMatch = job.special_notes?.match(/^Preferred time: (.+)/m);
            return prefMatch ? (
              <div>
                <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Requested Time</div>
                <div style={{ fontSize: 13, color: job.status === "pending" ? "#fbbf24" : TEXT_DIM, fontWeight: job.status === "pending" ? 600 : 400 }}>
                  {prefMatch[1]}
                </div>
              </div>
            ) : null;
          })()}
          <div>
            <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Amount</div>
            <div style={{ fontSize: 13, color: job.invoice_amount ? TEXT : TEXT_DIM, fontWeight: 600 }}>
              {job.invoice_amount ? `$${job.invoice_amount}` : "\u2014"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Requested By</div>
            <div style={{ fontSize: 13, color: TEXT_SEC }}>
              {job.requested_by === "broker"
                ? (job.payer_name ? `${job.payer_name} (Broker)` : "Broker")
                : "Homeowner (direct)"}
            </div>
          </div>
          {(() => {
            const payerDiffers = job.payer_type === "broker" || (job.payer_name && job.payer_name !== job.customer_name);
            return payerDiffers ? (
              <div>
                <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Payer</div>
                <div style={{ fontSize: 13, color: TEXT_SEC }}>
                  {job.payer_name || "\u2014"}
                  {job.payer_type ? ` (${job.payer_type.charAt(0).toUpperCase() + job.payer_type.slice(1)})` : ""}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Payer</div>
                <div style={{ fontSize: 13, color: TEXT_DIM }}>Homeowner</div>
              </div>
            );
          })()}
        </div>
      </div>

      <div style={{ height: 1, background: BORDER }} />

      {/* Location / Map */}
      <div>
        <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
          Location
        </div>
        {addr ? (
          <>
            <div style={{ borderRadius: 10, border: `1px solid ${BORDER}`, overflow: "hidden", height: 220, background: "#0f172a" }}>
              <iframe src={mapUrl} width="100%" height="100%" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Job location" />
            </div>
            <a href={directionsUrl} target="_blank" rel="noreferrer" style={{
              display: "block", marginTop: 10, padding: "8px 14px", borderRadius: 8,
              background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)",
              color: "#60a5fa", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center",
            }}>Get Directions</a>
          </>
        ) : (
          <div style={{
            borderRadius: 10, border: `1px solid ${BORDER}`, height: 120, background: "#0f172a",
            display: "flex", alignItems: "center", justifyContent: "center", color: TEXT_DIM, fontSize: 13,
          }}>No address provided</div>
        )}
      </div>

      <div style={{ height: 1, background: BORDER }} />

      {/* Google Calendar */}
      <div>
        <a href={buildGoogleCalendarUrl(job)} target="_blank" rel="noreferrer" style={{
          display: "block", padding: "9px 14px", borderRadius: 8,
          background: "rgba(66,133,244,0.1)", border: "1px solid rgba(66,133,244,0.25)",
          color: "#60a5fa", fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center",
        }}>
          Add to Google Calendar
        </a>
      </div>

      <div style={{ height: 1, background: BORDER }} />

      {/* Notes */}
      <div>
        <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 5 }}>Notes</div>
        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          className="admin-input" style={{ fontSize: 13, padding: "9px 12px", resize: "vertical", width: "100%" }}
          placeholder="Add notes..."
        />
      </div>

      <div style={{ height: 1, background: BORDER }} />

      {/* Payer Info */}
      <div>
        <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
          Payer Info
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
          <PayerField label="Requested By" value={job.requested_by} jobId={job.id} jobType={job.type} field="requested_by" onSaved={onStatusUpdated} />
          <PayerField label="Payer Name" value={job.payer_name} jobId={job.id} jobType={job.type} field="payer_name" onSaved={onStatusUpdated} />
          <PayerField label="Payer Email" value={job.payer_email} jobId={job.id} jobType={job.type} field="payer_email" onSaved={onStatusUpdated} isLink linkPrefix="mailto:" />
          <div>
            <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Payer Type</div>
            <div style={{ fontSize: 13, color: job.payer_type ? TEXT_SEC : TEXT_DIM }}>{job.payer_type ?? "\u2014"}</div>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: BORDER }} />

      {/* Reports & Delivery */}
      <div>
        <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
          Reports & Delivery
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {/* Payment Status */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 12px", borderRadius: 8,
            background: job.payment_status === "paid" ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
            border: job.payment_status === "paid" ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(245,158,11,0.2)",
          }}>
            <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase" }}>Payment</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: job.payment_status === "paid" ? EMERALD : "#f59e0b" }}>
              {job.payment_status === "paid" ? "Paid" : job.payment_status === "invoiced" ? "Invoiced" : "Unpaid"}
            </div>
          </div>

          {/* HES Report */}
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(30,41,59,0.5)", border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>HES Report</div>
            <input ref={hesFileRef} type="file" accept=".pdf" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleHesUpload(f); e.target.value = ""; }} />
            {localHesUrl ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: EMERALD, fontSize: 13 }}>&#10003;</span>
                  <span style={{ fontSize: 12, color: TEXT_SEC, fontWeight: 600 }}>Uploaded</span>
                  <a href={localHesUrl} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: "#60a5fa", textDecoration: "none", fontWeight: 600, marginLeft: "auto" }}>
                    Preview
                  </a>
                  <button type="button" disabled={hesRemoving}
                    onClick={handleHesRemove}
                    style={{ fontSize: 11, color: "#f87171", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0, opacity: hesRemoving ? 0.5 : 1 }}>
                    {hesRemoving ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button type="button" disabled={hesUploading}
                  onClick={() => hesFileRef.current?.click()}
                  style={{
                    width: "100%", padding: "8px 0", borderRadius: 6,
                    border: "1px dashed rgba(100,116,139,0.5)", background: "rgba(30,41,59,0.3)",
                    color: hesUploading ? TEXT_DIM : "#60a5fa", fontSize: 12, fontWeight: 600,
                    cursor: hesUploading ? "wait" : "pointer",
                  }}>
                  {hesUploading ? "Uploading…" : "Upload PDF"}
                </button>
                {!showPasteUrl ? (
                  <button type="button" onClick={() => setShowPasteUrl(true)}
                    style={{ fontSize: 11, color: TEXT_DIM, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                    or paste URL
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input value={pasteUrlDraft} onChange={(e) => setPasteUrlDraft(e.target.value)}
                      placeholder="https://…" autoFocus className="admin-input"
                      style={{ fontSize: 12, padding: "4px 8px", flex: 1, minWidth: 0 }}
                      onKeyDown={(e) => { if (e.key === "Enter") handlePasteUrlSave(); if (e.key === "Escape") { setShowPasteUrl(false); setPasteUrlDraft(""); } }} />
                    <button type="button" onClick={handlePasteUrlSave}
                      style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 6, padding: "3px 5px", cursor: "pointer", display: "flex" }}>
                      <CheckIcon style={{ width: 14, height: 14, color: "#10b981" }} />
                    </button>
                    <button type="button" onClick={() => { setShowPasteUrl(false); setPasteUrlDraft(""); }}
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "3px 5px", cursor: "pointer", display: "flex" }}>
                      <XMarkIcon style={{ width: 14, height: 14, color: "#f87171" }} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LEAF Report */}
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(30,41,59,0.5)", border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>LEAF Report</div>
            {job.leaf_report_url ? (
              <a href={job.leaf_report_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#60a5fa", textDecoration: "none", fontWeight: 600 }}>
                View Report
              </a>
            ) : (
              <span style={{ fontSize: 12, color: TEXT_DIM }}>Not available</span>
            )}
          </div>

          {/* Delivery status */}
          {job.reports_sent_at && (
            <div style={{ fontSize: 11, color: EMERALD, fontWeight: 600 }}>
              Reports sent {new Date(job.reports_sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          )}

          {/* Send Reports button */}
          <button
            type="button"
            disabled={!localHesUrl || job.payment_status !== "paid"}
            onClick={() => onSendReports({ ...job, hes_report_url: localHesUrl || null })}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 8,
              border: "none",
              background: localHesUrl && job.payment_status === "paid" ? EMERALD : BORDER,
              color: localHesUrl && job.payment_status === "paid" ? "#fff" : TEXT_DIM,
              fontSize: 13,
              fontWeight: 700,
              cursor: localHesUrl && job.payment_status === "paid" ? "pointer" : "not-allowed",
              opacity: localHesUrl && job.payment_status === "paid" ? 1 : 0.5,
              transition: "background 0.15s",
            }}
          >
            {job.reports_sent_at ? "Resend Reports" : "Send Reports"}
          </button>
        </div>
      </div>

      <div style={{ height: 1, background: BORDER }} />

      {/* Actions */}
      <div>
        <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
          Actions
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {renderActionPills()}
        </div>
      </div>

      <div style={{ height: 1, background: BORDER }} />

      {/* Activity Log */}
      <div>
        <ActivityLog entries={activityEntries} isLoading={activityLoading} collapsible />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

type ViewMode = "list" | "calendar";

export default function SchedulePageClient({ data }: { data: SchedulePageData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const isCompactMobile = useIsSmallMobile();
  const today = useMemo(() => todayStr(), []);
  const { monday, sunday } = useMemo(() => getWeekBounds(), []);
  const { monthStart, monthEnd } = useMemo(() => getMonthBounds(), []);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [mobileSelectedDay, setMobileSelectedDay] = useState<string | null>(null);

  // Column filter state
  const [dateFilter, setDateFilter] = useState<{ preset?: string; from?: string; to?: string }>({ preset: "this_week" });
  const [timeFilter, setTimeFilter] = useState<string[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [addressSearch, setAddressSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [assignedFilter, setAssignedFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [amountRange, setAmountRange] = useState<{ min?: string; max?: string }>({});
  const [globalSearch, setGlobalSearch] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // KPI card filter — only one active at a time
  const [kpiFilter, setKpiFilter] = useState<"today" | "week" | "pending" | "completed" | null>(null);

  function toggleKpi(card: "today" | "week" | "pending" | "completed") {
    if (kpiFilter === card) {
      // Deactivate — clear the filters this KPI set
      setKpiFilter(null);
      setDateFilter({});
      setStatusFilter([]);
    } else {
      setKpiFilter(card);
      // Reset other column filters so the KPI view is clean
      setTimeFilter([]);
      setCustomerSearch("");
      setPhoneSearch("");
      setAddressSearch("");
      setTypeFilter([]);
      setAssignedFilter([]);
      setAmountRange({});
      setGlobalSearch("");
      switch (card) {
        case "today":
          setDateFilter({ preset: "today" });
          setStatusFilter([]);
          break;
        case "week":
          setDateFilter({ preset: "this_week" });
          setStatusFilter([]);
          break;
        case "pending":
          setDateFilter({});
          setStatusFilter(["pending"]);
          break;
        case "completed":
          setDateFilter({ preset: "this_month" });
          setStatusFilter(["delivered", "completed"]);
          break;
      }
    }
  }

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => new Set(ALL_COLUMN_KEYS));
  useEffect(() => {
    const saved = loadVisibleColumns();
    setVisibleColumns(saved);
  }, []);
  const colVisible = useCallback((key: ColumnKey) => visibleColumns.has(key), [visibleColumns]);
  function handleColumnsChange(next: Set<ColumnKey>) {
    setVisibleColumns(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify([...next])); } catch {}
  }

  // Sort state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  // Column popover state (only one open at a time)
  const [openColumn, setOpenColumn] = useState<string | null>(null);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [catalog, setCatalog] = useState<ServiceCatalog>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(() => searchParams.get("jobId"));
  const selectedJob = useMemo(() => selectedJobId ? data.jobs.find((j) => j.id === selectedJobId) ?? null : null, [selectedJobId, data.jobs]);

  // Auto-open side panel from ?jobId= query param and clear it
  useEffect(() => {
    const qJobId = searchParams.get("jobId");
    if (qJobId) {
      setSelectedJobId(qJobId);
      // Clear the query param without a full navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("jobId");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [searchParams]);

  // Auto-close panel if job was deleted or filtered out of the current view
  useEffect(() => {
    if (!selectedJobId) return;
    const stillInData = data.jobs.some((j) => j.id === selectedJobId);
    if (!stillInData) { setSelectedJobId(null); }
  }, [selectedJobId, data.jobs]);

  // Calendar state
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [syncPopoverOpen, setSyncPopoverOpen] = useState(false);
  const [feedUrl, setFeedUrl] = useState("/api/calendar/feed");
  useEffect(() => { setFeedUrl(`${window.location.origin}/api/calendar/feed`); }, []);

  // Cancel confirm
  const [cancelTarget, setCancelTarget] = useState<ScheduleJob | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Reschedule modal
  const [rescheduleTarget, setRescheduleTarget] = useState<ScheduleJob | null>(null);

  // Archive confirm
  const [archiveTarget, setArchiveTarget] = useState<ScheduleJob | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ScheduleJob | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Report delivery modal
  const [deliveryTarget, setDeliveryTarget] = useState<ScheduleJob | null>(null);

  async function openScheduleModal() {
    if (!catalogLoaded) {
      const c = await fetchServiceCatalog();
      setCatalog(c);
      setCatalogLoaded(true);
    }
    setShowScheduleModal(true);
  }

  function handleRefresh() { router.refresh(); }

  // Derive member options from data
  const memberOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const m of data.members) seen.set(m.id, m.name);
    return [...seen.entries()].map(([id, name]) => ({ value: id, label: name }));
  }, [data.members]);

  function handleSort(col: string) {
    return (dir: SortDir) => {
      if (dir === null) { setSortColumn(null); setSortDir(null); }
      else { setSortColumn(col); setSortDir(dir); }
    };
  }

  const filteredJobs = useMemo(() => {
    const gq = globalSearch.trim().toLowerCase();
    let jobs = data.jobs.filter((job) => {
      // Date filter
      if (dateFilter.preset === "today" && job.scheduled_date !== today) return false;
      if (dateFilter.preset === "this_week" && (job.scheduled_date < monday || job.scheduled_date > sunday)) return false;
      if (dateFilter.preset === "this_month" && (job.scheduled_date < monthStart || job.scheduled_date > monthEnd)) return false;
      if (dateFilter.from && job.scheduled_date < dateFilter.from) return false;
      if (dateFilter.to && job.scheduled_date > dateFilter.to) return false;

      // Time segment filter
      if (timeFilter.length > 0) {
        if (!job.scheduled_time) return false;
        const hour = parseInt(job.scheduled_time.split(":")[0], 10);
        const seg = hour >= 6 && hour < 12 ? "morning" : hour >= 12 && hour < 18 ? "afternoon" : "evening";
        if (!timeFilter.includes(seg)) return false;
      }

      // Multi-select filters
      if (typeFilter.length > 0) {
        const typeMatch = typeFilter.includes(job.type);
        const brokerMatch = typeFilter.includes("broker") && job.requested_by === "broker";
        if (!typeMatch && !brokerMatch) return false;
      }
      if (assignedFilter.length > 0 && !assignedFilter.includes(job.team_member_id ?? "")) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(job.status)) return false;

      // Search filters
      if (customerSearch.trim()) {
        if (!(job.customer_name ?? "").toLowerCase().includes(customerSearch.trim().toLowerCase())) return false;
      }
      if (phoneSearch.trim()) {
        if (!(job.customer_phone ?? "").toLowerCase().includes(phoneSearch.trim().toLowerCase())) return false;
      }
      if (addressSearch.trim()) {
        const addr = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ").toLowerCase();
        if (!addr.includes(addressSearch.trim().toLowerCase())) return false;
      }

      // Amount range
      if (amountRange.min && (job.invoice_amount ?? 0) < parseFloat(amountRange.min)) return false;
      if (amountRange.max && (job.invoice_amount ?? 0) > parseFloat(amountRange.max)) return false;

      // Global search
      if (gq) {
        const hay = [job.customer_name, job.customer_phone, job.customer_email, job.address, job.city, job.zip, job.team_member_name]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(gq)) return false;
      }
      return true;
    });

    // Sort
    if (sortColumn && sortDir) {
      jobs = [...jobs].sort((a, b) => {
        let cmp = 0;
        switch (sortColumn) {
          case "date": cmp = a.scheduled_date.localeCompare(b.scheduled_date); break;
          case "customer": cmp = (a.customer_name ?? "").localeCompare(b.customer_name ?? ""); break;
          case "amount": cmp = (a.invoice_amount ?? 0) - (b.invoice_amount ?? 0); break;
          default: break;
        }
        return sortDir === "desc" ? -cmp : cmp;
      });
    }

    return jobs;
  }, [data.jobs, dateFilter, timeFilter, typeFilter, assignedFilter, statusFilter, customerSearch, phoneSearch, addressSearch, amountRange, globalSearch, sortColumn, sortDir, today, monday, sunday, monthStart, monthEnd]);

  // Calendar-specific: apply all filters EXCEPT date
  const calendarFilteredJobs = useMemo(() => {
    const gq = globalSearch.trim().toLowerCase();
    return data.jobs.filter((job) => {
      if (typeFilter.length > 0) {
        const typeMatch = typeFilter.includes(job.type);
        const brokerMatch = typeFilter.includes("broker") && job.requested_by === "broker";
        if (!typeMatch && !brokerMatch) return false;
      }
      if (assignedFilter.length > 0 && !assignedFilter.includes(job.team_member_id ?? "")) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(job.status)) return false;
      if (customerSearch.trim() && !(job.customer_name ?? "").toLowerCase().includes(customerSearch.trim().toLowerCase())) return false;
      if (gq) {
        const hay = [job.customer_name, job.customer_phone, job.customer_email, job.address, job.city, job.zip, job.team_member_name]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(gq)) return false;
      }
      return true;
    });
  }, [data.jobs, typeFilter, assignedFilter, statusFilter, customerSearch, globalSearch]);

  const jobsByDate = useMemo(() => {
    const map = new Map<string, ScheduleJob[]>();
    for (const job of calendarFilteredJobs) {
      const arr = map.get(job.scheduled_date) ?? [];
      arr.push(job);
      map.set(job.scheduled_date, arr);
    }
    return map;
  }, [calendarFilteredJobs]);

  const monthGridDays = useMemo(() => getMonthGridDays(calendarDate.getFullYear(), calendarDate.getMonth()), [calendarDate]);
  const weekDays = useMemo(() => getWeekDayDates(calendarDate), [calendarDate]);
  const currentMonthPrefix = useMemo(() => {
    const y = calendarDate.getFullYear();
    const m = String(calendarDate.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, [calendarDate]);

  // Build active filter chips
  const activeFilters = useMemo(() => {
    const chips: ActiveFilter[] = [];

    // "Completed This Month" KPI — single combined chip instead of separate date + status chips
    if (kpiFilter === "completed") {
      chips.push({ key: "kpi", label: "Status", value: "Completed This Month", onClear: () => { setKpiFilter(null); setDateFilter({}); setStatusFilter([]); } });
    } else {
      if (dateFilter.preset) {
        const labels: Record<string, string> = { today: "Today", this_week: "This Week", this_month: "This Month" };
        chips.push({ key: "date", label: "Date", value: labels[dateFilter.preset] ?? dateFilter.preset, onClear: () => { setKpiFilter(null); setDateFilter({}); } });
      } else if (dateFilter.from || dateFilter.to) {
        chips.push({ key: "date", label: "Date", value: `${dateFilter.from ?? "…"} → ${dateFilter.to ?? "…"}`, onClear: () => setDateFilter({}) });
      }
      if (statusFilter.length > 0) {
        const labels = statusFilter.map((v) => STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v).join(", ");
        chips.push({ key: "status", label: "Status", value: labels, onClear: () => { setKpiFilter(null); setStatusFilter([]); } });
      }
    }
    if (timeFilter.length > 0) {
      const labels = timeFilter.map((v) => TIME_SEGMENT_OPTIONS.find((o) => o.value === v)?.label?.split(" (")[0] ?? v).join(", ");
      chips.push({ key: "time", label: "Time", value: labels, onClear: () => setTimeFilter([]) });
    }
    if (customerSearch.trim()) chips.push({ key: "customer", label: "Customer", value: customerSearch, onClear: () => setCustomerSearch("") });
    if (phoneSearch.trim()) chips.push({ key: "phone", label: "Phone", value: phoneSearch, onClear: () => setPhoneSearch("") });
    if (addressSearch.trim()) chips.push({ key: "address", label: "Address", value: addressSearch, onClear: () => setAddressSearch("") });
    if (typeFilter.length > 0) {
      const labels = typeFilter.map((v) => TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v).join(", ");
      chips.push({ key: "type", label: "Type", value: labels, onClear: () => setTypeFilter([]) });
    }
    if (assignedFilter.length > 0) {
      const labels = assignedFilter.map((v) => memberOptions.find((o) => o.value === v)?.label ?? v).join(", ");
      chips.push({ key: "assigned", label: "Assigned", value: labels, onClear: () => setAssignedFilter([]) });
    }
    if (amountRange.min || amountRange.max) {
      chips.push({ key: "amount", label: "Amount", value: `$${amountRange.min ?? "0"} – $${amountRange.max ?? "∞"}`, onClear: () => setAmountRange({}) });
    }
    if (globalSearch.trim()) chips.push({ key: "search", label: "Search", value: globalSearch, onClear: () => setGlobalSearch("") });
    return chips;
  }, [kpiFilter, dateFilter, timeFilter, customerSearch, phoneSearch, addressSearch, typeFilter, assignedFilter, statusFilter, amountRange, globalSearch, memberOptions]);

  function clearAllFilters() {
    setKpiFilter(null);
    setDateFilter({});
    setTimeFilter([]);
    setCustomerSearch("");
    setPhoneSearch("");
    setAddressSearch("");
    setTypeFilter([]);
    setAssignedFilter([]);
    setStatusFilter([]);
    setAmountRange({});
    setGlobalSearch("");
    setSortColumn(null);
    setSortDir(null);
  }

  function calendarPrev() {
    setCalendarDate((prev) => {
      const d = new Date(prev);
      if (calendarView === "month") d.setMonth(d.getMonth() - 1);
      else d.setDate(d.getDate() - 7);
      return d;
    });
  }
  function calendarNext() {
    setCalendarDate((prev) => {
      const d = new Date(prev);
      if (calendarView === "month") d.setMonth(d.getMonth() + 1);
      else d.setDate(d.getDate() + 7);
      return d;
    });
  }
  function calendarToday() { setCalendarDate(new Date()); }

  async function handleCancel() {
    if (!cancelTarget || cancelLoading) return;
    setCancelLoading(true);
    try {
      await cancelScheduleJob(cancelTarget.id, cancelTarget.type);
      setCancelTarget(null);
      setToast("Job cancelled.");
      handleRefresh();
    } catch (err: any) {
      alert(err?.message ?? "Failed to cancel job.");
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleArchive() {
    if (!archiveTarget || archiveLoading) return;
    setArchiveLoading(true);
    try {
      await archiveScheduleJob(archiveTarget.id, archiveTarget.type);
      setArchiveTarget(null);
      setToast("Job archived.");
      handleRefresh();
    } catch (err: any) {
      alert(err?.message ?? "Failed to archive job.");
    } finally {
      setArchiveLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deleteLoading) return;
    setDeleteLoading(true);
    try {
      await deleteScheduleJob(deleteTarget.id, deleteTarget.type);
      setDeleteTarget(null);
      setSelectedJobId(null);
      setToast("Job deleted permanently.");
      handleRefresh();
    } catch (err: any) {
      alert(err?.message ?? "Failed to delete job.");
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleRowClick(jobId: string) {
    setSelectedJobId((prev) => (prev === jobId ? null : jobId));
  }

  function isOverdue(job: ScheduleJob): boolean {
    if (["delivered", "completed", "cancelled", "archived"].includes(job.status)) return false;
    if (job.payment_status === "paid") return false;
    return job.scheduled_date < today;
  }

  const COL_COUNT = visibleColumns.size;
  const panelOpen = selectedJob !== null;

  return (
    <>
    <style>{`
      @keyframes schedPanelFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes kpiPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      .kpi-pulse-dot { animation: kpiPulse 1.5s ease-in-out infinite; }
    `}</style>
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginRight: isMobile ? 0 : (panelOpen ? PANEL_WIDTH : 0), transition: "margin-right 300ms ease" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>Schedule</h1>
          <p style={{ fontSize: 13, color: TEXT_DIM, margin: "4px 0 0", fontWeight: 500 }}>
            Manage upcoming assessments, inspections, and service requests
          </p>
        </div>
        {!isMobile && (
          <button type="button" onClick={openScheduleModal} style={{
            padding: "8px 14px", borderRadius: 8, border: "none", background: PURPLE,
            color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>+ Schedule Service</button>
        )}
      </div>

      {/* Stats Row */}
      <div className="admin-kpi-grid">
        <KpiCard label="Today's Jobs" value={data.stats.todayJobs} color="#fbbf24"
          isActive={kpiFilter === "today"} onClick={() => toggleKpi("today")} />
        <KpiCard label="This Week" value={data.stats.thisWeek} color="#60a5fa"
          isActive={kpiFilter === "week"} onClick={() => toggleKpi("week")} />
        <KpiCard label="Pending Requests" value={data.stats.pendingRequests} color="#f59e0b"
          showPulse={data.stats.pendingRequests > 0}
          isActive={kpiFilter === "pending"} onClick={() => toggleKpi("pending")} />
        <KpiCard label="Completed This Month" value={data.stats.completedThisMonth} color={EMERALD}
          isActive={kpiFilter === "completed"} onClick={() => toggleKpi("completed")} />
      </div>

      {/* View Toggle + Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 0, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
            {(["list", "calendar"] as ViewMode[]).map((v, idx, arr) => (
              <button key={v} type="button" onClick={() => setViewMode(v)} style={{
                padding: "7px 16px", border: "none",
                borderRight: idx < arr.length - 1 ? `1px solid ${BORDER}` : "none",
                background: viewMode === v ? "rgba(124,58,237,0.1)" : "transparent",
                color: viewMode === v ? "#a78bfa" : TEXT_MUTED,
                fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.12s", textTransform: "capitalize",
              }}>{v}</button>
            ))}
          </div>
          <span style={{ fontSize: 12, color: TEXT_DIM }}>
            Showing <span style={{ fontWeight: 700, color: TEXT_SEC }}>{filteredJobs.length}</span> jobs
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search customer, address, team member..."
            className="admin-input" style={{ maxWidth: 340, fontSize: 13, padding: "7px 12px" }} />
          {viewMode === "list" && (
            <ColumnVisibilityDropdown visible={visibleColumns} onChange={handleColumnsChange} />
          )}
        </div>
      </div>

      {/* Mobile Filter Toggle */}
      <div className="admin-mobile-filter-toggle">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((p) => !p)}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8,
            padding: "10px 14px", borderRadius: 8,
            border: `1px solid ${activeFilters.length > 0 ? "rgba(16,185,129,0.30)" : BORDER}`,
            background: CARD, cursor: "pointer",
          }}
        >
          <AdjustmentsHorizontalIcon style={{ width: 18, height: 18, color: activeFilters.length > 0 ? EMERALD : TEXT_MUTED }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: activeFilters.length > 0 ? EMERALD : TEXT }}>Filters</span>
          {activeFilters.length > 0 && (
            <span style={{
              padding: "1px 7px", borderRadius: 9999, fontSize: 11, fontWeight: 700,
              background: "rgba(16,185,129,0.15)", color: EMERALD,
            }}>{activeFilters.length}</span>
          )}
          <ChevronDownIcon style={{
            width: 16, height: 16, marginLeft: "auto",
            color: TEXT_MUTED, transition: "transform 0.15s",
            transform: mobileFiltersOpen ? "rotate(180deg)" : "rotate(0)",
          }} />
        </button>
        {mobileFiltersOpen && (
          <div style={{
            marginTop: 8, padding: 14, borderRadius: 10,
            background: CARD, border: `1px solid ${BORDER}`,
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "block" }}>Date</label>
              <select
                value={dateFilter.preset ?? ""}
                onChange={(e) => setDateFilter(e.target.value ? { preset: e.target.value } : {})}
                className="admin-select" style={{ fontSize: 13 }}
              >
                <option value="">All Dates</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "block" }}>Type</label>
              <select
                value={typeFilter.length === 1 ? typeFilter[0] : ""}
                onChange={(e) => setTypeFilter(e.target.value ? [e.target.value] : [])}
                className="admin-select" style={{ fontSize: 13 }}
              >
                <option value="">All Types</option>
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "block" }}>Status</label>
              <select
                value={statusFilter.length === 1 ? statusFilter[0] : ""}
                onChange={(e) => setStatusFilter(e.target.value ? [e.target.value] : [])}
                className="admin-select" style={{ fontSize: 13 }}
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "block" }}>Assigned To</label>
              <select
                value={assignedFilter.length === 1 ? assignedFilter[0] : ""}
                onChange={(e) => setAssignedFilter(e.target.value ? [e.target.value] : [])}
                className="admin-select" style={{ fontSize: 13 }}
              >
                <option value="">All Members</option>
                {memberOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Active Filter Chips */}
      <ActiveFilterBar filters={activeFilters} onClearAll={clearAllFilters} />

      {/* Content */}
      {viewMode === "list" ? (
        <>
        <div className="admin-table-desktop" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table" style={{ minWidth: 1100, tableLayout: "fixed" }}>
              <thead>
                <tr>
                  {colVisible("date") && <FilterableHeader
                    label="Date" filterType="date-range" width={120}
                    filterValue={dateFilter} onFilterChange={(v) => setDateFilter(v as { preset?: string; from?: string; to?: string })}
                    sortable sortDir={sortColumn === "date" ? sortDir : null} onSortChange={handleSort("date")}
                    isOpen={openColumn === "date"} onOpen={() => setOpenColumn("date")} onClose={() => setOpenColumn(null)}
                  />}
                  {colVisible("time") && <FilterableHeader
                    label="Time" filterType="multi-select" width={80}
                    options={TIME_SEGMENT_OPTIONS}
                    optionColors={TIME_SEGMENT_COLORS}
                    filterValue={timeFilter} onFilterChange={(v) => setTimeFilter(v as string[])}
                    isOpen={openColumn === "time"} onOpen={() => setOpenColumn("time")} onClose={() => setOpenColumn(null)}
                  />}
                  {colVisible("customer") && <FilterableHeader
                    label="Customer" filterType="search" width={150}
                    filterValue={customerSearch} onFilterChange={(v) => setCustomerSearch(v as string)}
                    sortable sortDir={sortColumn === "customer" ? sortDir : null} onSortChange={handleSort("customer")}
                    isOpen={openColumn === "customer"} onOpen={() => setOpenColumn("customer")} onClose={() => setOpenColumn(null)}
                  />}
                  {colVisible("phone") && <FilterableHeader
                    label="Phone" filterType="search" width={120}
                    filterValue={phoneSearch} onFilterChange={(v) => setPhoneSearch(v as string)}
                    isOpen={openColumn === "phone"} onOpen={() => setOpenColumn("phone")} onClose={() => setOpenColumn(null)}
                  />}
                  {colVisible("address") && <FilterableHeader
                    label="Address" filterType="search"
                    filterValue={addressSearch} onFilterChange={(v) => setAddressSearch(v as string)}
                    isOpen={openColumn === "address"} onOpen={() => setOpenColumn("address")} onClose={() => setOpenColumn(null)}
                  />}
                  {colVisible("type") && <FilterableHeader
                    label="Type" filterType="multi-select" width={110}
                    options={TYPE_OPTIONS}
                    optionColors={TYPE_OPTION_COLORS}
                    filterValue={typeFilter} onFilterChange={(v) => setTypeFilter(v as string[])}
                    isOpen={openColumn === "type"} onOpen={() => setOpenColumn("type")} onClose={() => setOpenColumn(null)}
                  />}
                  {colVisible("assigned") && <FilterableHeader
                    label="Assigned To" filterType="multi-select" width={120}
                    options={memberOptions}
                    filterValue={assignedFilter} onFilterChange={(v) => setAssignedFilter(v as string[])}
                    isOpen={openColumn === "assigned"} onOpen={() => setOpenColumn("assigned")} onClose={() => setOpenColumn(null)}
                  />}
                  {colVisible("status") && <FilterableHeader
                    label="Status" filterType="multi-select" width={100}
                    options={STATUS_OPTIONS}
                    filterValue={statusFilter} onFilterChange={(v) => setStatusFilter(v as string[])}
                    isOpen={openColumn === "status"} onOpen={() => setOpenColumn("status")} onClose={() => setOpenColumn(null)}
                  />}
                  {colVisible("amount") && <FilterableHeader
                    label="Amount" filterType="range" width={80} align="right"
                    filterValue={amountRange} onFilterChange={(v) => setAmountRange(v as { min?: string; max?: string })}
                    sortable sortDir={sortColumn === "amount" ? sortDir : null} onSortChange={handleSort("amount")}
                    isOpen={openColumn === "amount"} onOpen={() => setOpenColumn("amount")} onClose={() => setOpenColumn(null)}
                  />}
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => {
                  const overdue = isOverdue(job);
                  const todayRow = job.scheduled_date === today;
                  const isMuted = job.status === "completed" || job.status === "cancelled" || job.status === "archived";
                  const isSelected = selectedJobId === job.id;
                  const typeBadge = JOB_TYPE_BADGE[job.type] ?? JOB_TYPE_BADGE.hes;
                  const statusBadge = resolveStatusBadge(job);

                  const isPending = job.status === "pending";
                  const leftBorder = isSelected
                    ? "3px solid rgba(16,185,129,0.6)"
                    : isPending
                    ? "4px solid rgba(245,158,11,0.6)"
                    : overdue
                    ? "3px solid rgba(239,68,68,0.6)"
                    : todayRow && !isMuted
                    ? "3px solid rgba(16,185,129,0.6)"
                    : "3px solid transparent";

                  const textColor = isMuted ? TEXT_DIM : TEXT;
                  const secColor = isMuted ? TEXT_DIM : TEXT_SEC;
                  const addr = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");

                  const rowBg = isSelected
                    ? "rgba(16,185,129,0.08)"
                    : isPending
                    ? "rgba(245,158,11,0.08)"
                    : (job.payment_status === "paid" || job.status === "delivered")
                    ? "rgba(16,185,129,0.06)"
                    : undefined;

                  return (
                    <tr
                      key={job.id}
                      onClick={() => handleRowClick(job.id)}
                      style={{
                        cursor: "pointer", borderLeft: leftBorder,
                        background: rowBg,
                        transition: "background 0.1s ease",
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = isSelected ? "" : "rgba(148,163,184,0.05)"; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = rowBg ?? ""; }}
                    >
                        {/* Date */}
                        {colVisible("date") && (
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {todayRow && !isMuted ? (
                              <span style={{ display: "inline-flex", alignItems: "center", fontSize: 9, fontWeight: 800, color: "#fff", background: EMERALD, padding: "2px 6px", borderRadius: 4, lineHeight: 1, flexShrink: 0, textTransform: "uppercase" }}>Today</span>
                            ) : (
                              <span style={{ fontWeight: 600, fontSize: 13, color: overdue ? "#f87171" : textColor }}>
                                {formatDate(job.scheduled_date)}
                              </span>
                            )}
                            {overdue && (
                              <span style={{ display: "inline-flex", alignItems: "center", fontSize: 9, fontWeight: 800, color: "#fff", background: "#ef4444", padding: "2px 6px", borderRadius: 4, lineHeight: 1, flexShrink: 0, textTransform: "uppercase" }}>Overdue</span>
                            )}
                          </div>
                        </td>
                        )}
                        {/* Time */}
                        {colVisible("time") && (
                        <td><span style={{ fontSize: 13, color: overdue ? "#fca5a5" : secColor }}>{formatTime(job.scheduled_time)}</span></td>
                        )}
                        {/* Customer */}
                        {colVisible("customer") && (
                        <td><span style={{ fontWeight: 600, fontSize: 13, color: textColor }}>{job.customer_name}</span></td>
                        )}
                        {/* Phone */}
                        {colVisible("phone") && (
                        <td>
                          {job.customer_phone ? (
                            <a href={`tel:${job.customer_phone}`} onClick={(e) => e.stopPropagation()}
                              style={{ fontSize: 13, color: isMuted ? TEXT_DIM : "#60a5fa", textDecoration: "none", fontWeight: 500 }}>
                              {job.customer_phone}
                            </a>
                          ) : <span style={{ fontSize: 13, color: TEXT_DIM }}>{"\u2014"}</span>}
                        </td>
                        )}
                        {/* Address */}
                        {colVisible("address") && (
                        <td>
                          {addr ? (
                            <a href={makeMapHref(job.address, job.city, job.state, job.zip)} target="_blank" rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{ fontSize: 13, color: isMuted ? TEXT_DIM : "#60a5fa", textDecoration: "none", fontWeight: 500 }}>
                              {addr}
                            </a>
                          ) : <span style={{ fontSize: 13, color: TEXT_DIM }}>{"\u2014"}</span>}
                        </td>
                        )}
                        {/* Type */}
                        {colVisible("type") && (
                        <td>
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <DisplayBadge config={typeBadge} />
                            {job.requested_by === "broker" && <DisplayBadge config={BROKER_BADGE} />}
                          </div>
                        </td>
                        )}
                        {/* Assigned To */}
                        {colVisible("assigned") && (
                        <td><span style={{ fontSize: 13, color: job.team_member_name ? secColor : TEXT_DIM }}>{job.team_member_name || "Unassigned"}</span></td>
                        )}
                        {/* Status */}
                        {colVisible("status") && (
                        <td><DisplayBadge config={statusBadge} /></td>
                        )}
                        {/* Amount */}
                        {colVisible("amount") && (
                        <td style={{ textAlign: "right" }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: job.invoice_amount ? textColor : TEXT_DIM }}>
                            {job.invoice_amount ? `$${job.invoice_amount}` : "\u2014"}
                          </span>
                        </td>
                        )}
                    </tr>
                  );
                })}

                {filteredJobs.length === 0 && (
                  <tr>
                    <td colSpan={COL_COUNT} style={{ padding: "40px 24px", textAlign: "center", color: TEXT_DIM }}>
                      No jobs match your current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="admin-card-mobile">
          {filteredJobs.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: TEXT_DIM, fontSize: 13 }}>
              No jobs match your current filters.
            </div>
          ) : filteredJobs.map((job) => (
            <ScheduleMobileCard
              key={job.id}
              job={job}
              isSelected={selectedJobId === job.id}
              overdue={isOverdue(job)}
              onClick={() => handleRowClick(job.id)}
            />
          ))}
        </div>
        </>
      ) : (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
          {/* Calendar Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isCompactMobile ? "10px 12px" : "12px 16px", borderBottom: `1px solid ${BORDER}`, gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: isCompactMobile ? 4 : 8, flex: 1, minWidth: 0 }}>
              <button type="button" onClick={calendarPrev} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT_MUTED, cursor: "pointer", padding: "4px 10px", fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{"\u2039"}</button>
              <h2 style={{ fontSize: isCompactMobile ? 13 : 15, fontWeight: 700, color: TEXT, margin: 0, textAlign: "center", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {calendarView === "month" ? monthYearLabel(calendarDate) : weekRangeLabel(weekDays)}
              </h2>
              <button type="button" onClick={calendarNext} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT_MUTED, cursor: "pointer", padding: "4px 10px", fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{"\u203A"}</button>
              <button type="button" onClick={() => { calendarToday(); setMobileSelectedDay(null); }} style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 6, color: EMERALD, cursor: "pointer", padding: "5px 12px", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Today</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 0, background: "#0f172a", border: `1px solid ${BORDER}`, borderRadius: 6, overflow: "hidden" }}>
                {(["month", "week"] as const).map((v, idx) => (
                  <button key={v} type="button" onClick={() => { setCalendarView(v); setMobileSelectedDay(null); }} style={{
                    padding: isCompactMobile ? "5px 10px" : "5px 14px", border: "none",
                    borderRight: idx === 0 ? `1px solid ${BORDER}` : "none",
                    background: calendarView === v ? "rgba(124,58,237,0.12)" : "transparent",
                    color: calendarView === v ? "#a78bfa" : TEXT_MUTED,
                    fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize",
                  }}>{isCompactMobile ? v.charAt(0).toUpperCase() : v}</button>
                ))}
              </div>
              {!isCompactMobile && (
                <div style={{ position: "relative" }}>
                  <button type="button" onClick={() => setSyncPopoverOpen(!syncPopoverOpen)} style={{
                    background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)",
                    borderRadius: 6, color: "#60a5fa", cursor: "pointer", padding: "5px 12px", fontSize: 12, fontWeight: 700,
                  }}>Sync</button>
                  {syncPopoverOpen && (
                    <>
                      <div onClick={() => setSyncPopoverOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 29 }} />
                      <div style={{
                        position: "absolute", right: 0, top: "calc(100% + 8px)", width: 340, zIndex: 30,
                        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16,
                        boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 8 }}>Sync with Google Calendar</div>
                        <p style={{ fontSize: 12, color: TEXT_MUTED, margin: "0 0 10px", lineHeight: 1.5 }}>
                          Copy this iCal feed URL and add it in Google Calendar:<br />
                          <span style={{ color: TEXT_DIM }}>Settings &rarr; Add calendar &rarr; From URL</span>
                        </p>
                        <div style={{ display: "flex", gap: 6 }}>
                          <input readOnly value={feedUrl} style={{
                            flex: 1, fontSize: 11, padding: "6px 8px", borderRadius: 6,
                            background: "#0f172a", border: `1px solid ${BORDER}`, color: TEXT_SEC,
                          }} onClick={(e) => (e.target as HTMLInputElement).select()} />
                          <button type="button" onClick={() => { navigator.clipboard.writeText(feedUrl); setSyncPopoverOpen(false); setToast("Feed URL copied!"); }} style={{
                            padding: "6px 12px", borderRadius: 6, border: "none",
                            background: EMERALD, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                          }}>Copy</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {calendarView === "month" ? (
            isCompactMobile ? (
              /* ── Mobile Month View: compact grid with count badges ── */
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${BORDER}` }}>
                  {WEEKDAY_LETTERS.map((d, i) => (
                    <div key={i} style={{ padding: "6px 0", fontSize: 11, fontWeight: 700, color: TEXT_DIM, textAlign: "center" }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                  {monthGridDays.map((dateStr, idx) => {
                    const dayNum = parseInt(dateStr.slice(8), 10);
                    const isCurrentMonth = dateStr.startsWith(currentMonthPrefix);
                    const isToday = dateStr === today;
                    const isSelected = mobileSelectedDay === dateStr;
                    const dayJobs = jobsByDate.get(dateStr) ?? [];
                    const count = dayJobs.length;
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => setMobileSelectedDay(isSelected ? null : dateStr)}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          minHeight: 48, padding: "4px 2px", cursor: "pointer",
                          background: isSelected ? "rgba(124,58,237,0.12)" : isToday ? "rgba(16,185,129,0.04)" : "transparent",
                          border: "none",
                          borderRight: (idx % 7) < 6 ? "1px solid rgba(51,65,85,0.25)" : "none",
                          borderBottom: idx < 35 ? "1px solid rgba(51,65,85,0.25)" : "none",
                        }}
                      >
                        {isToday ? (
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: EMERALD, color: "#fff", fontSize: 12, fontWeight: 800 }}>{dayNum}</span>
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: isSelected ? "#a78bfa" : isCurrentMonth ? TEXT_SEC : TEXT_DIM }}>{dayNum}</span>
                        )}
                        {count > 0 && (
                          <span style={{
                            marginTop: 2, fontSize: 9, fontWeight: 700, lineHeight: 1,
                            padding: "2px 5px", borderRadius: 9999,
                            background: "rgba(16,185,129,0.15)", color: EMERALD,
                          }}>{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* Mobile day detail list */}
                {mobileSelectedDay && (() => {
                  const dayJobs = (jobsByDate.get(mobileSelectedDay) ?? []).sort((a, b) => (a.scheduled_time ?? "99:99").localeCompare(b.scheduled_time ?? "99:99"));
                  const d = new Date(mobileSelectedDay + "T12:00:00");
                  return (
                    <div style={{ borderTop: `1px solid ${BORDER}`, padding: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 10 }}>
                        {d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                        <span style={{ marginLeft: 6, fontSize: 11, color: TEXT_DIM, fontWeight: 600 }}>{dayJobs.length} job{dayJobs.length !== 1 ? "s" : ""}</span>
                      </div>
                      {dayJobs.length === 0 ? (
                        <div style={{ fontSize: 12, color: TEXT_DIM, textAlign: "center", padding: "16px 0" }}>No jobs scheduled</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {dayJobs.map((job) => {
                            const badge = JOB_TYPE_BADGE[job.type] ?? JOB_TYPE_BADGE.hes;
                            const isSel = selectedJobId === job.id;
                            return (
                              <div key={job.id} onClick={() => setSelectedJobId(job.id)} style={{
                                display: "flex", alignItems: "center", gap: 10,
                                padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                                background: isSel ? badge.color : badge.bg, border: `1px solid ${badge.border}`, transition: "all 0.1s",
                              }}>
                                <div style={{ width: 50, flexShrink: 0, fontSize: 11, fontWeight: 700, color: isSel ? "#fff" : badge.color }}>{formatTime(job.scheduled_time)}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: isSel ? "#fff" : TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.customer_name}</div>
                                  <div style={{ fontSize: 11, color: isSel ? "rgba(255,255,255,0.7)" : TEXT_DIM }}>{typeLabel(job.type)}{job.team_member_name ? ` · ${job.team_member_name}` : ""}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            ) : (
              /* ── Desktop Month View ── */
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${BORDER}` }}>
                  {WEEKDAY_LABELS.map((d) => (
                    <div key={d} style={{ padding: "6px 8px", fontSize: 11, fontWeight: 700, color: TEXT_DIM, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.05em" }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                  {monthGridDays.map((dateStr, idx) => {
                    const dayNum = parseInt(dateStr.slice(8), 10);
                    const isCurrentMonth = dateStr.startsWith(currentMonthPrefix);
                    const isToday = dateStr === today;
                    const dayJobs = jobsByDate.get(dateStr) ?? [];
                    return (
                      <div key={dateStr} style={{
                        minHeight: 94, padding: "4px 5px",
                        borderRight: (idx % 7) < 6 ? "1px solid rgba(51,65,85,0.25)" : "none",
                        borderBottom: idx < 35 ? "1px solid rgba(51,65,85,0.25)" : "none",
                        background: isToday ? "rgba(16,185,129,0.04)" : undefined,
                      }}>
                        <div style={{ marginBottom: 3, textAlign: "right", paddingRight: 2 }}>
                          {isToday ? (
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: EMERALD, color: "#fff", fontSize: 12, fontWeight: 800 }}>{dayNum}</span>
                          ) : (
                            <span style={{ fontSize: 12, fontWeight: 500, color: isCurrentMonth ? TEXT_SEC : TEXT_DIM }}>{dayNum}</span>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {dayJobs.slice(0, 3).map((job) => {
                            const badge = JOB_TYPE_BADGE[job.type] ?? JOB_TYPE_BADGE.hes;
                            const isSel = selectedJobId === job.id;
                            return (
                              <div key={job.id} onClick={() => setSelectedJobId(job.id)} style={{
                                padding: "1px 4px", borderRadius: 3, fontSize: 10, fontWeight: 600, cursor: "pointer",
                                background: isSel ? badge.color : badge.bg, color: isSel ? "#fff" : badge.color,
                                border: `1px solid ${badge.border}`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                transition: "all 0.1s",
                              }}>
                                {job.scheduled_time ? formatTime(job.scheduled_time).split(" ")[0] + " " : ""}{job.customer_name}
                              </div>
                            );
                          })}
                          {dayJobs.length > 3 && (
                            <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, paddingLeft: 2 }}>+{dayJobs.length - 3} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )
          ) : isCompactMobile ? (
            /* ── Mobile Week View: single-column vertical day list ── */
            <div style={{ display: "flex", flexDirection: "column" }}>
              {weekDays.map((dateStr, idx) => {
                const d = new Date(dateStr + "T12:00:00");
                const isToday = dateStr === today;
                const dayJobs = (jobsByDate.get(dateStr) ?? []).sort((a, b) => (a.scheduled_time ?? "99:99").localeCompare(b.scheduled_time ?? "99:99"));
                return (
                  <div key={dateStr} style={{ borderBottom: idx < 6 ? `1px solid rgba(51,65,85,0.25)` : "none" }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 12px", background: isToday ? "rgba(16,185,129,0.06)" : undefined,
                      borderBottom: dayJobs.length > 0 ? `1px solid rgba(51,65,85,0.15)` : "none",
                    }}>
                      <div style={{ width: 32, textAlign: "center", flexShrink: 0 }}>
                        {isToday ? (
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: EMERALD, color: "#fff", fontSize: 14, fontWeight: 700 }}>{d.getDate()}</span>
                        ) : (
                          <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{d.getDate()}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isToday ? EMERALD : TEXT_MUTED, textTransform: "uppercase" }}>{WEEKDAY_LABELS[idx]}</div>
                      <span style={{ fontSize: 11, color: TEXT_DIM, marginLeft: "auto" }}>{dayJobs.length > 0 ? `${dayJobs.length} job${dayJobs.length !== 1 ? "s" : ""}` : ""}</span>
                    </div>
                    {dayJobs.length > 0 && (
                      <div style={{ padding: "6px 12px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                        {dayJobs.map((job) => {
                          const badge = JOB_TYPE_BADGE[job.type] ?? JOB_TYPE_BADGE.hes;
                          const isSel = selectedJobId === job.id;
                          return (
                            <div key={job.id} onClick={() => setSelectedJobId(job.id)} style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                              background: isSel ? badge.color : badge.bg, border: `1px solid ${badge.border}`, transition: "all 0.1s",
                            }}>
                              <div style={{ width: 50, flexShrink: 0, fontSize: 11, fontWeight: 700, color: isSel ? "#fff" : badge.color }}>{formatTime(job.scheduled_time)}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: isSel ? "#fff" : TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.customer_name}</div>
                                <div style={{ fontSize: 10, color: isSel ? "rgba(255,255,255,0.7)" : TEXT_DIM }}>{typeLabel(job.type)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {dayJobs.length === 0 && (
                      <div style={{ padding: "8px 12px", fontSize: 11, color: TEXT_DIM, opacity: 0.4 }}>No jobs</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Desktop Week View ── */
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
              {weekDays.map((dateStr, idx) => {
                const d = new Date(dateStr + "T12:00:00");
                const isToday = dateStr === today;
                const dayJobs = (jobsByDate.get(dateStr) ?? []).sort((a, b) => (a.scheduled_time ?? "99:99").localeCompare(b.scheduled_time ?? "99:99"));
                return (
                  <div key={dateStr} style={{ borderRight: idx < 6 ? "1px solid rgba(51,65,85,0.25)" : "none", minHeight: 420 }}>
                    <div style={{ padding: "8px 10px", borderBottom: `1px solid ${BORDER}`, background: isToday ? "rgba(16,185,129,0.06)" : undefined, textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase" }}>{WEEKDAY_LABELS[idx]}</div>
                      <div style={{ marginTop: 4 }}>
                        {isToday ? (
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "50%", background: EMERALD, color: "#fff", fontSize: 16, fontWeight: 700 }}>{d.getDate()}</span>
                        ) : (
                          <span style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>{d.getDate()}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                      {dayJobs.map((job) => {
                        const badge = JOB_TYPE_BADGE[job.type] ?? JOB_TYPE_BADGE.hes;
                        const isSel = selectedJobId === job.id;
                        return (
                          <div key={job.id} onClick={() => setSelectedJobId(job.id)} style={{
                            padding: "5px 7px", borderRadius: 6, cursor: "pointer",
                            background: isSel ? badge.color : badge.bg, border: `1px solid ${badge.border}`, transition: "all 0.1s",
                          }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: isSel ? "#fff" : badge.color }}>{formatTime(job.scheduled_time)}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: isSel ? "#fff" : TEXT, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.customer_name}</div>
                            <div style={{ fontSize: 10, color: isSel ? "rgba(255,255,255,0.7)" : TEXT_DIM, marginTop: 1 }}>{typeLabel(job.type)}</div>
                          </div>
                        );
                      })}
                      {dayJobs.length === 0 && (
                        <div style={{ fontSize: 11, color: TEXT_DIM, textAlign: "center", padding: "30px 0", opacity: 0.4 }}>{"\u2014"}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Schedule Service Modal */}
      {showScheduleModal && (
        <ScheduleServiceModal
          members={data.members} catalog={catalog}
          onClose={() => setShowScheduleModal(false)}
          onScheduled={() => { setShowScheduleModal(false); setToast("Service scheduled!"); handleRefresh(); }}
        />
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <RescheduleModal
          job={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onDone={() => {
            setRescheduleTarget(null);
            setToast("Job rescheduled.");
            handleRefresh();
          }}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {cancelTarget && (
        <ModalOverlay onClose={() => setCancelTarget(null)}>
          <div style={{ width: 400 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: TEXT, margin: "0 0 12px" }}>Cancel Job</h3>
            <p style={{ fontSize: 14, color: TEXT_SEC, lineHeight: 1.5, margin: "0 0 20px" }}>
              Are you sure you want to cancel the {cancelTarget.type === "hes" ? "HES Assessment" : "Home Inspection"} for{" "}
              <strong>{cancelTarget.customer_name}</strong> on {formatDate(cancelTarget.scheduled_date)}?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setCancelTarget(null)} disabled={cancelLoading} style={modalBtnCancel}>Keep</button>
              <button type="button" onClick={handleCancel} disabled={cancelLoading} style={{
                padding: "9px 20px", borderRadius: 8, border: "none", background: "#ef4444",
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: cancelLoading ? "not-allowed" : "pointer", opacity: cancelLoading ? 0.5 : 1,
              }}>{cancelLoading ? "Cancelling..." : "Cancel Job"}</button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Archive Confirmation Modal */}
      {archiveTarget && (
        <ModalOverlay onClose={() => setArchiveTarget(null)}>
          <div style={{ width: 400 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: TEXT, margin: "0 0 12px" }}>Archive Job</h3>
            <p style={{ fontSize: 14, color: TEXT_SEC, lineHeight: 1.5, margin: "0 0 20px" }}>
              Archive the {archiveTarget.type === "hes" ? "HES Assessment" : "Home Inspection"} for{" "}
              <strong>{archiveTarget.customer_name}</strong>? Archived jobs are hidden from the default view but can still be found with filters.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setArchiveTarget(null)} disabled={archiveLoading} style={modalBtnCancel}>Keep</button>
              <button type="button" onClick={handleArchive} disabled={archiveLoading} style={{
                padding: "9px 20px", borderRadius: 8, border: "none", background: "#475569",
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: archiveLoading ? "not-allowed" : "pointer", opacity: archiveLoading ? 0.5 : 1,
              }}>{archiveLoading ? "Archiving..." : "Archive Job"}</button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ModalOverlay onClose={() => setDeleteTarget(null)}>
          <div style={{ width: 400 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f87171", margin: "0 0 12px" }}>Delete Job Permanently</h3>
            <p style={{ fontSize: 14, color: TEXT_SEC, lineHeight: 1.5, margin: "0 0 6px" }}>
              This will permanently delete the {deleteTarget.type === "hes" ? "HES Assessment" : "Home Inspection"} for{" "}
              <strong>{deleteTarget.customer_name}</strong>.
            </p>
            <p style={{ fontSize: 13, color: "#f87171", margin: "0 0 20px", fontWeight: 600 }}>
              This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleteLoading} style={modalBtnCancel}>Cancel</button>
              <button type="button" onClick={handleDelete} disabled={deleteLoading} style={{
                padding: "9px 20px", borderRadius: 8, border: "none", background: "#ef4444",
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: deleteLoading ? "not-allowed" : "pointer", opacity: deleteLoading ? 0.5 : 1,
              }}>{deleteLoading ? "Deleting..." : "Delete Permanently"}</button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Report Delivery Modal */}
      {deliveryTarget && (
        <ReportDeliveryModal
          variant="admin"
          job={{
            id: deliveryTarget.id,
            type: deliveryTarget.type,
            customer_name: deliveryTarget.customer_name,
            customer_email: deliveryTarget.customer_email,
            address: deliveryTarget.address,
            city: deliveryTarget.city,
            state: deliveryTarget.state,
            zip: deliveryTarget.zip,
            service_name: deliveryTarget.service_name,
            tier_name: deliveryTarget.tier_name,
            hes_report_url: deliveryTarget.hes_report_url,
            leaf_report_url: deliveryTarget.leaf_report_url,
            payment_status: deliveryTarget.payment_status,
            invoice_amount: deliveryTarget.invoice_amount,
            reports_sent_at: deliveryTarget.reports_sent_at,
            invoice_sent_at: deliveryTarget.invoice_sent_at,
            requested_by: deliveryTarget.requested_by,
            payer_name: deliveryTarget.payer_name,
            payer_email: deliveryTarget.payer_email,
            broker_id: deliveryTarget.broker_id,
          }}
          onClose={() => setDeliveryTarget(null)}
          onSend={async (p: SendReportDeliveryParams) => {
            const result = await sendReportDelivery({
              jobId: deliveryTarget.id,
              jobType: deliveryTarget.type,
              leafTier: p.leafTier,
              leafReportUrl: p.leafReportUrl,
              includeInvoice: p.includeInvoice,
              invoiceAmount: p.invoiceAmount,
              includeReceipt: p.includeReceipt,
              recipientEmails: p.recipientEmails,
              senderVariant: "admin",
            });
            if (!result.error) {
              setDeliveryTarget(null);
              setToast("Reports sent successfully");
              handleRefresh();
            }
            return result;
          }}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </div>

    {/* Mobile backdrop for side panel */}
    {isMobile && panelOpen && (
      <div
        onClick={() => setSelectedJobId(null)}
        style={{ position: "fixed", inset: 0, zIndex: 39, background: "rgba(0,0,0,0.5)" }}
      />
    )}

    {/* Side panel — full-screen overlay on mobile, side-by-side on desktop */}
    <div style={{
      position: "fixed",
      ...(isMobile
        ? { inset: 0, width: "100%", height: "100%" }
        : { right: 0, top: 0, height: "100%", width: PANEL_WIDTH }
      ),
      zIndex: 40,
      background: "#0f172a", borderLeft: isMobile ? "none" : `1px solid ${BORDER}`,
      boxShadow: panelOpen ? (isMobile ? "none" : "-4px 0 24px rgba(0,0,0,0.3)") : "none",
      transform: panelOpen ? "translateX(0)" : "translateX(100%)",
      transition: "transform 300ms ease, box-shadow 300ms ease",
      display: "flex", flexDirection: "column",
    }}>
      {/* Panel header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px 24px", borderBottom: "1px solid rgba(51,65,85,0.5)", flexShrink: 0,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: TEXT, margin: 0 }}>Job Details</h2>
        <button
          type="button"
          onClick={() => setSelectedJobId(null)}
          style={{
            background: "none", border: "none", padding: 4,
            color: TEXT_MUTED, fontSize: 18, cursor: "pointer",
            lineHeight: 1, transition: "color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = TEXT; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_MUTED; }}
        >
          {"\u2715"}
        </button>
      </div>
      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {selectedJob && (
          <div key={selectedJob.id} style={{ animation: "schedPanelFadeIn 200ms ease" }}>
            <JobDetailContent
              job={selectedJob}
              members={data.members}
              onStatusUpdated={(msg) => { setToast(msg); handleRefresh(); }}
              onCancelRequest={(j) => setCancelTarget(j)}
              onRescheduleRequest={(j) => setRescheduleTarget(j)}
              onArchiveRequest={(j) => setArchiveTarget(j)}
              onDeleteRequest={(j) => setDeleteTarget(j)}
              onSendReports={(j) => setDeliveryTarget(j)}
            />
          </div>
        )}
      </div>
    </div>

    {/* Mobile FAB */}
    {isMobile && (
      <button
        type="button"
        onClick={openScheduleModal}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 30,
          width: 56, height: 56, borderRadius: 9999,
          background: PURPLE, border: "none", color: "#fff",
          boxShadow: "0 8px 24px rgba(124,58,237,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <PlusIcon style={{ width: 24, height: 24 }} />
      </button>
    )}
    </>
  );
}
