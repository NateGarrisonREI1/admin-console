"use client";

import { useState, useTransition } from "react";
import type { CSSProperties } from "react";
import type { DirectLead, HesTeamMember, InspectorTeamMember, PartnerContractor } from "@/types/admin-ops";
import { createDirectLead, assignLead, updateLeadStatus } from "./actions";
import { useRouter } from "next/navigation";

// ─── Types ─────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
type AssignType = "hes" | "inspector" | "partner";

// ─── Style constants ────────────────────────────────────────────────────────

const BG_BASE = "#0f172a";
const BG_SURFACE = "#1e293b";
const BORDER = "#334155";
const TEXT_PRIMARY = "#f1f5f9";
const TEXT_SECONDARY = "#cbd5e1";
const TEXT_MUTED = "#94a3b8";
const TEXT_DIM = "#64748b";
const EMERALD = "#10b981";

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${BORDER}`,
  background: BG_SURFACE,
  color: TEXT_PRIMARY,
  outline: "none",
  fontSize: 13,
  fontWeight: 600,
  boxSizing: "border-box",
};

const btnPrimary: CSSProperties = {
  flex: 1,
  padding: "12px 12px",
  borderRadius: 10,
  border: `1px solid rgba(16,185,129,0.30)`,
  background: "rgba(16,185,129,0.12)",
  color: EMERALD,
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const btnSecondary: CSSProperties = {
  flex: 1,
  padding: "12px 12px",
  borderRadius: 10,
  border: `1px solid ${BORDER}`,
  background: BG_SURFACE,
  color: TEXT_SECONDARY,
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function fmtLocation(lead: DirectLead) {
  const parts = [lead.city, lead.state].filter(Boolean).join(", ");
  return parts || lead.zip || "—";
}

function statusTone(status: string): { bg: string; bd: string; tx: string } {
  switch (status) {
    case "pending":
      return { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.30)", tx: "#fbbf24" };
    case "assigned":
      return { bg: "rgba(59,130,246,0.12)", bd: "rgba(59,130,246,0.30)", tx: "#60a5fa" };
    case "in_progress":
      return { bg: "rgba(6,182,212,0.12)", bd: "rgba(6,182,212,0.30)", tx: "#22d3ee" };
    case "completed":
      return { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.30)", tx: EMERALD };
    case "cancelled":
      return { bg: "rgba(100,116,139,0.12)", bd: "rgba(100,116,139,0.30)", tx: TEXT_DIM };
    default:
      return { bg: "rgba(51,65,85,0.5)", bd: "#475569", tx: TEXT_SECONDARY };
  }
}

function StatusBadge({ status }: { status: string }) {
  const t = statusTone(status);
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "3px 10px",
      borderRadius: 999,
      border: `1px solid ${t.bd}`,
      background: t.bg,
      color: t.tx,
      fontSize: 11,
      fontWeight: 700,
      textTransform: "capitalize",
      whiteSpace: "nowrap",
    }}>
      {status.replace("_", " ")}
    </span>
  );
}

function ServiceChip({ service }: { service: string }) {
  const isHes = service.toLowerCase().includes("hes") || service.toLowerCase().includes("assessment");
  const isInspection = service.toLowerCase().includes("inspection");
  const bg = isHes ? "rgba(16,185,129,0.12)" : isInspection ? "rgba(245,158,11,0.12)" : "rgba(99,102,241,0.12)";
  const bd = isHes ? "rgba(16,185,129,0.30)" : isInspection ? "rgba(245,158,11,0.30)" : "rgba(99,102,241,0.30)";
  const tx = isHes ? EMERALD : isInspection ? "#fbbf24" : "#818cf8";
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: 999,
      border: `1px solid ${bd}`,
      background: bg,
      color: tx,
      fontSize: 11,
      fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      {service}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

// ─── Assignment Modal ───────────────────────────────────────────────────────

function AssignModal({
  lead,
  hesMembers,
  inspectors,
  partners,
  onClose,
  onAssigned,
}: {
  lead: DirectLead;
  hesMembers: HesTeamMember[];
  inspectors: InspectorTeamMember[];
  partners: PartnerContractor[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [assignType, setAssignType] = useState<AssignType>("hes");
  const [selectedId, setSelectedId] = useState("");
  const [isPending, startTransition] = useTransition();

  const options =
    assignType === "hes"
      ? hesMembers.map((m) => ({ id: m.id, label: m.name, sub: m.status }))
      : assignType === "inspector"
      ? inspectors.map((m) => ({ id: m.id, label: m.name, sub: m.status }))
      : partners.map((p) => ({ id: p.id, label: p.name, sub: p.company_name ?? p.status }));

  function handleAssign() {
    if (!selectedId) return;
    startTransition(async () => {
      try {
        await assignLead(lead.id, assignType, selectedId);
        onAssigned();
      } catch (e: any) {
        alert(e?.message ?? "Failed to assign lead.");
      }
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.60)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, width: "100%", maxWidth: 500, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Header */}
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: TEXT_PRIMARY }}>Assign Lead</div>
          <div style={{ marginTop: 8, padding: 12, background: BG_SURFACE, borderRadius: 10, border: `1px solid ${BORDER}` }}>
            <div style={{ fontWeight: 700, color: TEXT_PRIMARY, fontSize: 14 }}>{lead.customer_name}</div>
            <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4 }}>
              {(lead.service_needed ?? []).join(", ") || "No service specified"}
            </div>
            <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 2 }}>
              {[lead.address, lead.city, lead.state].filter(Boolean).join(", ") || "No address"}
            </div>
          </div>
        </div>

        {/* Assignment type */}
        <Field label="Assignment Type">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(["hes", "inspector", "partner"] as AssignType[]).map((type) => (
              <label key={type} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 12px", borderRadius: 10, border: `1px solid ${assignType === type ? "rgba(16,185,129,0.30)" : BORDER}`, background: assignType === type ? "rgba(16,185,129,0.08)" : BG_SURFACE }}>
                <input
                  type="radio"
                  name="assignType"
                  checked={assignType === type}
                  onChange={() => { setAssignType(type); setSelectedId(""); }}
                  style={{ accentColor: EMERALD }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: assignType === type ? EMERALD : TEXT_SECONDARY }}>
                  {type === "hes" ? "Assign to HES Staff" : type === "inspector" ? "Assign to Inspector" : "Dispatch to Partner"}
                </span>
              </label>
            ))}
          </div>
        </Field>

        {/* Dropdown */}
        <Field label={assignType === "hes" ? "HES Staff Member" : assignType === "inspector" ? "Inspector" : "Partner"}>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="admin-select" style={inputStyle}>
            <option value="">— Select —</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label} ({o.sub})
              </option>
            ))}
          </select>
        </Field>

        {/* Footer */}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onClose} style={btnSecondary} disabled={isPending}>Cancel</button>
          <button type="button" onClick={handleAssign} style={{ ...btnPrimary, opacity: !selectedId || isPending ? 0.5 : 1 }} disabled={!selectedId || isPending}>
            {isPending ? "Assigning…" : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New Lead Modal ─────────────────────────────────────────────────────────

const ALL_SERVICES = ["HES Assessment", "Home Inspection"];
const ALL_SOURCES = ["direct", "referral", "website", "marketing"];
const TIME_OPTIONS = ["Morning (8am–12pm)", "Afternoon (12pm–5pm)", "Evening (5pm–8pm)", "Flexible"];

function NewLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("OR");
  const [zip, setZip] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [dateNeeded, setDateNeeded] = useState("");
  const [timeNeeded, setTimeNeeded] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState("direct");

  function toggleService(s: string) {
    setServices((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  function handleCreate() {
    if (!customerName.trim()) { alert("Customer name is required."); return; }
    startTransition(async () => {
      try {
        await createDirectLead({
          customer_name: customerName.trim(),
          customer_email: email.trim() || undefined,
          customer_phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || "OR",
          zip: zip.trim() || undefined,
          service_needed: services,
          date_needed: dateNeeded || undefined,
          time_needed: timeNeeded || undefined,
          budget: budget ? Number(budget) : undefined,
          special_notes: notes.trim() || undefined,
          source,
        });
        onCreated();
      } catch (e: any) {
        alert(e?.message ?? "Failed to create lead.");
      }
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.60)", display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto", padding: "20px 0" }}>
      <div style={{ background: BG_BASE, border: `1px solid ${BORDER}`, borderRadius: 12, width: "100%", maxWidth: 500, padding: 24, display: "flex", flexDirection: "column", gap: 16, margin: "auto" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: TEXT_PRIMARY }}>New Direct Lead</div>

        <Field label="Customer Name *">
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Full name" className="admin-input" style={inputStyle} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" type="email" className="admin-input" style={inputStyle} />
          </Field>
          <Field label="Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(503) 000-0000" type="tel" className="admin-input" style={inputStyle} />
          </Field>
        </div>

        <Field label="Address">
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" className="admin-input" style={inputStyle} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.7fr 0.8fr", gap: 12 }}>
          <Field label="City">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Portland" className="admin-input" style={inputStyle} />
          </Field>
          <Field label="State">
            <input value={state} onChange={(e) => setState(e.target.value)} placeholder="OR" maxLength={2} className="admin-input" style={inputStyle} />
          </Field>
          <Field label="ZIP">
            <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="97201" className="admin-input" style={inputStyle} />
          </Field>
        </div>

        <Field label="Service Needed">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ALL_SERVICES.map((s) => {
              const active = services.includes(s);
              return (
                <button key={s} type="button" onClick={() => toggleService(s)} style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: `1px solid ${active ? "rgba(16,185,129,0.40)" : BORDER}`,
                  background: active ? "rgba(16,185,129,0.12)" : BG_SURFACE,
                  color: active ? EMERALD : TEXT_MUTED,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}>
                  {s}
                </button>
              );
            })}
          </div>
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Date Needed">
            <input type="date" value={dateNeeded} onChange={(e) => setDateNeeded(e.target.value)} className="admin-input" style={inputStyle} />
          </Field>
          <Field label="Time Needed">
            <select value={timeNeeded} onChange={(e) => setTimeNeeded(e.target.value)} className="admin-select" style={inputStyle}>
              <option value="">— Any time —</option>
              {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Budget ($)">
            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0.00" min="0" className="admin-input" style={inputStyle} />
          </Field>
          <Field label="Source">
            <select value={source} onChange={(e) => setSource(e.target.value)} className="admin-select" style={inputStyle}>
              {ALL_SOURCES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Special Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special requests or notes…" className="admin-input" style={{ ...inputStyle, height: 90, resize: "vertical" }} />
        </Field>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onClose} style={btnSecondary} disabled={isPending}>Cancel</button>
          <button type="button" onClick={handleCreate} style={{ ...btnPrimary, opacity: isPending ? 0.5 : 1 }} disabled={isPending}>
            {isPending ? "Creating…" : "Create Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Client Component ──────────────────────────────────────────────────

export default function DirectLeadsClient({
  leads,
  hesMembers,
  inspectors,
  partners,
}: {
  leads: DirectLead[];
  hesMembers: HesTeamMember[];
  inspectors: InspectorTeamMember[];
  partners: PartnerContractor[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [assignTarget, setAssignTarget] = useState<DirectLead | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const STATUS_TABS: StatusFilter[] = ["all", "pending", "assigned", "in_progress", "completed", "cancelled"];

  const filteredLeads =
    statusFilter === "all"
      ? leads
      : leads.filter((l) => l.status === statusFilter);

  const pendingLeads = leads.filter((l) => l.status === "pending");

  function refresh() {
    router.refresh();
    setAssignTarget(null);
    setShowNewLead(false);
  }

  function handleMarkStatus(lead: DirectLead, status: string) {
    startTransition(async () => {
      try {
        await updateLeadStatus(lead.id, { status });
        router.refresh();
      } catch (e: any) {
        alert(e?.message ?? "Failed to update status.");
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT_PRIMARY, letterSpacing: -0.3 }}>Direct Customer Leads</h1>
            <span style={{
              padding: "3px 10px",
              borderRadius: 999,
              background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.30)",
              color: EMERALD,
              fontSize: 13,
              fontWeight: 700,
            }}>
              {leads.length}
            </span>
          </div>
          <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 4 }}>Manage and assign customer leads directly from REI</div>
        </div>
        <button
          type="button"
          onClick={() => setShowNewLead(true)}
          className="admin-btn-primary"
          style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(16,185,129,0.30)", background: "rgba(16,185,129,0.12)", color: EMERALD, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
        >
          + New Lead
        </button>
      </div>

      {/* Status filter bar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              border: `1px solid ${statusFilter === tab ? "rgba(16,185,129,0.30)" : BORDER}`,
              background: statusFilter === tab ? "rgba(16,185,129,0.12)" : BG_SURFACE,
              color: statusFilter === tab ? EMERALD : TEXT_SECONDARY,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {tab === "all" ? "All" : tab.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            {tab !== "all" && (
              <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>
                {leads.filter((l) => l.status === tab).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Pending Leads Section */}
      {pendingLeads.length > 0 && statusFilter === "all" && (
        <div style={{ border: "1px solid rgba(245,158,11,0.35)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", background: "rgba(245,158,11,0.08)", borderBottom: "1px solid rgba(245,158,11,0.20)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#fbbf24" }}>Pending Assignment</div>
            <span style={{ padding: "2px 10px", borderRadius: 999, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.30)", color: "#fbbf24", fontSize: 12, fontWeight: 700 }}>
              {pendingLeads.length} pending
            </span>
          </div>

          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.8fr 1.2fr 1fr 1fr 1.2fr 120px",
            gap: 12,
            padding: "10px 16px",
            fontSize: 11,
            fontWeight: 700,
            color: TEXT_DIM,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            borderBottom: `1px solid ${BORDER}`,
            background: BG_SURFACE,
          }}>
            <div>Customer</div>
            <div>Service Needed</div>
            <div>Date Needed</div>
            <div>Location</div>
            <div>Assignment</div>
            <div>Actions</div>
          </div>

          {pendingLeads.map((lead) => (
            <div
              key={lead.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.8fr 1.2fr 1fr 1fr 1.2fr 120px",
                gap: 12,
                padding: "12px 16px",
                borderBottom: `1px solid ${BORDER}`,
                alignItems: "center",
                background: BG_BASE,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: TEXT_PRIMARY }}>{lead.customer_name}</div>
                <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>{lead.customer_email || lead.customer_phone || ""}</div>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {(lead.service_needed ?? []).length > 0
                  ? (lead.service_needed ?? []).map((s) => <ServiceChip key={s} service={s} />)
                  : <span style={{ fontSize: 12, color: TEXT_DIM }}>—</span>}
              </div>
              <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>{fmtDate(lead.date_needed)}</div>
              <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>{fmtLocation(lead)}</div>
              <div style={{ fontSize: 12, color: TEXT_DIM }}>Unassigned</div>
              <div>
                <button
                  type="button"
                  onClick={() => setAssignTarget(lead)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(16,185,129,0.30)",
                    background: "rgba(16,185,129,0.12)",
                    color: EMERALD,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Assign
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All Leads Table */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", background: BG_SURFACE, borderBottom: `1px solid ${BORDER}`, fontWeight: 700, fontSize: 14, color: TEXT_PRIMARY }}>
          {statusFilter === "all" ? "All Leads" : `${statusFilter.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())} Leads`}
          <span style={{ marginLeft: 8, fontSize: 12, color: TEXT_DIM }}>{filteredLeads.length} records</span>
        </div>

        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr 1fr 1fr 110px 110px 80px",
          gap: 12,
          padding: "10px 16px",
          fontSize: 11,
          fontWeight: 700,
          color: TEXT_DIM,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          borderBottom: `1px solid ${BORDER}`,
          background: BG_SURFACE,
        }}>
          <div>Customer</div>
          <div>Service</div>
          <div>Location</div>
          <div>Assigned To</div>
          <div>Status</div>
          <div>Date</div>
          <div>Actions</div>
        </div>

        {filteredLeads.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: TEXT_DIM, fontSize: 14 }}>
            No leads found.
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <div key={lead.id}>
              {/* Row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 1fr 1fr 1fr 110px 110px 80px",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: `1px solid ${BORDER}`,
                  alignItems: "center",
                  cursor: "pointer",
                  background: expandedId === lead.id ? "rgba(30,41,59,0.7)" : "transparent",
                }}
                onClick={() => setExpandedId((prev) => prev === lead.id ? null : lead.id)}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: TEXT_PRIMARY }}>{lead.customer_name}</div>
                  <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 1 }}>{lead.source}</div>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(lead.service_needed ?? []).length > 0
                    ? (lead.service_needed ?? []).map((s) => <ServiceChip key={s} service={s} />)
                    : <span style={{ fontSize: 12, color: TEXT_DIM }}>—</span>}
                </div>
                <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>{fmtLocation(lead)}</div>
                <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>
                  {lead.assigned_type
                    ? `${lead.assigned_type} (${lead.assigned_to_id?.slice(0, 8)}…)`
                    : <span style={{ color: TEXT_DIM }}>—</span>}
                </div>
                <div><StatusBadge status={lead.status} /></div>
                <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>{fmtDate(lead.created_at)}</div>
                <div onClick={(e) => e.stopPropagation()}>
                  {lead.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => setAssignTarget(lead)}
                      style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.30)", background: "rgba(16,185,129,0.10)", color: EMERALD, fontWeight: 700, fontSize: 11, cursor: "pointer" }}
                    >
                      Assign
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === lead.id && (
                <div style={{ padding: "16px 20px", background: "rgba(15,23,42,0.8)", borderBottom: `1px solid ${BORDER}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Contact</div>
                    <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>{lead.customer_email || "—"}</div>
                    <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>{lead.customer_phone || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Schedule</div>
                    <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>Date: {fmtDate(lead.date_needed)}</div>
                    <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>Time: {lead.time_needed || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Notes</div>
                    <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>{lead.special_notes || "—"}</div>
                  </div>
                  {lead.status !== "completed" && lead.status !== "cancelled" && (
                    <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, marginTop: 4 }}>
                      {lead.status !== "in_progress" && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleMarkStatus(lead, "in_progress")}
                          style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(6,182,212,0.30)", background: "rgba(6,182,212,0.10)", color: "#22d3ee", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                        >
                          Mark In Progress
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleMarkStatus(lead, "completed")}
                        style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.30)", background: "rgba(16,185,129,0.10)", color: EMERALD, fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                      >
                        Mark Completed
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleMarkStatus(lead, "cancelled")}
                        style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.30)", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {assignTarget && (
        <AssignModal
          lead={assignTarget}
          hesMembers={hesMembers}
          inspectors={inspectors}
          partners={partners}
          onClose={() => setAssignTarget(null)}
          onAssigned={refresh}
        />
      )}
      {showNewLead && (
        <NewLeadModal
          onClose={() => setShowNewLead(false)}
          onCreated={refresh}
        />
      )}
    </div>
  );
}
