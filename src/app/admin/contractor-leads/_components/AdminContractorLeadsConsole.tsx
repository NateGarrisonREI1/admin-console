"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";

import type { DirectLeadsTabData } from "../actions";
import type { DirectLead } from "@/types/admin-ops";

import {
  createDirectLeadAction,
  assignDirectLeadAction,
  updateDirectLeadStatusAction,
} from "../actions";

// ─── Types ────────────────────────────────────────────────────

type Props = {
  directLeadsData: DirectLeadsTabData;
};

type LeadFilter = "all" | "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
type AssignCategory = "hes" | "inspector" | "partner";

const SERVICE_OPTIONS = [
  "HES",
  "Inspection",
  "HVAC",
  "Solar",
  "Electrical",
  "Plumbing",
  "Insulation",
] as const;

const SOURCE_OPTIONS = [
  { value: "HES Assessment", label: "HES Assessment" },
  { value: "LEAF Request", label: "LEAF Request" },
  { value: "Organic", label: "Organic" },
  { value: "Direct", label: "Direct" },
] as const;

// ─── Currency / Date formatters ───────────────────────────────

const fmtCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ─── Helpers ──────────────────────────────────────────────────

function sourceStyle(source: string): { bg: string; bd: string; tx: string } {
  const s = source.toLowerCase();
  if (s.includes("hes"))
    return { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.30)", tx: "#10b981" };
  if (s.includes("leaf"))
    return { bg: "rgba(59,130,246,0.12)", bd: "rgba(59,130,246,0.30)", tx: "#60a5fa" };
  if (s.includes("organic"))
    return { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.30)", tx: "#fbbf24" };
  return { bg: "rgba(51,65,85,0.5)", bd: "#475569", tx: "#cbd5e1" };
}

function statusStyle(status: string): { bg: string; bd: string; tx: string } {
  const s = status.toLowerCase();
  if (s === "pending")
    return { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.30)", tx: "#fbbf24" };
  if (s === "assigned")
    return { bg: "rgba(59,130,246,0.12)", bd: "rgba(59,130,246,0.30)", tx: "#60a5fa" };
  if (s === "in_progress")
    return { bg: "rgba(167,139,250,0.12)", bd: "rgba(167,139,250,0.30)", tx: "#a78bfa" };
  if (s === "completed")
    return { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.30)", tx: "#10b981" };
  if (s === "cancelled")
    return { bg: "rgba(239,68,68,0.12)", bd: "rgba(239,68,68,0.35)", tx: "#ef4444" };
  return { bg: "rgba(51,65,85,0.5)", bd: "#475569", tx: "#cbd5e1" };
}

function paymentStyle(status: string): { bg: string; bd: string; tx: string } {
  const s = status.toLowerCase();
  if (s === "paid")
    return { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.30)", tx: "#10b981" };
  if (s === "invoiced")
    return { bg: "rgba(59,130,246,0.12)", bd: "rgba(59,130,246,0.30)", tx: "#60a5fa" };
  if (s === "overdue")
    return { bg: "rgba(239,68,68,0.12)", bd: "rgba(239,68,68,0.35)", tx: "#ef4444" };
  return { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.30)", tx: "#fbbf24" };
}

// ─── Main Component ───────────────────────────────────────────

export default function ContractorLeadsConsole({ directLeadsData }: Props) {
  const { leads, hesMembers, inspectors, partners } = directLeadsData;

  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── Direct leads state
  const [leadFilter, setLeadFilter] = useState<LeadFilter>("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [assignModalLead, setAssignModalLead] = useState<DirectLead | null>(null);
  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);
  const [drawerLead, setDrawerLead] = useState<DirectLead | null>(null);

  // ── Assignment modal state
  const [assignCategory, setAssignCategory] = useState<AssignCategory>("hes");
  const [assignPersonId, setAssignPersonId] = useState("");

  // ── New lead form state
  const [nlName, setNlName] = useState("");
  const [nlEmail, setNlEmail] = useState("");
  const [nlPhone, setNlPhone] = useState("");
  const [nlAddress, setNlAddress] = useState("");
  const [nlCity, setNlCity] = useState("");
  const [nlState, setNlState] = useState("OR");
  const [nlZip, setNlZip] = useState("");
  const [nlSource, setNlSource] = useState("Direct");
  const [nlServices, setNlServices] = useState<string[]>([]);
  const [nlDateNeeded, setNlDateNeeded] = useState("");
  const [nlBudget, setNlBudget] = useState("");
  const [nlNotes, setNlNotes] = useState("");

  // ── Filtered leads
  const filteredLeads = useMemo(() => {
    if (leadFilter === "all") return leads;
    return leads.filter((l) => l.status === leadFilter);
  }, [leads, leadFilter]);

  // ── Lead counts
  const leadCounts = useMemo(() => {
    const counts: Record<LeadFilter, number> = {
      all: leads.length,
      pending: 0,
      assigned: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const l of leads) {
      const s = l.status as LeadFilter;
      if (s in counts) counts[s]++;
    }
    return counts;
  }, [leads]);

  // ── Resolve assigned_to name
  function resolveAssignee(lead: DirectLead): string {
    if (!lead.assigned_to_id || !lead.assigned_type) return "Unassigned";
    if (lead.assigned_type === "hes") {
      const m = hesMembers.find((h) => h.id === lead.assigned_to_id);
      return m ? m.name : "Unknown HES";
    }
    if (lead.assigned_type === "inspector") {
      const m = inspectors.find((i) => i.id === lead.assigned_to_id);
      return m ? m.name : "Unknown Inspector";
    }
    if (lead.assigned_type === "partner") {
      const m = partners.find((p) => p.id === lead.assigned_to_id);
      return m ? (m.company_name ? `${m.name} (${m.company_name})` : m.name) : "Unknown Partner";
    }
    return "Unassigned";
  }

  // ── Close kebab on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!openMenuId) return;
      const el = menuRefs.current[openMenuId];
      if (el && !el.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openMenuId]);

  // ── Escape closes modals/drawers/menus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuId(null);
        if (!isPending) {
          setAssignModalLead(null);
          setNewLeadModalOpen(false);
          setDrawerLead(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPending]);

  // ── Handlers
  function handleAssign() {
    if (!assignModalLead || !assignPersonId) return;
    startTransition(async () => {
      try {
        await assignDirectLeadAction(assignModalLead.id, assignCategory, assignPersonId);
        setAssignModalLead(null);
        setAssignPersonId("");
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  function handleStatusUpdate(leadId: string, status: string) {
    setOpenMenuId(null);
    startTransition(async () => {
      try {
        await updateDirectLeadStatusAction(leadId, status);
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  function handleCreateLead() {
    if (!nlName.trim()) return;
    startTransition(async () => {
      try {
        await createDirectLeadAction({
          customer_name: nlName.trim(),
          customer_email: nlEmail.trim() || undefined,
          customer_phone: nlPhone.trim() || undefined,
          address: nlAddress.trim() || undefined,
          city: nlCity.trim() || undefined,
          state: nlState.trim() || undefined,
          zip: nlZip.trim() || undefined,
          source: nlSource,
          service_needed: nlServices.length > 0 ? nlServices : undefined,
          date_needed: nlDateNeeded || undefined,
          budget: nlBudget ? Number(nlBudget) : undefined,
          special_notes: nlNotes.trim() || undefined,
        });
        resetNewLeadForm();
        setNewLeadModalOpen(false);
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  function resetNewLeadForm() {
    setNlName("");
    setNlEmail("");
    setNlPhone("");
    setNlAddress("");
    setNlCity("");
    setNlState("OR");
    setNlZip("");
    setNlSource("Direct");
    setNlServices([]);
    setNlDateNeeded("");
    setNlBudget("");
    setNlNotes("");
  }

  function openAssignModal(lead: DirectLead) {
    setAssignModalLead(lead);
    setAssignCategory("hes");
    setAssignPersonId("");
    setOpenMenuId(null);
  }

  function openDetailDrawer(lead: DirectLead) {
    setDrawerLead(lead);
    setOpenMenuId(null);
  }

  function toggleService(svc: string) {
    setNlServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc],
    );
  }

  // ── Assignee people list for the chosen category
  const assignPeople: { id: string; name: string }[] = useMemo(() => {
    if (assignCategory === "hes")
      return hesMembers.map((h) => ({ id: h.id, name: h.name }));
    if (assignCategory === "inspector")
      return inspectors.map((i) => ({ id: i.id, name: i.name }));
    return partners.map((p) => ({
      id: p.id,
      name: p.company_name ? `${p.name} (${p.company_name})` : p.name,
    }));
  }, [assignCategory, hesMembers, inspectors, partners]);

  // ─────────────────────────── RENDER ────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: -0.3, color: "#f1f5f9" }}>
            Direct Leads
          </div>
          <div style={{ color: "#94a3b8", marginTop: 4, fontSize: 13 }}>
            Manage direct customer leads, assignments, and revenue tracking.
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {(
          [
            ["all", "All"],
            ["pending", "Pending"],
            ["assigned", "Assigned"],
            ["in_progress", "In Progress"],
            ["completed", "Completed"],
            ["cancelled", "Cancelled"],
          ] as [LeadFilter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setLeadFilter(key)}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border:
                leadFilter === key
                  ? "1px solid rgba(16,185,129,0.30)"
                  : "1px solid #334155",
              background: leadFilter === key ? "rgba(16,185,129,0.12)" : "#1e293b",
              color: leadFilter === key ? "#10b981" : "#cbd5e1",
              fontWeight: 800,
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {label}
            <span
              style={{
                background: leadFilter === key ? "rgba(16,185,129,0.20)" : "#334155",
                color: leadFilter === key ? "#10b981" : "#94a3b8",
                padding: "1px 7px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 900,
              }}
            >
              {leadCounts[key]}
            </span>
          </button>
        ))}

        {/* ── + New Lead button ── */}
        <button
          type="button"
          onClick={() => {
            resetNewLeadForm();
            setNewLeadModalOpen(true);
          }}
          style={{
            marginLeft: "auto",
            padding: "8px 16px",
            borderRadius: 12,
            border: "1px solid rgba(16,185,129,0.30)",
            background: "rgba(16,185,129,0.12)",
            color: "#10b981",
            fontWeight: 900,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          + New Lead
        </button>
      </div>

      {/* ── Stats Strip ── */}
      <div className="admin-kpi-grid">
        <StatCard label="Total Leads" value={String(leads.length)} />
        <StatCard label="Pending Assignment" value={String(leadCounts.pending)} />
        <StatCard label="Assigned" value={String(leadCounts.assigned)} />
        <StatCard label="Completed" value={String(leadCounts.completed)} />
      </div>

      {/* ── Leads Table ── */}
      <div
        style={{
          border: "1px solid #334155",
          background: "#1e293b",
          borderRadius: 16,
          overflow: "visible",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1.4fr 1.2fr 100px 1fr 120px 52px",
            gap: 12,
            padding: "10px 12px",
            fontSize: 12,
            fontWeight: 900,
            color: "#94a3b8",
            borderBottom: "1px solid rgba(51,65,85,0.5)",
            background: "#1e293b",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          <div>Source</div>
          <div>Customer</div>
          <div>Services</div>
          <div>Status</div>
          <div>Assigned To</div>
          <div>Revenue</div>
          <div />
        </div>

        {filteredLeads.length === 0 ? (
          <div style={{ padding: 20, color: "#64748b", fontSize: 13, textAlign: "center" }}>
            No leads match the current filter.
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const src = sourceStyle(lead.source);
            const st = statusStyle(lead.status);
            const ps = paymentStyle(lead.payment_status);
            return (
              <div
                key={lead.id}
                onClick={() => openDetailDrawer(lead)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1.4fr 1.2fr 100px 1fr 120px 52px",
                  gap: 12,
                  padding: "12px 12px",
                  borderBottom: "1px solid rgba(51,65,85,0.5)",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                {/* Source */}
                <div>
                  <span
                    style={{
                      display: "inline-flex",
                      padding: "3px 8px",
                      borderRadius: 999,
                      border: `1px solid ${src.bd}`,
                      background: src.bg,
                      color: src.tx,
                      fontSize: 11,
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {lead.source}
                  </span>
                </div>

                {/* Customer */}
                <div>
                  <div style={{ fontWeight: 900, fontSize: 13, color: "#f1f5f9" }}>
                    {lead.customer_name}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {[lead.address, lead.city, lead.state, lead.zip]
                      .filter(Boolean)
                      .join(", ") || "\u2014"}
                  </div>
                </div>

                {/* Services */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {lead.service_needed.length > 0
                    ? lead.service_needed.map((svc) => (
                        <span
                          key={svc}
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "rgba(167,139,250,0.12)",
                            border: "1px solid rgba(167,139,250,0.25)",
                            color: "#a78bfa",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {svc}
                        </span>
                      ))
                    : <span style={{ color: "#64748b", fontSize: 12 }}>{"\u2014"}</span>}
                </div>

                {/* Status */}
                <div>
                  <span
                    style={{
                      display: "inline-flex",
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: `1px solid ${st.bd}`,
                      background: st.bg,
                      color: st.tx,
                      fontSize: 12,
                      fontWeight: 900,
                      textTransform: "capitalize",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {lead.status.replace("_", " ")}
                  </span>
                </div>

                {/* Assigned To */}
                <div style={{ fontSize: 13, color: "#cbd5e1" }}>{resolveAssignee(lead)}</div>

                {/* Revenue */}
                <div>
                  <div style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 800 }}>
                    {lead.invoice_amount != null ? fmtCurrency.format(lead.invoice_amount) : "\u2014"}
                  </div>
                  {lead.invoice_amount != null && (
                    <span
                      style={{
                        display: "inline-flex",
                        padding: "2px 6px",
                        borderRadius: 999,
                        border: `1px solid ${ps.bd}`,
                        background: ps.bg,
                        color: ps.tx,
                        fontSize: 10,
                        fontWeight: 800,
                        marginTop: 2,
                        textTransform: "capitalize",
                      }}
                    >
                      {lead.payment_status}
                    </span>
                  )}
                </div>

                {/* Kebab */}
                <div
                  style={{ position: "relative" }}
                  ref={(el) => {
                    menuRefs.current[lead.id] = el;
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenuId((cur) => (cur === lead.id ? null : lead.id))
                    }
                    style={{
                      height: 36,
                      width: 36,
                      borderRadius: 999,
                      border: "1px solid #334155",
                      background: "#1e293b",
                      color: "#cbd5e1",
                      fontWeight: 900,
                      cursor: "pointer",
                      fontSize: 16,
                    }}
                    aria-label="Lead actions"
                  >
                    {"\u22EF"}
                  </button>

                  {openMenuId === lead.id && (
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 42,
                        width: 220,
                        borderRadius: 14,
                        background: "#0f172a",
                        boxShadow: "0 28px 70px rgba(0,0,0,0.45)",
                        border: "1px solid #334155",
                        overflow: "hidden",
                        zIndex: 999,
                      }}
                    >
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => openAssignModal(lead)}
                        style={menuItemStyle}
                      >
                        Assign
                      </button>
                      <div style={{ height: 1, background: "#334155" }} />
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleStatusUpdate(lead.id, "in_progress")}
                        style={menuItemStyle}
                      >
                        Mark In Progress
                      </button>
                      <div style={{ height: 1, background: "#334155" }} />
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleStatusUpdate(lead.id, "completed")}
                        style={menuItemStyle}
                      >
                        Mark Complete
                      </button>
                      <div style={{ height: 1, background: "#334155" }} />
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleStatusUpdate(lead.id, "cancelled")}
                        style={{ ...menuItemStyle, color: "#ef4444" }}
                      >
                        Mark Lost
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ═══════════════════════ ASSIGN MODAL ═══════════════════════ */}
      {assignModalLead && (
        <div style={modalOverlayStyle}>
          <div
            onClick={() => !isPending && setAssignModalLead(null)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.60)" }}
          />
          <div className="admin-modal-content" style={modalContentStyle}>
            <div style={{ fontSize: 18, fontWeight: 950, color: "#f1f5f9" }}>Assign Lead</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
              {assignModalLead.customer_name} &mdash;{" "}
              {assignModalLead.service_needed.join(", ") || "No services"}
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#94a3b8", marginBottom: 8 }}>
                Category
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {(
                  [
                    ["hes", "HES Staff"],
                    ["inspector", "Inspector"],
                    ["partner", "Partner"],
                  ] as [AssignCategory, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setAssignCategory(key);
                      setAssignPersonId("");
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 999,
                      border:
                        assignCategory === key
                          ? "1px solid rgba(16,185,129,0.30)"
                          : "1px solid #334155",
                      background:
                        assignCategory === key ? "rgba(16,185,129,0.12)" : "#1e293b",
                      color: assignCategory === key ? "#10b981" : "#cbd5e1",
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#94a3b8", marginBottom: 8 }}>
                Select Person
              </div>
              <select
                value={assignPersonId}
                onChange={(e) => setAssignPersonId(e.target.value)}
                style={inputStyle}
              >
                <option value="">-- Select --</option>
                {assignPeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setAssignModalLead(null)}
                style={btnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || !assignPersonId}
                onClick={handleAssign}
                style={{
                  ...btnPrimary,
                  opacity: isPending || !assignPersonId ? 0.5 : 1,
                }}
              >
                {isPending ? "Assigning\u2026" : "Confirm Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ NEW LEAD MODAL ═══════════════════════ */}
      {newLeadModalOpen && (
        <div style={modalOverlayStyle}>
          <div
            onClick={() => !isPending && setNewLeadModalOpen(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.60)" }}
          />
          <div className="admin-modal-content" style={{ ...modalContentStyle, maxWidth: 540, maxHeight: "85vh", overflow: "auto" }}>
            <div style={{ fontSize: 18, fontWeight: 950, color: "#f1f5f9" }}>New Direct Lead</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
              Enter customer and service details
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {/* Customer Name */}
              <FieldLabel label="Customer Name *">
                <input
                  value={nlName}
                  onChange={(e) => setNlName(e.target.value)}
                  style={inputStyle}
                  placeholder="Full name"
                />
              </FieldLabel>

              {/* Email + Phone row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <FieldLabel label="Email">
                  <input
                    value={nlEmail}
                    onChange={(e) => setNlEmail(e.target.value)}
                    style={inputStyle}
                    placeholder="email@example.com"
                    type="email"
                  />
                </FieldLabel>
                <FieldLabel label="Phone">
                  <input
                    value={nlPhone}
                    onChange={(e) => setNlPhone(e.target.value)}
                    style={inputStyle}
                    placeholder="(555) 123-4567"
                  />
                </FieldLabel>
              </div>

              {/* Address */}
              <FieldLabel label="Address">
                <input
                  value={nlAddress}
                  onChange={(e) => setNlAddress(e.target.value)}
                  style={inputStyle}
                  placeholder="Street address"
                />
              </FieldLabel>

              {/* City, State, Zip */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px", gap: 10 }}>
                <FieldLabel label="City">
                  <input
                    value={nlCity}
                    onChange={(e) => setNlCity(e.target.value)}
                    style={inputStyle}
                    placeholder="City"
                  />
                </FieldLabel>
                <FieldLabel label="State">
                  <input
                    value={nlState}
                    onChange={(e) => setNlState(e.target.value)}
                    style={inputStyle}
                    placeholder="OR"
                  />
                </FieldLabel>
                <FieldLabel label="Zip">
                  <input
                    value={nlZip}
                    onChange={(e) => setNlZip(e.target.value)}
                    style={inputStyle}
                    placeholder="97201"
                  />
                </FieldLabel>
              </div>

              {/* Source */}
              <FieldLabel label="Source">
                <select
                  value={nlSource}
                  onChange={(e) => setNlSource(e.target.value)}
                  style={inputStyle}
                >
                  {SOURCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FieldLabel>

              {/* Service Needed */}
              <FieldLabel label="Services Needed">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SERVICE_OPTIONS.map((svc) => {
                    const selected = nlServices.includes(svc);
                    return (
                      <button
                        key={svc}
                        type="button"
                        onClick={() => toggleService(svc)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 999,
                          border: selected
                            ? "1px solid rgba(167,139,250,0.40)"
                            : "1px solid #334155",
                          background: selected ? "rgba(167,139,250,0.15)" : "#1e293b",
                          color: selected ? "#a78bfa" : "#94a3b8",
                          fontWeight: 800,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        {svc}
                      </button>
                    );
                  })}
                </div>
              </FieldLabel>

              {/* Date + Budget */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <FieldLabel label="Date Needed">
                  <input
                    type="date"
                    value={nlDateNeeded}
                    onChange={(e) => setNlDateNeeded(e.target.value)}
                    style={inputStyle}
                  />
                </FieldLabel>
                <FieldLabel label="Budget ($)">
                  <input
                    value={nlBudget}
                    onChange={(e) => setNlBudget(e.target.value)}
                    style={inputStyle}
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                  />
                </FieldLabel>
              </div>

              {/* Special Notes */}
              <FieldLabel label="Special Notes">
                <textarea
                  value={nlNotes}
                  onChange={(e) => setNlNotes(e.target.value)}
                  style={{ ...inputStyle, height: 80, resize: "vertical" }}
                  placeholder="Any additional information..."
                />
              </FieldLabel>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setNewLeadModalOpen(false)}
                style={btnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || !nlName.trim()}
                onClick={handleCreateLead}
                style={{
                  ...btnPrimary,
                  opacity: isPending || !nlName.trim() ? 0.5 : 1,
                }}
              >
                {isPending ? "Creating\u2026" : "Create Lead"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ DETAIL DRAWER ═══════════════════════ */}
      {drawerLead && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70 }}>
          <div
            onClick={() => !isPending && setDrawerLead(null)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.50)" }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              height: "100%",
              width: "min(540px, 100%)",
              background: "#0f172a",
              borderLeft: "1px solid #334155",
              boxShadow: "0 30px 80px rgba(0,0,0,0.50)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: 20, borderBottom: "1px solid #334155" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                    Lead Details
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 950, color: "#f1f5f9", marginTop: 4 }}>
                    {drawerLead.customer_name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerLead(null)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    border: "1px solid #334155",
                    background: "#1e293b",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontWeight: 900,
                    fontSize: 14,
                  }}
                >
                  {"\u2715"}
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              {/* Customer Info */}
              <DrawerSection title="Customer Information">
                <DrawerRow label="Name" value={drawerLead.customer_name} />
                <DrawerRow label="Email" value={drawerLead.customer_email || "\u2014"} />
                <DrawerRow label="Phone" value={drawerLead.customer_phone || "\u2014"} />
                <DrawerRow
                  label="Address"
                  value={
                    [drawerLead.address, drawerLead.city, drawerLead.state, drawerLead.zip]
                      .filter(Boolean)
                      .join(", ") || "\u2014"
                  }
                />
              </DrawerSection>

              {/* Lead Source + Services */}
              <DrawerSection title="Lead Source & Services">
                <DrawerRow label="Source" value={drawerLead.source} />
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 800, marginRight: 6 }}>
                    Services:
                  </span>
                  {drawerLead.service_needed.length > 0
                    ? drawerLead.service_needed.map((s) => (
                        <span
                          key={s}
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "rgba(167,139,250,0.12)",
                            border: "1px solid rgba(167,139,250,0.25)",
                            color: "#a78bfa",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {s}
                        </span>
                      ))
                    : <span style={{ color: "#64748b", fontSize: 12 }}>{"\u2014"}</span>}
                </div>
                {drawerLead.date_needed && (
                  <DrawerRow label="Date Needed" value={fmtDate(drawerLead.date_needed)} />
                )}
                {drawerLead.budget != null && (
                  <DrawerRow label="Budget" value={fmtCurrency.format(drawerLead.budget)} />
                )}
                {drawerLead.special_notes && (
                  <DrawerRow label="Notes" value={drawerLead.special_notes} />
                )}
              </DrawerSection>

              {/* Assignment */}
              <DrawerSection title="Assignment">
                <DrawerRow
                  label="Status"
                  value={drawerLead.status.replace("_", " ")}
                />
                <DrawerRow
                  label="Assigned Type"
                  value={drawerLead.assigned_type || "\u2014"}
                />
                <DrawerRow label="Assigned To" value={resolveAssignee(drawerLead)} />
                <DrawerRow label="Created" value={fmtDate(drawerLead.created_at)} />
                {drawerLead.completed_at && (
                  <DrawerRow label="Completed" value={fmtDate(drawerLead.completed_at)} />
                )}
              </DrawerSection>

              {/* Revenue + Rating */}
              <DrawerSection title="Revenue & Feedback">
                <DrawerRow
                  label="Invoice Amount"
                  value={
                    drawerLead.invoice_amount != null
                      ? fmtCurrency.format(drawerLead.invoice_amount)
                      : "\u2014"
                  }
                />
                <DrawerRow label="Payment Status" value={drawerLead.payment_status} />
                {drawerLead.customer_rating != null && (
                  <DrawerRow
                    label="Rating"
                    value={`${drawerLead.customer_rating} / 5`}
                  />
                )}
                {drawerLead.customer_feedback && (
                  <DrawerRow label="Feedback" value={drawerLead.customer_feedback} />
                )}
              </DrawerSection>
            </div>

            {/* Drawer Actions */}
            <div
              style={{
                padding: 16,
                borderTop: "1px solid #334155",
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setDrawerLead(null);
                  openAssignModal(drawerLead);
                }}
                style={btnPrimary}
              >
                {drawerLead.assigned_to_id ? "Reassign" : "Assign"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  handleStatusUpdate(drawerLead.id, "completed");
                  setDrawerLead(null);
                }}
                style={btnSecondary}
              >
                Mark Complete
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  handleStatusUpdate(drawerLead.id, "cancelled");
                  setDrawerLead(null);
                }}
                style={btnDanger}
              >
                Mark Lost
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatCard(props: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #334155",
        background: "#1e293b",
        borderRadius: 16,
        padding: "16px 18px",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8" }}>{props.label}</div>
      <div style={{ fontSize: 28, fontWeight: 950, color: "#f1f5f9", marginTop: 4 }}>
        {props.value}
      </div>
    </div>
  );
}

function FieldLabel(props: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 900, color: "#94a3b8", marginBottom: 6 }}>
        {props.label}
      </div>
      {props.children}
    </div>
  );
}

function DrawerSection(props: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #334155", borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 950, color: "#f1f5f9", marginBottom: 10 }}>
        {props.title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{props.children}</div>
    </div>
  );
}

function DrawerRow(props: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 800, flexShrink: 0 }}>
        {props.label}
      </span>
      <span
        style={{
          fontSize: 13,
          color: "#cbd5e1",
          fontWeight: 700,
          textAlign: "right",
          textTransform: "capitalize",
        }}
      >
        {props.value}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARED STYLES
// ═══════════════════════════════════════════════════════════════

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#f1f5f9",
  outline: "none",
  fontSize: 13,
  fontWeight: 800,
  boxSizing: "border-box",
};

const menuItemStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 14px",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
  border: "none",
  background: "transparent",
  color: "#f1f5f9",
  textAlign: "left",
};

const modalOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalContentStyle: CSSProperties = {
  position: "relative",
  zIndex: 51,
  maxWidth: 500,
  width: "90%",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 30px 80px rgba(0,0,0,0.50)",
};

const btnPrimary: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "1px solid rgba(16,185,129,0.30)",
  background: "rgba(16,185,129,0.12)",
  color: "#10b981",
  fontWeight: 950,
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const btnSecondary: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#cbd5e1",
  fontWeight: 950,
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const btnDanger: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "1px solid rgba(239,68,68,0.35)",
  background: "rgba(239,68,68,0.12)",
  color: "#ef4444",
  fontWeight: 950,
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};
