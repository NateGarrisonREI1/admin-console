// src/app/admin/marketplace/MarketplaceClient.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { MarketplaceData, MarketplaceLead, PostLeadInput } from "../_actions/marketplace";
import {
  adminUpdateLead,
  adminExpireLead,
  adminReactivateLead,
  adminDeleteLead,
  adminPostLead,
  fetchContractors,
} from "../_actions/marketplace";

// ─── Design tokens ──────────────────────────────────────────────────
const CARD = "#1e293b";
const BG = "#0f172a";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

const SYSTEM_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  hvac: { bg: "rgba(249,115,22,0.15)", text: "#f97316", label: "HVAC" },
  water_heater: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6", label: "Water Heater" },
  solar: { bg: "rgba(234,179,8,0.15)", text: "#eab308", label: "Solar" },
  electrical: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b", label: "Electrical" },
  plumbing: { bg: "rgba(6,182,212,0.15)", text: "#06b6d4", label: "Plumbing" },
  general_handyman: { bg: "rgba(148,163,184,0.15)", text: "#94a3b8", label: "General Handyman" },
};

const SERVICE_TYPES = [
  { value: "all", label: "All Types" },
  { value: "hvac", label: "HVAC" },
  { value: "water_heater", label: "Water Heater" },
  { value: "solar", label: "Solar" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "general_handyman", label: "Handyman" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  available: { label: "Available", color: EMERALD, bg: "rgba(16,185,129,0.12)" },
  purchased: { label: "Sold", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  assigned: { label: "Assigned", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  expired: { label: "Expired", color: TEXT_MUTED, bg: "rgba(148,163,184,0.1)" },
  archived: { label: "Archived", color: TEXT_DIM, bg: "rgba(100,116,139,0.1)" },
};

type SortKey = "newest" | "price_asc" | "price_desc" | "recently_sold";
const PAGE_SIZE = 25;

// ─── Helpers ────────────────────────────────────────────────────────

function money(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Main Component ─────────────────────────────────────────────────

export default function MarketplaceClient({ data }: { data: MarketplaceData }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [brokerFilter, setBrokerFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);

  // Modals
  const [detailLead, setDetailLead] = useState<MarketplaceLead | null>(null);
  const [editLead, setEditLead] = useState<MarketplaceLead | null>(null);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [revenueOpen, setRevenueOpen] = useState(true);

  // Toast
  const [toast, setToast] = useState<{ msg: string; error: boolean } | null>(null);
  function showToast(msg: string, error = false) {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = useMemo(() => {
    let leads = data.leads;
    if (statusFilter !== "all") leads = leads.filter((l) => l.status === statusFilter);
    if (typeFilter !== "all") leads = leads.filter((l) => l.system_type === typeFilter);
    if (areaFilter !== "all") leads = leads.filter((l) => l.area === areaFilter);
    if (brokerFilter !== "all") leads = leads.filter((l) => l.broker_id === brokerFilter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      leads = leads.filter(
        (l) =>
          (l.title ?? "").toLowerCase().includes(q) ||
          (l.city ?? "").toLowerCase().includes(q) ||
          l.zip.includes(q) ||
          (l.homeowner_name ?? "").toLowerCase().includes(q),
      );
    }
    const sorted = [...leads];
    switch (sort) {
      case "price_asc": sorted.sort((a, b) => a.price - b.price); break;
      case "price_desc": sorted.sort((a, b) => b.price - a.price); break;
      case "recently_sold":
        sorted.sort((a, b) => {
          if (!a.purchased_date && !b.purchased_date) return 0;
          if (!a.purchased_date) return 1;
          if (!b.purchased_date) return -1;
          return new Date(b.purchased_date).getTime() - new Date(a.purchased_date).getTime();
        });
        break;
      default: sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return sorted;
  }, [data.leads, statusFilter, typeFilter, areaFilter, brokerFilter, search, sort]);

  // Reset page when filters change
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Revenue computations
  const revenueData = useMemo(() => {
    const soldLeads = data.leads.filter((l) => l.status === "purchased");
    const totalRevenue = soldLeads.reduce((s, l) => s + l.price, 0);
    const reiRevenue = Math.round(totalRevenue * 30) / 100;
    const brokerPayouts = Math.round(totalRevenue * 68.6) / 100;

    // Revenue by service type
    const byType = new Map<string, number>();
    for (const l of soldLeads) {
      byType.set(l.system_type, (byType.get(l.system_type) ?? 0) + l.price);
    }

    // Revenue by broker
    const brokerStats = new Map<string, { name: string; posted: number; sold: number; revenue: number }>();
    for (const l of data.leads) {
      if (!l.broker_id || !l.broker_name) continue;
      if (!brokerStats.has(l.broker_id)) {
        brokerStats.set(l.broker_id, { name: l.broker_name, posted: 0, sold: 0, revenue: 0 });
      }
      const bs = brokerStats.get(l.broker_id)!;
      bs.posted++;
      if (l.status === "purchased") { bs.sold++; bs.revenue += l.price; }
    }
    const brokerRows = [...brokerStats.values()].sort((a, b) => b.revenue - a.revenue);

    return { totalRevenue, reiRevenue, brokerPayouts, byType, brokerRows };
  }, [data.leads]);

  const { stats } = data;
  const statCards = [
    { label: "Total Leads", value: String(stats.total), color: TEXT },
    { label: "Available", value: String(stats.available), color: EMERALD },
    { label: "Sold", value: String(stats.sold), color: "#10b981" },
    { label: "Expired", value: String(stats.expired), color: TEXT_MUTED },
    { label: "Total Revenue", value: money(stats.totalRevenue), color: "#f59e0b" },
    { label: "REI Revenue", value: money(stats.reiRevenue), color: EMERALD },
  ];

  const selectStyle: React.CSSProperties = {
    padding: "7px 10px", borderRadius: 8, border: `1px solid ${BORDER}`,
    background: CARD, color: TEXT_SEC, fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer",
  };

  // Action handlers
  async function handleExpire(id: string) {
    if (!window.confirm("Mark this lead as expired?")) return;
    const res = await adminExpireLead(id);
    if (res.success) { showToast("Lead expired."); router.refresh(); }
    else showToast(res.error || "Failed.", true);
  }
  async function handleReactivate(id: string) {
    if (!window.confirm("Reactivate this lead? It will be set to Available with a 30-day expiration.")) return;
    const res = await adminReactivateLead(id);
    if (res.success) { showToast("Lead reactivated."); router.refresh(); }
    else showToast(res.error || "Failed.", true);
  }
  async function handleDelete(id: string) {
    if (!window.confirm("Delete this lead? This cannot be undone for seed data.")) return;
    const res = await adminDeleteLead(id);
    if (res.success) { showToast("Lead deleted."); router.refresh(); }
    else showToast(res.error || "Failed.", true);
  }

  return (
    <div style={{ padding: 28 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 10000,
          borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600,
          border: `1px solid ${toast.error ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)"}`,
          background: toast.error ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
          color: toast.error ? "#f87171" : EMERALD,
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 700, margin: 0 }}>Lead Marketplace</h1>
          <p style={{ color: TEXT_DIM, fontSize: 13, margin: "4px 0 0", fontWeight: 500 }}>All leads across the platform</p>
        </div>
        <button type="button" onClick={() => setPostModalOpen(true)}
          style={{
            padding: "9px 18px", borderRadius: 8, border: "none",
            background: EMERALD, color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>
          + Post Lead
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 20 }}>
        {statCards.map((s) => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue Section (collapsible) */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, marginBottom: 20, overflow: "hidden" }}>
        <button type="button" onClick={() => setRevenueOpen(!revenueOpen)}
          style={{
            width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer",
          }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Revenue</span>
          <span style={{ fontSize: 12, color: TEXT_DIM, transition: "transform 0.15s", transform: revenueOpen ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
        </button>
        {revenueOpen && (
          <div style={{ padding: "0 18px 18px" }}>
            {/* Revenue Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 18 }}>
              <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600 }}>Total Revenue</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b", marginTop: 2 }}>{money(revenueData.totalRevenue)}</div>
              </div>
              <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600 }}>REI Revenue (30%)</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: EMERALD, marginTop: 2 }}>{money(revenueData.reiRevenue)}</div>
              </div>
              <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600 }}>Broker Payouts (68.6%)</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#3b82f6", marginTop: 2 }}>{money(revenueData.brokerPayouts)}</div>
              </div>
            </div>

            {/* Revenue by Service Type */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Revenue by Service Type</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SERVICE_TYPES.filter((s) => s.value !== "all").map((st) => {
                  const amt = revenueData.byType.get(st.value) ?? 0;
                  const stc = SYSTEM_TYPE_COLORS[st.value];
                  const maxAmt = Math.max(...[...revenueData.byType.values()], 1);
                  const pct = Math.round((amt / maxAmt) * 100);
                  return (
                    <div key={st.value} style={{ flex: "1 1 140px", minWidth: 140, background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: stc?.text ?? TEXT_MUTED, marginBottom: 4 }}>{st.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: amt > 0 ? TEXT : TEXT_DIM }}>{money(amt)}</div>
                      <div style={{ height: 4, borderRadius: 2, background: BORDER, marginTop: 6 }}>
                        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: stc?.text ?? TEXT_MUTED, transition: "width 0.3s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Revenue by Broker */}
            {revenueData.brokerRows.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Revenue by Broker</div>
                <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Broker", "Posted", "Sold", "Revenue", "Payout (68.6%)"].map((h) => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {revenueData.brokerRows.map((br) => (
                        <tr key={br.name} style={{ borderBottom: `1px solid ${BORDER}` }}>
                          <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: TEXT }}>{br.name}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: TEXT_SEC }}>{br.posted}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: TEXT_SEC }}>{br.sold}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>{money(br.revenue)}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#3b82f6" }}>{money(Math.round(br.revenue * 68.6) / 100)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Recent Transactions</div>
              {data.transactions.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: TEXT_DIM, background: BG, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
                  No transactions recorded yet
                </div>
              ) : (
                <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Lead", "Contractor", "Amount", "REI Take", "Broker Take", "Date", ""].map((h) => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.transactions.map((tx) => (
                        <tr key={tx.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                          <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: TEXT }}>{tx.lead_title || "—"}</td>
                          <td style={{ padding: "10px 14px", fontSize: 12, color: TEXT_SEC }}>{tx.contractor_name || "—"}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: TEXT }}>{money(tx.total_amount)}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: EMERALD }}>{money(tx.rei_amount)}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#3b82f6" }}>{money(tx.poster_amount)}</td>
                          <td style={{ padding: "10px 14px", fontSize: 12, color: TEXT_DIM }}>{fmtDate(tx.created_at)}</td>
                          <td style={{ padding: "10px 14px" }}>
                            {tx.stripe_payment_intent_id && (
                              <a href={`https://dashboard.stripe.com/test/payments/${tx.stripe_payment_intent_id}`}
                                target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", textDecoration: "none" }}
                                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}>
                                Stripe →
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="all">All Statuses</option>
          <option value="available">Available</option>
          <option value="purchased">Sold</option>
          <option value="expired">Expired</option>
        </select>
        <div style={{ display: "flex", gap: 4 }}>
          {SERVICE_TYPES.map((st) => {
            const active = typeFilter === st.value;
            return (
              <button key={st.value} type="button" onClick={() => { setTypeFilter(st.value); setPage(1); }}
                style={{
                  padding: "6px 12px", borderRadius: 14,
                  border: `1px solid ${active ? EMERALD : BORDER}`,
                  background: active ? "rgba(16,185,129,0.12)" : "transparent",
                  color: active ? EMERALD : TEXT_MUTED,
                  fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                }}>
                {st.label}
              </button>
            );
          })}
        </div>
        <select value={areaFilter} onChange={(e) => { setAreaFilter(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="all">All Areas</option>
          {data.areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={brokerFilter} onChange={(e) => { setBrokerFilter(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="all">All Brokers</option>
          {data.brokers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={selectStyle}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price Low→High</option>
          <option value="price_desc">Price High→Low</option>
          <option value="recently_sold">Recently Sold</option>
        </select>
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search title, city, zip, name…"
          style={{ ...selectStyle, minWidth: 200, cursor: "text" }} />
        <div style={{ fontSize: 12, color: TEXT_DIM, fontWeight: 600, marginLeft: "auto" }}>
          {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
        <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Lead", "Type", "Area", "Price", "Status", "LEAF", "Posted By", "Buyer", "Created", "Sold", ""].map((col) => (
                <th key={col} style={{
                  padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700,
                  color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em",
                  borderBottom: `1px solid ${BORDER}`,
                }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={11} style={{ padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: 14, color: TEXT_DIM, fontWeight: 600 }}>No leads match your filters</div>
              </td></tr>
            ) : paged.map((lead) => (
              <LeadRow key={lead.id} lead={lead}
                onViewDetails={() => setDetailLead(lead)}
                onEdit={() => setEditLead(lead)}
                onExpire={() => handleExpire(lead.id)}
                onReactivate={() => handleReactivate(lead.id)}
                onDelete={() => handleDelete(lead.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 }}>
          <PagBtn disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>← Prev</PagBtn>
          <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>
            Page {safePage} of {totalPages}
          </span>
          <PagBtn disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Next →</PagBtn>
        </div>
      )}

      {/* Detail Modal */}
      {detailLead && <DetailModal lead={detailLead} onClose={() => setDetailLead(null)} />}

      {/* Edit Modal */}
      {editLead && (
        <EditModal lead={editLead} onClose={() => setEditLead(null)}
          onSaved={() => { setEditLead(null); showToast("Lead updated."); router.refresh(); }}
          onError={(msg) => showToast(msg, true)} />
      )}

      {/* Post Lead Modal */}
      {postModalOpen && (
        <PostLeadModal
          areas={data.areas}
          onClose={() => setPostModalOpen(false)}
          onPosted={() => { setPostModalOpen(false); showToast("Lead posted to marketplace"); router.refresh(); }}
          onError={(msg) => showToast(msg, true)}
        />
      )}
    </div>
  );
}

// ─── Pagination Button ──────────────────────────────────────────────

function PagBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      style={{
        padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
        border: `1px solid ${BORDER}`, background: "transparent",
        color: disabled ? TEXT_DIM : TEXT_SEC, cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1, transition: "all 0.15s",
      }}>
      {children}
    </button>
  );
}

// ─── Lead Table Row ─────────────────────────────────────────────────

type RowProps = {
  lead: MarketplaceLead;
  onViewDetails: () => void;
  onEdit: () => void;
  onExpire: () => void;
  onReactivate: () => void;
  onDelete: () => void;
};

function LeadRow({ lead, onViewDetails, onEdit, onExpire, onReactivate, onDelete }: RowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const stc = SYSTEM_TYPE_COLORS[lead.system_type] ?? { bg: "rgba(148,163,184,0.15)", text: TEXT_MUTED, label: lead.system_type };
  const sc = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.available;
  const isMuted = lead.status === "expired" || lead.status === "archived";
  const textColor = isMuted ? TEXT_DIM : TEXT_SEC;

  return (
    <tr
      style={{
        borderBottom: `1px solid ${BORDER}`,
        borderLeft: lead.status === "purchased" ? `3px solid ${EMERALD}` : "3px solid transparent",
        transition: "background 0.1s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <td style={{ padding: "10px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: isMuted ? TEXT_DIM : TEXT }}>
          {lead.title || lead.homeowner_name || "—"}
        </div>
        <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 1 }}>
          {[lead.city, lead.state].filter(Boolean).join(", ") || lead.zip}
        </div>
      </td>
      <td style={{ padding: "10px 14px" }}>
        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: stc.bg, color: stc.text }}>
          {stc.label}
        </span>
      </td>
      <td style={{ padding: "10px 14px", fontSize: 12, color: textColor }}>{lead.area || "—"}</td>
      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: isMuted ? TEXT_DIM : TEXT }}>{money(lead.price)}</td>
      <td style={{ padding: "10px 14px" }}>
        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
          {sc.label}
        </span>
      </td>
      <td style={{ padding: "10px 14px", textAlign: "center" }}>
        {lead.has_leaf ? (
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: EMERALD }} title="Has LEAF report" />
        ) : (
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#334155" }} title="No LEAF" />
        )}
      </td>
      <td style={{ padding: "10px 14px", fontSize: 12, color: textColor }}>{lead.broker_name || "—"}</td>
      <td style={{ padding: "10px 14px", fontSize: 12, color: textColor }}>{lead.buyer_name || "—"}</td>
      <td style={{ padding: "10px 14px", fontSize: 12, color: TEXT_DIM }}>{fmtDate(lead.created_at)}</td>
      <td style={{ padding: "10px 14px", fontSize: 12, color: TEXT_DIM }}>{fmtDate(lead.purchased_date)}</td>
      <td style={{ padding: "10px 14px", position: "relative" }}>
        <button type="button" onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 4,
            color: TEXT_DIM, fontSize: 18, lineHeight: 1,
          }}>
          ⋮
        </button>
        {menuOpen && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 999 }} onClick={() => setMenuOpen(false)} />
            <div style={{
              position: "absolute", right: 14, top: 36, zIndex: 1000,
              background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8,
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)", minWidth: 160, padding: 4,
            }}>
              <MenuItem onClick={() => { setMenuOpen(false); onViewDetails(); }}>View Details</MenuItem>
              <MenuItem onClick={() => { setMenuOpen(false); onEdit(); }}>Edit Lead</MenuItem>
              {lead.status === "available" && (
                <MenuItem onClick={() => { setMenuOpen(false); onExpire(); }}>Mark as Expired</MenuItem>
              )}
              {lead.status === "expired" && (
                <MenuItem onClick={() => { setMenuOpen(false); onReactivate(); }}>Reactivate</MenuItem>
              )}
              <div style={{ height: 1, background: BORDER, margin: "2px 0" }} />
              <MenuItem danger onClick={() => { setMenuOpen(false); onDelete(); }}>Delete Lead</MenuItem>
            </div>
          </>
        )}
      </td>
    </tr>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        display: "block", width: "100%", padding: "8px 12px", borderRadius: 6,
        border: "none", background: "transparent", textAlign: "left",
        fontSize: 12, fontWeight: 600, cursor: "pointer",
        color: danger ? "#f87171" : TEXT_SEC, transition: "background 0.1s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? "rgba(239,68,68,0.08)" : "rgba(148,163,184,0.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
      {children}
    </button>
  );
}

// ─── Detail Modal ───────────────────────────────────────────────────

function DetailModal({ lead, onClose }: { lead: MarketplaceLead; onClose: () => void }) {
  const stc = SYSTEM_TYPE_COLORS[lead.system_type] ?? { bg: "rgba(148,163,184,0.15)", text: TEXT_MUTED, label: lead.system_type };
  const sc = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.available;
  const leaf = lead.leaf_report_data;
  const hasLeaf = lead.has_leaf && leaf && Object.keys(leaf).length > 0;

  const fullAddr = [lead.address, lead.city, lead.state, lead.zip].filter(Boolean).join(", ");
  const homeDetails = [
    lead.home_type,
    lead.home_year_built ? `Built ${lead.home_year_built}` : null,
    lead.home_sqft ? `${lead.home_sqft.toLocaleString()} sqft` : null,
    lead.beds != null ? `${lead.beds} bed` : null,
    lead.baths != null ? `${lead.baths} bath` : null,
  ].filter(Boolean).join(" · ");

  // Revenue split (for sold leads)
  const totalAmt = lead.price;
  const reiAmt = Math.round(totalAmt * 30) / 100;
  const serviceFee = Math.round(totalAmt * 2) / 100;
  const posterAmt = Math.round(totalAmt * 68.6) / 100;

  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 };
  const fieldLabel: React.CSSProperties = { fontSize: 11, color: TEXT_DIM, fontWeight: 600 };
  const fieldValue: React.CSSProperties = { fontSize: 13, color: TEXT_SEC, marginTop: 2 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24,
        width: 600, maxWidth: "90vw", maxHeight: "85vh", overflow: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>{lead.title || lead.homeowner_name || "Lead Details"}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: stc.bg, color: stc.text }}>{stc.label}</span>
              <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>{sc.label}</span>
              {lead.is_exclusive && <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "rgba(168,85,247,0.12)", color: "#a855f7" }}>Exclusive</span>}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: TEXT_DIM, fontSize: 20, cursor: "pointer", padding: 4 }}>✕</button>
        </div>

        {/* Lead Info */}
        <div style={sectionTitle}>Lead Info</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div><div style={fieldLabel}>Price</div><div style={{ ...fieldValue, fontWeight: 700, color: TEXT }}>{money(lead.price)}</div></div>
          <div><div style={fieldLabel}>Created</div><div style={fieldValue}>{fmtDate(lead.created_at)}</div></div>
          {lead.expiration_date && <div><div style={fieldLabel}>Expires</div><div style={fieldValue}>{fmtDate(lead.expiration_date)}</div></div>}
          {lead.broker_name && <div><div style={fieldLabel}>Posted By</div><div style={fieldValue}>{lead.broker_name}</div></div>}
        </div>
        {lead.description && (
          <div style={{ marginBottom: 20 }}>
            <div style={fieldLabel}>Description</div>
            <div style={{ ...fieldValue, lineHeight: 1.5 }}>{lead.description}</div>
          </div>
        )}

        {/* Property */}
        {(fullAddr || homeDetails) && (
          <>
            <div style={sectionTitle}>Property</div>
            <div style={{ marginBottom: 20 }}>
              {fullAddr && <div style={fieldValue}>{fullAddr}</div>}
              {homeDetails && <div style={{ ...fieldValue, marginTop: 4 }}>{homeDetails}</div>}
            </div>
          </>
        )}

        {/* Homeowner */}
        <div style={sectionTitle}>Homeowner Contact</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div><div style={fieldLabel}>Name</div><div style={fieldValue}>{lead.homeowner_name || "—"}</div></div>
          <div><div style={fieldLabel}>Phone</div><div style={fieldValue}>{lead.homeowner_phone || "—"}</div></div>
          <div><div style={fieldLabel}>Email</div><div style={fieldValue}>{lead.homeowner_email || "—"}</div></div>
          {lead.best_contact_time && <div><div style={fieldLabel}>Best Time</div><div style={fieldValue}>{lead.best_contact_time}</div></div>}
        </div>

        {/* LEAF */}
        {hasLeaf && (
          <>
            <div style={sectionTitle}>LEAF Energy Assessment</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {leaf!.current_system != null && <div><div style={fieldLabel}>Current System</div><div style={fieldValue}>{String(leaf!.current_system)}</div></div>}
              {leaf!.system_age != null && <div><div style={fieldLabel}>System Age</div><div style={fieldValue}>{String(leaf!.system_age)} years</div></div>}
              {leaf!.efficiency != null && <div><div style={fieldLabel}>Efficiency</div><div style={fieldValue}>{String(leaf!.efficiency)}</div></div>}
              {leaf!.recommendation != null && <div><div style={fieldLabel}>Recommendation</div><div style={{ ...fieldValue, color: EMERALD }}>{String(leaf!.recommendation)}</div></div>}
              {leaf!.estimated_cost != null && <div><div style={fieldLabel}>Estimated Cost</div><div style={fieldValue}>{String(leaf!.estimated_cost)}</div></div>}
              {leaf!.annual_savings != null && <div><div style={fieldLabel}>Annual Savings</div><div style={{ ...fieldValue, color: EMERALD }}>{String(leaf!.annual_savings)}</div></div>}
              {leaf!.payback_years != null && <div><div style={fieldLabel}>Payback</div><div style={fieldValue}>{String(leaf!.payback_years)} years</div></div>}
              {leaf!.priority != null && <div><div style={fieldLabel}>Priority</div><div style={{
                ...fieldValue,
                color: String(leaf!.priority) === "Urgent" ? "#ef4444" : String(leaf!.priority) === "High" ? "#f59e0b" : EMERALD,
              }}>{String(leaf!.priority)}</div></div>}
            </div>
          </>
        )}

        {/* Purchase info (sold) */}
        {lead.status === "purchased" && (
          <>
            <div style={sectionTitle}>Purchase Info</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div><div style={fieldLabel}>Buyer</div><div style={fieldValue}>{lead.buyer_name || "—"}</div></div>
              <div><div style={fieldLabel}>Purchase Date</div><div style={fieldValue}>{fmtDate(lead.purchased_date)}</div></div>
            </div>

            <div style={sectionTitle}>Revenue Split</div>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10,
              background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 14, marginBottom: 10,
            }}>
              <div><div style={fieldLabel}>Total</div><div style={{ ...fieldValue, fontWeight: 700, color: TEXT }}>{money(totalAmt)}</div></div>
              <div><div style={fieldLabel}>REI (30%)</div><div style={{ ...fieldValue, fontWeight: 700, color: EMERALD }}>{money(reiAmt)}</div></div>
              <div><div style={fieldLabel}>Poster (68.6%)</div><div style={{ ...fieldValue, fontWeight: 700, color: "#3b82f6" }}>{money(posterAmt)}</div></div>
              <div><div style={fieldLabel}>Service Fee (2%)</div><div style={{ ...fieldValue, fontWeight: 700, color: TEXT_MUTED }}>{money(serviceFee)}</div></div>
            </div>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" onClick={onClose} style={{
            padding: "8px 18px", borderRadius: 8, border: `1px solid ${BORDER}`,
            background: "transparent", color: TEXT_SEC, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal ─────────────────────────────────────────────────────

function EditModal({ lead, onClose, onSaved, onError }: {
  lead: MarketplaceLead; onClose: () => void; onSaved: () => void; onError: (msg: string) => void;
}) {
  const [title, setTitle] = useState(lead.title || "");
  const [description, setDescription] = useState(lead.description || "");
  const [price, setPrice] = useState(String(lead.price));
  const [status, setStatus] = useState(lead.status);
  const [saving, setSaving] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: `1px solid ${BORDER}`, background: BG, color: TEXT,
    fontSize: 13, fontWeight: 600, outline: "none", boxSizing: "border-box",
  };

  async function handleSave() {
    setSaving(true);
    const updates: Record<string, unknown> = {};
    if (title !== (lead.title || "")) updates.title = title || null;
    if (description !== (lead.description || "")) updates.description = description || null;
    if (price !== String(lead.price)) updates.price = parseFloat(price) || 0;
    if (status !== lead.status) updates.status = status;

    if (Object.keys(updates).length === 0) { onClose(); return; }

    const res = await adminUpdateLead(lead.id, updates as { title?: string; description?: string; price?: number; status?: string });
    setSaving(false);
    if (res.success) onSaved();
    else onError(res.error || "Failed to update.");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24, width: 460, maxWidth: "90vw" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginBottom: 18 }}>Edit Lead</div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, marginBottom: 4 }}>Title</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, marginBottom: 4 }}>Description</div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            style={{ ...inputStyle, height: 80, resize: "vertical", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, marginBottom: 4 }}>Price ($)</div>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, marginBottom: 4 }}>Status</div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="available">Available</option>
              <option value="purchased">Sold</option>
              <option value="expired">Expired</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} style={{
            padding: "8px 18px", borderRadius: 8, border: `1px solid ${BORDER}`,
            background: "transparent", color: TEXT_SEC, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} style={{
            padding: "8px 18px", borderRadius: 8, border: "none",
            background: EMERALD, color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: "pointer", opacity: saving ? 0.5 : 1,
          }}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Post Lead Modal ─────────────────────────────────────────────

const AREAS = [
  "Portland Metro", "Beaverton", "Lake Oswego", "Tigard", "Tualatin",
  "Hillsboro", "Gresham", "Milwaukie", "Oregon City", "West Linn",
  "Clackamas", "Happy Valley", "Sherwood", "Wilsonville", "Canby",
];

const HOME_TYPES = ["Single Family", "Townhouse", "Condo", "Multi-Family", "Commercial"];

function PostLeadModal({ areas, onClose, onPosted, onError }: {
  areas: string[];
  onClose: () => void;
  onPosted: () => void;
  onError: (msg: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  // Basic
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [systemType, setSystemType] = useState("hvac");
  const [price, setPrice] = useState("");

  // Routing
  const [routing, setRouting] = useState<"marketplace" | "assign">("marketplace");
  const [contractors, setContractors] = useState<{ id: string; name: string }[]>([]);
  const [contractorsLoaded, setContractorsLoaded] = useState(false);
  const [assignTo, setAssignTo] = useState("");

  // Property
  const [homeType, setHomeType] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [sqft, setSqft] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");

  // Location
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("OR");
  const [zip, setZip] = useState("");
  const [area, setArea] = useState("");

  // Homeowner
  const [hoName, setHoName] = useState("");
  const [hoEmail, setHoEmail] = useState("");
  const [hoPhone, setHoPhone] = useState("");
  const [hoNotes, setHoNotes] = useState("");

  // Load contractors when "Assign" is selected
  async function loadContractors() {
    if (contractorsLoaded) return;
    const list = await fetchContractors();
    setContractors(list);
    setContractorsLoaded(true);
  }

  function handleRoutingChange(mode: "marketplace" | "assign") {
    setRouting(mode);
    if (mode === "assign") loadContractors();
  }

  // All unique areas: merge existing from data + fallback list
  const allAreas = [...new Set([...areas, ...AREAS])].sort();

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: `1px solid ${BORDER}`, background: BG, color: TEXT,
    fontSize: 13, fontWeight: 600, outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: TEXT_DIM, marginBottom: 4 };
  const sectionHead: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase",
    letterSpacing: "0.05em", marginTop: 18, marginBottom: 10, paddingTop: 14,
    borderTop: `1px solid ${BORDER}`,
  };

  async function handlePost() {
    setSaving(true);
    const input: PostLeadInput = {
      title,
      description,
      system_type: systemType,
      price: parseFloat(price) || 0,
      home_type: homeType,
      home_year_built: yearBuilt ? Number(yearBuilt) : null,
      home_sqft: sqft ? Number(sqft) : null,
      beds: beds ? Number(beds) : null,
      baths: baths ? Number(baths) : null,
      address,
      city,
      state,
      zip,
      area,
      homeowner_name: hoName,
      homeowner_email: hoEmail,
      homeowner_phone: hoPhone,
      best_contact_time: hoNotes,
      routing,
      assign_to_contractor_id: routing === "assign" ? assignTo || null : null,
    };

    const res = await adminPostLead(input);
    setSaving(false);
    if (res.success) {
      onPosted();
    } else {
      onError(res.error || "Failed to post lead.");
    }
  }

  const routingBtnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "10px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700,
    cursor: "pointer", transition: "all 0.15s", textAlign: "center",
    border: `1px solid ${active ? EMERALD : BORDER}`,
    background: active ? "rgba(16,185,129,0.12)" : BG,
    color: active ? EMERALD : TEXT_MUTED,
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24,
        width: 640, maxWidth: "92vw", maxHeight: "88vh", overflow: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>Post New Lead</div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: TEXT_DIM, fontSize: 20, cursor: "pointer", padding: 4 }}>✕</button>
        </div>

        {/* Lead Routing */}
        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>Lead Routing</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => handleRoutingChange("marketplace")} style={routingBtnStyle(routing === "marketplace")}>
              Post to Marketplace
            </button>
            <button type="button" onClick={() => handleRoutingChange("assign")} style={routingBtnStyle(routing === "assign")}>
              Assign to Contractor
            </button>
          </div>
          {routing === "marketplace" && (
            <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 6 }}>
              Lead goes to the open job board — any contractor can purchase it.
            </div>
          )}
          {routing === "assign" && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 6 }}>
                Lead is assigned directly — it appears in the contractor{"'"}s My Leads with full contact info unlocked. No payment required.
              </div>
              <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">Select a contractor…</option>
                {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {contractorsLoaded && contractors.length === 0 && (
                <div style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>No active contractors found.</div>
              )}
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle}>Title *</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. HVAC Replacement — Lake Oswego" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle}>Description</div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Lead details, notes for contractors…"
            style={{ ...inputStyle, height: 72, resize: "vertical", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={labelStyle}>Service Type *</div>
            <select value={systemType} onChange={(e) => setSystemType(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {SERVICE_TYPES.filter((s) => s.value !== "all").map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Price ($){routing === "marketplace" ? " *" : ""}</div>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" style={inputStyle} />
          </div>
        </div>

        {/* Property Info */}
        <div style={sectionHead}>Property Info</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={labelStyle}>Home Type</div>
            <select value={homeType} onChange={(e) => setHomeType(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">—</option>
              {HOME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Year Built</div>
            <input type="number" value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} placeholder="2005" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Square Feet</div>
            <input type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} placeholder="2,400" style={inputStyle} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={labelStyle}>Beds</div>
            <input type="number" value={beds} onChange={(e) => setBeds(e.target.value)} placeholder="3" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Baths</div>
            <input type="number" value={baths} onChange={(e) => setBaths(e.target.value)} placeholder="2" style={inputStyle} />
          </div>
        </div>

        {/* Location */}
        <div style={sectionHead}>Location</div>
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle}>Address</div>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" style={inputStyle} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={labelStyle}>City</div>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Portland" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>State</div>
            <input value={state} onChange={(e) => setState(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Zip Code</div>
            <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="97201" style={inputStyle} />
          </div>
        </div>
        <div>
          <div style={labelStyle}>Area</div>
          <select value={area} onChange={(e) => setArea(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">—</option>
            {allAreas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Homeowner */}
        <div style={sectionHead}>Homeowner</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={labelStyle}>Name *</div>
            <input value={hoName} onChange={(e) => setHoName(e.target.value)} placeholder="Jane Smith" style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Phone</div>
            <input value={hoPhone} onChange={(e) => setHoPhone(e.target.value)} placeholder="(503) 555-1234" style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle}>Email</div>
          <input type="email" value={hoEmail} onChange={(e) => setHoEmail(e.target.value)} placeholder="jane@example.com" style={inputStyle} />
        </div>
        <div>
          <div style={labelStyle}>Notes</div>
          <textarea value={hoNotes} onChange={(e) => setHoNotes(e.target.value)} placeholder="Best contact times, special instructions…"
            style={{ ...inputStyle, height: 56, resize: "vertical", fontFamily: "inherit" }} />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
          <button type="button" onClick={onClose} style={{
            padding: "9px 20px", borderRadius: 8, border: `1px solid ${BORDER}`,
            background: "transparent", color: TEXT_SEC, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Cancel</button>
          <button type="button" onClick={handlePost} disabled={saving} style={{
            padding: "9px 20px", borderRadius: 8, border: "none",
            background: routing === "assign" ? "#a78bfa" : EMERALD, color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: "pointer", opacity: saving ? 0.5 : 1,
          }}>{saving ? (routing === "assign" ? "Assigning…" : "Posting…") : (routing === "assign" ? "Assign Lead" : "Post Lead")}</button>
        </div>
      </div>
    </div>
  );
}
