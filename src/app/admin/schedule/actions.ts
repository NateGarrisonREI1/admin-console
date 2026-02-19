// src/app/admin/schedule/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { AdminOpsService } from "@/lib/services/AdminOpsService";

export type MemberType = "hes" | "inspector";

// ─── Schedule a new service ─────────────────────────────────────────

export async function createScheduleJob(input: {
  type: MemberType;
  team_member_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  inspection_type?: string;
  scheduled_date: string;
  scheduled_time?: string;
  special_notes?: string;
  invoice_amount?: number;
}) {
  const svc = new AdminOpsService();
  if (input.type === "hes") {
    await svc.createHesSchedule(input);
  } else {
    await svc.createInspectorSchedule(input);
  }
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/team");
}

// ─── Cancel a job ───────────────────────────────────────────────────

export async function cancelScheduleJob(id: string, type: MemberType) {
  const svc = new AdminOpsService();
  if (type === "hes") {
    await svc.updateHesSchedule(id, { status: "cancelled" });
  } else {
    await svc.updateInspectorSchedule(id, { status: "cancelled" });
  }
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/team");
}

// ─── Update job status ──────────────────────────────────────────────

export async function updateScheduleJobStatus(
  id: string,
  type: MemberType,
  status: string
) {
  const svc = new AdminOpsService();
  if (type === "hes") {
    await svc.updateHesSchedule(id, { status });
  } else {
    await svc.updateInspectorSchedule(id, { status });
  }
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/team");
}

// ─── Reschedule a job (update date/time/member) ─────────────────

export async function rescheduleJob(
  id: string,
  type: MemberType,
  updates: {
    scheduled_date: string;
    scheduled_time?: string;
    team_member_id?: string;
  }
) {
  const svc = new AdminOpsService();
  const payload: Record<string, unknown> = {
    scheduled_date: updates.scheduled_date,
    status: "rescheduled",
  };
  if (updates.scheduled_time !== undefined) payload.scheduled_time = updates.scheduled_time;
  if (updates.team_member_id !== undefined) payload.team_member_id = updates.team_member_id || null;

  if (type === "hes") {
    await svc.updateHesSchedule(id, payload);
  } else {
    await svc.updateInspectorSchedule(id, payload);
  }
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/team");
}

// ─── Archive a job ──────────────────────────────────────────────────

export async function archiveScheduleJob(id: string, type: MemberType) {
  const svc = new AdminOpsService();
  if (type === "hes") {
    await svc.updateHesSchedule(id, { status: "archived" });
  } else {
    await svc.updateInspectorSchedule(id, { status: "archived" });
  }
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/team");
}

// ─── Delete a job (hard delete) ─────────────────────────────────────

export async function deleteScheduleJob(id: string, type: MemberType) {
  const svc = new AdminOpsService();
  if (type === "hes") {
    await svc.deleteHesSchedule(id);
  } else {
    await svc.deleteInspectorSchedule(id);
  }
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/team");
}
