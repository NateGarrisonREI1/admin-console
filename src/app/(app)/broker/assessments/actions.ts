"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { BrokerService } from "@/lib/services/BrokerService";
import { logJobActivity } from "@/lib/activityLog";

// ─── Types ────────────────────────────────────────────────────────

export type BrokerScheduleJob = {
  id: string;
  type: "hes" | "inspector";
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  service_name: string | null;
  tier_name: string | null;
  scheduled_date: string;
  status: string;
  network_status: string | null;
  hes_report_url: string | null;
  leaf_report_url: string | null;
  leaf_tier: string | null;
  delivered_by: string | null;
  reports_sent_at: string | null;
  external_assessor_name: string | null;
  external_assessor_company: string | null;
  external_assessor_email: string | null;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────

async function getBroker() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;
  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(userId);
  return broker;
}

// ─── Existing actions ─────────────────────────────────────────────

export async function fetchAssessments() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(userId);
  const assessments = await svc.getAssessments(broker.id);
  return { broker, assessments };
}

export async function createAssessment(input: {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(userId);
  await svc.createAssessment({ broker_id: broker.id, ...input });
}

// ─── Fetch broker's out-of-network schedule jobs ──────────────────

const SCHEDULE_COLS = `id, customer_name, customer_email, customer_phone, address, city, state, zip,
  service_name, tier_name, scheduled_date, status, network_status,
  hes_report_url, leaf_report_url, leaf_tier, delivered_by, reports_sent_at,
  external_assessor_name, external_assessor_company, external_assessor_email, created_at`;

export async function fetchBrokerScheduleJobs(): Promise<BrokerScheduleJob[]> {
  const broker = await getBroker();
  if (!broker) return [];

  const [{ data: hes }, { data: insp }] = await Promise.all([
    supabaseAdmin
      .from("hes_schedule")
      .select(SCHEDULE_COLS)
      .eq("broker_id", broker.id)
      .eq("network_status", "out_of_network")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("inspector_schedule")
      .select(SCHEDULE_COLS)
      .eq("broker_id", broker.id)
      .eq("network_status", "out_of_network")
      .order("created_at", { ascending: false }),
  ]);

  const jobs: BrokerScheduleJob[] = [
    ...(hes ?? []).map((r: any) => ({ ...r, type: "hes" as const })),
    ...(insp ?? []).map((r: any) => ({ ...r, type: "inspector" as const })),
  ];
  jobs.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return jobs;
}

// ─── Log Out-of-Network Job ──────────────────────────────────────

export async function logOutOfNetworkJob(input: {
  serviceType: "hes" | "inspector";
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  scheduled_date: string;
  external_assessor_name: string;
  external_assessor_company?: string;
  external_assessor_email?: string;
}): Promise<{ error?: string; jobId?: string }> {
  const broker = await getBroker();
  if (!broker) return { error: "Not authenticated" };

  const table = input.serviceType === "inspector" ? "inspector_schedule" : "hes_schedule";

  const row: Record<string, unknown> = {
    customer_name: input.customer_name,
    customer_email: input.customer_email || null,
    customer_phone: input.customer_phone || null,
    address: input.address,
    city: input.city,
    state: input.state,
    zip: input.zip,
    scheduled_date: input.scheduled_date,
    status: "pending_delivery",
    network_status: "out_of_network",
    requested_by: "broker",
    broker_id: broker.id,
    payer_name: broker.company_name || broker.email || "Broker",
    payer_email: broker.email,
    payer_type: "broker",
    payment_status: "unpaid",
    external_assessor_name: input.external_assessor_name,
    external_assessor_company: input.external_assessor_company || null,
    external_assessor_email: input.external_assessor_email || null,
    service_name: input.serviceType === "inspector" ? "Home Inspection" : "HES Assessment",
  };

  const { data, error } = await supabaseAdmin
    .from(table)
    .insert(row)
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logJobActivity(
    data.id,
    "out_of_network_job_logged",
    "Broker logged out-of-network job",
    { name: broker.company_name || "Broker", role: "broker" },
    {
      network_status: "out_of_network",
      external_assessor: input.external_assessor_name,
      external_company: input.external_assessor_company || null,
    },
    input.serviceType,
  );

  revalidatePath("/broker/assessments");
  return { jobId: data.id };
}

// ─── Upload HES Report PDF ───────────────────────────────────────

export async function uploadHesReport(
  jobId: string,
  jobType: "hes" | "inspector",
  formData: FormData,
): Promise<{ error?: string; url?: string }> {
  const broker = await getBroker();
  if (!broker) return { error: "Not authenticated" };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided" };
  if (file.size > 25 * 1024 * 1024) return { error: "File too large (max 25MB)" };
  if (!file.name.toLowerCase().endsWith(".pdf")) return { error: "Only PDF files accepted" };

  const table = jobType === "inspector" ? "inspector_schedule" : "hes_schedule";

  // Verify broker owns this job
  const { data: job } = await supabaseAdmin
    .from(table)
    .select("id, broker_id")
    .eq("id", jobId)
    .single();
  if (!job || job.broker_id !== broker.id) return { error: "Job not found" };

  const storagePath = `reports/${jobType}/${jobId}/HES-Report.pdf`;

  const { error: uploadErr } = await supabaseAdmin.storage
    .from("job-files")
    .upload(storagePath, file, { contentType: "application/pdf", upsert: true });

  if (uploadErr) return { error: uploadErr.message };

  // Create signed URL (long-lived: 10 years)
  const { data: signed } = await supabaseAdmin.storage
    .from("job-files")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10);

  const url = signed?.signedUrl ?? "";

  // Save to job record
  await supabaseAdmin.from(table).update({ hes_report_url: url }).eq("id", jobId);

  await logJobActivity(
    jobId,
    "hes_report_uploaded",
    "Broker uploaded HES report PDF",
    { name: broker.company_name || "Broker", role: "broker" },
    { filename: file.name, size_bytes: file.size },
    jobType,
  );

  revalidatePath("/broker/assessments");
  return { url };
}

// ─── Remove uploaded HES report ──────────────────────────────────

export async function removeHesReport(
  jobId: string,
  jobType: "hes" | "inspector",
): Promise<{ error?: string }> {
  const broker = await getBroker();
  if (!broker) return { error: "Not authenticated" };

  const table = jobType === "inspector" ? "inspector_schedule" : "hes_schedule";

  const { data: job } = await supabaseAdmin
    .from(table)
    .select("id, broker_id")
    .eq("id", jobId)
    .single();
  if (!job || job.broker_id !== broker.id) return { error: "Job not found" };

  const storagePath = `reports/${jobType}/${jobId}/HES-Report.pdf`;
  await supabaseAdmin.storage.from("job-files").remove([storagePath]);
  await supabaseAdmin.from(table).update({ hes_report_url: null }).eq("id", jobId);

  revalidatePath("/broker/assessments");
  return {};
}

// ─── Send Broker Delivery ─────────────────────────────────────────

export async function sendBrokerDelivery(params: {
  jobId: string;
  jobType: "hes" | "inspector";
  leafTier: "none" | "basic";
  recipientEmail: string;
}): Promise<{ error?: string }> {
  const broker = await getBroker();
  if (!broker) return { error: "Not authenticated" };

  const table = params.jobType === "inspector" ? "inspector_schedule" : "hes_schedule";

  // Fetch job
  const { data: job, error: fetchErr } = await supabaseAdmin
    .from(table)
    .select("id, broker_id, customer_name, customer_email, address, city, state, zip, hes_report_url, service_name, status")
    .eq("id", params.jobId)
    .single();

  if (fetchErr || !job) return { error: "Job not found" };
  if (job.broker_id !== broker.id) return { error: "Not authorized" };
  if (!job.hes_report_url) return { error: "Upload HES report first" };

  const fullAddress = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");
  const serviceName = job.service_name || (params.jobType === "inspector" ? "Home Inspection" : "Home Energy Assessment");

  // ── LEAF link generation ──
  let leafUrl = "";
  if (params.leafTier === "basic") {
    // Check intake_sessions for existing session
    const { data: session } = await supabaseAdmin
      .from("intake_sessions")
      .select("id")
      .eq("email", params.recipientEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (session) {
      leafUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://leafenergy.app"}/report/${session.id}`;
    } else {
      // Create new intake session
      const { data: newSession } = await supabaseAdmin
        .from("intake_sessions")
        .insert({
          name: job.customer_name,
          email: params.recipientEmail,
          address: job.address,
          city: job.city,
          state: job.state,
          zip: job.zip,
          originating_user_type: "broker",
          originating_broker_id: broker.id,
          originating_job_id: params.jobId,
          sent_via: "delivery_panel",
        })
        .select("id")
        .single();

      if (newSession) {
        leafUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://leafenergy.app"}/report/${newSession.id}`;
      }
    }
  }

  // ── Build LEAF section HTML ──
  const leafSection = params.leafTier === "basic" && leafUrl
    ? `<div style="margin:24px 0;padding:20px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:12px;">
        <p style="color:#10b981;font-weight:700;font-size:15px;margin:0 0 8px;">Your LEAF Energy Report</p>
        <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 12px;">Explore your home's energy profile and discover personalized savings opportunities:</p>
        <a href="${leafUrl}" style="display:inline-block;padding:10px 20px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View LEAF Report</a>
       </div>`
    : "";

  // ── Send email ──
  const { getTemplateHtml, sendEmail } = await import("@/lib/services/EmailService");

  const tpl = await getTemplateHtml("report_delivery_broker_sent", {
    customer_name: job.customer_name,
    broker_name: broker.company_name || broker.email || "Your Broker",
    broker_company: broker.company_name || "",
    hes_report_url: job.hes_report_url,
    leaf_report_url: leafUrl,
    leaf_section: leafSection,
  });

  const fallbackHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 24px;text-align:center;border-bottom:2px solid #10b981;">
        <h1 style="color:#f1f5f9;font-size:24px;font-weight:700;margin:0;">Your Home Energy Report</h1>
      </div>
      <div style="padding:32px 24px;">
        <p style="color:#e2e8f0;font-size:15px;margin:0 0 20px;">Hi ${job.customer_name},</p>
        <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;">Your Home Energy Score report for <strong style="color:#e2e8f0;">${fullAddress}</strong> is ready to view.</p>
        <div style="text-align:center;margin:0 0 16px;">
          <a href="${job.hes_report_url}" style="display:inline-block;padding:14px 28px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View HES Report</a>
        </div>
        ${leafSection}
        <p style="color:#64748b;font-size:12px;margin:24px 0 0;text-align:center;">Sent by ${broker.company_name || "your broker"} via LEAF Energy</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: params.recipientEmail,
    subject: tpl?.subject ?? `Your ${serviceName} Report — ${fullAddress}`,
    html: tpl?.html ?? fallbackHtml,
  });

  // ── Update job record ──
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: "delivered",
    delivered_by: "broker",
    leaf_tier: params.leafTier,
    reports_sent_at: now,
  };
  if (params.leafTier === "basic" && leafUrl) {
    updates.leaf_report_url = leafUrl;
  }

  await supabaseAdmin.from(table).update(updates).eq("id", params.jobId);

  // ── Stamp intake session if exists ──
  if (params.leafTier === "basic" && leafUrl) {
    await supabaseAdmin
      .from("intake_sessions")
      .update({
        originating_user_type: "broker",
        originating_broker_id: broker.id,
        originating_job_id: params.jobId,
        sent_via: "delivery_panel",
        sent_at: now,
      })
      .eq("email", params.recipientEmail)
      .order("created_at", { ascending: false })
      .limit(1);
  }

  // ── Activity log ──
  await logJobActivity(
    params.jobId,
    "broker_delivered_reports",
    "Broker delivered reports to homeowner",
    { name: broker.company_name || "Broker", role: "broker" },
    {
      leaf_tier: params.leafTier,
      leaf_report_url: leafUrl || null,
      recipient_email: params.recipientEmail,
      broker_id: broker.id,
    },
    params.jobType,
  );

  revalidatePath("/broker/assessments");
  return {};
}
