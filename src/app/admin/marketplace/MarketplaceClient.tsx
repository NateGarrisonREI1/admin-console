// src/app/admin/marketplace/MarketplaceClient.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import SidePanel from "@/components/ui/SidePanel";
import FilterableHeader, { ActiveFilterBar, type ActiveFilter, type SortDir, type OptionColor } from "@/components/ui/FilterableHeader";
import { AdjustmentsHorizontalIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import type { MarketplaceData, MarketplaceLead, PostLeadInput } from "../_actions/marketplace";
import {
  adminUpdateLead,
  adminExpireLead,
  adminReactivateLead,
  adminDeleteLead,
  adminPostLead,
  fetchContractors,
  fetchNetworkContractors,
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
  hvac: { bg: "rgba(239,68,68,0.15)", text: "#ef4444", label: "HVAC" },
  solar: { bg: "rgba(234,179,8,0.15)", text: "#eab308", label: "Solar" },
  water_heater: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6", label: "Water Heater" },
  electrical: { bg: "rgba(168,85,247,0.15)", text: "#a855f7", label: "Electrical" },
  plumbing: { bg: "rgba(236,72,153,0.15)", text: "#ec4899", label: "Plumbing" },
  general_handyman: { bg: "rgba(148,163,184,0.15)", text: "#94a3b8", label: "Handyman" },
  hes_assessment: { bg: "rgba(16,185,129,0.15)", text: "#10b981", label: "HES Assessment" },
  home_inspection: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b", label: "Home Inspection" },
  leaf_followup: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6", label: "LEAF Follow-up" },
};

const SERVICE_TYPES = [
  { value: "all", label: "All Types" },
  { value: "hvac", label: "HVAC" },
  { value: "solar", label: "Solar" },
  { value: "water_heater", label: "Water Heater" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "general_handyman", label: "Handyman" },
  { value: "hes_assessment", label: "HES Assessment" },
  { value: "home_inspection", label: "Home Inspection" },
  { value: "leaf_followup", label: "LEAF Follow-up" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  available: { label: "Available", color: EMERALD, bg: "rgba(16,185,129,0.12)" },
  purchased: { label: "Sold", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  assigned: { label: "Assigned", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  expired: { label: "Expired", color: TEXT_MUTED, bg: "rgba(148,163,184,0.1)" },
  archived: { label: "Archived", color: TEXT_DIM, bg: "rgba(100,116,139,0.1)" },
};

const PAGE_SIZE = 25;

// ─── Filter option lists ─────────────────────────────────────────────
const TYPE_OPTIONS = SERVICE_TYPES.filter((s) => s.value !== "all");

const STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "purchased", label: "Sold" },
  { value: "assigned", label: "Assigned" },
  { value: "expired", label: "Expired" },
  { value: "archived", label: "Archived" },
];

const LEAF_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const ROUTING_OPTIONS = [
  { value: "open_market", label: "Open Market" },
  { value: "internal_network", label: "Network" },
  { value: "exclusive", label: "Exclusive" },
];

const ROUTING_BADGE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  open_market: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b", label: "Open Market" },
  internal_network: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6", label: "Network" },
  exclusive: { bg: "rgba(168,85,247,0.15)", text: "#a855f7", label: "Exclusive" },
};

const MARKETPLACE_TYPE_COLORS: Record<string, OptionColor> = {
  hvac:              { bg: "rgba(239,68,68,0.2)", text: "#f87171", border: "rgba(239,68,68,0.3)", activeBg: "#ef4444", activeText: "#fff" },
  solar:             { bg: "rgba(234,179,8,0.2)", text: "#fbbf24", border: "rgba(234,179,8,0.3)", activeBg: "#eab308", activeText: "#fff" },
  water_heater:      { bg: "rgba(59,130,246,0.2)", text: "#60a5fa", border: "rgba(59,130,246,0.3)", activeBg: "#3b82f6", activeText: "#fff" },
  electrical:        { bg: "rgba(168,85,247,0.2)", text: "#c084fc", border: "rgba(168,85,247,0.3)", activeBg: "#a855f7", activeText: "#fff" },
  plumbing:          { bg: "rgba(236,72,153,0.2)", text: "#f472b6", border: "rgba(236,72,153,0.3)", activeBg: "#ec4899", activeText: "#fff" },
  general_handyman:  { bg: "rgba(100,116,139,0.2)", text: "#94a3b8", border: "rgba(100,116,139,0.3)", activeBg: "#64748b", activeText: "#fff" },
  hes_assessment:    { bg: "rgba(16,185,129,0.2)", text: "#34d399", border: "rgba(16,185,129,0.3)", activeBg: "#10b981", activeText: "#fff" },
  home_inspection:   { bg: "rgba(245,158,11,0.2)", text: "#fbbf24", border: "rgba(245,158,11,0.3)", activeBg: "#f59e0b", activeText: "#fff" },
  leaf_followup:     { bg: "rgba(59,130,246,0.2)", text: "#60a5fa", border: "rgba(59,130,246,0.3)", activeBg: "#3b82f6", activeText: "#fff" },
};

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

  // Column filter state
  const [leadSearch, setLeadSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [areaFilter, setAreaFilter] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<{ min?: string; max?: string }>({});
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [leafFilter, setLeafFilter] = useState<string[]>([]);
  const [routingFilter, setRoutingFilter] = useState<string[]>([]);
  const [postedByFilter, setPostedByFilter] = useState<string[]>([]);
  const [buyerFilter, setBuyerFilter] = useState<string[]>([]);
  const [createdDateFilter, setCreatedDateFilter] = useState<{ preset?: string; from?: string; to?: string }>({});
  const [soldDateFilter, setSoldDateFilter] = useState<{ preset?: string; from?: string; to?: string }>({});
  const [globalSearch, setGlobalSearch] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Sort state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  // Column popover state (only one open at a time)
  const [openColumn, setOpenColumn] = useState<string | null>(null);

  const [page, setPage] = useState(1);

  // Side panel
  const [selectedLead, setSelectedLead] = useState<MarketplaceLead | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  // Modals
  const [editLead, setEditLead] = useState<MarketplaceLead | null>(null);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [revenueOpen, setRevenueOpen] = useState(true);
  const [leadsOpen, setLeadsOpen] = useState(true);

  // Toast
  const [toast, setToast] = useState<{ msg: string; error: boolean } | null>(null);
  function showToast(msg: string, error = false) {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3000);
  }

  function openPanel(lead: MarketplaceLead) {
    setSelectedLead(lead);
    setSidePanelOpen(true);
  }

  function closePanel() {
    setSidePanelOpen(false);
    setTimeout(() => setSelectedLead(null), 300);
  }

  // Derived option lists
  const areaOptions = useMemo(() => data.areas.map((a) => ({ value: a, label: a })), [data.areas]);
  const brokerOptions = useMemo(() => data.brokers.map((b) => ({ value: b.id, label: b.name })), [data.brokers]);
  const buyerOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const l of data.leads) {
      if (l.buyer_id && l.buyer_name) seen.set(l.buyer_id, l.buyer_name);
    }
    return [...seen.entries()].map(([id, name]) => ({ value: id, label: name }));
  }, [data.leads]);

  function handleSort(col: string) {
    return (dir: SortDir) => {
      if (dir === null) { setSortColumn(null); setSortDir(null); }
      else { setSortColumn(col); setSortDir(dir); }
    };
  }

  function matchDateFilter(iso: string | null, filter: { preset?: string; from?: string; to?: string }): boolean {
    if (!filter.preset && !filter.from && !filter.to) return true;
    if (!iso) return false;
    const d = iso.slice(0, 10);
    if (filter.preset === "today") {
      return d === new Date().toISOString().slice(0, 10);
    }
    if (filter.preset === "this_week") {
      const now = new Date();
      const day = now.getDay();
      const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return d >= mon.toISOString().slice(0, 10) && d <= sun.toISOString().slice(0, 10);
    }
    if (filter.preset === "this_month") {
      const now = new Date();
      const ms = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const me = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      return d >= ms && d <= me;
    }
    if (filter.from && d < filter.from) return false;
    if (filter.to && d > filter.to) return false;
    return true;
  }

  const filtered = useMemo(() => {
    const gq = globalSearch.trim().toLowerCase();
    let leads = data.leads.filter((l) => {
      // Lead search
      if (leadSearch.trim()) {
        const q = leadSearch.trim().toLowerCase();
        const hay = [l.title, l.city, l.zip, l.homeowner_name].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // Multi-select filters
      if (typeFilter.length > 0 && !typeFilter.includes(l.system_type)) return false;
      if (areaFilter.length > 0 && !areaFilter.includes(l.area ?? "")) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(l.status)) return false;
      if (leafFilter.length > 0) {
        const val = l.has_leaf ? "yes" : "no";
        if (!leafFilter.includes(val)) return false;
      }
      if (routingFilter.length > 0 && !routingFilter.includes(l.routing_channel ?? "open_market")) return false;
      if (postedByFilter.length > 0 && !postedByFilter.includes(l.broker_id ?? "")) return false;
      if (buyerFilter.length > 0 && !buyerFilter.includes(l.buyer_id ?? "")) return false;
      // Price range
      if (priceRange.min && l.price < parseFloat(priceRange.min)) return false;
      if (priceRange.max && l.price > parseFloat(priceRange.max)) return false;
      // Date filters
      if (!matchDateFilter(l.created_at, createdDateFilter)) return false;
      if (!matchDateFilter(l.purchased_date, soldDateFilter)) return false;
      // Global search
      if (gq) {
        const hay = [l.title, l.homeowner_name, l.city, l.zip, l.broker_name, l.buyer_name].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(gq)) return false;
      }
      return true;
    });

    // Sort
    if (sortColumn && sortDir) {
      leads = [...leads].sort((a, b) => {
        let cmp = 0;
        switch (sortColumn) {
          case "price": cmp = a.price - b.price; break;
          case "created": cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
          case "sold": {
            const at = a.purchased_date ? new Date(a.purchased_date).getTime() : 0;
            const bt = b.purchased_date ? new Date(b.purchased_date).getTime() : 0;
            cmp = at - bt; break;
          }
          default: break;
        }
        return sortDir === "desc" ? -cmp : cmp;
      });
    } else {
      // Default sort: newest first
      leads = [...leads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return leads;
  }, [data.leads, leadSearch, typeFilter, areaFilter, statusFilter, leafFilter, routingFilter, postedByFilter, buyerFilter, priceRange, createdDateFilter, soldDateFilter, globalSearch, sortColumn, sortDir]);

  // Active filter chips
  const activeFilters = useMemo(() => {
    const chips: ActiveFilter[] = [];
    if (leadSearch.trim()) chips.push({ key: "lead", label: "Lead", value: leadSearch, onClear: () => setLeadSearch("") });
    if (typeFilter.length > 0) {
      const labels = typeFilter.map((v) => TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v).join(", ");
      chips.push({ key: "type", label: "Type", value: labels, onClear: () => setTypeFilter([]) });
    }
    if (areaFilter.length > 0) {
      chips.push({ key: "area", label: "Area", value: areaFilter.join(", "), onClear: () => setAreaFilter([]) });
    }
    if (priceRange.min || priceRange.max) {
      chips.push({ key: "price", label: "Price", value: `$${priceRange.min ?? "0"} – $${priceRange.max ?? "∞"}`, onClear: () => setPriceRange({}) });
    }
    if (statusFilter.length > 0) {
      const labels = statusFilter.map((v) => STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v).join(", ");
      chips.push({ key: "status", label: "Status", value: labels, onClear: () => setStatusFilter([]) });
    }
    if (leafFilter.length > 0) {
      chips.push({ key: "leaf", label: "LEAF", value: leafFilter.map((v) => v === "yes" ? "Yes" : "No").join(", "), onClear: () => setLeafFilter([]) });
    }
    if (routingFilter.length > 0) {
      const labels = routingFilter.map((v) => ROUTING_OPTIONS.find((o) => o.value === v)?.label ?? v).join(", ");
      chips.push({ key: "routing", label: "Routing", value: labels, onClear: () => setRoutingFilter([]) });
    }
    if (postedByFilter.length > 0) {
      const labels = postedByFilter.map((v) => brokerOptions.find((o) => o.value === v)?.label ?? v).join(", ");
      chips.push({ key: "postedBy", label: "Posted By", value: labels, onClear: () => setPostedByFilter([]) });
    }
    if (buyerFilter.length > 0) {
      const labels = buyerFilter.map((v) => buyerOptions.find((o) => o.value === v)?.label ?? v).join(", ");
      chips.push({ key: "buyer", label: "Buyer", value: labels, onClear: () => setBuyerFilter([]) });
    }
    if (createdDateFilter.preset) {
      const presetLabels: Record<string, string> = { today: "Today", this_week: "This Week", this_month: "This Month" };
      chips.push({ key: "created", label: "Created", value: presetLabels[createdDateFilter.preset] ?? createdDateFilter.preset, onClear: () => setCreatedDateFilter({}) });
    } else if (createdDateFilter.from || createdDateFilter.to) {
      chips.push({ key: "created", label: "Created", value: `${createdDateFilter.from ?? "…"} → ${createdDateFilter.to ?? "…"}`, onClear: () => setCreatedDateFilter({}) });
    }
    if (soldDateFilter.preset) {
      const presetLabels: Record<string, string> = { today: "Today", this_week: "This Week", this_month: "This Month" };
      chips.push({ key: "sold", label: "Sold", value: presetLabels[soldDateFilter.preset] ?? soldDateFilter.preset, onClear: () => setSoldDateFilter({}) });
    } else if (soldDateFilter.from || soldDateFilter.to) {
      chips.push({ key: "sold", label: "Sold", value: `${soldDateFilter.from ?? "…"} → ${soldDateFilter.to ?? "…"}`, onClear: () => setSoldDateFilter({}) });
    }
    if (globalSearch.trim()) chips.push({ key: "search", label: "Search", value: globalSearch, onClear: () => setGlobalSearch("") });
    return chips;
  }, [leadSearch, typeFilter, areaFilter, priceRange, statusFilter, leafFilter, routingFilter, postedByFilter, buyerFilter, createdDateFilter, soldDateFilter, globalSearch, brokerOptions, buyerOptions]);

  function clearAllFilters() {
    setLeadSearch(""); setTypeFilter([]); setAreaFilter([]);
    setPriceRange({}); setStatusFilter([]); setLeafFilter([]);
    setRoutingFilter([]); setPostedByFilter([]); setBuyerFilter([]);
    setCreatedDateFilter({}); setSoldDateFilter({});
    setGlobalSearch(""); setSortColumn(null); setSortDir(null);
  }

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

  // Action handlers
  async function handleExpire(id: string) {
    if (!window.confirm("Mark this lead as expired?")) return;
    const res = await adminExpireLead(id);
    if (res.success) { showToast("Lead expired."); closePanel(); router.refresh(); }
    else showToast(res.error || "Failed.", true);
  }
  async function handleReactivate(id: string) {
    if (!window.confirm("Reactivate this lead? It will be set to Available with a 30-day expiration.")) return;
    const res = await adminReactivateLead(id);
    if (res.success) { showToast("Lead reactivated."); closePanel(); router.refresh(); }
    else showToast(res.error || "Failed.", true);
  }
  async function handleDelete(id: string) {
    if (!window.confirm("Delete this lead? This cannot be undone for seed data.")) return;
    const res = await adminDeleteLead(id);
    if (res.success) { showToast("Lead deleted."); closePanel(); router.refresh(); }
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
      <div className="admin-kpi-grid-6" style={{ marginBottom: 20 }}>
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

      {/* Leads Section (collapsible) */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, marginBottom: 20, overflow: "hidden" }}>
        <button type="button" onClick={() => setLeadsOpen(!leadsOpen)}
          style={{
            width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer",
          }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Leads</span>
          <span style={{ fontSize: 12, color: TEXT_DIM, transition: "transform 0.15s", transform: leadsOpen ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
        </button>
        {leadsOpen && (
          <div style={{ padding: "0 18px 18px" }}>
            {/* Search + Count */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: TEXT_DIM }}>
                Showing <span style={{ fontWeight: 700, color: TEXT_SEC }}>{filtered.length}</span> lead{filtered.length !== 1 ? "s" : ""}
              </span>
              <input type="text" value={globalSearch} onChange={(e) => { setGlobalSearch(e.target.value); setPage(1); }}
                placeholder="Search title, city, zip, name…"
                className="admin-input"
                style={{ maxWidth: 300, fontSize: 13, padding: "7px 12px" }} />
            </div>

            {/* Mobile Filter Toggle */}
            <div className="admin-mobile-filter-toggle">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((p) => !p)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", borderRadius: 8,
                  border: `1px solid ${activeFilters.length > 0 ? "rgba(16,185,129,0.30)" : BORDER}`,
                  background: CARD, cursor: "pointer",
                }}
              >
                <AdjustmentsHorizontalIcon style={{ width: 18, height: 18, color: activeFilters.length > 0 ? EMERALD : TEXT_MUTED }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: activeFilters.length > 0 ? EMERALD : TEXT }}>Filters</span>
                {activeFilters.length > 0 && (
                  <span style={{
                    padding: "1px 7px", borderRadius: 9999, fontSize: 11, fontWeight: 700,
                    background: "rgba(16,185,129,0.15)", color: EMERALD,
                  }}>{activeFilters.length}</span>
                )}
                <ChevronDownIcon style={{
                  width: 16, height: 16, marginLeft: "auto",
                  color: TEXT_MUTED, transition: "transform 0.15s",
                  transform: mobileFiltersOpen ? "rotate(180deg)" : "rotate(0)",
                }} />
              </button>
              {mobileFiltersOpen && (
                <div style={{
                  marginTop: 8, padding: 14, borderRadius: 10,
                  background: CARD, border: `1px solid ${BORDER}`,
                  display: "flex", flexDirection: "column", gap: 12,
                }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "block" }}>Type</label>
                    <select
                      value={typeFilter.length === 1 ? typeFilter[0] : ""}
                      onChange={(e) => { setTypeFilter(e.target.value ? [e.target.value] : []); setPage(1); }}
                      className="admin-select" style={{ fontSize: 13 }}
                    >
                      <option value="">All Types</option>
                      {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "block" }}>Status</label>
                    <select
                      value={statusFilter.length === 1 ? statusFilter[0] : ""}
                      onChange={(e) => { setStatusFilter(e.target.value ? [e.target.value] : []); setPage(1); }}
                      className="admin-select" style={{ fontSize: 13 }}
                    >
                      <option value="">All Statuses</option>
                      {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "block" }}>Area</label>
                    <select
                      value={areaFilter.length === 1 ? areaFilter[0] : ""}
                      onChange={(e) => { setAreaFilter(e.target.value ? [e.target.value] : []); setPage(1); }}
                      className="admin-select" style={{ fontSize: 13 }}
                    >
                      <option value="">All Areas</option>
                      {areaOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, display: "block" }}>Routing</label>
                    <select
                      value={routingFilter.length === 1 ? routingFilter[0] : ""}
                      onChange={(e) => { setRoutingFilter(e.target.value ? [e.target.value] : []); setPage(1); }}
                      className="admin-select" style={{ fontSize: 13 }}
                    >
                      <option value="">All Routing</option>
                      {ROUTING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Active Filter Chips */}
            <div style={{ marginBottom: activeFilters.length > 0 ? 12 : 0 }}>
              <ActiveFilterBar filters={activeFilters} onClearAll={clearAllFilters} />
            </div>

            {/* Table */}
            <div className="admin-table-desktop" style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
              <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    <FilterableHeader
                      label="Lead" filterType="search"
                      filterValue={leadSearch} onFilterChange={(v) => { setLeadSearch(v as string); setPage(1); }}
                      isOpen={openColumn === "lead"} onOpen={() => setOpenColumn("lead")} onClose={() => setOpenColumn(null)}
                    />
                    <FilterableHeader
                      label="Type" filterType="multi-select" width={110}
                      options={TYPE_OPTIONS}
                      optionColors={MARKETPLACE_TYPE_COLORS}
                      filterValue={typeFilter} onFilterChange={(v) => { setTypeFilter(v as string[]); setPage(1); }}
                      isOpen={openColumn === "type"} onOpen={() => setOpenColumn("type")} onClose={() => setOpenColumn(null)}
                    />
                    <FilterableHeader
                      label="Area" filterType="multi-select" width={100}
                      options={areaOptions}
                      filterValue={areaFilter} onFilterChange={(v) => { setAreaFilter(v as string[]); setPage(1); }}
                      isOpen={openColumn === "area"} onOpen={() => setOpenColumn("area")} onClose={() => setOpenColumn(null)}
                    />
                    <FilterableHeader
                      label="Price" filterType="range" width={90}
                      filterValue={priceRange} onFilterChange={(v) => { setPriceRange(v as { min?: string; max?: string }); setPage(1); }}
                      sortable sortDir={sortColumn === "price" ? sortDir : null} onSortChange={handleSort("price")}
                      isOpen={openColumn === "price"} onOpen={() => setOpenColumn("price")} onClose={() => setOpenColumn(null)}
                    />
                    <FilterableHeader
                      label="Status" filterType="multi-select" width={90}
                      options={STATUS_OPTIONS}
                      filterValue={statusFilter} onFilterChange={(v) => { setStatusFilter(v as string[]); setPage(1); }}
                      isOpen={openColumn === "status"} onOpen={() => setOpenColumn("status")} onClose={() => setOpenColumn(null)}
                    />
                    <FilterableHeader
                      label="LEAF" filterType="multi-select" width={60}
                      options={LEAF_OPTIONS}
                      filterValue={leafFilter} onFilterChange={(v) => { setLeafFilter(v as string[]); setPage(1); }}
                      isOpen={openColumn === "leaf"} onOpen={() => setOpenColumn("leaf")} onClose={() => setOpenColumn(null)}
                    />
                    <FilterableHeader
                      label="Routing" filterType="multi-select" width={90}
                      options={ROUTING_OPTIONS}
                      filterValue={routingFilter} onFilterChange={(v) => { setRoutingFilter(v as string[]); setPage(1); }}
                      isOpen={openColumn === "routing"} onOpen={() => setOpenColumn("routing")} onClose={() => setOpenColumn(null)}
                    />
                    <FilterableHeader
                      label="Posted By" filterType="multi-select" width={100}
                      options={brokerOptions}
                      filterValue={postedByFilter} onFilterChange={(v) => { setPostedByFilter(v as string[]); setPage(1); }}
                      isOpen={openColumn === "postedBy"} onOpen={() => setOpenColumn("postedBy")} onClose={() => setOpenColumn(null)}
                    />
                    <FilterableHeader
                      label="Buyer" filterType="multi-select" width={100}
                      options={buyerOptions}
                      filterValue={buyerFilter} onFilterChange={(v) => { setBuyerFilter(v as string[]); setPage(1); }}
                      isOpen={openColumn === "buyer"} onOpen={() => setOpenColumn("buyer")} onClose={() => setOpenColumn(null)}
                    />
                    <FilterableHeader
                      label="Created" filterType="date-range" width={100}
                      filterValue={createdDateFilter} onFilterChange={(v) => { setCreatedDateFilter(v as { preset?: string; from?: string; to?: string }); setPage(1); }}
                      sortable sortDir={sortColumn === "created" ? sortDir : null} onSortChange={handleSort("created")}
                      isOpen={openColumn === "created"} onOpen={() => setOpenColumn("created")} onClose={() => setOpenColumn(null)}
                    />
                    <FilterableHeader
                      label="Sold" filterType="date-range" width={100}
                      filterValue={soldDateFilter} onFilterChange={(v) => { setSoldDateFilter(v as { preset?: string; from?: string; to?: string }); setPage(1); }}
                      sortable sortDir={sortColumn === "sold" ? sortDir : null} onSortChange={handleSort("sold")}
                      isOpen={openColumn === "sold"} onOpen={() => setOpenColumn("sold")} onClose={() => setOpenColumn(null)}
                    />
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr><td colSpan={12} style={{ padding: 48, textAlign: "center" }}>
                      <div style={{ fontSize: 14, color: TEXT_DIM, fontWeight: 600 }}>No leads match your filters</div>
                    </td></tr>
                  ) : paged.map((lead) => (
                    <LeadRow key={lead.id} lead={lead}
                      onRowClick={() => openPanel(lead)}
                      onExpire={() => handleExpire(lead.id)}
                      onReactivate={() => handleReactivate(lead.id)}
                      onDelete={() => handleDelete(lead.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-card-mobile">
              {paged.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center", fontSize: 14, color: TEXT_DIM, fontWeight: 600 }}>
                  No leads match your filters
                </div>
              ) : paged.map((lead) => (
                <LeadMobileCard key={lead.id} lead={lead} onClick={() => openPanel(lead)} />
              ))}
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
          </div>
        )}
      </div>

      {/* Lead Detail Side Panel */}
      <SidePanel
        isOpen={sidePanelOpen}
        onClose={closePanel}
        title={selectedLead?.title || selectedLead?.homeowner_name || "Lead Details"}
        width="w-2/5"
        footer={selectedLead ? (
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={() => { closePanel(); setEditLead(selectedLead); }} style={{
              flex: 1, padding: "9px 14px", borderRadius: 8, border: "none",
              background: EMERALD, color: "#fff", fontSize: 12, fontWeight: 700,
              cursor: "pointer", transition: "opacity 0.15s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>
              Edit Lead
            </button>
            {selectedLead.status === "available" && (
              <button type="button" onClick={() => handleExpire(selectedLead.id)} style={{
                flex: 1, padding: "9px 14px", borderRadius: 8,
                border: "1px solid rgba(234,179,8,0.3)", background: "transparent",
                color: "#f59e0b", fontSize: 12, fontWeight: 700,
                cursor: "pointer", transition: "background 0.15s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(234,179,8,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                Mark Expired
              </button>
            )}
            {selectedLead.status === "expired" && (
              <button type="button" onClick={() => handleReactivate(selectedLead.id)} style={{
                flex: 1, padding: "9px 14px", borderRadius: 8,
                border: "1px solid rgba(16,185,129,0.3)", background: "transparent",
                color: EMERALD, fontSize: 12, fontWeight: 700,
                cursor: "pointer", transition: "background 0.15s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(16,185,129,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                Reactivate
              </button>
            )}
            <button type="button" onClick={() => handleDelete(selectedLead.id)} style={{
              flex: 1, padding: "9px 14px", borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.3)", background: "transparent",
              color: "#f87171", fontSize: 12, fontWeight: 700,
              cursor: "pointer", transition: "background 0.15s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              Delete Lead
            </button>
          </div>
        ) : undefined}
      >
        {selectedLead && (
          <LeadDetailPanel lead={selectedLead} />
        )}
      </SidePanel>

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
  onRowClick: () => void;
  onExpire: () => void;
  onReactivate: () => void;
  onDelete: () => void;
};

function LeadRow({ lead, onRowClick, onExpire, onReactivate, onDelete }: RowProps) {
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
        cursor: "pointer",
      }}
      onClick={onRowClick}
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
      <td style={{ padding: "10px 14px" }}>
        {(() => {
          const rc = lead.routing_channel ?? "open_market";
          const cfg = ROUTING_BADGE_CONFIG[rc];
          if (!cfg) return <span style={{ fontSize: 12, color: TEXT_DIM }}>—</span>;
          return (
            <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.text }}>
              {cfg.label}{lead.is_free_assignment ? " (Free)" : ""}
            </span>
          );
        })()}
      </td>
      <td style={{ padding: "10px 14px", fontSize: 12, color: textColor }}>{lead.broker_name || "—"}</td>
      <td style={{ padding: "10px 14px", fontSize: 12, color: textColor }}>{lead.buyer_name || "—"}</td>
      <td style={{ padding: "10px 14px", fontSize: 12, color: TEXT_DIM }}>{fmtDate(lead.created_at)}</td>
      <td style={{ padding: "10px 14px", fontSize: 12, color: TEXT_DIM }}>{fmtDate(lead.purchased_date)}</td>
      <td style={{ padding: "10px 14px", position: "relative" }} onClick={(e) => e.stopPropagation()}>
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

// ─── Mobile Card (< 640px) ──────────────────────────────────────────

function LeadMobileCard({ lead, onClick }: { lead: MarketplaceLead; onClick: () => void }) {
  const stc = SYSTEM_TYPE_COLORS[lead.system_type] ?? { bg: "rgba(148,163,184,0.15)", text: TEXT_MUTED, label: lead.system_type };
  const sc = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.available;
  const isMuted = lead.status === "expired" || lead.status === "archived";

  return (
    <div
      onClick={onClick}
      style={{
        background: "rgba(30,41,59,0.5)",
        borderRadius: 12,
        padding: 16,
        border: lead.status === "purchased" ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(51,65,85,0.5)",
        marginBottom: 12,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: isMuted ? TEXT_DIM : TEXT }}>
          {lead.title || lead.homeowner_name || "\u2014"}
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: isMuted ? TEXT_DIM : TEXT }}>{money(lead.price)}</span>
      </div>
      <div style={{ fontSize: 12, color: TEXT_DIM, marginBottom: 8 }}>
        {[lead.city, lead.state].filter(Boolean).join(", ") || lead.zip || "\u2014"}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: stc.bg, color: stc.text }}>
          {stc.label}
        </span>
        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
          {sc.label}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: TEXT_DIM }}>{fmtDate(lead.created_at)}</span>
        {lead.has_leaf && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: EMERALD, display: "inline-block" }} />
            <span style={{ fontSize: 10, color: EMERALD, fontWeight: 600 }}>LEAF</span>
          </div>
        )}
      </div>
    </div>
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

// ─── Lead Detail Panel (inside SidePanel) ───────────────────────────

function LeadDetailPanel({ lead }: {
  lead: MarketplaceLead;
}) {
  const stc = SYSTEM_TYPE_COLORS[lead.system_type] ?? { bg: "rgba(148,163,184,0.15)", text: TEXT_MUTED, label: lead.system_type };
  const sc = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.available;
  const leaf = lead.leaf_report_data;
  const hasLeaf = lead.has_leaf && leaf && Object.keys(leaf).length > 0;

  const sectionStyle: React.CSSProperties = {
    background: "rgba(30,41,59,0.5)", border: "1px solid rgba(51,65,85,0.5)",
    borderRadius: 8, padding: 16, marginBottom: 16,
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase",
    letterSpacing: "0.06em", marginBottom: 10,
  };
  const fieldLabel: React.CSSProperties = { fontSize: 11, color: TEXT_DIM, fontWeight: 600 };
  const fieldValue: React.CSSProperties = { fontSize: 13, color: TEXT_SEC, marginTop: 2 };

  // Revenue split (for sold leads)
  const totalAmt = lead.price;
  const reiAmt = Math.round(totalAmt * 30) / 100;
  const serviceFee = Math.round(totalAmt * 2) / 100;
  const posterAmt = Math.round(totalAmt * 68.6) / 100;

  return (
    <div>
        {/* Status & Type badges */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>{sc.label}</span>
          <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: stc.bg, color: stc.text }}>{stc.label}</span>
          {lead.routing_channel && ROUTING_BADGE_CONFIG[lead.routing_channel] && (
            <span style={{
              padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700,
              background: ROUTING_BADGE_CONFIG[lead.routing_channel].bg,
              color: ROUTING_BADGE_CONFIG[lead.routing_channel].text,
            }}>
              {ROUTING_BADGE_CONFIG[lead.routing_channel].label}
              {lead.is_free_assignment ? " (Free)" : ""}
            </span>
          )}
          {lead.has_leaf && <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "rgba(16,185,129,0.12)", color: EMERALD }}>LEAF</span>}
        </div>

        {/* Lead Info */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Lead Info</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><div style={fieldLabel}>Price</div><div style={{ ...fieldValue, fontWeight: 700, color: TEXT }}>{money(lead.price)}</div></div>
            <div><div style={fieldLabel}>Created</div><div style={fieldValue}>{fmtDate(lead.created_at)}</div></div>
            {lead.expiration_date && <div><div style={fieldLabel}>Expires</div><div style={fieldValue}>{fmtDate(lead.expiration_date)}</div></div>}
            {lead.broker_name && <div><div style={fieldLabel}>Posted By</div><div style={fieldValue}>{lead.broker_name}</div></div>}
          </div>
          {lead.description && (
            <div style={{ marginTop: 12 }}>
              <div style={fieldLabel}>Description</div>
              <div style={{ ...fieldValue, lineHeight: 1.5 }}>{lead.description}</div>
            </div>
          )}
        </div>

        {/* Property */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Property</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {lead.address && <div style={{ gridColumn: "span 2" }}><div style={fieldLabel}>Address</div><div style={fieldValue}>{[lead.address, lead.city, lead.state, lead.zip].filter(Boolean).join(", ")}</div></div>}
            {!lead.address && lead.city && <div><div style={fieldLabel}>City / Area</div><div style={fieldValue}>{[lead.city, lead.state].filter(Boolean).join(", ")}</div></div>}
            {lead.home_type && <div><div style={fieldLabel}>Property Type</div><div style={fieldValue}>{lead.home_type}</div></div>}
            {lead.home_sqft != null && <div><div style={fieldLabel}>Square Footage</div><div style={fieldValue}>{lead.home_sqft.toLocaleString()} sqft</div></div>}
            {lead.home_year_built != null && <div><div style={fieldLabel}>Year Built</div><div style={fieldValue}>{lead.home_year_built}</div></div>}
            {lead.beds != null && <div><div style={fieldLabel}>Bedrooms</div><div style={fieldValue}>{lead.beds}</div></div>}
            {lead.baths != null && <div><div style={fieldLabel}>Bathrooms</div><div style={fieldValue}>{lead.baths}</div></div>}
          </div>
        </div>

        {/* Homeowner */}
        <div style={sectionStyle}>
          <div style={sectionTitle}>Homeowner</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><div style={fieldLabel}>Name</div><div style={fieldValue}>{lead.homeowner_name || "—"}</div></div>
            <div><div style={fieldLabel}>Phone</div><div style={fieldValue}>
              {lead.homeowner_phone ? (
                <a href={`tel:${lead.homeowner_phone}`} style={{ color: TEXT_SEC, textDecoration: "none" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = EMERALD; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_SEC; }}>
                  {lead.homeowner_phone}
                </a>
              ) : "—"}
            </div></div>
            <div><div style={fieldLabel}>Email</div><div style={fieldValue}>
              {lead.homeowner_email ? (
                <a href={`mailto:${lead.homeowner_email}`} style={{ color: TEXT_SEC, textDecoration: "none" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = EMERALD; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_SEC; }}>
                  {lead.homeowner_email}
                </a>
              ) : "—"}
            </div></div>
            {lead.best_contact_time && <div><div style={fieldLabel}>Best Time</div><div style={fieldValue}>{lead.best_contact_time}</div></div>}
          </div>
        </div>

        {/* LEAF */}
        {hasLeaf && (
          <div style={sectionStyle}>
            <div style={sectionTitle}>LEAF Energy Assessment</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
          </div>
        )}

        {/* Purchase info (sold) */}
        {lead.status === "purchased" && (
          <div style={sectionStyle}>
            <div style={sectionTitle}>Purchase Info</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><div style={fieldLabel}>Buyer</div><div style={fieldValue}>{lead.buyer_name || "—"}</div></div>
              <div><div style={fieldLabel}>Purchase Date</div><div style={fieldValue}>{fmtDate(lead.purchased_date)}</div></div>
            </div>
            <div style={sectionTitle}>Revenue Split</div>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
              background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12,
            }}>
              <div><div style={fieldLabel}>Total</div><div style={{ ...fieldValue, fontWeight: 700, color: TEXT }}>{money(totalAmt)}</div></div>
              <div><div style={fieldLabel}>REI (30%)</div><div style={{ ...fieldValue, fontWeight: 700, color: EMERALD }}>{money(reiAmt)}</div></div>
              <div><div style={fieldLabel}>Poster (68.6%)</div><div style={{ ...fieldValue, fontWeight: 700, color: "#3b82f6" }}>{money(posterAmt)}</div></div>
              <div><div style={fieldLabel}>Service Fee (2%)</div><div style={{ ...fieldValue, fontWeight: 700, color: TEXT_MUTED }}>{money(serviceFee)}</div></div>
            </div>
          </div>
        )}
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

type RoutingChannel = "open_market" | "internal_network" | "exclusive";

const ROUTING_CARDS: { key: RoutingChannel; icon: string; title: string; desc: string }[] = [
  { key: "open_market", icon: "\uD83C\uDF10", title: "Open Market", desc: "Post to the public job board. Any contractor can purchase this lead." },
  { key: "internal_network", icon: "\uD83D\uDC65", title: "My Network Only", desc: "Post to REI\u2019s contractor network. Auto-releases to open market if unclaimed." },
  { key: "exclusive", icon: "\uD83C\uDFAF", title: "Assign to Contractor", desc: "Send directly to a specific contractor in your network." },
];

const RELEASE_OPTIONS = [
  { value: "24", label: "24 hours" },
  { value: "48", label: "48 hours" },
  { value: "72", label: "72 hours" },
  { value: "never", label: "Never" },
];

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

  // Routing — Phase 8A
  const [routingChannel, setRoutingChannel] = useState<RoutingChannel>("open_market");
  const [networkReleaseHours, setNetworkReleaseHours] = useState("48");
  const [networkContractors, setNetworkContractors] = useState<{ id: string; name: string; company_name: string | null }[]>([]);
  const [networkContractorsLoaded, setNetworkContractorsLoaded] = useState(false);
  const [exclusiveContractorId, setExclusiveContractorId] = useState("");
  const [isFreeAssignment, setIsFreeAssignment] = useState(false);

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

  // Load network contractors when exclusive is selected
  async function loadNetworkContractors() {
    if (networkContractorsLoaded) return;
    const list = await fetchNetworkContractors();
    setNetworkContractors(list);
    setNetworkContractorsLoaded(true);
  }

  function handleChannelChange(channel: RoutingChannel) {
    setRoutingChannel(channel);
    if (channel === "exclusive") loadNetworkContractors();
    // Reset free assignment if switching away from exclusive
    if (channel !== "exclusive") setIsFreeAssignment(false);
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

  const priceDisabled = routingChannel === "exclusive" && isFreeAssignment;

  async function handlePost() {
    setSaving(true);
    const input: PostLeadInput = {
      title,
      description,
      system_type: systemType,
      price: priceDisabled ? 0 : (parseFloat(price) || 0),
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
      routing_channel: routingChannel,
      exclusive_contractor_id: routingChannel === "exclusive" ? exclusiveContractorId || null : null,
      is_free_assignment: routingChannel === "exclusive" ? isFreeAssignment : false,
      network_release_hours: routingChannel === "internal_network" && networkReleaseHours !== "never"
        ? Number(networkReleaseHours)
        : null,
    };

    const res = await adminPostLead(input);
    setSaving(false);
    if (res.success) {
      onPosted();
    } else {
      onError(res.error || "Failed to post lead.");
    }
  }

  const buttonLabel = routingChannel === "exclusive"
    ? (saving ? "Assigning\u2026" : "Assign Lead")
    : routingChannel === "internal_network"
    ? (saving ? "Posting\u2026" : "Post to Network")
    : (saving ? "Posting\u2026" : "Post Lead");

  const buttonColor = routingChannel === "exclusive" ? "#a78bfa" : EMERALD;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24,
        width: 680, maxWidth: "92vw", maxHeight: "88vh", overflow: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>Post New Lead</div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: TEXT_DIM, fontSize: 20, cursor: "pointer", padding: 4 }}>{"\u2715"}</button>
        </div>

        {/* ─── Routing Channel Cards ─── */}
        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>Lead Routing</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {ROUTING_CARDS.map((card) => {
              const active = routingChannel === card.key;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => handleChannelChange(card.key)}
                  style={{
                    padding: 14, borderRadius: 12, textAlign: "left",
                    cursor: "pointer", transition: "all 0.15s",
                    border: `1px solid ${active ? EMERALD : "rgba(51,65,85,0.5)"}`,
                    background: active ? "rgba(16,185,129,0.1)" : "rgba(30,41,59,0.5)",
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = "#475569"; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = "rgba(51,65,85,0.5)"; }}
                >
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{card.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: active ? EMERALD : TEXT, marginBottom: 4 }}>{card.title}</div>
                  <div style={{ fontSize: 11, color: TEXT_MUTED, lineHeight: 1.4 }}>{card.desc}</div>
                </button>
              );
            })}
          </div>

          {/* ─── My Network: auto-release timer ─── */}
          {routingChannel === "internal_network" && (
            <div style={{ marginTop: 10, padding: "10px 14px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600, whiteSpace: "nowrap" }}>Auto-release to Open Market after:</div>
                <select
                  value={networkReleaseHours}
                  onChange={(e) => setNetworkReleaseHours(e.target.value)}
                  style={{ ...inputStyle, width: "auto", flex: "0 0 140px", cursor: "pointer" }}
                >
                  {RELEASE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ─── Exclusive: contractor picker + paid/free toggle ─── */}
          {routingChannel === "exclusive" && (
            <div style={{ marginTop: 10, padding: "12px 14px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600, marginBottom: 4 }}>Select Contractor</div>
                <select
                  value={exclusiveContractorId}
                  onChange={(e) => setExclusiveContractorId(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="">Select a contractor\u2026</option>
                  {networkContractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name ? `${c.company_name} — ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
                {networkContractorsLoaded && networkContractors.length === 0 && (
                  <div style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>No active partners in your network. Add partners via My Network page.</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600, marginBottom: 4 }}>Assignment Type</div>
                <div style={{ display: "flex", gap: 0, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
                  <button
                    type="button"
                    onClick={() => setIsFreeAssignment(false)}
                    style={{
                      padding: "7px 16px", border: "none",
                      borderRight: `1px solid ${BORDER}`,
                      background: !isFreeAssignment ? "rgba(16,185,129,0.1)" : "transparent",
                      color: !isFreeAssignment ? EMERALD : TEXT_MUTED,
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    Paid Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFreeAssignment(true)}
                    style={{
                      padding: "7px 16px", border: "none",
                      background: isFreeAssignment ? "rgba(148,163,184,0.12)" : "transparent",
                      color: isFreeAssignment ? TEXT_SEC : TEXT_MUTED,
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    Free Assignment
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle}>Title *</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. HVAC Replacement \u2014 Lake Oswego" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle}>Description</div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Lead details, notes for contractors\u2026"
            style={{ ...inputStyle, height: 72, resize: "vertical", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={labelStyle}>Service Type *</div>
            <select value={systemType} onChange={(e) => setSystemType(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {SERVICE_TYPES.filter((s) => s.value !== "all").map((s) => {
                const stc = SYSTEM_TYPE_COLORS[s.value];
                return (
                  <option key={s.value} value={s.value} style={{ color: stc?.text }}>
                    {s.label}
                  </option>
                );
              })}
            </select>
            {/* Color indicator for selected type */}
            {systemType && SYSTEM_TYPE_COLORS[systemType] && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: SYSTEM_TYPE_COLORS[systemType].text }} />
                <span style={{ fontSize: 11, color: SYSTEM_TYPE_COLORS[systemType].text, fontWeight: 600 }}>{SYSTEM_TYPE_COLORS[systemType].label}</span>
              </div>
            )}
          </div>
          <div>
            <div style={labelStyle}>
              Price ($){routingChannel === "open_market" || (routingChannel === "internal_network") ? " *" : ""}
            </div>
            {priceDisabled ? (
              <div>
                <input type="number" value="0" disabled style={{ ...inputStyle, opacity: 0.4, cursor: "not-allowed" }} />
                <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4, fontStyle: "italic" }}>Free assignment — no charge</div>
              </div>
            ) : (
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" style={inputStyle} />
            )}
          </div>
        </div>

        {/* Property Info */}
        <div style={sectionHead}>Property Info</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={labelStyle}>Home Type</div>
            <select value={homeType} onChange={(e) => setHomeType(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">{"\u2014"}</option>
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
            <option value="">{"\u2014"}</option>
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
          <textarea value={hoNotes} onChange={(e) => setHoNotes(e.target.value)} placeholder="Best contact times, special instructions\u2026"
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
            background: buttonColor, color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: "pointer", opacity: saving ? 0.5 : 1,
          }}>{buttonLabel}</button>
        </div>
      </div>
    </div>
  );
}
