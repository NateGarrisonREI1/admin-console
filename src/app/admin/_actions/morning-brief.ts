// src/app/admin/_actions/morning-brief.ts
"use server";

import { AdminOpsService } from "@/lib/services/AdminOpsService";
import type {
  AdminDashboardKpis,
  HesScheduleEntry,
  InspectorScheduleEntry,
  RevenueBreakdown,
  AdminBrokerSummary,
  DirectLead,
} from "@/types/admin-ops";
import { supabaseAdmin } from "@/lib/supabase/server";

// ─── Types ──────────────────────────────────────────────────────────

export type ScheduleItem = {
  id: string;
  type: "hes" | "inspection";
  time: string | null;
  address: string | null;
  city: string | null;
  teamMember: string | null;
  customerName: string;
  status: string;
};

export type AttentionItem = {
  id: string;
  kind: "pending_lead" | "overdue_project" | "at_risk_broker";
  label: string;
  detail: string;
  urgency: "normal" | "amber" | "red";
  href: string;
};

export type WeekSummary = {
  hesCompleted: number;
  inspectionsCompleted: number;
  revenueThisWeek: number;
  newDirectLeads: number;
  newBrokerLeads: number;
  newBrokers: number;
};

export type RevenueStream = {
  label: string;
  gross: number;
  reiTake: number;
  count: number;
};

export type MorningBriefData = {
  // Row 1 — key numbers
  revenueMtd: number;
  revenueMtdChange: number;
  openProjects: number;
  teamAvailableToday: string;
  activeBrokers: number;
  // Row 2 — today's schedule
  todaySchedule: ScheduleItem[];
  todayDate: string;
  // Row 3 left — needs attention
  attentionItems: AttentionItem[];
  // Row 3 right — this week
  weekSummary: WeekSummary;
  // Row 4 — revenue snapshot
  revenueStreams: RevenueStream[];
};

// ─── Fetch ──────────────────────────────────────────────────────────

export async function fetchMorningBrief(): Promise<MorningBriefData> {
  const svc = new AdminOpsService();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Monday of current week
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  const weekStart = monday.toISOString().slice(0, 10);

  // Defaults for graceful degradation
  const defaultKpis: AdminDashboardKpis = {
    active_brokers: 0, revenue_this_month: 0, broker_revenue: 0,
    leads_posted: 0, leads_purchased: 0, leads_closed: 0, services_completed: 0,
    hes_staff_count: 0, hes_capacity_pct: 0, hes_scheduled_today: 0,
    inspector_staff_count: 0, inspector_capacity_pct: 0, inspector_scheduled_today: 0,
    partner_count: 0, partner_active_pct: 0, partner_available: 0,
    pending_direct_leads: 0, alerts: [],
  };
  const defaultSchedule = { hes: [] as HesScheduleEntry[], inspections: [] as InspectorScheduleEntry[] };
  const defaultRevenue: RevenueBreakdown = {
    broker_commissions: 0, broker_lead_count: 0,
    inhouse_hes_revenue: 0, inhouse_hes_count: 0,
    inhouse_inspection_revenue: 0, inhouse_inspection_count: 0,
    partner_dispatch_revenue: 0, partner_dispatch_count: 0,
    total_revenue: 0, rei_take: 0,
  };

  // Batch all queries — each wrapped so one failure doesn't block the rest
  const [kpis, todayScheduleRaw, revenue, brokers, directLeads, weekSchedule, openJobCount, lastMonthRevenue] =
    await Promise.all([
      svc.getDashboardKpis().catch(() => defaultKpis),
      svc.getTodaySchedule().catch(() => defaultSchedule),
      svc.getRevenueBreakdown().catch(() => defaultRevenue),
      svc.getBrokers().catch(() => [] as AdminBrokerSummary[]),
      svc.getDirectLeads().catch(() => [] as DirectLead[]),
      fetchWeekSchedule(svc, weekStart, today).catch(() => defaultSchedule),
      fetchOpenProjectCount(),
      fetchLastMonthRevenue(),
    ]);

  // ── Row 1: Key numbers ──
  const totalTeam = kpis.hes_staff_count + kpis.inspector_staff_count;
  const scheduledToday = kpis.hes_scheduled_today + kpis.inspector_scheduled_today;
  const availableToday = Math.max(0, totalTeam - scheduledToday);
  const teamAvailableToday = `${availableToday} of ${totalTeam} available`;

  const revenueMtdChange = lastMonthRevenue > 0
    ? Math.round(((revenue.total_revenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : 0;

  // ── Row 2: Today's schedule ──
  const todaySchedule = buildScheduleItems(todayScheduleRaw.hes, todayScheduleRaw.inspections);

  // ── Row 3 left: Needs attention ──
  const attentionItems = buildAttentionItems(directLeads, brokers, kpis);

  // ── Row 3 right: This week ──
  const weekSummary = buildWeekSummary(weekSchedule, directLeads, brokers, weekStart);

  // ── Row 4: Revenue snapshot ──
  const revenueStreams = buildRevenueStreams(revenue);

  return {
    revenueMtd: revenue.total_revenue,
    revenueMtdChange,
    openProjects: openJobCount,
    teamAvailableToday,
    activeBrokers: kpis.active_brokers,
    todaySchedule,
    todayDate: today,
    attentionItems,
    weekSummary,
    revenueStreams,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function buildScheduleItems(
  hes: HesScheduleEntry[],
  inspections: InspectorScheduleEntry[]
): ScheduleItem[] {
  const items: ScheduleItem[] = [];

  for (const e of hes) {
    if (e.status === "cancelled") continue;
    items.push({
      id: e.id,
      type: "hes",
      time: e.scheduled_time,
      address: e.address,
      city: e.city,
      teamMember: e.team_member?.name || null,
      customerName: e.customer_name,
      status: e.status,
    });
  }

  for (const e of inspections) {
    if (e.status === "cancelled") continue;
    items.push({
      id: e.id,
      type: "inspection",
      time: e.scheduled_time,
      address: e.address,
      city: e.city,
      teamMember: e.team_member?.name || null,
      customerName: e.customer_name,
      status: e.status,
    });
  }

  // Sort by time
  items.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
  return items.slice(0, 8);
}

function buildAttentionItems(
  directLeads: DirectLead[],
  brokers: AdminBrokerSummary[],
  kpis: AdminDashboardKpis
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const now = Date.now();

  // Pending direct leads with no assignee
  const pending = directLeads.filter((l) => l.status === "pending" && !l.assigned_to_id);
  for (const lead of pending.slice(0, 3)) {
    const ageHrs = Math.floor((now - new Date(lead.created_at).getTime()) / 3600_000);
    const urgency: AttentionItem["urgency"] = ageHrs > 48 ? "red" : ageHrs > 24 ? "amber" : "normal";
    items.push({
      id: `lead-${lead.id}`,
      kind: "pending_lead",
      label: `Lead: ${lead.customer_name}`,
      detail: ageHrs < 24 ? `${ageHrs}h ago` : `${Math.floor(ageHrs / 24)}d ago`,
      urgency,
      href: "/admin/direct-leads",
    });
  }

  // At-risk brokers (simple heuristic: low activity)
  const atRisk = brokers.filter((b) => {
    if (b.status !== "active") return false;
    return b.leads_posted === 0 && b.homes_assessed === 0;
  });
  for (const broker of atRisk.slice(0, 2)) {
    items.push({
      id: `broker-${broker.id}`,
      kind: "at_risk_broker",
      label: `Broker: ${broker.company_name || broker.user_email || "Unknown"}`,
      detail: "No activity",
      urgency: "amber",
      href: "/admin/brokers",
    });
  }

  return items.slice(0, 6);
}

function buildWeekSummary(
  weekSchedule: { hes: HesScheduleEntry[]; inspections: InspectorScheduleEntry[] },
  directLeads: DirectLead[],
  brokers: AdminBrokerSummary[],
  weekStart: string
): WeekSummary {
  const hesCompleted = weekSchedule.hes.filter((e) => e.status === "completed").length;
  const inspectionsCompleted = weekSchedule.inspections.filter((e) => e.status === "completed").length;

  // Revenue this week: sum of completed invoices
  const hesRevenue = weekSchedule.hes
    .filter((e) => e.status === "completed" && e.invoice_amount)
    .reduce((sum, e) => sum + (e.invoice_amount || 0), 0);
  const inspRevenue = weekSchedule.inspections
    .filter((e) => e.status === "completed" && e.invoice_amount)
    .reduce((sum, e) => sum + (e.invoice_amount || 0), 0);

  const newDirectLeads = directLeads.filter((l) => l.created_at >= weekStart).length;

  const newBrokers = brokers.filter((b) => b.created_at >= weekStart).length;

  return {
    hesCompleted,
    inspectionsCompleted,
    revenueThisWeek: hesRevenue + inspRevenue,
    newDirectLeads,
    newBrokerLeads: 0, // Would need broker leads query; use KPI data instead
    newBrokers,
  };
}

function buildRevenueStreams(revenue: RevenueBreakdown): RevenueStream[] {
  return [
    {
      label: "Broker Commissions",
      gross: revenue.broker_commissions,
      reiTake: Math.round(revenue.broker_commissions * 0.2),
      count: revenue.broker_lead_count,
    },
    {
      label: "In-House HES",
      gross: revenue.inhouse_hes_revenue,
      reiTake: Math.round(revenue.inhouse_hes_revenue * 0.8),
      count: revenue.inhouse_hes_count,
    },
    {
      label: "In-House Inspections",
      gross: revenue.inhouse_inspection_revenue,
      reiTake: Math.round(revenue.inhouse_inspection_revenue * 0.8),
      count: revenue.inhouse_inspection_count,
    },
    {
      label: "Partner Dispatch",
      gross: revenue.partner_dispatch_revenue,
      reiTake: Math.round(revenue.partner_dispatch_revenue * 0.3),
      count: revenue.partner_dispatch_count,
    },
  ];
}

async function fetchWeekSchedule(
  svc: AdminOpsService,
  weekStart: string,
  _today: string
): Promise<{ hes: HesScheduleEntry[]; inspections: InspectorScheduleEntry[] }> {
  const sunday = new Date(weekStart);
  sunday.setDate(sunday.getDate() + 6);
  const weekEnd = sunday.toISOString().slice(0, 10);

  const [hes, inspections] = await Promise.all([
    svc.getHesSchedule(weekStart, weekEnd).catch(() => [] as HesScheduleEntry[]),
    svc.getInspectorSchedule(weekStart, weekEnd).catch(() => [] as InspectorScheduleEntry[]),
  ]);

  return { hes, inspections };
}

async function fetchOpenProjectCount(): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from("admin_jobs")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "in_progress", "scheduled"]);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function fetchLastMonthRevenue(): Promise<number> {
  try {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data, error } = await supabaseAdmin
      .from("payments")
      .select("amount")
      .eq("status", "completed")
      .gte("created_at", lastMonthStart)
      .lt("created_at", thisMonthStart);

    if (error) return 0;
    return (data || []).reduce((sum, p) => sum + ((p as { amount: number }).amount || 0), 0);
  } catch {
    return 0;
  }
}
