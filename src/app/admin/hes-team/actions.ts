// src/app/admin/hes-team/actions.ts
"use server";

import { AdminOpsService } from "@/lib/services/AdminOpsService";
import type { HesTeamMember, HesScheduleEntry } from "@/types/admin-ops";

export type HesTeamPageData = {
  members: HesTeamMember[];
  schedule: HesScheduleEntry[];
};

export async function fetchHesTeamData(): Promise<HesTeamPageData> {
  const svc = new AdminOpsService();
  // Get current week Mon-Sun
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const [members, schedule] = await Promise.all([
    svc.getHesTeamMembers(),
    svc.getHesSchedule(monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)),
  ]);
  return { members, schedule };
}

export async function addHesTeamMember(input: {
  name: string;
  email?: string;
  phone?: string;
  certifications?: string[];
  service_areas?: string[];
}) {
  const svc = new AdminOpsService();
  return svc.createHesTeamMember(input);
}

export async function scheduleHesAssessment(input: {
  team_member_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  address?: string;
  city?: string;
  zip?: string;
  scheduled_date: string;
  scheduled_time?: string;
  special_notes?: string;
  invoice_amount?: number;
}) {
  const svc = new AdminOpsService();
  return svc.createHesSchedule(input);
}

export async function updateScheduleEntry(id: string, updates: Record<string, unknown>) {
  const svc = new AdminOpsService();
  return svc.updateHesSchedule(id, updates);
}
