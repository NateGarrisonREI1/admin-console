// src/app/admin/team/actions.ts
"use server";

import { AdminOpsService } from "@/lib/services/AdminOpsService";
import type {
  HesTeamMember,
  HesScheduleEntry,
  InspectorTeamMember,
  InspectorScheduleEntry,
  TimeOffPeriod,
} from "@/types/admin-ops";

// ─── Unified Types ──────────────────────────────────────────────

export type MemberType = "hes" | "inspector";

export type UnifiedTeamMember = {
  id: string;
  type: MemberType;
  name: string;
  email: string | null;
  phone: string | null;
  certifications: string[];
  service_areas: string[];
  status: string;
  avg_rating: number;
  total_completed: number;
  license_number?: string | null;
  time_off: TimeOffPeriod[];
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type UnifiedScheduleEntry = {
  id: string;
  type: MemberType;
  team_member_id: string | null;
  team_member_name: string | null;
  customer_name: string;
  address: string | null;
  city: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  inspection_type?: string;
  invoice_amount: number | null;
  payment_status: string;
};

export type TeamPageData = {
  members: UnifiedTeamMember[];
  weekSchedule: UnifiedScheduleEntry[];
  stats: {
    total: number;
    availableToday: number;
    scheduledToday: number;
    thisWeekTotal: number;
  };
};

export type TeamMemberDetail = {
  member: UnifiedTeamMember;
  kpis: {
    jobsCompleted: number;
    thisMonth: number;
    revenueGenerated: number;
    avgRating: number;
  };
  upcomingJobs: UnifiedScheduleEntry[];
  jobHistory: UnifiedScheduleEntry[];
  weekSchedule: UnifiedScheduleEntry[];
};

// ─── Helpers ────────────────────────────────────────────────────

function getWeekBounds(refDate?: Date): { monday: string; sunday: string } {
  const now = refDate ?? new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { monday: mon.toISOString().slice(0, 10), sunday: sun.toISOString().slice(0, 10) };
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function unifyHes(m: HesTeamMember): UnifiedTeamMember {
  const raw = m as Record<string, unknown>;
  return {
    id: m.id,
    type: "hes",
    name: m.name,
    email: m.email,
    phone: m.phone,
    certifications: m.certifications,
    service_areas: m.service_areas,
    status: m.status,
    avg_rating: m.avg_rating,
    total_completed: m.total_completed,
    time_off: (Array.isArray(raw.time_off) ? raw.time_off : []) as TimeOffPeriod[],
    notes: m.notes,
    created_at: m.created_at,
    updated_at: m.updated_at,
  };
}

function unifyInspector(m: InspectorTeamMember): UnifiedTeamMember {
  const raw = m as Record<string, unknown>;
  return {
    id: m.id,
    type: "inspector",
    name: m.name,
    email: m.email,
    phone: m.phone,
    certifications: m.certifications,
    service_areas: m.service_areas,
    status: m.status,
    avg_rating: m.avg_rating,
    total_completed: m.total_completed,
    license_number: m.license_number,
    time_off: (Array.isArray(raw.time_off) ? raw.time_off : []) as TimeOffPeriod[],
    notes: m.notes,
    created_at: m.created_at,
    updated_at: m.updated_at,
  };
}

function unifyHesSchedule(e: HesScheduleEntry): UnifiedScheduleEntry {
  return {
    id: e.id,
    type: "hes",
    team_member_id: e.team_member_id,
    team_member_name: e.team_member?.name ?? null,
    customer_name: e.customer_name,
    address: e.address,
    city: e.city,
    scheduled_date: e.scheduled_date,
    scheduled_time: e.scheduled_time,
    status: e.status,
    invoice_amount: e.invoice_amount,
    payment_status: e.payment_status,
  };
}

function unifyInspSchedule(e: InspectorScheduleEntry): UnifiedScheduleEntry {
  return {
    id: e.id,
    type: "inspector",
    team_member_id: e.team_member_id,
    team_member_name: e.team_member?.name ?? null,
    customer_name: e.customer_name,
    address: e.address,
    city: e.city,
    scheduled_date: e.scheduled_date,
    scheduled_time: e.scheduled_time,
    status: e.status,
    inspection_type: e.inspection_type,
    invoice_amount: e.invoice_amount,
    payment_status: e.payment_status,
  };
}

function isOnTimeOff(periods: TimeOffPeriod[], date: string): boolean {
  return periods.some((p) => date >= p.start && date <= p.end);
}

// ─── Server Actions ─────────────────────────────────────────────

export async function fetchTeamData(): Promise<TeamPageData> {
  const svc = new AdminOpsService();
  const { monday, sunday } = getWeekBounds();
  const today = todayStr();

  const [hesMembers, inspMembers, hesSchedule, inspSchedule] = await Promise.all([
    svc.getHesTeamMembers(),
    svc.getInspectorTeamMembers(),
    svc.getHesSchedule(monday, sunday),
    svc.getInspectorSchedule(monday, sunday),
  ]);

  const members = [
    ...hesMembers.map(unifyHes),
    ...inspMembers.map(unifyInspector),
  ];

  const weekSchedule = [
    ...hesSchedule.map(unifyHesSchedule),
    ...inspSchedule.map(unifyInspSchedule),
  ];

  // Stats
  const activeMembers = members.filter((m) => m.status === "active");
  const todaySchedule = weekSchedule.filter((s) => s.scheduled_date === today && s.status !== "cancelled");

  // Available today: active, not on time-off today, and not fully booked (< 3 jobs today)
  const todayJobsByMember = new Map<string, number>();
  for (const s of todaySchedule) {
    if (s.team_member_id) {
      todayJobsByMember.set(s.team_member_id, (todayJobsByMember.get(s.team_member_id) ?? 0) + 1);
    }
  }
  const availableToday = activeMembers.filter((m) => {
    if (isOnTimeOff(m.time_off, today)) return false;
    const jobCount = todayJobsByMember.get(m.id) ?? 0;
    return jobCount < 3;
  }).length;

  return {
    members,
    weekSchedule,
    stats: {
      total: members.length,
      availableToday,
      scheduledToday: todaySchedule.length,
      thisWeekTotal: weekSchedule.filter((s) => s.status !== "cancelled").length,
    },
  };
}

export async function fetchTeamMemberDetail(
  id: string,
  type: MemberType
): Promise<TeamMemberDetail> {
  const svc = new AdminOpsService();
  const today = todayStr();
  const { monday, sunday } = getWeekBounds();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  if (type === "hes") {
    const [members, allSchedule, weekSched] = await Promise.all([
      svc.getHesTeamMembers(),
      svc.getHesSchedule(), // all schedule entries
      svc.getHesSchedule(monday, sunday),
    ]);
    const raw = members.find((m) => m.id === id);
    if (!raw) throw new Error("Team member not found");
    const member = unifyHes(raw);

    const mySchedule = allSchedule.filter((s) => s.team_member_id === id);
    const upcoming = mySchedule
      .filter((s) => s.scheduled_date >= today && s.status !== "cancelled" && s.status !== "completed")
      .slice(0, 10)
      .map(unifyHesSchedule);
    const history = mySchedule
      .filter((s) => s.status === "completed")
      .reverse()
      .slice(0, 20)
      .map(unifyHesSchedule);

    const thisMonthCompleted = mySchedule.filter(
      (s) => s.status === "completed" && s.completed_at && s.completed_at >= monthStart
    ).length;
    const revenueGenerated = mySchedule
      .filter((s) => s.status === "completed" && s.payment_status === "paid")
      .reduce((sum, s) => sum + (s.invoice_amount ?? 0), 0);

    const myWeek = weekSched.filter((s) => s.team_member_id === id).map(unifyHesSchedule);

    return {
      member,
      kpis: {
        jobsCompleted: member.total_completed,
        thisMonth: thisMonthCompleted,
        revenueGenerated,
        avgRating: member.avg_rating,
      },
      upcomingJobs: upcoming,
      jobHistory: history,
      weekSchedule: myWeek,
    };
  } else {
    const [members, allSchedule, weekSched] = await Promise.all([
      svc.getInspectorTeamMembers(),
      svc.getInspectorSchedule(),
      svc.getInspectorSchedule(monday, sunday),
    ]);
    const raw = members.find((m) => m.id === id);
    if (!raw) throw new Error("Team member not found");
    const member = unifyInspector(raw);

    const mySchedule = allSchedule.filter((s) => s.team_member_id === id);
    const upcoming = mySchedule
      .filter((s) => s.scheduled_date >= today && s.status !== "cancelled" && s.status !== "completed")
      .slice(0, 10)
      .map(unifyInspSchedule);
    const history = mySchedule
      .filter((s) => s.status === "completed")
      .reverse()
      .slice(0, 20)
      .map(unifyInspSchedule);

    const thisMonthCompleted = mySchedule.filter(
      (s) => s.status === "completed" && s.completed_at && s.completed_at >= monthStart
    ).length;
    const revenueGenerated = mySchedule
      .filter((s) => s.status === "completed" && s.payment_status === "paid")
      .reduce((sum, s) => sum + (s.invoice_amount ?? 0), 0);

    const myWeek = weekSched.filter((s) => s.team_member_id === id).map(unifyInspSchedule);

    return {
      member,
      kpis: {
        jobsCompleted: member.total_completed,
        thisMonth: thisMonthCompleted,
        revenueGenerated,
        avgRating: member.avg_rating,
      },
      upcomingJobs: upcoming,
      jobHistory: history,
      weekSchedule: myWeek,
    };
  }
}

export async function addTeamMember(input: {
  type: MemberType;
  name: string;
  email?: string;
  phone?: string;
  license_number?: string;
  certifications?: string[];
  service_areas?: string[];
}) {
  const svc = new AdminOpsService();
  if (input.type === "hes") {
    return svc.createHesTeamMember(input);
  } else {
    return svc.createInspectorTeamMember(input);
  }
}

export async function scheduleService(input: {
  type: MemberType;
  team_member_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  address?: string;
  city?: string;
  zip?: string;
  inspection_type?: string;
  scheduled_date: string;
  scheduled_time?: string;
  special_notes?: string;
  invoice_amount?: number;
}) {
  const svc = new AdminOpsService();
  if (input.type === "hes") {
    return svc.createHesSchedule(input);
  } else {
    return svc.createInspectorSchedule(input);
  }
}

export async function updateTeamMember(
  id: string,
  type: MemberType,
  updates: Record<string, unknown>
) {
  const svc = new AdminOpsService();
  if (type === "hes") {
    return svc.updateHesTeamMember(id, updates as Partial<HesTeamMember>);
  } else {
    return svc.updateInspectorTeamMember(id, updates as Partial<InspectorTeamMember>);
  }
}

export async function setTimeOff(
  id: string,
  type: MemberType,
  start: string,
  end: string,
  reason?: string
) {
  const svc = new AdminOpsService();
  // Fetch current time_off, then append
  let current: TimeOffPeriod[] = [];
  if (type === "hes") {
    const members = await svc.getHesTeamMembers();
    const m = members.find((m) => m.id === id);
    const raw = m as Record<string, unknown> | undefined;
    current = (Array.isArray(raw?.time_off) ? raw.time_off : []) as TimeOffPeriod[];
    const newPeriod: TimeOffPeriod = { start, end, ...(reason ? { reason } : {}) };
    await svc.setHesTimeOff(id, [...current, newPeriod]);
  } else {
    const members = await svc.getInspectorTeamMembers();
    const m = members.find((m) => m.id === id);
    const raw = m as Record<string, unknown> | undefined;
    current = (Array.isArray(raw?.time_off) ? raw.time_off : []) as TimeOffPeriod[];
    const newPeriod: TimeOffPeriod = { start, end, ...(reason ? { reason } : {}) };
    await svc.setInspectorTimeOff(id, [...current, newPeriod]);
  }
}

export async function clearTimeOff(id: string, type: MemberType, index: number) {
  const svc = new AdminOpsService();
  if (type === "hes") {
    const members = await svc.getHesTeamMembers();
    const m = members.find((m) => m.id === id);
    const raw = m as Record<string, unknown> | undefined;
    const current = (Array.isArray(raw?.time_off) ? raw.time_off : []) as TimeOffPeriod[];
    current.splice(index, 1);
    await svc.setHesTimeOff(id, current);
  } else {
    const members = await svc.getInspectorTeamMembers();
    const m = members.find((m) => m.id === id);
    const raw = m as Record<string, unknown> | undefined;
    const current = (Array.isArray(raw?.time_off) ? raw.time_off : []) as TimeOffPeriod[];
    current.splice(index, 1);
    await svc.setInspectorTimeOff(id, current);
  }
}

export async function fetchScheduleWeek(
  startDate: string
): Promise<UnifiedScheduleEntry[]> {
  const svc = new AdminOpsService();
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const endStr = end.toISOString().slice(0, 10);

  const [hes, insp] = await Promise.all([
    svc.getHesSchedule(startDate, endStr),
    svc.getInspectorSchedule(startDate, endStr),
  ]);

  return [
    ...hes.map(unifyHesSchedule),
    ...insp.map(unifyInspSchedule),
  ];
}

export async function fetchScheduleMonth(
  year: number,
  month: number
): Promise<{ date: string; hesCount: number; inspCount: number }[]> {
  const svc = new AdminOpsService();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10); // last day

  const [hes, insp] = await Promise.all([
    svc.getHesSchedule(startDate, endDate),
    svc.getInspectorSchedule(startDate, endDate),
  ]);

  const dayMap = new Map<string, { hesCount: number; inspCount: number }>();
  for (const e of hes) {
    if (e.status === "cancelled") continue;
    const d = e.scheduled_date;
    const cur = dayMap.get(d) ?? { hesCount: 0, inspCount: 0 };
    cur.hesCount++;
    dayMap.set(d, cur);
  }
  for (const e of insp) {
    if (e.status === "cancelled") continue;
    const d = e.scheduled_date;
    const cur = dayMap.get(d) ?? { hesCount: 0, inspCount: 0 };
    cur.inspCount++;
    dayMap.set(d, cur);
  }

  return Array.from(dayMap.entries())
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
