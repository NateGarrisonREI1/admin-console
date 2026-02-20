// src/app/admin/schedule/data.ts
// Data-fetching logic for the Schedule page — NOT a "use server" module.
// Server actions (mutations) remain in actions.ts.

import { AdminOpsService } from "@/lib/services/AdminOpsService";
import type { HesScheduleEntry, InspectorScheduleEntry } from "@/types/admin-ops";

export type MemberType = "hes" | "inspector";

export type ScheduleJob = {
  id: string;
  type: MemberType;
  team_member_id: string | null;
  team_member_name: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  inspection_type: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  invoice_amount: number | null;
  special_notes: string | null;
  // Catalog fields
  service_category_id: string | null;
  service_tier_id: string | null;
  addon_ids: string[] | null;
  catalog_base_price: number | null;
  catalog_addon_total: number | null;
  catalog_total_price: number | null;
  service_name: string | null;
  tier_name: string | null;
  payment_status: string | null;
  created_at: string;
};

export type SchedulePageData = {
  jobs: ScheduleJob[];
  members: { id: string; name: string; type: MemberType }[];
  stats: {
    todayJobs: number;
    thisWeek: number;
    pendingRequests: number;
    completedThisMonth: number;
  };
};

// ─── Date helpers ───────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
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

// ─── Unify rows into ScheduleJob ────────────────────────────────

function unifyHes(row: HesScheduleEntry): ScheduleJob {
  return {
    id: row.id,
    type: "hes",
    team_member_id: row.team_member_id,
    team_member_name: row.team_member?.name ?? null,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    inspection_type: null,
    scheduled_date: row.scheduled_date,
    scheduled_time: row.scheduled_time,
    status: row.status,
    invoice_amount: row.invoice_amount,
    special_notes: row.special_notes,
    service_category_id: row.service_category_id ?? null,
    service_tier_id: row.service_tier_id ?? null,
    addon_ids: row.addon_ids ?? null,
    catalog_base_price: row.catalog_base_price ?? null,
    catalog_addon_total: row.catalog_addon_total ?? null,
    catalog_total_price: row.catalog_total_price ?? null,
    service_name: row.service_name ?? "HES Assessment",
    tier_name: row.tier_name ?? null,
    payment_status: row.payment_status ?? null,
    created_at: row.created_at,
  };
}

function unifyInsp(row: InspectorScheduleEntry): ScheduleJob {
  return {
    id: row.id,
    type: "inspector",
    team_member_id: row.team_member_id,
    team_member_name: (row as any).team_member?.name ?? null,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    inspection_type: row.inspection_type,
    scheduled_date: row.scheduled_date,
    scheduled_time: row.scheduled_time,
    status: row.status,
    invoice_amount: row.invoice_amount,
    special_notes: row.special_notes,
    service_category_id: row.service_category_id ?? null,
    service_tier_id: row.service_tier_id ?? null,
    addon_ids: row.addon_ids ?? null,
    catalog_base_price: row.catalog_base_price ?? null,
    catalog_addon_total: row.catalog_addon_total ?? null,
    catalog_total_price: row.catalog_total_price ?? null,
    service_name: row.service_name ?? "Home Inspection",
    tier_name: row.tier_name ?? null,
    payment_status: row.payment_status ?? null,
    created_at: row.created_at,
  };
}

// ─── Main data-fetching function ────────────────────────────────

export async function fetchScheduleData(): Promise<SchedulePageData> {
  const svc = new AdminOpsService();

  const [hesMembers, inspMembers, hesRows, inspRows] = await Promise.all([
    svc.getHesTeamMembers(),
    svc.getInspectorTeamMembers(),
    svc.getHesSchedule(),
    svc.getInspectorSchedule(),
  ]);

  const jobs: ScheduleJob[] = [
    ...hesRows.map(unifyHes),
    ...inspRows.map(unifyInsp),
  ].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  const members = [
    ...hesMembers.map((m) => ({ id: m.id, name: m.name, type: "hes" as MemberType })),
    ...inspMembers.map((m) => ({ id: m.id, name: m.name, type: "inspector" as MemberType })),
  ];

  const today = todayStr();
  const { monday, sunday } = getWeekBounds();
  const { monthStart, monthEnd } = getMonthBounds();

  const stats = {
    todayJobs: jobs.filter((j) => j.scheduled_date === today).length,
    thisWeek: jobs.filter((j) => j.scheduled_date >= monday && j.scheduled_date <= sunday).length,
    pendingRequests: jobs.filter((j) => j.status === "pending" || j.status === "scheduled").length,
    completedThisMonth: jobs.filter(
      (j) => j.status === "completed" && j.scheduled_date >= monthStart && j.scheduled_date <= monthEnd
    ).length,
  };

  return { jobs, members, stats };
}
