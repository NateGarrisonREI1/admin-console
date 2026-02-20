"use client";

import { useState, useTransition } from "react";
import type { InspectorTeamMember, InspectorScheduleEntry } from "@/types/admin-ops";
import { addInspectorMember, scheduleInspection, updateInspectorEntry } from "./actions";
import { XMarkIcon } from "@heroicons/react/24/outline";

// ─── Constants ───────────────────────────────────────────────────────────────

const INSPECTION_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "203k", label: "203k" },
  { value: "commercial", label: "Commercial" },
  { value: "pre_listing", label: "Pre-Listing" },
  { value: "new_construction", label: "New Construction" },
];

const TIME_OPTIONS = [
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" },
];

const CERTIFICATION_OPTIONS = ["ASHI", "InterNACHI", "State Licensed", "Radon", "Mold"];

const SERVICE_AREA_OPTIONS = [
  "Portland Metro",
  "Salem",
  "Eugene",
  "Bend",
  "Medford",
  "Corvallis",
];

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getWeekDates(): string[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function fmtDate(iso?: string | null) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(t?: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtMoney(v?: number | null) {
  if (v == null) return "\u2014";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function inspectionTypeLabel(t: string) {
  return INSPECTION_TYPES.find((x) => x.value === t)?.label ?? t;
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const tones: Record<string, { bg: string; bd: string; tx: string }> = {
    scheduled: { bg: "rgba(59,130,246,0.12)", bd: "rgba(59,130,246,0.30)", tx: "#60a5fa" },
    confirmed: { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.30)", tx: "#10b981" },
    in_progress: { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.30)", tx: "#fbbf24" },
    completed: { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.30)", tx: "#10b981" },
    cancelled: { bg: "rgba(239,68,68,0.12)", bd: "rgba(239,68,68,0.30)", tx: "#f87171" },
    no_show: { bg: "rgba(239,68,68,0.12)", bd: "rgba(239,68,68,0.30)", tx: "#f87171" },
    rescheduled: { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.30)", tx: "#fbbf24" },
  };
  const labels: Record<string, string> = {
    scheduled: "Scheduled",
    confirmed: "Confirmed",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No Show",
    rescheduled: "Rescheduled",
  };
  const t = tones[status] ?? { bg: "rgba(51,65,85,0.5)", bd: "#475569", tx: "#cbd5e1" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 9999,
        border: `1px solid ${t.bd}`,
        background: t.bg,
        color: t.tx,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {labels[status] ?? status}
    </span>
  );
}

function InspTypeBadge({ type }: { type: string }) {
  const colors: Record<string, { bg: string; tx: string }> = {
    standard: { bg: "rgba(99,102,241,0.15)", tx: "#a5b4fc" },
    "203k": { bg: "rgba(245,158,11,0.15)", tx: "#fbbf24" },
    commercial: { bg: "rgba(59,130,246,0.15)", tx: "#60a5fa" },
    pre_listing: { bg: "rgba(16,185,129,0.15)", tx: "#34d399" },
    new_construction: { bg: "rgba(239,68,68,0.15)", tx: "#f87171" },
  };
  const c = colors[type] ?? { bg: "rgba(51,65,85,0.5)", tx: "#94a3b8" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 6,
        background: c.bg,
        color: c.tx,
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {inspectionTypeLabel(type)}
    </span>
  );
}

function MemberStatusBadge({ status }: { status: string }) {
  const active = status === "active";
  const onLeave = status === "on_leave";
  const bg = active
    ? "rgba(16,185,129,0.12)"
    : onLeave
      ? "rgba(245,158,11,0.12)"
      : "rgba(239,68,68,0.12)";
  const bd = active
    ? "rgba(16,185,129,0.30)"
    : onLeave
      ? "rgba(245,158,11,0.30)"
      : "rgba(239,68,68,0.30)";
  const tx = active ? "#10b981" : onLeave ? "#fbbf24" : "#f87171";
  const label = active ? "Active" : onLeave ? "On Leave" : "Inactive";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 9999,
        border: `1px solid ${bd}`,
        background: bg,
        color: tx,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ fontSize: 12, color: i < full ? "#f59e0b" : "#334155" }}>
          {"\u2605"}
        </span>
      ))}
      <span style={{ fontSize: 11, color: "#64748b", marginLeft: 4 }}>
        {rating > 0 ? rating.toFixed(1) : "N/A"}
      </span>
    </span>
  );
}

// ─── Form Field Wrapper ───────────────────────────────────────────────────────

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}{required && <span style={{ color: "#f87171", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Checkbox Group ───────────────────────────────────────────────────────────

function CheckboxGroup({
  options,
  selected,
  onChange,
  accentColor = "#10b981",
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  accentColor?: string;
}) {
  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const checked = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            style={{
              padding: "5px 12px",
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              border: checked ? `1px solid ${accentColor}44` : "1px solid #334155",
              background: checked ? `${accentColor}18` : "#1e293b",
              color: checked ? accentColor : "#94a3b8",
              transition: "all 0.15s ease",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 2,
      }}
    >
      {children}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px dashed #334155",
        background: "rgba(30,41,59,0.5)",
        padding: "40px 16px",
        textAlign: "center",
        color: "#64748b",
        fontSize: 14,
      }}
    >
      {message}
    </div>
  );
}

// ─── Modal Shell ──────────────────────────────────────────────────────────────

function ModalShell({
  onClose,
  maxWidth = 500,
  children,
}: {
  onClose: () => void;
  maxWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.60)",
          backdropFilter: "blur(4px)",
        }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth,
          borderRadius: 12,
          background: "#0f172a",
          border: "1px solid #334155",
          boxShadow: "0 30px 80px rgba(0,0,0,0.60)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid #334155",
        padding: "16px 20px",
      }}
    >
      <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f1f5f9" }}>{title}</h3>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: "#64748b",
          cursor: "pointer",
          padding: 4,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
        }}
      >
        <XMarkIcon style={{ width: 20, height: 20 }} />
      </button>
    </div>
  );
}

function ModalFooter({
  onCancel,
  onConfirm,
  cancelLabel = "Cancel",
  confirmLabel,
  loading,
  disabled,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  cancelLabel?: string;
  confirmLabel: string;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        borderTop: "1px solid #334155",
        padding: "14px 20px",
      }}
    >
      <button
        onClick={onCancel}
        disabled={loading}
        style={{
          flex: 1,
          padding: "10px 16px",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          border: "1px solid #334155",
          background: "#334155",
          color: "#f1f5f9",
          opacity: loading ? 0.5 : 1,
        }}
      >
        {cancelLabel}
      </button>
      <button
        onClick={onConfirm}
        disabled={loading || disabled}
        style={{
          flex: 1,
          padding: "10px 16px",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          border: "none",
          background: "#10b981",
          color: "#fff",
          opacity: loading || disabled ? 0.5 : 1,
        }}
      >
        {loading ? "Saving..." : confirmLabel}
      </button>
    </div>
  );
}

// ─── Schedule Inspection Modal ────────────────────────────────────────────────

type ScheduleForm = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string;
  city: string;
  zip: string;
  inspection_type: string;
  scheduled_date: string;
  scheduled_time: string;
  team_member_id: string;
  special_notes: string;
  invoice_amount: string;
};

function ScheduleInspectionModal({
  members,
  onClose,
  onSuccess,
}: {
  members: InspectorTeamMember[];
  onClose: () => void;
  onSuccess: (entry: InspectorScheduleEntry) => void;
}) {
  const [form, setForm] = useState<ScheduleForm>({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    address: "",
    city: "",
    zip: "",
    inspection_type: "standard",
    scheduled_date: "",
    scheduled_time: "",
    team_member_id: "",
    special_notes: "",
    invoice_amount: "400",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(k: keyof ScheduleForm, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSubmit() {
    if (!form.customer_name.trim()) {
      setError("Customer name is required.");
      return;
    }
    if (!form.scheduled_date) {
      setError("Scheduled date is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await scheduleInspection({
        customer_name: form.customer_name.trim(),
        customer_email: form.customer_email.trim() || undefined,
        customer_phone: form.customer_phone.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        zip: form.zip.trim() || undefined,
        inspection_type: form.inspection_type || undefined,
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time || undefined,
        team_member_id: form.team_member_id || undefined,
        special_notes: form.special_notes.trim() || undefined,
        invoice_amount: form.invoice_amount ? Number(form.invoice_amount) : 400,
      });
      onSuccess(result as InspectorScheduleEntry);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to schedule inspection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell onClose={onClose} maxWidth={500}>
      <ModalHeader title="Schedule Inspection" onClose={onClose} />
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Customer Info */}
        <FormField label="Customer Name" required>
          <input
            className="admin-input"
            placeholder="Full name"
            value={form.customer_name}
            onChange={(e) => set("customer_name", e.target.value)}
          />
        </FormField>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="Email">
            <input
              className="admin-input"
              type="email"
              placeholder="email@example.com"
              value={form.customer_email}
              onChange={(e) => set("customer_email", e.target.value)}
            />
          </FormField>
          <FormField label="Phone">
            <input
              className="admin-input"
              type="tel"
              placeholder="(503) 000-0000"
              value={form.customer_phone}
              onChange={(e) => set("customer_phone", e.target.value)}
            />
          </FormField>
        </div>

        {/* Address */}
        <FormField label="Address">
          <input
            className="admin-input"
            placeholder="Street address"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </FormField>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="City">
            <input
              className="admin-input"
              placeholder="City"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </FormField>
          <FormField label="ZIP">
            <input
              className="admin-input"
              placeholder="97201"
              value={form.zip}
              onChange={(e) => set("zip", e.target.value)}
            />
          </FormField>
        </div>

        {/* Inspection Type */}
        <FormField label="Inspection Type">
          <select
            className="admin-select"
            value={form.inspection_type}
            onChange={(e) => set("inspection_type", e.target.value)}
          >
            {INSPECTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Date & Time */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="Date" required>
            <input
              className="admin-input"
              type="date"
              value={form.scheduled_date}
              onChange={(e) => set("scheduled_date", e.target.value)}
            />
          </FormField>
          <FormField label="Time">
            <select
              className="admin-select"
              value={form.scheduled_time}
              onChange={(e) => set("scheduled_time", e.target.value)}
            >
              <option value="">Select time</option>
              {TIME_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Assign to */}
        <FormField label="Assign To">
          <select
            className="admin-select"
            value={form.team_member_id}
            onChange={(e) => set("team_member_id", e.target.value)}
          >
            <option value="">Auto-assign</option>
            {members
              .filter((m) => m.status === "active")
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </FormField>

        {/* Special Notes */}
        <FormField label="Special Notes">
          <textarea
            className="admin-input"
            placeholder="Any special instructions or notes..."
            rows={3}
            style={{ resize: "vertical" }}
            value={form.special_notes}
            onChange={(e) => set("special_notes", e.target.value)}
          />
        </FormField>

        {/* Invoice Amount */}
        <FormField label="Invoice Amount ($)">
          <input
            className="admin-input"
            type="number"
            min={0}
            step={50}
            placeholder="400"
            value={form.invoice_amount}
            onChange={(e) => set("invoice_amount", e.target.value)}
          />
        </FormField>

        {error && (
          <div
            style={{
              borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.30)",
              background: "rgba(239,68,68,0.10)",
              padding: 12,
              fontSize: 13,
              color: "#f87171",
            }}
          >
            {error}
          </div>
        )}
      </div>

      <ModalFooter
        onCancel={onClose}
        onConfirm={handleSubmit}
        confirmLabel="Schedule"
        loading={loading}
        disabled={!form.customer_name.trim() || !form.scheduled_date}
      />
    </ModalShell>
  );
}

// ─── Add Inspector Modal ──────────────────────────────────────────────────────

type AddInspectorForm = {
  name: string;
  email: string;
  phone: string;
  license_number: string;
  certifications: string[];
  service_areas: string[];
};

function AddInspectorModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (member: InspectorTeamMember) => void;
}) {
  const [form, setForm] = useState<AddInspectorForm>({
    name: "",
    email: "",
    phone: "",
    license_number: "",
    certifications: [],
    service_areas: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof AddInspectorForm>(k: K, v: AddInspectorForm[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError("Inspector name is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await addInspectorMember({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        license_number: form.license_number.trim() || undefined,
        certifications: form.certifications,
        service_areas: form.service_areas,
      });
      onSuccess(result as InspectorTeamMember);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add inspector.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell onClose={onClose} maxWidth={500}>
      <ModalHeader title="Add Inspector" onClose={onClose} />
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Name */}
        <FormField label="Name" required>
          <input
            className="admin-input"
            placeholder="Inspector full name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </FormField>

        {/* Email & Phone */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="Email">
            <input
              className="admin-input"
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </FormField>
          <FormField label="Phone">
            <input
              className="admin-input"
              type="tel"
              placeholder="(503) 000-0000"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </FormField>
        </div>

        {/* License Number */}
        <FormField label="License Number">
          <input
            className="admin-input"
            placeholder="OR-INSP-000000"
            value={form.license_number}
            onChange={(e) => set("license_number", e.target.value)}
          />
        </FormField>

        {/* Certifications */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionLabel>Certifications</SectionLabel>
          <CheckboxGroup
            options={CERTIFICATION_OPTIONS}
            selected={form.certifications}
            onChange={(v) => set("certifications", v)}
            accentColor="#f59e0b"
          />
        </div>

        {/* Service Areas */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionLabel>Service Areas</SectionLabel>
          <CheckboxGroup
            options={SERVICE_AREA_OPTIONS}
            selected={form.service_areas}
            onChange={(v) => set("service_areas", v)}
            accentColor="#10b981"
          />
        </div>

        {error && (
          <div
            style={{
              borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.30)",
              background: "rgba(239,68,68,0.10)",
              padding: 12,
              fontSize: 13,
              color: "#f87171",
            }}
          >
            {error}
          </div>
        )}
      </div>

      <ModalFooter
        onCancel={onClose}
        onConfirm={handleSubmit}
        confirmLabel="Add Inspector"
        loading={loading}
        disabled={!form.name.trim()}
      />
    </ModalShell>
  );
}

// ─── Week Calendar View ───────────────────────────────────────────────────────

function WeekCalendar({
  members,
  schedule,
  weekDates,
}: {
  members: InspectorTeamMember[];
  schedule: InspectorScheduleEntry[];
  weekDates: string[];
}) {
  const activeMembers = members.filter((m) => m.status !== "inactive");

  function entriesFor(memberId: string, date: string) {
    return schedule.filter(
      (e) => e.team_member_id === memberId && e.scheduled_date === date && e.status !== "cancelled"
    );
  }

  function unassignedFor(date: string) {
    return schedule.filter(
      (e) => !e.team_member_id && e.scheduled_date === date && e.status !== "cancelled"
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div
      style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Calendar grid header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "160px repeat(7, 1fr)",
          borderBottom: "1px solid #334155",
          background: "#1a2a3a",
        }}
      >
        <div style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Inspector
        </div>
        {weekDates.map((date, i) => (
          <div
            key={date}
            style={{
              padding: "10px 8px",
              textAlign: "center",
              borderLeft: "1px solid #334155",
              background: date === today ? "rgba(245,158,11,0.08)" : undefined,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: date === today ? "#f59e0b" : "#64748b", textTransform: "uppercase" }}>
              {WEEK_DAYS[i]}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: date === today ? "#f59e0b" : "#94a3b8", marginTop: 2 }}>
              {new Date(date + "T12:00:00").getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Member rows */}
      {activeMembers.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: "#64748b", fontSize: 13 }}>
          No active inspectors. Add an inspector to view the schedule.
        </div>
      ) : (
        activeMembers.map((member) => (
          <div
            key={member.id}
            style={{
              display: "grid",
              gridTemplateColumns: "160px repeat(7, 1fr)",
              borderBottom: "1px solid rgba(51,65,85,0.5)",
              minHeight: 72,
            }}
          >
            {/* Member label */}
            <div
              style={{
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                borderRight: "1px solid #334155",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{member.name}</div>
              {member.license_number && (
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>#{member.license_number}</div>
              )}
            </div>

            {/* Day cells */}
            {weekDates.map((date) => {
              const entries = entriesFor(member.id, date);
              return (
                <div
                  key={date}
                  style={{
                    padding: "6px 6px",
                    borderLeft: "1px solid #334155",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    background: date === today ? "rgba(245,158,11,0.04)" : undefined,
                  }}
                >
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        borderRadius: 6,
                        background: "rgba(245,158,11,0.10)",
                        border: "1px solid rgba(245,158,11,0.25)",
                        padding: "4px 6px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      {entry.scheduled_time && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b" }}>
                          {fmtTime(entry.scheduled_time)}
                        </div>
                      )}
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#f1f5f9", lineHeight: 1.2 }}>
                        {entry.customer_name}
                      </div>
                      {entry.address && (
                        <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.2 }}>
                          {entry.address}
                        </div>
                      )}
                      <InspTypeBadge type={entry.inspection_type} />
                      <StatusBadge status={entry.status} />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))
      )}

      {/* Unassigned row */}
      {weekDates.some((d) => unassignedFor(d).length > 0) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "160px repeat(7, 1fr)",
            borderTop: "1px solid #334155",
            minHeight: 60,
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              borderRight: "1px solid #334155",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", fontStyle: "italic" }}>Unassigned</div>
          </div>
          {weekDates.map((date) => {
            const entries = unassignedFor(date);
            return (
              <div
                key={date}
                style={{
                  padding: "6px 6px",
                  borderLeft: "1px solid #334155",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      borderRadius: 6,
                      background: "rgba(99,102,241,0.10)",
                      border: "1px solid rgba(99,102,241,0.25)",
                      padding: "4px 6px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    {entry.scheduled_time && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#a5b4fc" }}>
                        {fmtTime(entry.scheduled_time)}
                      </div>
                    )}
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#f1f5f9" }}>
                      {entry.customer_name}
                    </div>
                    <InspTypeBadge type={entry.inspection_type} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function InspectorTeamClient({
  members: initialMembers,
  schedule: initialSchedule,
}: {
  members: InspectorTeamMember[];
  schedule: InspectorScheduleEntry[];
}) {
  const [members, setMembers] = useState<InspectorTeamMember[]>(initialMembers);
  const [schedule, setSchedule] = useState<InspectorScheduleEntry[]>(initialSchedule);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const weekDates = getWeekDates();
  const today = new Date().toISOString().slice(0, 10);

  const upcomingSchedule = schedule.filter(
    (e) => e.status !== "completed" && e.status !== "cancelled"
  );
  const completedSchedule = schedule.filter((e) => e.status === "completed");

  const todayCount = schedule.filter(
    (e) => e.scheduled_date === today && e.status !== "cancelled"
  ).length;
  const activeCount = members.filter((m) => m.status === "active").length;
  const weekTotal = schedule.filter((e) => e.status !== "cancelled").length;

  async function handleStatusChange(id: string, status: string) {
    setUpdatingId(id);
    try {
      const updated = await updateInspectorEntry(id, { status });
      setSchedule((prev) =>
        prev.map((e) => (e.id === id ? (updated as InspectorScheduleEntry) : e))
      );
    } catch {
      // silently fail — could toast here
    } finally {
      setUpdatingId(null);
    }
  }

  function handleScheduleSuccess(entry: InspectorScheduleEntry) {
    startTransition(() => {
      setSchedule((prev) => [...prev, entry]);
      setShowScheduleModal(false);
    });
  }

  function handleMemberSuccess(member: InspectorTeamMember) {
    startTransition(() => {
      setMembers((prev) => [...prev, member]);
      setShowAddModal(false);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 12,
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.30)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              {"\uD83D\uDDD2"}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", letterSpacing: -0.3 }}>
              Home Inspector Team
            </h1>
          </div>
          <p style={{ marginTop: 6, fontSize: 13, color: "#94a3b8" }}>
            Manage inspectors, schedule inspections, and track this week&apos;s workload.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="admin-btn-secondary"
            style={{ fontSize: 13, padding: "9px 16px", borderRadius: 8 }}
          >
            + Schedule Inspection
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="admin-btn-primary"
            style={{ fontSize: 13, padding: "9px 16px", borderRadius: 8 }}
          >
            + Add Inspector
          </button>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────────────────────── */}
      <div className="admin-kpi-grid-3">
        {[
          { label: "Active Inspectors", value: String(activeCount), color: "#10b981" },
          { label: "Today's Inspections", value: String(todayCount), color: "#f59e0b" },
          { label: "This Week Total", value: String(weekTotal), color: "#60a5fa" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 12,
              padding: "16px 18px",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color, marginTop: 6 }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Team Members Table ─────────────────────────────────── */}
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #334155",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 9999,
              background: "#f59e0b",
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>
            Team Members
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#64748b",
              background: "#334155",
              borderRadius: 9999,
              padding: "2px 8px",
            }}
          >
            {members.length}
          </span>
        </div>

        {members.length === 0 ? (
          <div style={{ padding: 24 }}>
            <EmptyState message="No inspectors yet. Add your first inspector to get started." />
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>License #</th>
                  <th>Certifications</th>
                  <th>Today</th>
                  <th>Status</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const todayJobs = schedule.filter(
                    (e) =>
                      e.team_member_id === m.id &&
                      e.scheduled_date === today &&
                      e.status !== "cancelled"
                  ).length;
                  return (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>
                          {m.name}
                        </div>
                        {m.email && (
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>{m.email}</div>
                        )}
                      </td>
                      <td>
                        {m.license_number ? (
                          <span style={{ fontSize: 12, fontFamily: "monospace", color: "#cbd5e1" }}>
                            {m.license_number}
                          </span>
                        ) : (
                          <span style={{ color: "#475569", fontSize: 12 }}>&mdash;</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {m.certifications.length === 0 ? (
                            <span style={{ color: "#475569", fontSize: 12 }}>&mdash;</span>
                          ) : (
                            m.certifications.map((cert) => (
                              <span
                                key={cert}
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "2px 7px",
                                  borderRadius: 6,
                                  background: "rgba(245,158,11,0.12)",
                                  color: "#f59e0b",
                                  border: "1px solid rgba(245,158,11,0.25)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {cert}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: todayJobs > 0 ? "#f59e0b" : "#475569",
                          }}
                        >
                          {todayJobs > 0 ? `${todayJobs} inspection${todayJobs > 1 ? "s" : ""}` : "Free"}
                        </span>
                      </td>
                      <td>
                        <MemberStatusBadge status={m.status} />
                      </td>
                      <td>
                        <StarRating rating={m.avg_rating} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Week Calendar ──────────────────────────────────────── */}
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #334155",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: 9999, background: "#60a5fa" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Week at a Glance</span>
          <span style={{ fontSize: 12, color: "#64748b", marginLeft: 4 }}>
            {new Date(weekDates[0] + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            {" \u2013 "}
            {new Date(weekDates[6] + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 900 }}>
            <WeekCalendar members={members} schedule={schedule} weekDates={weekDates} />
          </div>
        </div>
      </div>

      {/* ── Upcoming Inspections Table ─────────────────────────── */}
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #334155",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: 9999, background: "#f59e0b" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Upcoming Inspections</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#64748b",
              background: "#334155",
              borderRadius: 9999,
              padding: "2px 8px",
            }}
          >
            {upcomingSchedule.length}
          </span>
        </div>

        {upcomingSchedule.length === 0 ? (
          <div style={{ padding: 24 }}>
            <EmptyState message="No upcoming inspections this week." />
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Address</th>
                  <th>Type</th>
                  <th>Date / Time</th>
                  <th>Inspector</th>
                  <th>Invoice</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingSchedule.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>
                        {entry.customer_name}
                      </div>
                      {entry.customer_phone && (
                        <div style={{ fontSize: 12, color: "#64748b" }}>{entry.customer_phone}</div>
                      )}
                    </td>
                    <td>
                      {entry.address ? (
                        <div>
                          <div style={{ fontSize: 13, color: "#cbd5e1" }}>{entry.address}</div>
                          {entry.city && (
                            <div style={{ fontSize: 12, color: "#64748b" }}>
                              {entry.city}{entry.zip ? `, ${entry.zip}` : ""}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "#475569", fontSize: 12 }}>&mdash;</span>
                      )}
                    </td>
                    <td>
                      <InspTypeBadge type={entry.inspection_type} />
                    </td>
                    <td>
                      <div style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 600 }}>
                        {fmtDate(entry.scheduled_date)}
                      </div>
                      {entry.scheduled_time && (
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          {fmtTime(entry.scheduled_time)}
                        </div>
                      )}
                    </td>
                    <td>
                      {entry.team_member ? (
                        <div style={{ fontSize: 13, color: "#f1f5f9" }}>
                          {entry.team_member.name}
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#94a3b8",
                            background: "rgba(51,65,85,0.5)",
                            border: "1px solid #475569",
                            padding: "2px 8px",
                            borderRadius: 9999,
                          }}
                        >
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>
                        {fmtMoney(entry.invoice_amount)}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", textTransform: "capitalize" }}>
                        {entry.payment_status}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={entry.status} />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <select
                        className="admin-select"
                        value={entry.status}
                        disabled={updatingId === entry.id}
                        onChange={(e) => handleStatusChange(entry.id, e.target.value)}
                        style={{ width: "auto", fontSize: 12, padding: "5px 10px" }}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="no_show">No Show</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="rescheduled">Rescheduled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Completed Inspections Table ────────────────────────── */}
      {completedSchedule.length > 0 && (
        <div
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid #334155",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 9999, background: "#10b981" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>
              Completed This Week
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#64748b",
                background: "#334155",
                borderRadius: 9999,
                padding: "2px 8px",
              }}
            >
              {completedSchedule.length}
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Address</th>
                  <th>Type</th>
                  <th>Completed</th>
                  <th>Inspector</th>
                  <th>Invoice</th>
                  <th>Payment</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {completedSchedule.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>
                        {entry.customer_name}
                      </div>
                    </td>
                    <td>
                      {entry.address ? (
                        <div style={{ fontSize: 13, color: "#cbd5e1" }}>
                          {entry.address}
                          {entry.city && (
                            <span style={{ color: "#64748b", fontSize: 12 }}>, {entry.city}</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "#475569", fontSize: 12 }}>&mdash;</span>
                      )}
                    </td>
                    <td>
                      <InspTypeBadge type={entry.inspection_type} />
                    </td>
                    <td style={{ color: "#94a3b8", fontSize: 13 }}>
                      {fmtDate(entry.completed_at ?? entry.scheduled_date)}
                    </td>
                    <td style={{ color: "#cbd5e1", fontSize: 13 }}>
                      {entry.team_member?.name ?? <span style={{ color: "#475569" }}>&mdash;</span>}
                    </td>
                    <td>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#10b981" }}>
                        {fmtMoney(entry.invoice_amount)}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 9999,
                          background:
                            entry.payment_status === "paid"
                              ? "rgba(16,185,129,0.12)"
                              : "rgba(245,158,11,0.12)",
                          color:
                            entry.payment_status === "paid" ? "#10b981" : "#fbbf24",
                          border:
                            entry.payment_status === "paid"
                              ? "1px solid rgba(16,185,129,0.30)"
                              : "1px solid rgba(245,158,11,0.30)",
                          textTransform: "capitalize",
                        }}
                      >
                        {entry.payment_status}
                      </span>
                    </td>
                    <td>
                      {entry.customer_rating ? (
                        <StarRating rating={entry.customer_rating} />
                      ) : (
                        <span style={{ color: "#475569", fontSize: 12 }}>&mdash;</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────── */}
      {showScheduleModal && (
        <ScheduleInspectionModal
          members={members}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={handleScheduleSuccess}
        />
      )}

      {showAddModal && (
        <AddInspectorModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleMemberSuccess}
        />
      )}
    </div>
  );
}
