// src/app/admin/schedule/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { AdminOpsService } from "@/lib/services/AdminOpsService";
import { supabaseAdmin } from "@/lib/supabase/server";
import { fetchJobActivity, logJobActivity, type ActivityLogEntry } from "@/lib/activityLog";

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
  service_category_id?: string;
  service_tier_id?: string;
  addon_ids?: string[];
  catalog_base_price?: number;
  catalog_addon_total?: number;
  catalog_total_price?: number;
  service_name?: string;
  tier_name?: string;
}): Promise<{ error?: string }> {
  console.log("[createScheduleJob] input:", JSON.stringify(input, null, 2));
  try {
    const svc = new AdminOpsService();
    let created: any;
    if (input.type === "hes") {
      created = await svc.createHesSchedule(input);
    } else {
      created = await svc.createInspectorSchedule(input);
    }
    console.log("[createScheduleJob] created:", created?.id ?? "no id returned");

    // Log activity
    if (created?.id) {
      const serviceLine = [input.service_name, input.tier_name].filter(Boolean).join(" — ")
        || (input.type === "hes" ? "HES Assessment" : "Home Inspection");
      await logJobActivity(
        created.id,
        "job_created",
        `Job scheduled — ${input.customer_name}`,
        { name: "Admin", role: "admin" },
        {
          service: serviceLine,
          date: input.scheduled_date,
          time: input.scheduled_time,
          team_member_id: input.team_member_id,
        },
        input.type
      );
    }

    revalidatePath("/admin/schedule");
    revalidatePath("/admin/team");
    return {};
  } catch (err: any) {
    console.error("[createScheduleJob] ERROR:", err?.message ?? err);
    return { error: err?.message ?? "Unknown error creating schedule job" };
  }
}

// ─── Cancel a job ───────────────────────────────────────────────────

export async function cancelScheduleJob(id: string, type: MemberType) {
  const svc = new AdminOpsService();
  if (type === "hes") {
    await svc.updateHesSchedule(id, { status: "cancelled" });
  } else {
    await svc.updateInspectorSchedule(id, { status: "cancelled" });
  }

  await logJobActivity(id, "job_cancelled", "Job cancelled", { name: "Admin", role: "admin" }, undefined, type);

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

  await logJobActivity(
    id,
    `status_${status}`,
    `Status changed to ${status.replace(/_/g, " ")}`,
    { name: "Admin", role: "admin" },
    undefined,
    type
  );

  revalidatePath("/admin/schedule");
  revalidatePath("/admin/team");
}

// ─── Confirm pending job (set time, tech, amount, status → scheduled) ──

export async function confirmPendingJob(
  id: string,
  type: MemberType,
  scheduledDate: string,
  scheduledTime: string,
  teamMemberId: string,
  invoiceAmount: number | null,
  tierOverride?: { service_tier_id: string; tier_name: string; home_sqft_range: string; catalog_base_price: number }
) {
  const svc = new AdminOpsService();
  const updates: Record<string, unknown> = {
    status: "scheduled",
    scheduled_date: scheduledDate,
    scheduled_time: scheduledTime,
    team_member_id: teamMemberId,
  };
  if (invoiceAmount !== null) {
    updates.invoice_amount = invoiceAmount;
  }
  if (tierOverride) {
    updates.service_tier_id = tierOverride.service_tier_id;
    updates.tier_name = tierOverride.tier_name;
    updates.home_sqft_range = tierOverride.home_sqft_range;
    updates.catalog_base_price = tierOverride.catalog_base_price;
    updates.catalog_total_price = tierOverride.catalog_base_price + (updates.invoice_amount as number ?? 0 - tierOverride.catalog_base_price);
  }

  if (type === "hes") {
    await svc.updateHesSchedule(id, updates);
  } else {
    await svc.updateInspectorSchedule(id, updates);
  }

  await logJobActivity(
    id,
    "job_scheduled",
    "Job confirmed and scheduled",
    { name: "Admin", role: "admin" },
    { scheduled_date: scheduledDate, scheduled_time: scheduledTime, team_member_id: teamMemberId, invoice_amount: invoiceAmount },
    type
  );

  revalidatePath("/admin/schedule");
  revalidatePath("/admin/team");
}

// ─── Fetch team members by type ──────────────────────────────────

export async function getTeamMembersByType(
  type: MemberType
): Promise<{ id: string; name: string }[]> {
  const svc = new AdminOpsService();
  if (type === "hes") {
    const members = await svc.getHesTeamMembers();
    return members.map((m) => ({ id: m.id, name: m.name }));
  } else {
    const members = await svc.getInspectorTeamMembers();
    return members.map((m) => ({ id: m.id, name: m.name }));
  }
}

// ─── Reschedule a job (update date/time/member) ─────────────────

export async function rescheduleJob(
  id: string,
  type: MemberType,
  updates: {
    scheduled_date: string;
    scheduled_time?: string;
    team_member_id?: string;
    previous_member_id?: string;
    previous_member_name?: string;
    new_member_name?: string;
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

  // Build a human-readable date/time string for the title
  const dateObj = updates.scheduled_time
    ? new Date(`${updates.scheduled_date}T${updates.scheduled_time}`)
    : new Date(`${updates.scheduled_date}T12:00:00`);
  const formattedDate = dateObj.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(updates.scheduled_time
      ? { hour: "numeric", minute: "2-digit", hour12: true }
      : {}),
  });

  console.log(`[rescheduleJob] About to log activity for job ${id}, type=${type}, date=${formattedDate}`);
  await logJobActivity(
    id,
    "job_rescheduled",
    `Rescheduled to ${formattedDate}`,
    { name: "Admin", role: "admin" },
    { new_date: updates.scheduled_date, new_time: updates.scheduled_time, team_member_id: updates.team_member_id },
    type
  );

  // Log reassignment if the assigned member changed
  const memberChanged =
    (updates.previous_member_id ?? "") !== (updates.team_member_id ?? "");
  console.log(`[rescheduleJob] Member changed? ${memberChanged} (prev=${updates.previous_member_id}, new=${updates.team_member_id})`);
  if (memberChanged) {
    const fromName = updates.previous_member_name || "Unassigned";
    const toName = updates.new_member_name || "Unassigned";
    await logJobActivity(
      id,
      "job_reassigned",
      `Reassigned from ${fromName} to ${toName}`,
      { name: "Admin", role: "admin" },
      {
        previous_member_id: updates.previous_member_id,
        new_member_id: updates.team_member_id,
      },
      type
    );
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

  await logJobActivity(id, "job_archived", "Job archived", { name: "Admin", role: "admin" }, undefined, type);

  revalidatePath("/admin/schedule");
  revalidatePath("/admin/team");
}

// ─── Delete a job (hard delete) ─────────────────────────────────────

export async function deleteScheduleJob(id: string, type: MemberType) {
  // Log before deletion since the job won't exist after
  await logJobActivity(id, "job_deleted", "Job permanently deleted", { name: "Admin", role: "admin" }, undefined, type);

  const svc = new AdminOpsService();
  if (type === "hes") {
    await svc.deleteHesSchedule(id);
  } else {
    await svc.deleteInspectorSchedule(id);
  }
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/team");
}

// ─── Update customer info (name, email, phone) ─────────────────────

export async function updateJobCustomerInfo(
  id: string,
  type: MemberType,
  field: "customer_name" | "customer_email" | "customer_phone",
  value: string
) {
  const svc = new AdminOpsService();
  if (type === "hes") {
    await svc.updateHesSchedule(id, { [field]: value || null });
  } else {
    await svc.updateInspectorSchedule(id, { [field]: value || null });
  }

  const labels: Record<string, string> = {
    customer_name: "Customer name",
    customer_email: "Customer email",
    customer_phone: "Customer phone",
  };

  await logJobActivity(
    id,
    "customer_info_updated",
    `${labels[field]} updated to ${value || "(cleared)"}`,
    { name: "Admin", role: "admin" },
    { field, value },
    type
  );

  revalidatePath("/admin/schedule");
}

// ─── Update a single job field (generic) ─────────────────────────────

const ALLOWED_JOB_FIELDS = new Set([
  "payer_type", "payer_email", "payer_name", "requested_by",
  "hes_report_url", "leaf_report_url",
  "payment_status", "status",
]);

export async function updateJobField(
  id: string,
  type: MemberType,
  field: string,
  value: string | null
) {
  if (!ALLOWED_JOB_FIELDS.has(field)) {
    throw new Error(`Field "${field}" is not allowed.`);
  }

  const svc = new AdminOpsService();
  if (type === "hes") {
    await svc.updateHesSchedule(id, { [field]: value || null });
  } else {
    await svc.updateInspectorSchedule(id, { [field]: value || null });
  }

  const label = field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  await logJobActivity(
    id,
    "field_updated",
    `${label} updated to ${value || "(cleared)"}`,
    { name: "Admin", role: "admin" },
    { field, value },
    type
  );

  revalidatePath("/admin/schedule");
}

// ─── Send reports (deliver to homeowner + broker) ──────────────────

export async function sendReportsAction(
  jobId: string,
  jobType: MemberType
): Promise<{ error?: string }> {
  const table = jobType === "inspector" ? "inspector_schedule" : "hes_schedule";

  // Verify prerequisites
  const { data: job } = await supabaseAdmin
    .from(table)
    .select("payment_status, hes_report_url")
    .eq("id", jobId)
    .single();

  if (!job) return { error: "Job not found" };
  if (job.payment_status !== "paid") return { error: "Payment must be confirmed before sending reports" };
  if (!job.hes_report_url) return { error: "HES report URL must be set before sending reports" };

  const { deliverReports } = await import("@/lib/services/EmailService");
  const result = await deliverReports(jobId, jobType);
  if (result.error) return result;

  await logJobActivity(
    jobId,
    "reports_delivered",
    "Reports delivered to homeowner",
    { name: "Admin", role: "admin" },
    undefined,
    jobType
  );

  revalidatePath("/admin/schedule");
  revalidatePath("/admin/team");
  return {};
}

// ─── Activity Log ──────────────────────────────────────────────────

export async function getJobActivityLog(
  jobId: string
): Promise<ActivityLogEntry[]> {
  return fetchJobActivity(jobId);
}
