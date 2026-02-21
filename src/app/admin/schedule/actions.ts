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

// ─── Admin HES Report Upload ────────────────────────────────────────

export async function uploadAdminHesReport(
  jobId: string,
  jobType: MemberType,
  formData: FormData,
): Promise<{ error?: string; url?: string }> {
  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided" };
  if (file.size > 25 * 1024 * 1024) return { error: "File too large (max 25 MB)" };
  if (!file.name.toLowerCase().endsWith(".pdf")) return { error: "Only PDF files accepted" };

  const table = jobType === "inspector" ? "inspector_schedule" : "hes_schedule";

  const storagePath = `reports/${jobType}/${jobId}/HES-Report.pdf`;

  const { error: uploadErr } = await supabaseAdmin.storage
    .from("job-files")
    .upload(storagePath, file, { contentType: "application/pdf", upsert: true });

  if (uploadErr) return { error: uploadErr.message };

  const { data: signed } = await supabaseAdmin.storage
    .from("job-files")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10);

  const url = signed?.signedUrl ?? "";

  await supabaseAdmin.from(table).update({ hes_report_url: url }).eq("id", jobId);

  await logJobActivity(
    jobId,
    "hes_report_uploaded",
    "Admin uploaded HES report PDF",
    { name: "Admin", role: "admin" },
    { filename: file.name, size_bytes: file.size },
    jobType,
  );

  revalidatePath("/admin/schedule");
  return { url };
}

// ─── Admin Remove HES Report ────────────────────────────────────────

export async function removeAdminHesReport(
  jobId: string,
  jobType: MemberType,
): Promise<{ error?: string }> {
  const table = jobType === "inspector" ? "inspector_schedule" : "hes_schedule";

  const storagePath = `reports/${jobType}/${jobId}/HES-Report.pdf`;
  await supabaseAdmin.storage.from("job-files").remove([storagePath]);
  await supabaseAdmin.from(table).update({ hes_report_url: null }).eq("id", jobId);

  await logJobActivity(
    jobId,
    "hes_report_removed",
    "Admin removed HES report",
    { name: "Admin", role: "admin" },
    {},
    jobType,
  );

  revalidatePath("/admin/schedule");
  return {};
}

// ─── Report delivery (modal-based) ──────────────────────────────────

export async function sendReportDelivery(params: {
  jobId: string;
  jobType: MemberType;
  leafTier: "none" | "basic";
  leafReportUrl: string | null;
  includeInvoice: boolean;
  invoiceAmount: number | null;
  includeReceipt: boolean;
  recipientEmails: string[];
  senderVariant: "admin" | "tech" | "broker";
}): Promise<{ error?: string }> {
  const table = params.jobType === "inspector" ? "inspector_schedule" : "hes_schedule";

  // Fetch job to validate
  const { data: job, error: fetchErr } = await supabaseAdmin
    .from(table)
    .select("customer_name, customer_email, address, city, state, zip, payment_status, hes_report_url, leaf_report_url, invoice_amount, broker_id, service_name, tier_name, requested_by, payer_name, payer_email")
    .eq("id", params.jobId)
    .single();

  if (fetchErr || !job) return { error: "Job not found" };
  if (!job.hes_report_url) return { error: "No HES report — upload before sending" };
  if (params.recipientEmails.length === 0) return { error: "No recipients selected" };

  const fullAddress = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");
  const serviceName = [job.service_name, job.tier_name].filter(Boolean).join(" — ") || (params.jobType === "inspector" ? "Home Inspection" : "Home Energy Assessment");
  const leafUrl = params.leafTier === "basic" ? (params.leafReportUrl || job.leaf_report_url || "") : "";

  const {
    sendReportDeliveryEmail,
    sendReportDeliveryBrokerEmail,
    sendReceiptWithReportsEmail,
    sendInvoiceEmail,
  } = await import("@/lib/services/EmailService");

  // Determine which emails to send
  const customerEmail = job.customer_email;
  const sendingToCustomer = customerEmail && params.recipientEmails.includes(customerEmail);
  const brokerEmail = job.payer_email && job.requested_by === "broker" ? job.payer_email : null;
  const sendingToBroker = brokerEmail && params.recipientEmails.includes(brokerEmail);

  // ── Send to homeowner ────────────────────────────────────────
  if (sendingToCustomer) {
    if (job.payment_status === "paid") {
      // Paid → receipt + reports
      const amount = job.invoice_amount ? Number(job.invoice_amount).toFixed(2) : "0.00";
      await sendReceiptWithReportsEmail({
        to: customerEmail,
        customerName: job.customer_name,
        amount,
        hesReportUrl: job.hes_report_url,
        leafReportUrl: leafUrl || `${process.env.NEXT_PUBLIC_APP_URL || ""}/report/${params.jobId}`,
        serviceName,
      });
    } else if (params.includeInvoice && params.invoiceAmount) {
      // Unpaid + invoice → send invoice with report link
      // First create a Stripe link or use placeholder
      await sendInvoiceEmail({
        to: customerEmail,
        customerName: job.customer_name,
        amount: params.invoiceAmount.toFixed(2),
        serviceName,
        paymentLink: `${process.env.NEXT_PUBLIC_APP_URL || ""}/pay/${params.jobId}`,
      });
    } else {
      // Free / complimentary
      await sendReportDeliveryEmail({
        to: customerEmail,
        customerName: job.customer_name,
        address: fullAddress,
        hesReportUrl: job.hes_report_url,
        leafReportUrl: leafUrl || `${process.env.NEXT_PUBLIC_APP_URL || ""}/report/${params.jobId}`,
        serviceName,
      });
    }
  }

  // ── Send broker copy (HES only, no LEAF) ────────────────────
  if (sendingToBroker && brokerEmail) {
    await sendReportDeliveryBrokerEmail({
      to: brokerEmail,
      brokerName: job.payer_name || "Broker",
      address: fullAddress,
      hesReportUrl: job.hes_report_url,
      homeownerName: job.customer_name,
      serviceName,
    });
  }

  // ── Update job record ────────────────────────────────────────
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    reports_sent_at: now,
    status: "delivered",
    delivered_by: params.senderVariant === "tech" ? "assessor" : params.senderVariant,
    leaf_tier: params.leafTier,
  };
  if (params.leafTier === "basic" && leafUrl) {
    updates.leaf_report_url = leafUrl;
  }
  if (params.includeInvoice && params.invoiceAmount) {
    updates.invoice_amount = params.invoiceAmount;
    updates.payment_status = "invoiced";
    updates.invoice_sent_at = now;
  }

  await supabaseAdmin.from(table).update(updates).eq("id", params.jobId);

  // ── Activity log ─────────────────────────────────────────────
  await logJobActivity(
    params.jobId,
    "reports_delivered",
    "Reports delivered via delivery modal",
    { name: "Admin", role: params.senderVariant },
    {
      leaf_tier: params.leafTier,
      leaf_report_url: leafUrl || null,
      include_invoice: params.includeInvoice,
      invoice_amount: params.invoiceAmount,
      recipients: params.recipientEmails,
      sender_variant: params.senderVariant,
    },
    params.jobType
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
