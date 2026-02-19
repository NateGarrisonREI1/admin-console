// src/app/admin/schedule/SchedulePageClient.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import type { SchedulePageData, ScheduleJob, MemberType } from "./data";
import {
  createScheduleJob,
  cancelScheduleJob,
  updateScheduleJobStatus,
  rescheduleJob,
} from "./actions";
import type { ServiceCatalog } from "../_actions/services";
import { fetchServiceCatalog } from "../_actions/services";

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
} as const;

// ─── Display badge config (table rows — not clickable) ──────────────

const STATUS_DISPLAY: Record<string, { bg: string; color: string; border: string; label: string }> = {
  pending:     { bg: "rgba(124,58,237,0.12)", color: "#a78bfa", border: "rgba(124,58,237,0.3)", label: "Pending" },
  scheduled:   { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.35)", label: "Scheduled" },
  in_progress: { bg: "rgba(217,119,6,0.15)", color: "#fbbf24", border: "rgba(217,119,6,0.35)", label: "In Progress" },
  completed:   { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.35)", label: "Completed" },
  cancelled:   { bg: "rgba(100,116,139,0.12)", color: "#94a3b8", border: "rgba(100,116,139,0.3)", label: "Cancelled" },
};

const JOB_TYPE_BADGE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  hes:           { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.3)", label: "HES" },
  inspector:     { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "rgba(245,158,11,0.3)", label: "Inspection" },
  leaf_followup: { bg: "rgba(99,102,241,0.12)", color: "#818cf8", border: "rgba(99,102,241,0.3)", label: "LEAF" },
};

type JobTypeFilter = "all" | "hes" | "inspector" | "leaf_followup";
type StatusFilter = "all" | "pending" | "scheduled" | "in_progress" | "completed" | "cancelled";
type DateRange = "today" | "this_week" | "this_month" | "custom";

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

// ─── Expanded Job Detail Card ───────────────────────────────────────

function ExpandedJobCard({
  job,
  onStatusUpdated,
  onCancelRequest,
  onRescheduleRequest,
  onCollapse,
}: {
  job: ScheduleJob;
  onStatusUpdated: (msg: string) => void;
  onCancelRequest: (job: ScheduleJob) => void;
  onRescheduleRequest: (job: ScheduleJob) => void;
  onCollapse: () => void;
}) {
  const [notes, setNotes] = useState(job.special_notes ?? "");
  const [busy, setBusy] = useState(false);

  const addr = fullAddress(job);
  const mapUrl = makeMapEmbed(job.address, job.city, job.state, job.zip);
  const directionsUrl = makeMapHref(job.address, job.city, job.state, job.zip);

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

  // Determine which action pills to show based on current status
  function renderActionPills() {
    const pills: React.ReactNode[] = [];

    switch (job.status) {
      case "pending":
        pills.push(
          <StatusPill key="schedule" label="Schedule" colorKey="schedule" disabled={busy}
            onClick={() => handlePillAction("scheduled", "Scheduled")} />,
          <StatusPill key="cancel" label="Cancel" colorKey="cancelled" disabled={busy}
            onClick={() => onCancelRequest(job)} />,
        );
        break;
      case "scheduled":
        pills.push(
          <StatusPill key="reschedule" label="Re-Schedule" colorKey="reschedule" disabled={busy}
            onClick={() => onRescheduleRequest(job)} />,
          <StatusPill key="in_progress" label="In Progress" colorKey="in_progress" disabled={busy}
            onClick={() => handlePillAction("in_progress", "In Progress")} />,
          <StatusPill key="cancel" label="Cancel" colorKey="cancelled" disabled={busy}
            onClick={() => onCancelRequest(job)} />,
        );
        break;
      case "in_progress":
        pills.push(
          <StatusPill key="completed" label="Completed" colorKey="completed" disabled={busy}
            onClick={() => handlePillAction("completed", "Completed")} />,
          <StatusPill key="cancel" label="Cancel" colorKey="cancelled" disabled={busy}
            onClick={() => onCancelRequest(job)} />,
        );
        break;
      case "completed":
        pills.push(
          <StatusPill key="reschedule" label="Re-Schedule" colorKey="reschedule" disabled={busy}
            onClick={() => onRescheduleRequest(job)} />,
        );
        break;
      case "cancelled":
        pills.push(
          <StatusPill key="reschedule" label="Re-Schedule" colorKey="reschedule" disabled={busy}
            onClick={() => onRescheduleRequest(job)} />,
        );
        break;
    }

    return pills;
  }

  return (
    <tr>
      <td colSpan={9} style={{ padding: 0 }}>
        <div
          style={{ background: "#162032", borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", gap: 20 }}>
            {/* Left side — 2/3 */}
            <div style={{ flex: 2, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                Job Details
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
                <div>
                  <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Customer</div>
                  <div style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{job.customer_name}</div>
                </div>
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
                  <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>Service Type</div>
                  <div style={{ fontSize: 13, color: TEXT_SEC }}>{typeLabel(job.type)}</div>
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

              {/* Notes */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 5 }}>Notes</div>
                <textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  className="admin-input" style={{ fontSize: 13, padding: "9px 12px", resize: "vertical", width: "100%" }}
                  placeholder="Add notes..."
                />
              </div>

              {/* Current status display */}
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase" }}>Current Status</div>
                <DisplayBadge config={STATUS_DISPLAY[job.status] ?? STATUS_DISPLAY.pending} />
              </div>

              {/* Action pills */}
              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {renderActionPills()}
                <button
                  type="button" onClick={onCollapse}
                  style={{
                    padding: "6px 16px", borderRadius: 9999, fontSize: 13, fontWeight: 600,
                    cursor: "pointer", background: "transparent", color: TEXT_MUTED,
                    border: `1px solid ${BORDER}`, marginLeft: 4,
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Right side — 1/3: Map */}
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                Location
              </div>
              {addr ? (
                <>
                  <div style={{ borderRadius: 10, border: `1px solid ${BORDER}`, overflow: "hidden", height: 300, background: "#0f172a" }}>
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
                  borderRadius: 10, border: `1px solid ${BORDER}`, height: 300, background: "#0f172a",
                  display: "flex", alignItems: "center", justifyContent: "center", color: TEXT_DIM, fontSize: 13,
                }}>No address provided</div>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
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
  const [jobTypeFilter, setJobTypeFilter] = useState<JobTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [assignedToFilter, setAssignedToFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>("this_week");
  const [searchQuery, setSearchQuery] = useState("");

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [catalog, setCatalog] = useState<ServiceCatalog>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Cancel confirm
  const [cancelTarget, setCancelTarget] = useState<ScheduleJob | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Reschedule modal
  const [rescheduleTarget, setRescheduleTarget] = useState<ScheduleJob | null>(null);

  async function openScheduleModal() {
    if (!catalogLoaded) {
      const c = await fetchServiceCatalog();
      setCatalog(c);
      setCatalogLoaded(true);
    }
    setShowScheduleModal(true);
  }

  function handleRefresh() { router.refresh(); }

  const filteredJobs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return data.jobs.filter((job) => {
      if (jobTypeFilter !== "all" && job.type !== jobTypeFilter) return false;
      if (statusFilter !== "all" && job.status !== statusFilter) return false;
      if (assignedToFilter !== "all" && (job.team_member_id ?? "") !== assignedToFilter) return false;
      if (dateRange === "today" && job.scheduled_date !== today) return false;
      if (dateRange === "this_week" && (job.scheduled_date < monday || job.scheduled_date > sunday)) return false;
      if (dateRange === "this_month" && (job.scheduled_date < monthStart || job.scheduled_date > monthEnd)) return false;
      if (query) {
        const hay = [job.customer_name, job.customer_phone, job.customer_email, job.address, job.city, job.zip, job.team_member_name]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [data.jobs, jobTypeFilter, statusFilter, assignedToFilter, dateRange, searchQuery, today, monday, sunday, monthStart, monthEnd]);

  async function handleCancel() {
    if (!cancelTarget || cancelLoading) return;
    setCancelLoading(true);
    try {
      await cancelScheduleJob(cancelTarget.id, cancelTarget.type);
      setCancelTarget(null);
      setExpandedJobId(null);
      setToast("Job cancelled.");
      handleRefresh();
    } catch (err: any) {
      alert(err?.message ?? "Failed to cancel job.");
    } finally {
      setCancelLoading(false);
    }
  }

  function handleRowClick(jobId: string) {
    setExpandedJobId((prev) => (prev === jobId ? null : jobId));
  }

  function isOverdue(job: ScheduleJob): boolean {
    if (job.status === "completed" || job.status === "cancelled") return false;
    return job.scheduled_date < today;
  }

  const COL_COUNT = 9;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customer, address, team member..."
          className="admin-input" style={{ maxWidth: 340, fontSize: 13, padding: "7px 12px" }} />
      </div>

      {/* Filter Bar */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase" }}>Type:</span>
          <select value={jobTypeFilter} onChange={(e) => setJobTypeFilter(e.target.value as JobTypeFilter)} className="admin-input" style={{ fontSize: 12, padding: "5px 8px", width: "auto", minWidth: 140 }}>
            <option value="all">All</option><option value="hes">HES Assessment</option><option value="inspector">Home Inspection</option><option value="leaf_followup">LEAF Follow-up</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase" }}>Status:</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="admin-input" style={{ fontSize: 12, padding: "5px 8px", width: "auto", minWidth: 130 }}>
            <option value="all">All</option><option value="pending">Pending</option><option value="scheduled">Scheduled</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase" }}>Assigned:</span>
          <select value={assignedToFilter} onChange={(e) => setAssignedToFilter(e.target.value)} className="admin-input" style={{ fontSize: 12, padding: "5px 8px", width: "auto", minWidth: 150 }}>
            <option value="all">All</option>
            {data.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase" }}>Date:</span>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRange)} className="admin-input" style={{ fontSize: 12, padding: "5px 8px", width: "auto", minWidth: 120 }}>
            <option value="today">Today</option><option value="this_week">This Week</option><option value="this_month">This Month</option><option value="custom">All Time</option>
          </select>
        </div>
        <span style={{ fontSize: 12, color: TEXT_DIM, marginLeft: "auto" }}>
          Showing <span style={{ fontWeight: 700, color: TEXT_SEC }}>{filteredJobs.length}</span> jobs
        </span>
      </div>

      {/* Content */}
      {viewMode === "list" ? (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table" style={{ minWidth: 1100 }}>
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Date</th>
                  <th style={{ width: 80 }}>Time</th>
                  <th style={{ width: 150 }}>Customer</th>
                  <th style={{ width: 120 }}>Phone</th>
                  <th>Address</th>
                  <th style={{ width: 110 }}>Type</th>
                  <th style={{ width: 120 }}>Assigned To</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ width: 80, textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => {
                  const overdue = isOverdue(job);
                  const todayRow = job.scheduled_date === today;
                  const isMuted = job.status === "completed" || job.status === "cancelled";
                  const isExpanded = expandedJobId === job.id;
                  const typeBadge = JOB_TYPE_BADGE[job.type] ?? JOB_TYPE_BADGE.hes;
                  const statusBadge = STATUS_DISPLAY[job.status] ?? STATUS_DISPLAY.pending;

                  const leftBorder = overdue
                    ? "3px solid rgba(239,68,68,0.6)"
                    : todayRow && !isMuted
                    ? "3px solid rgba(16,185,129,0.6)"
                    : "3px solid transparent";

                  const textColor = isMuted ? TEXT_DIM : TEXT;
                  const secColor = isMuted ? TEXT_DIM : TEXT_SEC;
                  const addr = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");

                  return (
                    <Fragment key={job.id}>
                      <tr
                        onClick={() => handleRowClick(job.id)}
                        style={{
                          cursor: "pointer", borderLeft: leftBorder,
                          background: isExpanded ? "rgba(124,58,237,0.06)" : undefined,
                          transition: "background 0.1s ease",
                        }}
                        onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = "rgba(148,163,184,0.05)"; }}
                        onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = ""; }}
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

                      {isExpanded && (
                        <ExpandedJobCard
                          job={job}
                          onStatusUpdated={(msg) => { setToast(msg); handleRefresh(); }}
                          onCancelRequest={(j) => setCancelTarget(j)}
                          onRescheduleRequest={(j) => setRescheduleTarget(j)}
                          onCollapse={() => setExpandedJobId(null)}
                        />
                      )}
                    </Fragment>
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

      {/* Toast */}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </div>
  );
}
