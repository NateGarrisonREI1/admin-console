"use client";

import { useState, useTransition } from "react";
import type { AdminDashboardData, SystemLeadRow, HesRequestRow } from "../_actions/dashboard";
import { postLeadForSale, assignHesRequest } from "../_actions/dashboard";
import { StatusBadge, SystemTypeIcon, systemTypeLabel } from "@/components/dashboard";

const GREEN = "#43a419";

function money(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ──────────────────────────────────────────
// KPI Cards
// ──────────────────────────────────────────

function KpiCard({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: "leaf" | "warn" | "neutral" }) {
  const border =
    tone === "leaf" ? "1px solid rgba(67,164,25,0.25)" :
    tone === "warn" ? "1px solid rgba(245,158,11,0.30)" :
    "1px solid #eef2f7";
  const bg =
    tone === "leaf" ? "rgba(67,164,25,0.06)" :
    tone === "warn" ? "rgba(245,158,11,0.08)" :
    "#fff";
  const color =
    tone === "leaf" ? "#2f7a12" :
    tone === "warn" ? "#92400e" :
    "#111827";

  return (
    <div style={{ border, background: bg, borderRadius: 14, padding: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 950, marginTop: 6, letterSpacing: -0.4, color }}>{value}</div>
      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{hint}</div>
    </div>
  );
}

// ──────────────────────────────────────────
// Post for Sale Dialog
// ──────────────────────────────────────────

function PostForSaleDialog({
  lead,
  onClose,
  onDone,
}: {
  lead: SystemLeadRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [price, setPrice] = useState(
    lead.system_type === "solar" ? 75 : lead.system_type === "hvac" ? 50 : 25
  );
  const [days, setDays] = useState(30);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit() {
    startTransition(async () => {
      try {
        await postLeadForSale(lead.id, price, days);
        onDone();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">Post Lead for Sale</h3>
          <p className="text-sm text-slate-500 mt-1">
            {systemTypeLabel(lead.system_type as "hvac" | "solar" | "water_heater")} — {lead.city}, {lead.state}
          </p>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Price ($)</label>
            <input
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Expiration (days)</label>
            <input
              type="number"
              min={1}
              max={90}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            disabled={pending}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={pending}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
            style={{ background: GREEN }}
          >
            {pending ? "Posting..." : `Post for ${money(price)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// Main Dashboard
// ──────────────────────────────────────────

type Tab = "system-leads" | "hes-requests";

export default function AdminDashboardClient({ data }: { data: AdminDashboardData }) {
  const [tab, setTab] = useState<Tab>("system-leads");
  const [postingLead, setPostingLead] = useState<SystemLeadRow | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const { kpis, system_leads, hes_requests } = data;

  const filteredLeads = filter === "all"
    ? system_leads
    : system_leads.filter((l) => l.system_type === filter);

  return (
    <div>
      {/* KPI Row */}
      <div style={{ border: "1px solid #e5e7eb", background: "white", borderRadius: 16, padding: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 950 }}>Dashboard KPIs</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2, marginBottom: 12 }}>
          Live data from your system leads and HES requests
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 10,
          }}
        >
          <KpiCard label="Leads Posted" value={String(kpis.leads_posted)} hint="This month" tone="leaf" />
          <KpiCard label="Leads Sold" value={String(kpis.leads_sold)} hint="This month" tone="leaf" />
          <KpiCard label="Revenue" value={money(kpis.revenue)} hint="This month" tone="leaf" />
          <KpiCard label="Available" value={String(kpis.available_leads)} hint="On job board" tone="neutral" />
          <KpiCard label="HES Pending" value={String(kpis.pending_hes)} hint="Awaiting action" tone={kpis.pending_hes > 0 ? "warn" : "neutral"} />
          <KpiCard label="Expiring Soon" value={String(kpis.expiring_soon)} hint="Next 48 hours" tone={kpis.expiring_soon > 0 ? "warn" : "neutral"} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <TabButton label="System Leads" active={tab === "system-leads"} onClick={() => setTab("system-leads")} count={system_leads.length} />
          <TabButton label="HES Requests" active={tab === "hes-requests"} onClick={() => setTab("hes-requests")} count={hes_requests.length} />
        </div>

        {tab === "system-leads" && (
          <div style={{ border: "1px solid #e5e7eb", background: "white", borderRadius: 16, overflow: "hidden" }}>
            {/* Filter bar */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["all", "water_heater", "hvac", "solar"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    border: filter === f ? `1px solid rgba(67,164,25,0.35)` : "1px solid #e5e7eb",
                    background: filter === f ? "rgba(67,164,25,0.10)" : "white",
                    color: filter === f ? GREEN : "#374151",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {f === "all" ? "All Systems" : systemTypeLabel(f as "hvac" | "solar" | "water_heater")}
                </button>
              ))}
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>System</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Location</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Price</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Status</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Created</th>
                    <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "40px 16px", textAlign: "center", color: "#9ca3af" }}>
                        No system leads yet. They'll appear here when homeowners request estimates.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                        <td style={{ padding: "10px 16px" }}>
                          <SystemTypeIcon type={lead.system_type as "hvac" | "solar" | "water_heater"} showLabel size="sm" />
                        </td>
                        <td style={{ padding: "10px 16px", color: "#374151" }}>
                          {[lead.city, lead.state].filter(Boolean).join(", ") || lead.zip}
                        </td>
                        <td style={{ padding: "10px 16px", fontWeight: 600 }}>{money(lead.price)}</td>
                        <td style={{ padding: "10px 16px" }}>
                          <StatusBadge status={lead.status} />
                        </td>
                        <td style={{ padding: "10px 16px", color: "#6b7280", fontSize: 13 }}>
                          {fmtDate(lead.created_at)}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right" }}>
                          {lead.status !== "available" && lead.status !== "purchased" && (
                            <button
                              onClick={() => setPostingLead(lead)}
                              style={{
                                padding: "4px 12px",
                                borderRadius: 8,
                                border: "1px solid rgba(67,164,25,0.30)",
                                background: "rgba(67,164,25,0.08)",
                                color: GREEN,
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: "pointer",
                              }}
                            >
                              Post
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "hes-requests" && (
          <HesRequestsTable requests={hes_requests} />
        )}
      </div>

      {/* Post for Sale Dialog */}
      {postingLead && (
        <PostForSaleDialog
          lead={postingLead}
          onClose={() => setPostingLead(null)}
          onDone={() => {
            setPostingLead(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

function TabButton({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 18px",
        borderRadius: 12,
        border: active ? "1px solid rgba(67,164,25,0.35)" : "1px solid #e5e7eb",
        background: active ? "rgba(67,164,25,0.10)" : "white",
        color: active ? GREEN : "#374151",
        fontWeight: 800,
        fontSize: 14,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {label}
      <span
        style={{
          padding: "2px 8px",
          borderRadius: 999,
          background: active ? "rgba(67,164,25,0.15)" : "#f1f5f9",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {count}
      </span>
    </button>
  );
}

function HesRequestsTable({ requests }: { requests: HesRequestRow[] }) {
  const [pending, startTransition] = useTransition();

  function handleAction(id: string, action: "assign-internal" | "post-for-sale") {
    startTransition(async () => {
      await assignHesRequest(id, action);
      window.location.reload();
    });
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", background: "white", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
              <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Address</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Location</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Type</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Status</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Requested</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 700, fontSize: 12, color: "#6b7280" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "40px 16px", textAlign: "center", color: "#9ca3af" }}>
                  No HES requests yet. Brokers submit these from their dashboard.
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                  <td style={{ padding: "10px 16px", color: "#111827", fontWeight: 500 }}>{r.property_address}</td>
                  <td style={{ padding: "10px 16px", color: "#374151" }}>{r.city}, {r.state}</td>
                  <td style={{ padding: "10px 16px", color: "#374151", textTransform: "capitalize" }}>{r.property_type.replace("_", " ")}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <StatusBadge status={r.status} />
                  </td>
                  <td style={{ padding: "10px 16px", color: "#6b7280", fontSize: 13 }}>{fmtDate(r.created_at)}</td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>
                    {r.status === "pending" && (
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => handleAction(r.id, "assign-internal")}
                          disabled={pending}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 8,
                            border: "1px solid #dbeafe",
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Assign REI
                        </button>
                        <button
                          onClick={() => handleAction(r.id, "post-for-sale")}
                          disabled={pending}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 8,
                            border: "1px solid rgba(67,164,25,0.30)",
                            background: "rgba(67,164,25,0.08)",
                            color: GREEN,
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Post $10
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
