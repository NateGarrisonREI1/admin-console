// src/app/admin/team/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { AdminOpsService } from "@/lib/services/AdminOpsService";
import type {
  HesTeamMember,
  InspectorTeamMember,
  TimeOffPeriod,
} from "@/types/admin-ops";

// Re-export types so existing client imports from "./actions" still resolve
export type {
  MemberType,
  UnifiedTeamMember,
  UnifiedScheduleEntry,
  TeamPageData,
  TeamMemberDetail,
} from "./data";

import type { MemberType, UnifiedScheduleEntry } from "./data";
import { unifyHesSchedule, unifyInspSchedule } from "./data";

// ─── Mutations (server actions called from client components) ───

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
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

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

export async function disableTeamMember(id: string, type: MemberType) {
  const svc = new AdminOpsService();
  if (type === "hes") {
    await svc.updateHesTeamMember(id, { status: "inactive" } as Partial<HesTeamMember>);
  } else {
    await svc.updateInspectorTeamMember(id, { status: "inactive" } as Partial<InspectorTeamMember>);
  }
  revalidatePath("/admin/team");
}

export async function deleteTeamMember(id: string, type: MemberType) {
  const svc = new AdminOpsService();
  if (type === "hes") {
    await svc.deleteHesTeamMember(id);
  } else {
    await svc.deleteInspectorTeamMember(id);
  }
  revalidatePath("/admin/team");
}
