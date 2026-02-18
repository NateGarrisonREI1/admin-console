// src/app/admin/hes-team/HesTeamClient.tsx
"use client";

import { useState, useTransition } from "react";
import type { HesTeamMember, HesScheduleEntry } from "@/types/admin-ops";
import { addHesTeamMember, scheduleHesAssessment, updateScheduleEntry } from "./actions";

// ─── Constants ───────────────────────────────────────────────────────────────

const CERTIFICATIONS = ["BPI", "DOE HES", "RESNET", "ENERGY STAR"];
const SERVICE_AREAS = ["Portland Metro", "Salem", "Eugene", "Bend", "Medford", "Corvallis"];
const TIME_SLOTS = [
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  scheduled:  { bg: "rgba(59,130,246,0.15)",  text: "#60a5fa", label: "Scheduled" },
  confirmed:  { bg: "rgba(16,185,129,0.15)",  text: "#34d399", label: "Confirmed" },
  completed:  { bg: "rgba(34,197,94,0.15)",   text: "#4ade80", label: "Completed" },
  no_show:    { bg: "rgba(239,68,68,0.15)",   text: "#f87171", label: "No Show" },
  cancelled:  { bg: "rgba(100,116,139,0.15)", text: "#94a3b8", label: "Cancelled" },
  in_progress:{ bg: "rgba(251,191,36,0.15)",  text: "#fbbf24", label: "In Progress" },
  rescheduled:{ bg: "rgba(168,85,247,0.15)",  text: "#c084fc", label: "Rescheduled" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekDays(referenceMonday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(referenceMonday);
    d.setDate(referenceMonday.getDate() + i);
    return d;
  });
}

function getThisMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${suffix}`;
}

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function renderStars(rating: number | null): string {
  if (!rating) return "—";
  return "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
}

function statusBadge(status: string) {
  const s = STATUS_COLORS[status] ?? { bg: "rgba(100,116,139,0.15)", text: "#94a3b8", label: status };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: s.bg,
        color: s.text,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

// ─── Pill Toggle ─────────────────────────────────────────────────────────────

function PillToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "4px 12px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        border: active ? "1px solid rgba(16,185,129,0.5)" : "1px solid #334155",
        background: active ? "rgba(16,185,129,0.15)" : "transparent",
        color: active ? "#10b981" : "#64748b",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

// ─── Schedule Assessment Modal ────────────────────────────────────────────────

function ScheduleModal({
  members,
  onClose,
  onSuccess,
}: {
  members: HesTeamMember[];
  onClose: () => void;
  onSuccess: (entry: HesScheduleEntry) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    address: "",
    city: "",
    zip: "",
    scheduled_date: "",
    scheduled_time: "",
    team_member_id: "",
    special_notes: "",
    invoice_amount: "200",
  });
  const [error, setError] = useState<string | null>(null);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name.trim()) { setError("Customer name is required."); return; }
    if (!form.scheduled_date) { setError("Scheduled date is required."); return; }
    setError(null);

    startTransition(async () => {
      try {
        const result = await scheduleHesAssessment({
          customer_name: form.customer_name.trim(),
          customer_email: form.customer_email.trim() || undefined,
          customer_phone: form.customer_phone.trim() || undefined,
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          zip: form.zip.trim() || undefined,
          scheduled_date: form.scheduled_date,
          scheduled_time: form.scheduled_time || undefined,
          team_member_id: form.team_member_id || undefined,
          special_notes: form.special_notes.trim() || undefined,
          invoice_amount: form.invoice_amount ? Number(form.invoice_amount) : 200,
        });
        onSuccess(result as HesScheduleEntry);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to schedule assessment.");
      }
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#f1f5f9",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 4, display: "block" };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Schedule Assessment</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 0 }}>
            &#x2715;
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#f87171" }}>
              {error}
            </div>
          )}

          {/* Customer Name */}
          <div>
            <label style={labelStyle}>Customer Name <span style={{ color: "#ef4444" }}>*</span></label>
            <input style={inputStyle} value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} placeholder="Full name" required />
          </div>

          {/* Email + Phone */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} placeholder="email@example.com" />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} type="tel" value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} placeholder="(503) 555-0000" />
            </div>
          </div>

          {/* Address */}
          <div>
            <label style={labelStyle}>Address</label>
            <input style={inputStyle} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Street address" />
          </div>

          {/* City + ZIP */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>City</label>
              <input style={inputStyle} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="City" />
            </div>
            <div>
              <label style={labelStyle}>ZIP</label>
              <input style={inputStyle} value={form.zip} onChange={(e) => set("zip", e.target.value)} placeholder="97201" />
            </div>
          </div>

          {/* Date + Time */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Date <span style={{ color: "#ef4444" }}>*</span></label>
              <input style={inputStyle} type="date" value={form.scheduled_date} onChange={(e) => set("scheduled_date", e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>Time</label>
              <select style={inputStyle} value={form.scheduled_time} onChange={(e) => set("scheduled_time", e.target.value)}>
                <option value="">— Select time —</option>
                {TIME_SLOTS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assign to */}
          <div>
            <label style={labelStyle}>Assign To</label>
            <select style={inputStyle} value={form.team_member_id} onChange={(e) => set("team_member_id", e.target.value)}>
              <option value="">Auto-assign</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Special Notes */}
          <div>
            <label style={labelStyle}>Special Notes</label>
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: 72, fontFamily: "inherit" }}
              value={form.special_notes}
              onChange={(e) => set("special_notes", e.target.value)}
              placeholder="Any access instructions, special requirements..."
            />
          </div>

          {/* Invoice Amount */}
          <div>
            <label style={labelStyle}>Invoice Amount ($)</label>
            <input
              style={inputStyle}
              type="number"
              min="0"
              step="1"
              value={form.invoice_amount}
              onChange={(e) => set("invoice_amount", e.target.value)}
              placeholder="200"
            />
          </div>

          {/* Footer */}
          <div style={{ display: "flex", gap: 12, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#cbd5e1", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: isPending ? "#0f766e" : "#10b981", color: "white", fontSize: 14, fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer", transition: "background 0.15s" }}
            >
              {isPending ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Team Member Modal ────────────────────────────────────────────────────

function AddMemberModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (member: HesTeamMember) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggleCert(c: string) {
    setSelectedCerts((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  }
  function toggleArea(a: string) {
    setSelectedAreas((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required."); return; }
    setError(null);

    startTransition(async () => {
      try {
        const result = await addHesTeamMember({
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          certifications: selectedCerts,
          service_areas: selectedAreas,
        });
        onSuccess(result as HesTeamMember);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to add team member.");
      }
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#f1f5f9",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 4, display: "block" };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Add Team Member</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 0 }}>
            &#x2715;
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#f87171" }}>
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label style={labelStyle}>Name <span style={{ color: "#ef4444" }}>*</span></label>
            <input style={inputStyle} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" required />
          </div>

          {/* Email + Phone */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(503) 555-0000" />
            </div>
          </div>

          {/* Certifications */}
          <div>
            <label style={labelStyle}>Certifications</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {CERTIFICATIONS.map((c) => (
                <PillToggle key={c} label={c} active={selectedCerts.includes(c)} onClick={() => toggleCert(c)} />
              ))}
            </div>
          </div>

          {/* Service Areas */}
          <div>
            <label style={labelStyle}>Service Areas</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {SERVICE_AREAS.map((a) => (
                <PillToggle key={a} label={a} active={selectedAreas.includes(a)} onClick={() => toggleArea(a)} />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", gap: 12, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#cbd5e1", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: isPending ? "#0f766e" : "#10b981", color: "white", fontSize: 14, fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer", transition: "background 0.15s" }}
            >
              {isPending ? "Adding…" : "Add Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Calendar Week View ───────────────────────────────────────────────────────

function CalendarWeekView({
  members,
  schedule,
  weekDays,
}: {
  members: HesTeamMember[];
  schedule: HesScheduleEntry[];
  weekDays: Date[];
}) {
  const today = toDateStr(new Date());

  // Build lookup: dateStr -> memberId -> entries
  const slotMap: Record<string, Record<string, HesScheduleEntry[]>> = {};
  for (const entry of schedule) {
    const d = entry.scheduled_date;
    if (!slotMap[d]) slotMap[d] = {};
    const mid = entry.team_member_id ?? "__unassigned__";
    if (!slotMap[d][mid]) slotMap[d][mid] = [];
    slotMap[d][mid].push(entry);
  }

  // Unassigned entries (no team_member_id)
  const allRows: Array<{ id: string; name: string; isUnassigned?: boolean }> = [
    ...members.map((m) => ({ id: m.id, name: m.name })),
  ];

  // Check if there are any unassigned entries this week
  const hasUnassigned = schedule.some((e) => !e.team_member_id);
  if (hasUnassigned) {
    allRows.push({ id: "__unassigned__", name: "Unassigned", isUnassigned: true });
  }

  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 900 }}>
        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "160px repeat(7, 1fr)", gap: 1, marginBottom: 2 }}>
          <div style={{ padding: "8px 12px" }} />
          {weekDays.map((d, i) => {
            const ds = toDateStr(d);
            const isToday = ds === today;
            return (
              <div
                key={ds}
                style={{
                  padding: "10px 8px",
                  textAlign: "center",
                  borderRadius: "8px 8px 0 0",
                  background: isToday ? "rgba(16,185,129,0.12)" : "#1e293b",
                  border: isToday ? "1px solid rgba(16,185,129,0.3)" : "1px solid #334155",
                  borderBottom: "none",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: isToday ? "#10b981" : "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {DAY_LABELS[i]}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: isToday ? "#10b981" : "#f1f5f9", marginTop: 2 }}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Member rows */}
        {allRows.map((row) => (
          <div
            key={row.id}
            style={{ display: "grid", gridTemplateColumns: "160px repeat(7, 1fr)", gap: 1, marginBottom: 1 }}
          >
            {/* Member label */}
            <div
              style={{
                padding: "12px",
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px 0 0 8px",
                display: "flex",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: row.isUnassigned ? "#f59e0b" : "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130 }}>
                  {row.name}
                </div>
                {!row.isUnassigned && (() => {
                  const member = members.find((m) => m.id === row.id);
                  return member ? (
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                      {member.status === "active" ? (
                        <span style={{ color: "#10b981" }}>Active</span>
                      ) : (
                        <span style={{ color: "#f87171" }}>{member.status}</span>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
            </div>

            {/* Day cells */}
            {weekDays.map((d) => {
              const ds = toDateStr(d);
              const isToday = ds === today;
              const entries = slotMap[ds]?.[row.id] ?? [];

              return (
                <div
                  key={ds}
                  style={{
                    padding: 6,
                    minHeight: 80,
                    background: isToday ? "rgba(16,185,129,0.04)" : "#1e293b",
                    border: isToday ? "1px solid rgba(16,185,129,0.2)" : "1px solid #334155",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {entries.length === 0 ? (
                    <span style={{ fontSize: 11, color: "#334155", fontStyle: "italic", margin: "auto" }}>Free</span>
                  ) : (
                    entries.map((entry) => {
                      const sc = STATUS_COLORS[entry.status] ?? STATUS_COLORS.scheduled;
                      return (
                        <div
                          key={entry.id}
                          style={{
                            padding: "5px 7px",
                            borderRadius: 6,
                            background: sc.bg,
                            border: `1px solid ${sc.text}33`,
                            fontSize: 11,
                            lineHeight: 1.4,
                          }}
                        >
                          {entry.scheduled_time && (
                            <div style={{ fontWeight: 700, color: sc.text, fontSize: 10 }}>
                              {formatTime(entry.scheduled_time)}
                            </div>
                          )}
                          <div style={{ fontWeight: 600, color: "#f1f5f9", marginTop: 1 }}>
                            {truncate(entry.customer_name, 16)}
                          </div>
                          {entry.address && (
                            <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 1 }}>
                              {truncate(entry.address, 18)}
                            </div>
                          )}
                          <div style={{ marginTop: 3 }}>
                            {statusBadge(entry.status)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {allRows.length === 0 && (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
            No team members. Add a member to see the calendar.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Completed Assessments Table ──────────────────────────────────────────────

function CompletedTable({ schedule }: { schedule: HesScheduleEntry[] }) {
  const [filter, setFilter] = useState<"all" | "completed" | "no_show">("all");

  const filtered = schedule.filter((e) => {
    if (filter === "all") return e.status === "completed" || e.status === "no_show";
    return e.status === filter;
  });

  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Completed Assessments</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {(["all", "completed", "no_show"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setFilter(v)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                border: filter === v ? "1px solid rgba(16,185,129,0.5)" : "1px solid #334155",
                background: filter === v ? "rgba(16,185,129,0.15)" : "transparent",
                color: filter === v ? "#10b981" : "#64748b",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {v === "no_show" ? "No Show" : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "#64748b", fontSize: 13 }}>
          No {filter === "all" ? "completed" : filter.replace("_", " ")} assessments found.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Date", "Customer", "Assessor", "Rating", "Duration", "Status", "Payment"].map((h) => (
                  <th
                    key={h}
                    style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #334155", whiteSpace: "nowrap" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "10px 12px", color: "#cbd5e1", whiteSpace: "nowrap" }}>
                    {entry.scheduled_date}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#f1f5f9", fontWeight: 500 }}>
                    <div>{entry.customer_name}</div>
                    {entry.city && <div style={{ fontSize: 11, color: "#64748b" }}>{entry.city}</div>}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#cbd5e1" }}>
                    {entry.team_member?.name ?? <span style={{ color: "#475569" }}>Unassigned</span>}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#f59e0b", fontSize: 14, letterSpacing: -1 }}>
                    {renderStars(entry.customer_rating)}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#94a3b8" }}>
                    {entry.duration_minutes ? `${entry.duration_minutes}m` : "—"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {statusBadge(entry.status)}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ color: entry.invoice_amount ? "#f1f5f9" : "#475569", fontWeight: entry.invoice_amount ? 600 : 400 }}>
                        {entry.invoice_amount ? `$${entry.invoice_amount.toLocaleString()}` : "—"}
                      </span>
                      {entry.payment_status && (
                        <span
                          style={{
                            fontSize: 10,
                            color: entry.payment_status === "paid" ? "#10b981" : entry.payment_status === "overdue" ? "#f87171" : "#94a3b8",
                            fontWeight: 600,
                            textTransform: "capitalize",
                          }}
                        >
                          {entry.payment_status}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function HesTeamClient({
  members: initialMembers,
  schedule: initialSchedule,
}: {
  members: HesTeamMember[];
  schedule: HesScheduleEntry[];
}) {
  const [members, setMembers] = useState<HesTeamMember[]>(initialMembers);
  const [schedule, setSchedule] = useState<HesScheduleEntry[]>(initialSchedule);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [teamCollapsed, setTeamCollapsed] = useState(false);
  const [, startTransition] = useTransition();

  const monday = getThisMonday();
  const weekDays = getWeekDays(monday);
  const today = toDateStr(new Date());

  // Derive stats
  const activeMembers = members.filter((m) => m.status === "active");
  const todaySchedule = schedule.filter((e) => e.scheduled_date === today && e.status !== "cancelled");
  const capacity = activeMembers.length > 0
    ? Math.round((todaySchedule.length / (activeMembers.length * 3)) * 100)
    : 0;

  const completedEntries = schedule.filter((e) => e.status === "completed" || e.status === "no_show");

  function handleScheduleSuccess(entry: HesScheduleEntry) {
    setSchedule((prev) => [...prev, entry]);
    setShowScheduleModal(false);
  }

  function handleMemberSuccess(member: HesTeamMember) {
    setMembers((prev) => [...prev, member]);
    setShowAddMemberModal(false);
  }

  // Status update helper (for future inline controls)
  function handleStatusChange(entryId: string, newStatus: string) {
    startTransition(async () => {
      try {
        const updated = await updateScheduleEntry(entryId, { status: newStatus });
        setSchedule((prev) => prev.map((e) => (e.id === entryId ? (updated as HesScheduleEntry) : e)));
      } catch {
        // silently fail – user can refresh
      }
    });
  }
  void handleStatusChange; // suppress unused warning

  return (
    <>
      {/* ── Modals ── */}
      {showScheduleModal && (
        <ScheduleModal
          members={members}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={handleScheduleSuccess}
        />
      )}
      {showAddMemberModal && (
        <AddMemberModal
          onClose={() => setShowAddMemberModal(false)}
          onSuccess={handleMemberSuccess}
        />
      )}

      {/* ── Page Header ── */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", letterSpacing: -0.3, margin: 0 }}>
              HES Assessor Team
            </h1>
            <p style={{ marginTop: 6, fontSize: 13, color: "#94a3b8" }}>
              {activeMembers.length} active assessor{activeMembers.length !== 1 ? "s" : ""}
              {" \u2022 "}
              {todaySchedule.length} scheduled today
              {" \u2022 "}
              <span style={{ color: capacity >= 80 ? "#f87171" : capacity >= 50 ? "#fbbf24" : "#10b981" }}>
                {capacity}% capacity
              </span>
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setShowScheduleModal(true)}
              style={{
                padding: "9px 18px",
                borderRadius: 8,
                border: "none",
                background: "#10b981",
                color: "white",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "background 0.15s",
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Schedule Assessment
            </button>
            <button
              type="button"
              onClick={() => setShowAddMemberModal(true)}
              style={{
                padding: "9px 18px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "transparent",
                color: "#cbd5e1",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Team Member
            </button>
          </div>
        </div>
      </div>

      {/* ── Team Members Section ── */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
        {/* Section header */}
        <button
          type="button"
          onClick={() => setTeamCollapsed((c) => !c)}
          style={{
            width: "100%",
            padding: "16px 20px",
            background: "none",
            border: "none",
            borderBottom: teamCollapsed ? "none" : "1px solid #334155",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>Team Members</span>
            <span
              style={{
                padding: "2px 10px",
                borderRadius: 20,
                background: "rgba(16,185,129,0.15)",
                color: "#10b981",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {members.length}
            </span>
            <span style={{ fontSize: 12, color: "#64748b" }}>Available {capacity > 0 ? `(${100 - capacity}% free)` : ""}</span>
          </div>
          <span style={{ fontSize: 14, color: "#64748b", transition: "transform 0.15s", transform: teamCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>
            &#x25BE;
          </span>
        </button>

        {!teamCollapsed && (
          members.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
              No team members yet. Add one to get started.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Name", "Certifications", "Today's Schedule", "Status", "Avg Rating"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 16px",
                          textAlign: "left",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          borderBottom: "1px solid #334155",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const memberToday = schedule.filter(
                      (e) => e.team_member_id === member.id && e.scheduled_date === today && e.status !== "cancelled"
                    );
                    const isBusy = memberToday.length >= 2;

                    return (
                      <tr key={member.id} style={{ borderBottom: "1px solid #1e293b" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 600, color: "#f1f5f9" }}>{member.name}</div>
                          {member.email && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{member.email}</div>}
                          {member.phone && <div style={{ fontSize: 11, color: "#64748b" }}>{member.phone}</div>}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {member.certifications.length > 0 ? (
                              member.certifications.map((cert) => (
                                <span
                                  key={cert}
                                  style={{
                                    padding: "2px 8px",
                                    borderRadius: 20,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    background: "rgba(59,130,246,0.12)",
                                    color: "#60a5fa",
                                    border: "1px solid rgba(59,130,246,0.2)",
                                  }}
                                >
                                  {cert}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: "#475569", fontSize: 12 }}>—</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {memberToday.length === 0 ? (
                            <span style={{ color: "#475569", fontSize: 12 }}>None</span>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {memberToday.map((e) => (
                                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  {e.scheduled_time && (
                                    <span style={{ fontSize: 11, color: "#94a3b8", minWidth: 52 }}>
                                      {formatTime(e.scheduled_time)}
                                    </span>
                                  )}
                                  <span style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 500 }}>
                                    {truncate(e.customer_name, 20)}
                                  </span>
                                  {statusBadge(e.status)}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "3px 10px",
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 600,
                              background: isBusy ? "rgba(251,191,36,0.12)" : "rgba(16,185,129,0.12)",
                              color: isBusy ? "#fbbf24" : "#10b981",
                            }}
                          >
                            {isBusy ? "Busy" : "Available"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {member.avg_rating ? (
                            <div>
                              <span style={{ color: "#f59e0b", fontSize: 14 }}>{renderStars(member.avg_rating)}</span>
                              <span style={{ fontSize: 12, color: "#64748b", marginLeft: 6 }}>
                                ({member.avg_rating.toFixed(1)})
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: "#475569", fontSize: 12 }}>No ratings</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ── Weekly Calendar ── */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
            Week of{" "}
            {monday.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </h2>
          <p style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
            {schedule.filter((e) => e.status !== "cancelled").length} assessments this week
          </p>
        </div>
        <CalendarWeekView members={members} schedule={schedule} weekDays={weekDays} />
      </div>

      {/* ── Completed Assessments ── */}
      {completedEntries.length > 0 && (
        <CompletedTable schedule={completedEntries} />
      )}
    </>
  );
}
