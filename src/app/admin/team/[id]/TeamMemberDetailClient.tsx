// src/app/admin/team/[id]/TeamMemberDetailClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  ClockIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import type { TeamMemberDetail, UnifiedScheduleEntry, MemberType } from "../actions";
import { updateTeamMember, setTimeOff, clearTimeOff } from "../actions";

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
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
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
              background: active ? EMERALD : "#334155",
              color: active ? "#fff" : TEXT_SEC,
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Modal Primitives ───────────────────────────────────────────────

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
        zIndex: 50,
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

function ModalField({ label, value, onChange, type = "text", placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="admin-input"
        style={{ fontSize: 13, padding: "9px 12px" }}
      />
    </div>
  );
}

function ModalSelect({ label, value, onChange, children }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="admin-input"
        style={{ fontSize: 13, padding: "9px 12px" }}
      >
        {children}
      </select>
    </div>
  );
}

function ModalTextarea({ label, value, onChange, rows = 3 }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="admin-input"
        style={{ fontSize: 13, padding: "9px 12px", resize: "vertical" }}
      />
    </div>
  );
}

const modalBtnCancel: React.CSSProperties = {
  padding: "9px 20px",
  borderRadius: 8,
  border: "none",
  background: "#334155",
  color: TEXT_SEC,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const modalBtnPrimary: React.CSSProperties = {
  padding: "9px 20px",
  borderRadius: 8,
  border: "none",
  background: EMERALD,
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

// ─── Status color for jobs ──────────────────────────────────────────

const jobStatusColors: Record<string, string> = {
  scheduled: "#38bdf8",
  confirmed: "#10b981",
  in_progress: "#fbbf24",
  completed: "#10b981",
  cancelled: "#ef4444",
  no_show: "#ef4444",
};

// ─── Edit Profile Modal ─────────────────────────────────────────────

function EditProfileModal({
  member,
  onClose,
  onSaved,
}: {
  member: TeamMemberDetail["member"];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email ?? "");
  const [phone, setPhone] = useState(member.phone ?? "");
  const [status, setStatus] = useState(member.status);
  const [selectedCerts, setSelectedCerts] = useState<Set<string>>(new Set(member.certifications));
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set(member.service_areas));
  const [saving, setSaving] = useState(false);

  function toggleCert(val: string) {
    setSelectedCerts((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  }

  function toggleArea(val: string) {
    setSelectedAreas((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
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

  const certOptions = member.type === "hes" ? HES_CERTS : INSP_CERTS;

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ width: 500 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: TEXT, margin: "0 0 18px" }}>Edit Profile</h3>

        <ModalField label="Full Name" value={name} onChange={setName} placeholder="e.g. John Smith" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <ModalField label="Email" value={email} onChange={setEmail} placeholder="john@example.com" />
          <ModalField label="Phone" value={phone} onChange={setPhone} placeholder="(503) 555-0100" />
        </div>

        <ModalSelect label="Status" value={status} onChange={setStatus}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on_leave">On Leave</option>
        </ModalSelect>

        {/* Certifications pills */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Certifications
          </label>
          <PillToggle options={certOptions} selected={selectedCerts} onToggle={toggleCert} />
        </div>

        {/* Service Areas pills */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Service Areas
          </label>
          <PillToggle options={SERVICE_AREAS} selected={selectedAreas} onToggle={toggleArea} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" onClick={onClose} style={modalBtnCancel}>Cancel</button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{ ...modalBtnPrimary, opacity: saving ? 0.5 : 1, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Time Off Modal ─────────────────────────────────────────────────

function TimeOffModal({
  memberId,
  memberType,
  onClose,
  onSaved,
}: {
  memberId: string;
  memberType: MemberType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!start || !end) return;
    setSaving(true);
    try {
      await setTimeOff(memberId, memberType, start, end, reason.trim() || undefined);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = !!start && !!end && !saving;

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ width: 420 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: TEXT, margin: "0 0 18px" }}>Mark Time Off</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <ModalField label="Start Date *" value={start} onChange={setStart} type="date" />
          <ModalField label="End Date *" value={end} onChange={setEnd} type="date" />
        </div>

        <ModalTextarea label="Reason (optional)" value={reason} onChange={setReason} rows={2} />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" onClick={onClose} style={modalBtnCancel}>Cancel</button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSubmit}
            style={{
              ...modalBtnPrimary,
              background: "#ef4444",
              opacity: canSubmit ? 1 : 0.5,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "Saving..." : "Mark Time Off"}
          </button>
        </div>
      </div>
    </ModalOverlay>
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
                    {[entry.address, entry.city].filter(Boolean).join(", ") || "—"}
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
                    {entry.invoice_amount != null ? fmtCurrency(entry.invoice_amount) : "—"}
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
  const [showTimeOff, setShowTimeOff] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const today = todayStr();
  const onTimeOffNow = isOnTimeOff(member.time_off, today);

  const typeBadge =
    member.type === "hes"
      ? { label: "HES Assessor", bg: "rgba(56,189,248,0.15)", color: "#38bdf8" }
      : { label: "Home Inspector", bg: "rgba(251,191,36,0.15)", color: "#fbbf24" };

  function handleRefresh() {
    router.refresh();
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
            {member.email ?? "No email"}{member.phone && ` · ${member.phone}`}
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
          <button
            type="button"
            onClick={() => setShowTimeOff(true)}
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
            <ClockIcon style={{ width: 13, height: 13 }} />
            Mark Time Off
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
              <ProfileField label="Email" value={member.email ?? "—"} />
              <ProfileField label="Phone" value={member.phone ?? "—"} />
              <ProfileField label="Certifications" value={member.certifications.join(", ") || "None"} />
              <ProfileField label="Service Areas" value={member.service_areas.join(", ") || "None"} />
              {member.type === "inspector" && (
                <ProfileField label="License" value={member.license_number ?? "—"} />
              )}
              <ProfileField label="Member Since" value={formatDate(member.created_at)} />
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            <KpiCard label="Jobs Completed" value={kpis.jobsCompleted} color={EMERALD} />
            <KpiCard label="This Month" value={kpis.thisMonth} color="#38bdf8" />
            <KpiCard label="Revenue Generated" value={fmtCurrency(kpis.revenueGenerated)} color="#a78bfa" />
            <KpiCard label="Avg Rating" value={kpis.avgRating > 0 ? kpis.avgRating.toFixed(1) : "—"} color="#fbbf24" />
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
                    <button
                      type="button"
                      title="Remove time off"
                      onClick={async () => {
                        await clearTimeOff(member.id, member.type, i);
                        handleRefresh();
                      }}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <XMarkIcon style={{ width: 14, height: 14 }} />
                    </button>
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
                            color: j.type === "hes" ? "#38bdf8" : "#fbbf24",
                            background: j.type === "hes" ? "rgba(56,189,248,0.1)" : "rgba(251,191,36,0.1)",
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
                    <span style={{ fontSize: 10, color: "#475569" }}>—</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEdit && (
        <EditProfileModal
          member={member}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); handleRefresh(); }}
        />
      )}
      {showTimeOff && (
        <TimeOffModal
          memberId={member.id}
          memberType={member.type}
          onClose={() => setShowTimeOff(false)}
          onSaved={() => { setShowTimeOff(false); handleRefresh(); }}
        />
      )}
    </div>
  );
}
