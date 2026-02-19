// src/app/admin/schedule/SchedulePageClient.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SchedulePageData, ScheduleJob, MemberType } from "./data";
import {
  createScheduleJob,
  cancelScheduleJob,
  updateScheduleJobStatus,
  rescheduleJob,
  archiveScheduleJob,
  deleteScheduleJob,
} from "./actions";
import type { ServiceCatalog } from "../_actions/services";
import { fetchServiceCatalog } from "../_actions/services";
import FilterableHeader, { ActiveFilterBar, type ActiveFilter, type SortDir, type OptionColor } from "@/components/ui/FilterableHeader";
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
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

// ─── Status pill colors ─────────────────────────────────────────────

const PILL_COLORS = {
  schedule:    { bg: "#7c3aed", hover: "#6d28d9", text: "#fff" },
  scheduled:   { bg: "#059669", hover: "#047857", text: "#fff" },
  reschedule:  { bg: "#2563eb", hover: "#1d4ed8", text: "#fff" },
  in_progress: { bg: "#d97706", hover: "#b45309", text: "#fff" },
  completed:   { bg: "#059669", hover: "#047857", text: "#fff" },
  cancelled:   { bg: "#dc2626", hover: "#b91c1c", text: "#fff" },
  archived:    { bg: "#475569", hover: "#374151", text: "#fff" },
} as const;

// ─── Display badge config (table rows — not clickable) ──────────────

const STATUS_DISPLAY: Record<string, { bg: string; color: string; border: string; label: string }> = {
  pending:      { bg: "rgba(124,58,237,0.12)", color: "#a78bfa", border: "rgba(124,58,237,0.3)", label: "Pending" },
  scheduled:    { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.35)", label: "Scheduled" },
  rescheduled:  { bg: "rgba(37,99,235,0.15)", color: "#60a5fa", border: "rgba(37,99,235,0.35)", label: "Rescheduled" },
  in_progress:  { bg: "rgba(217,119,6,0.15)", color: "#fbbf24", border: "rgba(217,119,6,0.35)", label: "In Progress" },
  completed:    { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.35)", label: "Completed" },
  cancelled:    { bg: "rgba(100,116,139,0.12)", color: "#94a3b8", border: "rgba(100,116,139,0.3)", label: "Cancelled" },
  archived:     { bg: "rgba(71,85,105,0.15)", color: "#94a3b8", border: "rgba(71,85,105,0.3)", label: "Archived" },
};

// ─── Status transition map ──────────────────────────────────────────

type TransitionDef = { status: string; label: string; colorKey: keyof typeof PILL_COLORS; action?: "cancel" | "reschedule" | "archive" };

const STATUS_TRANSITIONS: Record<string, TransitionDef[]> = {
  pending: [
    { status: "scheduled", label: "Schedule", colorKey: "schedule" },
    { status: "cancelled", label: "Cancel", colorKey: "cancelled", action: "cancel" },
  ],
  scheduled: [
    { status: "rescheduled", label: "Re-Schedule", colorKey: "reschedule", action: "reschedule" },
    { status: "in_progress", label: "In Progress", colorKey: "in_progress" },
    { status: "cancelled", label: "Cancel", colorKey: "cancelled", action: "cancel" },
  ],
  rescheduled: [
    { status: "rescheduled", label: "Re-Schedule", colorKey: "reschedule", action: "reschedule" },
    { status: "in_progress", label: "In Progress", colorKey: "in_progress" },
    { status: "cancelled", label: "Cancel", colorKey: "cancelled", action: "cancel" },
  ],
  in_progress: [
    { status: "completed", label: "Completed", colorKey: "completed" },
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

// Filter option lists (for column headers)
const TYPE_OPTIONS = [
  { value: "hes", label: "HES Assessment" },
  { value: "inspector", label: "Home Inspection" },
  { value: "leaf_followup", label: "LEAF Follow-up" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
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

// ─── KPI Card ───────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px" }}>
      <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
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
      <div style={{
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
  members,
  onClose,
  onDone,
}: {
  job: ScheduleJob;
  members: { id: string; name: string; type: MemberType }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [date, setDate] = useState(job.scheduled_date);
  const [time, setTime] = useState(job.scheduled_time ?? "");
  const [memberId, setMemberId] = useState(job.team_member_id ?? "");
  const [saving, setSaving] = useState(false);

  const typeMembers = members.filter((m) => m.type === job.type);

  async function handleConfirm() {
    if (!date) return;
    setSaving(true);
    try {
      await rescheduleJob(job.id, job.type, {
        scheduled_date: date,
        scheduled_time: time || undefined,
        team_member_id: memberId || undefined,
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
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="admin-input" style={{ fontSize: 13, padding: "9px 12px" }}>
            <option value="">Unassigned</option>
            {typeMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
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
  const [sqFt, setSqFt] = useState("");

  const hesCat = catalog.find((c) => c.slug === "hes");
  const inspCat = catalog.find((c) => c.slug === "inspection");
  const activeCat = serviceType === "hes" ? hesCat : inspCat;
  const activeTiers = (activeCat?.tiers ?? []).filter((t) => t.is_active);
  const activeAddons = (activeCat?.addons ?? []).filter((a) => a.is_active);

  function handleSqFtChange(val: string) {
    setSqFt(val);
    const sqFtNum = parseInt(val, 10);
    if (!isNaN(sqFtNum) && activeTiers.length > 0) {
      const match = activeTiers.find((t) => sqFtNum >= (t.sq_ft_min ?? 0) && sqFtNum <= (t.sq_ft_max ?? Infinity));
      if (match) setSelectedTierId(match.id);
    }
  }

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
  const totalPrice = basePrice + addonsTotal;
  const typeMembers = members.filter((m) => m.type === serviceType);

  function handleTypeSwitch(newType: MemberType) {
    setServiceType(newType); setMemberId(""); setSelectedTierId(""); setSelectedAddonIds(new Set()); setSqFt("");
  }

  async function handleSubmit() {
    if (!customerName.trim() || !date) return;
    setSaving(true);
    try {
      await createScheduleJob({
        type: serviceType, team_member_id: memberId || undefined,
        customer_name: customerName.trim(), customer_email: customerEmail.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined, address: address.trim() || undefined,
        city: city.trim() || undefined, state: state.trim() || undefined, zip: zip.trim() || undefined,
        scheduled_date: date, scheduled_time: time || undefined,
        special_notes: notes.trim() || undefined, invoice_amount: totalPrice > 0 ? totalPrice : undefined,
      });
      onScheduled();
    } catch (err: any) { alert(err?.message ?? "Failed to schedule service."); } finally { setSaving(false); }
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
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sq Ft (optional)</label>
          <input type="number" value={sqFt} onChange={(e) => handleSqFtChange(e.target.value)} placeholder="e.g. 2000" className="admin-input" style={{ fontSize: 13, padding: "9px 12px", width: 160 }} />
        </div>
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

function JobDetailContent({
  job,
  onStatusUpdated,
  onCancelRequest,
  onRescheduleRequest,
  onArchiveRequest,
  onDeleteRequest,
}: {
  job: ScheduleJob;
  onStatusUpdated: (msg: string) => void;
  onCancelRequest: (job: ScheduleJob) => void;
  onRescheduleRequest: (job: ScheduleJob) => void;
  onArchiveRequest: (job: ScheduleJob) => void;
  onDeleteRequest: (job: ScheduleJob) => void;
}) {
  const [notes, setNotes] = useState(job.special_notes ?? "");
  const [busy, setBusy] = useState(false);

  const addr = fullAddress(job);
  const mapUrl = makeMapEmbed(job.address, job.city, job.state, job.zip);
  const directionsUrl = makeMapHref(job.address, job.city, job.state, job.zip);
  const typeBadge = JOB_TYPE_BADGE[job.type] ?? JOB_TYPE_BADGE.hes;
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
          <DisplayBadge config={statusBadge} />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: 0 }}>{job.customer_name}</h3>
        <p style={{ fontSize: 13, color: TEXT_SEC, margin: "4px 0 0" }}>{typeLabel(job.type)}</p>
      </div>

      <div style={{ height: 1, background: BORDER }} />

      {/* Job Details */}
      <div>
        <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
          Job Details
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
          <div>
            <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Phone</div>
            {job.customer_phone ? (
              <a href={`tel:${job.customer_phone}`} style={{ fontSize: 13, color: "#60a5fa", textDecoration: "none", fontWeight: 600 }}>{job.customer_phone}</a>
            ) : <div style={{ fontSize: 13, color: TEXT_DIM }}>{"\u2014"}</div>}
          </div>
          <div>
            <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Email</div>
            {job.customer_email ? (
              <a href={`mailto:${job.customer_email}`} style={{ fontSize: 13, color: "#60a5fa", textDecoration: "none", fontWeight: 600 }}>{job.customer_email}</a>
            ) : <div style={{ fontSize: 13, color: TEXT_DIM }}>{"\u2014"}</div>}
          </div>
          <div>
            <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Address</div>
            <div style={{ fontSize: 13, color: TEXT_SEC }}>{addr || "\u2014"}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Assigned To</div>
            <div style={{ fontSize: 13, color: job.team_member_name ? TEXT_SEC : TEXT_DIM }}>{job.team_member_name || "Unassigned"}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Scheduled</div>
            <div style={{ fontSize: 13, color: TEXT_SEC }}>{formatDate(job.scheduled_date)} at {formatTime(job.scheduled_time)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Amount</div>
            <div style={{ fontSize: 13, color: job.invoice_amount ? TEXT : TEXT_DIM, fontWeight: 600 }}>
              {job.invoice_amount ? `$${job.invoice_amount}` : "\u2014"}
            </div>
          </div>
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

      {/* Actions */}
      <div>
        <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
          Actions
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {renderActionPills()}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

type ViewMode = "list" | "calendar";

export default function SchedulePageClient({ data }: { data: SchedulePageData }) {
  const router = useRouter();
  const today = useMemo(() => todayStr(), []);
  const { monday, sunday } = useMemo(() => getWeekBounds(), []);
  const { monthStart, monthEnd } = useMemo(() => getMonthBounds(), []);

  const [viewMode, setViewMode] = useState<ViewMode>("list");

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

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const selectedJob = useMemo(() => selectedJobId ? data.jobs.find((j) => j.id === selectedJobId) ?? null : null, [selectedJobId, data.jobs]);

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
      if (typeFilter.length > 0 && !typeFilter.includes(job.type)) return false;
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

  // Build active filter chips
  const activeFilters = useMemo(() => {
    const chips: ActiveFilter[] = [];
    if (dateFilter.preset) {
      const labels: Record<string, string> = { today: "Today", this_week: "This Week", this_month: "This Month" };
      chips.push({ key: "date", label: "Date", value: labels[dateFilter.preset] ?? dateFilter.preset, onClear: () => setDateFilter({}) });
    } else if (dateFilter.from || dateFilter.to) {
      chips.push({ key: "date", label: "Date", value: `${dateFilter.from ?? "…"} → ${dateFilter.to ?? "…"}`, onClear: () => setDateFilter({}) });
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
    if (statusFilter.length > 0) {
      const labels = statusFilter.map((v) => STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v).join(", ");
      chips.push({ key: "status", label: "Status", value: labels, onClear: () => setStatusFilter([]) });
    }
    if (amountRange.min || amountRange.max) {
      chips.push({ key: "amount", label: "Amount", value: `$${amountRange.min ?? "0"} – $${amountRange.max ?? "∞"}`, onClear: () => setAmountRange({}) });
    }
    if (globalSearch.trim()) chips.push({ key: "search", label: "Search", value: globalSearch, onClear: () => setGlobalSearch("") });
    return chips;
  }, [dateFilter, timeFilter, customerSearch, phoneSearch, addressSearch, typeFilter, assignedFilter, statusFilter, amountRange, globalSearch, memberOptions]);

  function clearAllFilters() {
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
    if (job.status === "completed" || job.status === "cancelled" || job.status === "archived") return false;
    return job.scheduled_date < today;
  }

  const COL_COUNT = 9;
  const panelOpen = selectedJob !== null;

  return (
    <>
    <style>{`@keyframes schedPanelFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginRight: panelOpen ? PANEL_WIDTH : 0, transition: "margin-right 300ms ease" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>Schedule</h1>
          <p style={{ fontSize: 13, color: TEXT_DIM, margin: "4px 0 0", fontWeight: 500 }}>
            Manage upcoming assessments, inspections, and service requests
          </p>
        </div>
        <button type="button" onClick={openScheduleModal} style={{
          padding: "8px 14px", borderRadius: 8, border: "none", background: PURPLE,
          color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>+ Schedule Service</button>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        <KpiCard label="Today's Jobs" value={data.stats.todayJobs} color="#fbbf24" />
        <KpiCard label="This Week" value={data.stats.thisWeek} color="#60a5fa" />
        <KpiCard label="Pending Requests" value={data.stats.pendingRequests} color="#fb923c" />
        <KpiCard label="Completed This Month" value={data.stats.completedThisMonth} color={EMERALD} />
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
        <input value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)}
          placeholder="Search customer, address, team member..."
          className="admin-input" style={{ maxWidth: 340, fontSize: 13, padding: "7px 12px" }} />
      </div>

      {/* Active Filter Chips */}
      <ActiveFilterBar filters={activeFilters} onClearAll={clearAllFilters} />

      {/* Content */}
      {viewMode === "list" ? (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table" style={{ minWidth: 1100, tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <FilterableHeader
                    label="Date" filterType="date-range" width={120}
                    filterValue={dateFilter} onFilterChange={(v) => setDateFilter(v as { preset?: string; from?: string; to?: string })}
                    sortable sortDir={sortColumn === "date" ? sortDir : null} onSortChange={handleSort("date")}
                    isOpen={openColumn === "date"} onOpen={() => setOpenColumn("date")} onClose={() => setOpenColumn(null)}
                  />
                  <FilterableHeader
                    label="Time" filterType="multi-select" width={80}
                    options={TIME_SEGMENT_OPTIONS}
                    optionColors={TIME_SEGMENT_COLORS}
                    filterValue={timeFilter} onFilterChange={(v) => setTimeFilter(v as string[])}
                    isOpen={openColumn === "time"} onOpen={() => setOpenColumn("time")} onClose={() => setOpenColumn(null)}
                  />
                  <FilterableHeader
                    label="Customer" filterType="search" width={150}
                    filterValue={customerSearch} onFilterChange={(v) => setCustomerSearch(v as string)}
                    sortable sortDir={sortColumn === "customer" ? sortDir : null} onSortChange={handleSort("customer")}
                    isOpen={openColumn === "customer"} onOpen={() => setOpenColumn("customer")} onClose={() => setOpenColumn(null)}
                  />
                  <FilterableHeader
                    label="Phone" filterType="search" width={120}
                    filterValue={phoneSearch} onFilterChange={(v) => setPhoneSearch(v as string)}
                    isOpen={openColumn === "phone"} onOpen={() => setOpenColumn("phone")} onClose={() => setOpenColumn(null)}
                  />
                  <FilterableHeader
                    label="Address" filterType="search"
                    filterValue={addressSearch} onFilterChange={(v) => setAddressSearch(v as string)}
                    isOpen={openColumn === "address"} onOpen={() => setOpenColumn("address")} onClose={() => setOpenColumn(null)}
                  />
                  <FilterableHeader
                    label="Type" filterType="multi-select" width={110}
                    options={TYPE_OPTIONS}
                    optionColors={TYPE_OPTION_COLORS}
                    filterValue={typeFilter} onFilterChange={(v) => setTypeFilter(v as string[])}
                    isOpen={openColumn === "type"} onOpen={() => setOpenColumn("type")} onClose={() => setOpenColumn(null)}
                  />
                  <FilterableHeader
                    label="Assigned To" filterType="multi-select" width={120}
                    options={memberOptions}
                    filterValue={assignedFilter} onFilterChange={(v) => setAssignedFilter(v as string[])}
                    isOpen={openColumn === "assigned"} onOpen={() => setOpenColumn("assigned")} onClose={() => setOpenColumn(null)}
                  />
                  <FilterableHeader
                    label="Status" filterType="multi-select" width={100}
                    options={STATUS_OPTIONS}
                    filterValue={statusFilter} onFilterChange={(v) => setStatusFilter(v as string[])}
                    isOpen={openColumn === "status"} onOpen={() => setOpenColumn("status")} onClose={() => setOpenColumn(null)}
                  />
                  <FilterableHeader
                    label="Amount" filterType="range" width={80} align="right"
                    filterValue={amountRange} onFilterChange={(v) => setAmountRange(v as { min?: string; max?: string })}
                    sortable sortDir={sortColumn === "amount" ? sortDir : null} onSortChange={handleSort("amount")}
                    isOpen={openColumn === "amount"} onOpen={() => setOpenColumn("amount")} onClose={() => setOpenColumn(null)}
                  />
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => {
                  const overdue = isOverdue(job);
                  const todayRow = job.scheduled_date === today;
                  const isMuted = job.status === "completed" || job.status === "cancelled" || job.status === "archived";
                  const isSelected = selectedJobId === job.id;
                  const typeBadge = JOB_TYPE_BADGE[job.type] ?? JOB_TYPE_BADGE.hes;
                  const statusBadge = STATUS_DISPLAY[job.status] ?? STATUS_DISPLAY.pending;

                  const leftBorder = isSelected
                    ? "3px solid rgba(16,185,129,0.6)"
                    : overdue
                    ? "3px solid rgba(239,68,68,0.6)"
                    : todayRow && !isMuted
                    ? "3px solid rgba(16,185,129,0.6)"
                    : "3px solid transparent";

                  const textColor = isMuted ? TEXT_DIM : TEXT;
                  const secColor = isMuted ? TEXT_DIM : TEXT_SEC;
                  const addr = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");

                  return (
                    <tr
                      key={job.id}
                      onClick={() => handleRowClick(job.id)}
                      style={{
                        cursor: "pointer", borderLeft: leftBorder,
                        background: isSelected ? "rgba(16,185,129,0.08)" : undefined,
                        transition: "background 0.1s ease",
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "rgba(148,163,184,0.05)"; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = ""; }}
                    >
                        {/* Date */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: 600, fontSize: 13, color: overdue ? "#f87171" : textColor }}>
                              {formatDate(job.scheduled_date)}
                            </span>
                            {todayRow && !isMuted && (
                              <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", background: EMERALD, padding: "1px 5px", borderRadius: 4, textTransform: "uppercase" }}>Today</span>
                            )}
                            {overdue && (
                              <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", background: "#ef4444", padding: "1px 5px", borderRadius: 4, textTransform: "uppercase" }}>Overdue</span>
                            )}
                          </div>
                        </td>
                        {/* Time */}
                        <td><span style={{ fontSize: 13, color: overdue ? "#fca5a5" : secColor }}>{formatTime(job.scheduled_time)}</span></td>
                        {/* Customer */}
                        <td><span style={{ fontWeight: 600, fontSize: 13, color: textColor }}>{job.customer_name}</span></td>
                        {/* Phone */}
                        <td>
                          {job.customer_phone ? (
                            <a href={`tel:${job.customer_phone}`} onClick={(e) => e.stopPropagation()}
                              style={{ fontSize: 13, color: isMuted ? TEXT_DIM : "#60a5fa", textDecoration: "none", fontWeight: 500 }}>
                              {job.customer_phone}
                            </a>
                          ) : <span style={{ fontSize: 13, color: TEXT_DIM }}>{"\u2014"}</span>}
                        </td>
                        {/* Address */}
                        <td>
                          {addr ? (
                            <a href={makeMapHref(job.address, job.city, job.state, job.zip)} target="_blank" rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{ fontSize: 13, color: isMuted ? TEXT_DIM : "#60a5fa", textDecoration: "none", fontWeight: 500 }}>
                              {addr}
                            </a>
                          ) : <span style={{ fontSize: 13, color: TEXT_DIM }}>{"\u2014"}</span>}
                        </td>
                        {/* Type */}
                        <td><DisplayBadge config={typeBadge} /></td>
                        {/* Assigned To */}
                        <td><span style={{ fontSize: 13, color: job.team_member_name ? secColor : TEXT_DIM }}>{job.team_member_name || "Unassigned"}</span></td>
                        {/* Status */}
                        <td><DisplayBadge config={statusBadge} /></td>
                        {/* Amount */}
                        <td style={{ textAlign: "right" }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: job.invoice_amount ? textColor : TEXT_DIM }}>
                            {job.invoice_amount ? `$${job.invoice_amount}` : "\u2014"}
                          </span>
                        </td>
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
      ) : (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "60px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>&#128197;</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 6 }}>Calendar View</div>
          <div style={{ fontSize: 13, color: TEXT_MUTED }}>Calendar view is coming soon. Use the List view to manage your schedule.</div>
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
          members={data.members}
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

      {/* Toast */}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </div>

    {/* Inline side panel — no backdrop, no portal */}
    <div style={{
      position: "fixed", right: 0, top: 0, height: "100%",
      width: PANEL_WIDTH, zIndex: 40,
      background: "#0f172a", borderLeft: `1px solid ${BORDER}`,
      boxShadow: panelOpen ? "-4px 0 24px rgba(0,0,0,0.3)" : "none",
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
              onStatusUpdated={(msg) => { setToast(msg); handleRefresh(); }}
              onCancelRequest={(j) => setCancelTarget(j)}
              onRescheduleRequest={(j) => setRescheduleTarget(j)}
              onArchiveRequest={(j) => setArchiveTarget(j)}
              onDeleteRequest={(j) => setDeleteTarget(j)}
            />
          </div>
        )}
      </div>
    </div>
    </>
  );
}
