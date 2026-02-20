// src/app/admin/team/[id]/TeamMemberDetailClient.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import type { TeamMemberDetail, UnifiedScheduleEntry, MemberType } from "../actions";
import { updateTeamMember, setTimeOff, clearTimeOff, disableTeamMember, deleteTeamMember } from "../actions";
import SidePanel from "@/components/ui/SidePanel";

// ─── Design tokens ──────────────────────────────────────────────────
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";
const BG = "#0f172a";

// ─── Cert/Area presets ──────────────────────────────────────────────
const HES_CERTS = ["BPI", "DOE HES", "RESNET", "ENERGY STAR"];
const INSP_CERTS = ["ASHI", "InterNACHI", "State Licensed", "Radon", "Mold"];
const SERVICE_AREAS = ["Portland Metro", "Salem", "Eugene", "Bend", "Medford", "Corvallis"];

// ─── Helpers ────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isOnTimeOff(
  periods: { start: string; end: string; reason?: string }[],
  date: string,
): boolean {
  return periods.some((p) => date >= p.start && date <= p.end);
}

function formatDate(iso: string): string {
  const d = iso.includes("T") ? new Date(iso) : new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDayShort(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function fmtCurrency(n: number): string {
  return "$" + n.toLocaleString();
}

// ─── Shared Components ──────────────────────────────────────────────

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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    active: { bg: "rgba(16,185,129,0.12)", color: "#10b981" },
    inactive: { bg: "rgba(100,116,139,0.12)", color: "#64748b" },
    on_leave: { bg: "rgba(239,68,68,0.12)", color: "#ef4444" },
  };
  const c = colors[status] ?? colors.inactive;
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 700,
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.color}33`,
        textTransform: "capitalize",
      }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

// ─── Pill Toggle ────────────────────────────────────────────────────

function PillToggle({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: Set<string>;
  onToggle: (val: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((opt) => {
        const active = selected.has(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            style={{
              padding: "5px 12px",
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              transition: "all 0.12s",
              background: active ? EMERALD : "rgba(51,65,85,0.5)",
              color: active ? "#fff" : TEXT_SEC,
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#475569"; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? EMERALD : "rgba(51,65,85,0.5)"; }}
          >
            {opt}
          </button>
        );
      })}
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
      position: "fixed",
      bottom: 24,
      right: 24,
      zIndex: 100,
      padding: "12px 20px",
      borderRadius: 10,
      background: EMERALD,
      color: "#fff",
      fontWeight: 700,
      fontSize: 13,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    }}>
      {message}
    </div>
  );
}

// ─── Status color for jobs ──────────────────────────────────────────

const jobStatusColors: Record<string, string> = {
  scheduled: "#38bdf8",
  confirmed: "#10b981",
  in_progress: "#fbbf24",
  completed: "#10b981",
  cancelled: "#ef4444",
  no_show: "#ef4444",
};

// ─── Modal Overlay (for delete confirmation) ────────────────────────

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.60)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
    >
      <div style={{
        background: "#1e293b",
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: 28,
        maxHeight: "85vh",
        overflowY: "auto",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Edit Side Panel Content ────────────────────────────────────────

function EditPanelContent({
  member,
  onSaved,
  onClose,
  onDisable,
  onDeleteRequest,
}: {
  member: TeamMemberDetail["member"];
  onSaved: () => void;
  onClose: () => void;
  onDisable: () => void;
  onDeleteRequest: () => void;
}) {
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email ?? "");
  const [phone, setPhone] = useState(member.phone ?? "");
  const [status, setStatus] = useState(member.status);
  const [selectedCerts, setSelectedCerts] = useState<Set<string>>(new Set(member.certifications));
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set(member.service_areas));
  const [saving, setSaving] = useState(false);

  // Time off state
  const [toStart, setToStart] = useState("");
  const [toEnd, setToEnd] = useState("");
  const [toReason, setToReason] = useState("");
  const [addingTimeOff, setAddingTimeOff] = useState(false);

  function toggleCert(val: string) {
    setSelectedCerts((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val); else next.add(val);
      return next;
    });
  }

  function toggleArea(val: string) {
    setSelectedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val); else next.add(val);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateTeamMember(member.id, member.type, {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        status,
        certifications: Array.from(selectedCerts),
        service_areas: Array.from(selectedAreas),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTimeOff() {
    if (!toStart || !toEnd) return;
    setAddingTimeOff(true);
    try {
      await setTimeOff(member.id, member.type, toStart, toEnd, toReason.trim() || undefined);
      setToStart("");
      setToEnd("");
      setToReason("");
      onSaved();
    } finally {
      setAddingTimeOff(false);
    }
  }

  async function handleRemoveTimeOff(index: number) {
    await clearTimeOff(member.id, member.type, index);
    onSaved();
  }

  const certOptions = member.type === "hes" ? HES_CERTS : INSP_CERTS;
  const sectionHeader: React.CSSProperties = {
    fontSize: 11,
    color: TEXT_DIM,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 10,
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    fontSize: 13,
    borderRadius: 8,
    border: `1px solid ${BORDER}`,
    background: "#1e293b",
    color: TEXT,
    outline: "none",
    transition: "border-color 0.15s",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 5,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 0 20px" }}>
        {/* Profile Section */}
        <div style={sectionHeader}>Profile</div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Full Name</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = EMERALD; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = BORDER; }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = EMERALD; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = BORDER; }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Phone</label>
          <input
            type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = EMERALD; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = BORDER; }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Status</label>
          <select
            value={status} onChange={(e) => setStatus(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = EMERALD; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = BORDER; }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>

        {/* Certifications Section */}
        <div style={{ ...sectionHeader, marginTop: 24 }}>Certifications</div>
        <div style={{ marginBottom: 20 }}>
          <PillToggle options={certOptions} selected={selectedCerts} onToggle={toggleCert} />
        </div>

        {/* Service Areas Section */}
        <div style={sectionHeader}>Service Areas</div>
        <div style={{ marginBottom: 20 }}>
          <PillToggle options={SERVICE_AREAS} selected={selectedAreas} onToggle={toggleArea} />
        </div>

        {/* Time Off Section */}
        <div style={sectionHeader}>Time Off</div>

        {/* Existing time off entries */}
        {member.time_off.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {member.time_off.map((period, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  borderRadius: 8,
                  marginBottom: 6,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: TEXT, fontWeight: 600 }}>
                    {formatDateShort(period.start)} — {formatDateShort(period.end)}
                  </div>
                  {period.reason && (
                    <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>{period.reason}</div>
                  )}
                </div>
                <button
                  type="button"
                  title="Remove time off"
                  onClick={() => handleRemoveTimeOff(i)}
                  style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: "none", border: "none", color: "#ef4444",
                    cursor: "pointer", display: "flex", alignItems: "center",
                    justifyContent: "center", flexShrink: 0,
                  }}
                >
                  <XMarkIcon style={{ width: 14, height: 14 }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {member.time_off.length === 0 && (
          <div style={{ fontSize: 12, color: TEXT_DIM, marginBottom: 12 }}>No scheduled time off.</div>
        )}

        {/* Add time off form */}
        <div style={{
          padding: 12, borderRadius: 8,
          border: `1px solid ${BORDER}`, background: "rgba(15,23,42,0.5)",
          marginBottom: 20,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
            <div>
              <label style={{ ...labelStyle, fontSize: 10 }}>Start Date</label>
              <input
                type="date" value={toStart} onChange={(e) => setToStart(e.target.value)}
                style={{ ...inputStyle, fontSize: 12, padding: "6px 10px" }}
              />
            </div>
            <div>
              <label style={{ ...labelStyle, fontSize: 10 }}>End Date</label>
              <input
                type="date" value={toEnd} onChange={(e) => setToEnd(e.target.value)}
                style={{ ...inputStyle, fontSize: 12, padding: "6px 10px" }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ ...labelStyle, fontSize: 10 }}>Reason (optional)</label>
            <input
              type="text" value={toReason} onChange={(e) => setToReason(e.target.value)}
              placeholder="e.g. Vacation"
              style={{ ...inputStyle, fontSize: 12, padding: "6px 10px" }}
            />
          </div>
          <button
            type="button"
            onClick={handleAddTimeOff}
            disabled={!toStart || !toEnd || addingTimeOff}
            style={{
              width: "100%",
              padding: "7px 14px",
              borderRadius: 8,
              border: `1px solid rgba(16,185,129,0.4)`,
              background: "transparent",
              color: EMERALD,
              fontSize: 12,
              fontWeight: 700,
              cursor: !toStart || !toEnd || addingTimeOff ? "not-allowed" : "pointer",
              opacity: !toStart || !toEnd || addingTimeOff ? 0.5 : 1,
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => { if (toStart && toEnd && !addingTimeOff) e.currentTarget.style.background = "rgba(16,185,129,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {addingTimeOff ? "Adding..." : "Add Time Off"}
          </button>
        </div>

        {/* Danger Zone */}
        <div style={{ marginTop: 32, borderTop: `1px solid rgba(51,65,85,0.5)`, paddingTop: 24 }}>
          <div style={{ ...sectionHeader, color: "#f87171" }}>Danger Zone</div>

          <button
            type="button"
            onClick={onDisable}
            style={{
              width: "100%",
              padding: "10px 16px",
              borderRadius: 8,
              border: member.status === "active"
                ? "1px solid rgba(202,138,4,0.4)"
                : `1px solid rgba(16,185,129,0.4)`,
              background: "transparent",
              color: member.status === "active" ? "#eab308" : EMERALD,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 8,
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = member.status === "active"
                ? "rgba(202,138,4,0.08)"
                : "rgba(16,185,129,0.08)";
            }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            {member.status === "active" ? "Disable Member" : "Enable Member"}
          </button>

          <button
            type="button"
            onClick={onDeleteRequest}
            style={{
              width: "100%",
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.4)",
              background: "transparent",
              color: "#f87171",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            Delete Member
          </button>
        </div>
      </div>

      {/* Pinned footer */}
      <div style={{
        borderTop: `1px solid rgba(51,65,85,0.5)`,
        padding: "16px 0 0",
        display: "flex",
        gap: 10,
        flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            padding: "10px 16px",
            borderRadius: 8,
            border: `1px solid ${BORDER}`,
            background: "transparent",
            color: TEXT_SEC,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 2,
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            background: EMERALD,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Jobs Table ─────────────────────────────────────────────────────

function JobsTable({ entries, emptyMessage }: { entries: UnifiedScheduleEntry[]; emptyMessage: string }) {
  if (entries.length === 0) {
    return (
      <div style={{ padding: "16px 0", fontSize: 12, color: TEXT_DIM, textAlign: "center" }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="admin-table" style={{ minWidth: 600 }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Customer</th>
            <th>Location</th>
            <th>Status</th>
            <th style={{ textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const sColor = jobStatusColors[entry.status] ?? TEXT_DIM;
            return (
              <tr key={entry.id}>
                <td>
                  <div style={{ fontSize: 12, color: TEXT_SEC, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {formatDateShort(entry.scheduled_date)}
                  </div>
                  {entry.scheduled_time && (
                    <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 1 }}>
                      {entry.scheduled_time.slice(0, 5)}
                    </div>
                  )}
                </td>
                <td>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{entry.customer_name}</div>
                  {entry.inspection_type && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#fbbf24" }}>
                      {entry.inspection_type}
                    </span>
                  )}
                </td>
                <td>
                  <span style={{ fontSize: 12, color: TEXT_DIM }}>
                    {[entry.address, entry.city].filter(Boolean).join(", ") || "\u2014"}
                  </span>
                </td>
                <td>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      color: sColor,
                      background: `${sColor}18`,
                      textTransform: "capitalize",
                    }}
                  >
                    {entry.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>
                    {entry.invoice_amount != null ? fmtCurrency(entry.invoice_amount) : "\u2014"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

type Props = { data: TeamMemberDetail };

export default function TeamMemberDetailClient({ data }: Props) {
  const router = useRouter();
  const { member, kpis, upcomingJobs, jobHistory, weekSchedule } = data;

  const [showEdit, setShowEdit] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const today = todayStr();
  const onTimeOffNow = isOnTimeOff(member.time_off, today);

  const typeBadge =
    member.type === "hes"
      ? { label: "HES Assessor", bg: "rgba(16,185,129,0.15)", color: "#10b981" }
      : { label: "Home Inspector", bg: "rgba(245,158,11,0.15)", color: "#f59e0b" };

  function handleRefresh() {
    router.refresh();
  }

  async function handleDisable() {
    setActionSaving(true);
    try {
      if (member.status === "active") {
        await disableTeamMember(member.id, member.type);
        setToast(`${member.name} has been disabled.`);
      } else {
        await updateTeamMember(member.id, member.type, { status: "active" });
        setToast(`${member.name} has been enabled.`);
      }
      setShowEdit(false);
      handleRefresh();
    } catch (e: any) {
      alert(e?.message ?? "Failed to update team member.");
    } finally {
      setActionSaving(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await deleteTeamMember(member.id, member.type);
      setToast(`${member.name} has been removed.`);
      router.push("/admin/team");
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete team member.");
      setDeleteLoading(false);
    }
  }

  // Mini week schedule — build day labels for current week
  const weekDays: string[] = [];
  const d = new Date();
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  for (let i = 0; i < 7; i++) {
    const dd = new Date(mon);
    dd.setDate(mon.getDate() + i);
    weekDays.push(dd.toISOString().slice(0, 10));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push("/admin/team")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          color: TEXT_MUTED,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          padding: 0,
          width: "fit-content",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = TEXT)}
        onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_MUTED)}
      >
        <ArrowLeftIcon style={{ width: 14, height: 14 }} />
        Back to Team
      </button>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: "16px 20px",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(16,185,129,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 700,
            color: EMERALD,
            flexShrink: 0,
          }}
        >
          {member.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: 0 }}>{member.name}</h1>
            <span
              style={{
                padding: "2px 10px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                background: typeBadge.bg,
                color: typeBadge.color,
              }}
            >
              {typeBadge.label}
            </span>
            <StatusBadge status={member.status} />
          </div>
          <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 3 }}>
            {member.email ?? "No email"}{member.phone && ` \u00B7 ${member.phone}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              border: `1px solid ${BORDER}`,
              background: "#334155",
              color: TEXT_SEC,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#475569"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#334155"; }}
          >
            <PencilSquareIcon style={{ width: 13, height: 13 }} />
            Edit
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Profile Card */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 20px" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Profile
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <ProfileField label="Email" value={member.email ?? "\u2014"} />
              <ProfileField label="Phone" value={member.phone ?? "\u2014"} />
              <ProfileField label="Certifications" value={member.certifications.join(", ") || "None"} />
              <ProfileField label="Service Areas" value={member.service_areas.join(", ") || "None"} />
              {member.type === "inspector" && (
                <ProfileField label="License" value={member.license_number ?? "\u2014"} />
              )}
              <ProfileField label="Member Since" value={formatDate(member.created_at)} />
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            <KpiCard label="Jobs Completed" value={kpis.jobsCompleted} color={EMERALD} />
            <KpiCard label="This Month" value={kpis.thisMonth} color="#38bdf8" />
            <KpiCard label="Revenue Generated" value={fmtCurrency(kpis.revenueGenerated)} color="#a78bfa" />
            <KpiCard label="Avg Rating" value={kpis.avgRating > 0 ? kpis.avgRating.toFixed(1) : "\u2014"} color="#fbbf24" />
          </div>

          {/* Upcoming Jobs */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", borderBottom: `1px solid ${BORDER}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0 }}>
                Upcoming Jobs
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: TEXT_DIM }}>({upcomingJobs.length})</span>
              </h3>
            </div>
            <JobsTable entries={upcomingJobs} emptyMessage="No upcoming jobs scheduled." />
          </div>

          {/* Job History */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0 }}>
                Job History
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: TEXT_DIM }}>({jobHistory.length})</span>
              </h3>
              {jobHistory.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  style={{
                    background: "none",
                    border: "none",
                    color: EMERALD,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {showHistory ? "Show less" : "Show all"}
                </button>
              )}
            </div>
            <JobsTable
              entries={showHistory ? jobHistory : jobHistory.slice(0, 5)}
              emptyMessage="No completed jobs yet."
            />
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Availability Card */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 20px" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Availability
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: onTimeOffNow
                    ? "#ef4444"
                    : member.status === "active"
                    ? "#10b981"
                    : "#64748b",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 14, color: TEXT, fontWeight: 700 }}>
                {onTimeOffNow ? "On Time Off" : member.status === "active" ? "Available" : "Inactive"}
              </span>
            </div>

            {/* Time Off Periods */}
            {member.time_off.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                  Scheduled Time Off
                </div>
                {member.time_off.map((period, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 10px",
                      background: "rgba(239,68,68,0.06)",
                      border: "1px solid rgba(239,68,68,0.15)",
                      borderRadius: 8,
                      marginBottom: 6,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: TEXT, fontWeight: 600 }}>
                        {formatDateShort(period.start)} — {formatDateShort(period.end)}
                      </div>
                      {period.reason && (
                        <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>{period.reason}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {member.time_off.length === 0 && (
              <div style={{ fontSize: 12, color: TEXT_DIM }}>No scheduled time off.</div>
            )}
          </div>

          {/* This Week Mini Schedule */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 20px" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              This Week
            </h3>
            {weekDays.map((dayDate) => {
              const dayJobs = weekSchedule.filter(
                (s) => s.scheduled_date === dayDate && s.status !== "cancelled",
              );
              const isToday = dayDate === today;
              const timeOff = isOnTimeOff(member.time_off, dayDate);

              return (
                <div
                  key={dayDate}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "7px 8px",
                    borderBottom: `1px solid rgba(51,65,85,0.5)`,
                    background: isToday ? "rgba(16,185,129,0.06)" : "transparent",
                    borderRadius: isToday ? 4 : 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: isToday ? EMERALD : TEXT_DIM,
                      fontWeight: isToday ? 700 : 600,
                      minWidth: 100,
                    }}
                  >
                    {formatDayShort(dayDate)}
                  </span>
                  {timeOff ? (
                    <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 600, background: "rgba(239,68,68,0.1)", padding: "2px 8px", borderRadius: 6 }}>
                      Time Off
                    </span>
                  ) : dayJobs.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                      {dayJobs.map((j) => (
                        <span
                          key={j.id}
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: j.type === "hes" ? "#10b981" : "#f59e0b",
                            background: j.type === "hes" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                            padding: "2px 8px",
                            borderRadius: 6,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 150,
                          }}
                          title={j.customer_name}
                        >
                          {j.scheduled_time ? j.scheduled_time.slice(0, 5) + " " : ""}
                          {j.customer_name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 10, color: "#475569" }}>{"\u2014"}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Side Panel */}
      <SidePanel
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit Team Member"
        width="w-1/3"
      >
        <EditPanelContent
          member={member}
          onSaved={() => {
            setShowEdit(false);
            setToast("Changes saved.");
            handleRefresh();
          }}
          onClose={() => setShowEdit(false)}
          onDisable={handleDisable}
          onDeleteRequest={() => {
            setShowEdit(false);
            setShowDeleteConfirm(true);
          }}
        />
      </SidePanel>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ModalOverlay onClose={() => setShowDeleteConfirm(false)}>
          <div className="admin-modal-content" style={{ width: 400 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#f87171", margin: "0 0 12px" }}>Delete Team Member</h3>
            <p style={{ fontSize: 14, color: TEXT_SEC, lineHeight: 1.5, margin: "0 0 6px" }}>
              Are you sure you want to remove <strong>{member.name}</strong>? This will also delete their schedule history.
            </p>
            <p style={{ fontSize: 13, color: "#f87171", margin: "0 0 20px", fontWeight: 600 }}>
              This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "none",
                  background: "#334155", color: TEXT_SEC, fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "none",
                  background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: deleteLoading ? "not-allowed" : "pointer",
                  opacity: deleteLoading ? 0.5 : 1,
                }}
              >
                {deleteLoading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
