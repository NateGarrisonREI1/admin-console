"use server";

import { AdminOpsService } from "@/lib/services/AdminOpsService";
import type { InspectorTeamMember, InspectorScheduleEntry } from "@/types/admin-ops";

export type InspectorTeamPageData = {
  members: InspectorTeamMember[];
  schedule: InspectorScheduleEntry[];
};

export async function fetchInspectorTeamData(): Promise<InspectorTeamPageData> {
  const svc = new AdminOpsService();
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const [members, schedule] = await Promise.all([
    svc.getInspectorTeamMembers(),
    svc.getInspectorSchedule(monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)),
  ]);
  return { members, schedule };
}

export async function addInspectorMember(input: {
  name: string;
  email?: string;
  phone?: string;
  license_number?: string;
  certifications?: string[];
  service_areas?: string[];
}) {
  const svc = new AdminOpsService();
  return svc.createInspectorTeamMember(input);
}

export async function scheduleInspection(input: {
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
  return svc.createInspectorSchedule(input);
}

export async function updateInspectorEntry(id: string, updates: Record<string, unknown>) {
  const svc = new AdminOpsService();
  return svc.updateInspectorSchedule(id, updates);
}
