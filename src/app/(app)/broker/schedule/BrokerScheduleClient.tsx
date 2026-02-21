// src/app/(app)/broker/schedule/BrokerScheduleClient.tsx
"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BrokerJob } from "./actions";
import type { BrokerScheduleJob } from "../assessments/actions";
import {
  logOutOfNetworkJob,
  uploadHesReport,
  removeHesReport,
  sendBrokerDelivery,
} from "../assessments/actions";
import StatusProgressBar from "@/components/ui/StatusProgressBar";
import BrokerDeliveryPanel from "@/components/ui/BrokerDeliveryPanel";

// ─── Design tokens ──────────────────────────────────────────────────

const BG_CARD = "#1e293b";
const BORDER = "#334155";
const RADIUS = 12;
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_MUTED = "#94a3b8";
const TEXT_DIM = "#64748b";
const EMERALD = "#10b981";
const BLUE = "#3b82f6";
const AMBER = "#f59e0b";
const PURPLE = "#8b5cf6";

// ─── Status display ─────────────────────────────────────────────────

const STATUS_DISPLAY: Record<string, { bg: string; color: string; border: string; label: string }> = {
  pending:          { bg: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "rgba(245,158,11,0.35)", label: "Pending" },
  pending_delivery: { bg: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "rgba(245,158,11,0.35)", label: "Pending Delivery" },
  scheduled:        { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.35)", label: "Scheduled" },
  rescheduled:      { bg: "rgba(37,99,235,0.15)", color: "#60a5fa", border: "rgba(37,99,235,0.35)", label: "Rescheduled" },
  en_route:         { bg: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "rgba(59,130,246,0.35)", label: "En Route" },
  on_site:          { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.35)", label: "On Site" },
  field_complete:   { bg: "rgba(217,119,6,0.15)", color: "#fbbf24", border: "rgba(217,119,6,0.35)", label: "Field Complete" },
  report_ready:     { bg: "rgba(8,145,178,0.15)", color: "#22d3ee", border: "rgba(8,145,178,0.35)", label: "Report Ready" },
  delivered:        { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.35)", label: "Delivered" },
  in_progress:      { bg: "rgba(217,119,6,0.15)", color: "#fbbf24", border: "rgba(217,119,6,0.35)", label: "In Progress" },
  completed:        { bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.35)", label: "Completed" },
};

const JOB_TYPE_BADGE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  hes:       { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.3)", label: "HES" },
  inspector: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "rgba(245,158,11,0.3)", label: "Inspection" },
};

const NETWORK_BADGE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  in_network:      { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.3)", label: "In-Network" },
  out_of_network:  { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "rgba(245,158,11,0.3)", label: "Out-of-Network" },
  self_managed:    { bg: "rgba(234,179,8,0.12)",  color: "#eab308", border: "rgba(234,179,8,0.3)",  label: "Self-Managed" },
};

function Badge({ bg, color, border, label }: { bg: string; color: string; border: string; label: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, background: bg, color, border: `1px solid ${border}`,
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Filter tabs ────────────────────────────────────────────────────

type FilterTab = "all" | "in_progress" | "completed" | "pending_delivery";

const ACTIVE_STATUSES = new Set(["scheduled", "en_route", "on_site", "field_complete", "report_ready", "in_progress", "rescheduled"]);
const COMPLETED_STATUSES = new Set(["delivered", "completed"]);

function filterJobs(jobs: BrokerJob[], tab: FilterTab): BrokerJob[] {
  switch (tab) {
    case "in_progress":
      return jobs.filter((j) => ACTIVE_STATUSES.has(j.status));
    case "completed":
      return jobs.filter((j) => COMPLETED_STATUSES.has(j.status));
    case "pending_delivery":
      return jobs.filter((j) => j.status === "pending_delivery" || j.status === "pending");
    default:
      return jobs;
  }
}

// ─── US States ──────────────────────────────────────────────────────

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

// ─── FormField helper ───────────────────────────────────────────────

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: TEXT_DIM, marginBottom: 4 }}>
        {label}{required && <span style={{ color: "#f87171" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

// ─── LogOutOfNetworkJobModal ────────────────────────────────────────

function LogOutOfNetworkJobModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [serviceType, setServiceType] = useState<"hes" | "inspector">("hes");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("OR");
  const [zip, setZip] = useState("");
  const [dateCompleted, setDateCompleted] = useState(new Date().toISOString().slice(0, 10));
  const [assessorName, setAssessorName] = useState("");
  const [assessorCompany, setAssessorCompany] = useState("");
  const [assessorEmail, setAssessorEmail] = useState("");
  const [submitting, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  function handleSubmit() {
    if (!customerName.trim()) { setError("Customer name is required."); return; }
    if (!address.trim()) { setError("Address is required."); return; }
    if (!city.trim()) { setError("City is required."); return; }
    if (!assessorName.trim()) { setError("Assessor name is required."); return; }
    setError("");
    startTransition(async () => {
      try {
        const result = await logOutOfNetworkJob({
          serviceType,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim() || undefined,
          customer_phone: customerPhone.trim() || undefined,
          address: address.trim(),
          city: city.trim(),
          state,
          zip: zip.trim(),
          scheduled_date: dateCompleted,
          external_assessor_name: assessorName.trim(),
          external_assessor_company: assessorCompany.trim() || undefined,
          external_assessor_email: assessorEmail.trim() || undefined,
        });
        if (result.error) throw new Error(result.error);
        setSuccess(true);
        setTimeout(() => onCreated(), 900);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to log job.");
      }
    });
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current && !submitting) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 30px 80px rgba(0,0,0,0.55)" }}>
        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>Log Out-of-Network Job</div>
            <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 2 }}>Record a job done by an assessor outside the REI network</div>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Close" style={{ background: "transparent", border: "none", color: TEXT_DIM, fontSize: 22, cursor: "pointer", lineHeight: 1, padding: 4, opacity: submitting ? 0.5 : 1 }}>&times;</button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          {success ? (
            <div style={{ padding: 20, borderRadius: 10, background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)", color: EMERALD, fontWeight: 700, fontSize: 14, textAlign: "center" }}>
              Job logged! You can now upload the HES report and deliver.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>Service Type</div>
              <div style={{ display: "flex", gap: 10 }}>
                {(["hes", "inspector"] as const).map((t) => (
                  <label key={t} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, cursor: "pointer", background: serviceType === t ? "rgba(16,185,129,0.06)" : "transparent", border: `1px solid ${serviceType === t ? "rgba(16,185,129,0.2)" : "#334155"}` }}>
                    <input type="radio" name="serviceType" checked={serviceType === t} onChange={() => setServiceType(t)} style={{ accentColor: EMERALD }} />
                    <span style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{t === "hes" ? "HES Assessment" : "Home Inspection"}</span>
                  </label>
                ))}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>Homeowner</div>
              <FormField label="Name" required>
                <input className="admin-input" type="text" placeholder="Jane Smith" value={customerName} onChange={(e) => setCustomerName(e.target.value)} autoFocus />
              </FormField>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormField label="Email"><input className="admin-input" type="email" placeholder="jane@email.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} /></FormField>
                <FormField label="Phone"><input className="admin-input" type="tel" placeholder="(503) 555-0100" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></FormField>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>Property Address</div>
              <FormField label="Street" required><input className="admin-input" type="text" placeholder="123 Main St" value={address} onChange={(e) => setAddress(e.target.value)} /></FormField>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
                <FormField label="City" required><input className="admin-input" type="text" placeholder="Portland" value={city} onChange={(e) => setCity(e.target.value)} /></FormField>
                <FormField label="State"><select className="admin-select" value={state} onChange={(e) => setState(e.target.value)}>{US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select></FormField>
                <FormField label="ZIP"><input className="admin-input" type="text" placeholder="97201" maxLength={10} value={zip} onChange={(e) => setZip(e.target.value)} /></FormField>
              </div>

              <FormField label="Date Completed" required><input className="admin-input" type="date" value={dateCompleted} onChange={(e) => setDateCompleted(e.target.value)} /></FormField>

              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>External Assessor</div>
              <FormField label="Assessor Name" required><input className="admin-input" type="text" placeholder="Joe's Energy" value={assessorName} onChange={(e) => setAssessorName(e.target.value)} /></FormField>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormField label="Company"><input className="admin-input" type="text" placeholder="Energy Co." value={assessorCompany} onChange={(e) => setAssessorCompany(e.target.value)} /></FormField>
                <FormField label="Email"><input className="admin-input" type="email" placeholder="joe@energy.com" value={assessorEmail} onChange={(e) => setAssessorEmail(e.target.value)} /></FormField>
              </div>

              {error && (
                <div style={{ fontSize: 13, color: "#f87171", fontWeight: 600, padding: "8px 12px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.20)" }}>
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {!success && (
          <div style={{ padding: "14px 20px", borderTop: "1px solid #334155", display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} className="admin-btn-secondary" disabled={submitting} style={{ opacity: submitting ? 0.6 : 1 }}>Cancel</button>
            <button type="button" onClick={handleSubmit} className="admin-btn-primary" disabled={submitting} style={{ opacity: submitting ? 0.6 : 1 }}>{submitting ? "Creating..." : "Log Job"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────

function KPICard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{
      background: BG_CARD,
      borderTop: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: RADIUS, padding: "16px 20px",
      display: "flex", flexDirection: "column", gap: 4, minWidth: 0,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ fontSize: 24, fontWeight: 700, color: TEXT, lineHeight: 1 }}>{value}</span>
    </div>
  );
}

// ─── Expanded Row Detail ────────────────────────────────────────────

function JobDetailPanel({ job, onRefresh }: { job: BrokerJob; onRefresh: () => void }) {
  const fullAddr = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");
  const isOutOfNetwork = job.network_status === "out_of_network";
  const isSelfManaged = job.delivered_by === "broker" || job.network_status === "self_managed";
  const isDelivered = job.status === "delivered" || job.status === "completed";

  // Convert BrokerJob to BrokerScheduleJob for BrokerDeliveryPanel
  const deliveryJob: BrokerScheduleJob = {
    id: job.id,
    type: job.type,
    customer_name: job.customer_name,
    customer_email: job.customer_email,
    customer_phone: job.customer_phone,
    address: job.address,
    city: job.city,
    state: job.state,
    zip: job.zip,
    service_name: job.service_name,
    tier_name: job.tier_name,
    scheduled_date: job.scheduled_date,
    status: job.status,
    network_status: job.network_status,
    hes_report_url: job.hes_report_url,
    leaf_report_url: job.leaf_report_url,
    leaf_tier: job.leaf_tier,
    delivered_by: job.delivered_by,
    reports_sent_at: job.reports_sent_at,
    external_assessor_name: job.external_assessor_name,
    external_assessor_company: job.external_assessor_company,
    external_assessor_email: job.external_assessor_email,
    created_at: job.created_at,
  };

  return (
    <div style={{ padding: "16px 20px", background: "rgba(15,23,42,0.6)", borderTop: `1px solid ${BORDER}` }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Address</div>
          <div style={{ fontSize: 13, color: TEXT_SEC }}>{fullAddr || "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Homeowner</div>
          <div style={{ fontSize: 13, color: TEXT_SEC }}>{job.customer_name}</div>
          {job.customer_email && <div style={{ fontSize: 12, color: TEXT_DIM }}>{job.customer_email}</div>}
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Assessor</div>
          <div style={{ fontSize: 13, color: TEXT_SEC }}>
            {isOutOfNetwork
              ? (job.external_assessor_name || "External")
              : (job.team_member_name || "TBD")}
          </div>
          {isOutOfNetwork && job.external_assessor_company && (
            <div style={{ fontSize: 12, color: TEXT_DIM }}>{job.external_assessor_company}</div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Payment</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: job.payment_status === "paid" ? EMERALD : AMBER }}>
            {job.payment_status === "paid" ? "Paid" : job.payment_status === "invoiced" ? "Invoiced" : "Unpaid"}
          </div>
        </div>
      </div>

      {/* In-network: progress bar + download */}
      {!isOutOfNetwork && !isSelfManaged && (
        <div style={{ marginBottom: 12 }}>
          <StatusProgressBar status={job.status} paymentStatus={job.payment_status ?? ""} />
          {isDelivered && job.hes_report_url && (
            <div style={{ marginTop: 10 }}>
              <a href={job.hes_report_url} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: "#60a5fa", fontWeight: 600, textDecoration: "none" }}>
                Download HES Report
              </a>
            </div>
          )}
        </div>
      )}

      {/* Out-of-network pending_delivery: BrokerDeliveryPanel */}
      {isOutOfNetwork && (job.status === "pending_delivery" || (!isDelivered)) && (
        <BrokerDeliveryPanel
          job={deliveryJob}
          onUpload={uploadHesReport}
          onRemoveReport={removeHesReport}
          onSend={sendBrokerDelivery}
        />
      )}

      {/* Delivered self-managed: show report links + LEAF placeholder */}
      {(isSelfManaged || (isOutOfNetwork && isDelivered)) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {job.hes_report_url && (
            <a href={job.hes_report_url} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, color: "#60a5fa", fontWeight: 600, textDecoration: "none" }}>
              Download HES Report
            </a>
          )}
          {job.leaf_report_url && (
            <a href={job.leaf_report_url} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, color: EMERALD, fontWeight: 600, textDecoration: "none" }}>
              View LEAF Report
            </a>
          )}
          {job.reports_sent_at && (
            <div style={{ fontSize: 11, color: EMERALD, fontWeight: 600 }}>
              Reports delivered {new Date(job.reports_sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

type Props = {
  jobs: BrokerJob[];
};

export default function BrokerScheduleClient({ jobs: initialJobs }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showOonModal, setShowOonModal] = useState(false);

  const today = todayStr();
  const filtered = filterJobs(initialJobs, tab);

  // KPI counts
  const inProgress = initialJobs.filter((j) => ACTIVE_STATUSES.has(j.status)).length;
  const completed = initialJobs.filter((j) => COMPLETED_STATUSES.has(j.status)).length;
  const allTime = initialJobs.length;

  function handleRefresh() {
    router.refresh();
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "in_progress", label: "In Progress" },
    { key: "completed", label: "Completed" },
    { key: "pending_delivery", label: "Pending Delivery" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, letterSpacing: "-0.02em", margin: 0 }}>Schedule</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => setShowOonModal(true)}
            style={{
              padding: "8px 16px", borderRadius: 8,
              border: `1px solid ${BORDER}`, background: "transparent",
              color: TEXT_MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = AMBER; e.currentTarget.style.color = AMBER; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_MUTED; }}
          >
            Log Out-of-Network Job
          </button>
          <Link
            href="/broker/request"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8, textDecoration: "none",
              fontWeight: 700, fontSize: 13, color: "#fff",
              background: EMERALD, border: "1px solid rgba(16,185,129,0.5)",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#059669"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = EMERALD; }}
          >
            + New Request
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
        <KPICard label="In Progress" value={inProgress} accent={BLUE} />
        <KPICard label="Completed" value={completed} accent={EMERALD} />
        <KPICard label="All Time" value={allTime} accent={PURPLE} />
      </div>

      {/* ── Filter Tabs ── */}
      <div style={{ display: "flex", gap: 4, background: "rgba(30,41,59,0.5)", borderRadius: 8, padding: 3 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setTab(t.key); setExpandedId(null); }}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 6,
              border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              transition: "all 0.15s",
              background: tab === t.key ? "rgba(16,185,129,0.12)" : "transparent",
              color: tab === t.key ? TEXT : TEXT_MUTED,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Jobs Table ── */}
      {filtered.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center", color: TEXT_MUTED, fontSize: 14, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS }}>
          No jobs found for this filter.
        </div>
      ) : (
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: RADIUS, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "90px 1fr 80px 140px 130px 120px",
            padding: "10px 20px", borderBottom: `1px solid ${BORDER}`,
            gap: 12,
          }}>
            {["Date", "Address", "Service", "Assessor", "Network", "Status"].map((h) => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
            ))}
          </div>

          {/* Table rows */}
          {filtered.map((job) => {
            const isExpanded = expandedId === job.id;
            const isToday = job.scheduled_date === today;
            const statusBadge = STATUS_DISPLAY[job.status] ?? STATUS_DISPLAY.pending;
            const typeBadge = JOB_TYPE_BADGE[job.type] ?? JOB_TYPE_BADGE.hes;
            const networkBadge = NETWORK_BADGE[job.network_status ?? "in_network"] ?? NETWORK_BADGE.in_network;
            const assessorName = job.network_status === "out_of_network"
              ? (job.external_assessor_name || "External")
              : (job.team_member_name || "TBD");

            return (
              <React.Fragment key={job.id}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : job.id)}
                  style={{
                    display: "grid", gridTemplateColumns: "90px 1fr 80px 140px 130px 120px",
                    padding: "12px 20px", gap: 12, cursor: "pointer",
                    borderBottom: `1px solid ${BORDER}44`,
                    background: isExpanded ? "rgba(16,185,129,0.04)" : "transparent",
                    transition: "background 0.1s",
                    alignItems: "center",
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded) e.currentTarget.style.background = "rgba(148,163,184,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Date */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_SEC }}>{formatDate(job.scheduled_date)}</span>
                    {isToday && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: EMERALD, background: "rgba(16,185,129,0.12)", padding: "1px 5px", borderRadius: 4 }}>TODAY</span>
                    )}
                  </div>

                  {/* Address */}
                  <div style={{ fontSize: 13, fontWeight: 500, color: TEXT_SEC, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {job.address || "—"}
                    {job.city && <span style={{ color: TEXT_DIM }}>, {job.city}</span>}
                  </div>

                  {/* Service */}
                  <Badge {...typeBadge} />

                  {/* Assessor */}
                  <div style={{ fontSize: 13, color: TEXT_MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {assessorName}
                  </div>

                  {/* Network */}
                  <Badge {...networkBadge} />

                  {/* Status */}
                  <Badge {...statusBadge} />
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <JobDetailPanel job={job} onRefresh={handleRefresh} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* ── Log Out-of-Network Modal ── */}
      {showOonModal && (
        <LogOutOfNetworkJobModal
          onClose={() => setShowOonModal(false)}
          onCreated={() => { setShowOonModal(false); handleRefresh(); }}
        />
      )}
    </div>
  );
}
