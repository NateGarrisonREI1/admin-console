"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { logJobActivity, fetchJobActivity, type ActivityLogEntry } from "@/lib/activityLog";

// ─── Auth helper ────────────────────────────────────────────────────

async function requirePortalUser(): Promise<{ id: string; role: string }> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated.");

  const { data: prof } = await supabase
    .from("app_profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  const role = prof?.role || "homeowner";
  return { id: data.user.id, role };
}

// ─── Types ──────────────────────────────────────────────────────────

export type PortalUser = {
  id: string;
  role: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  settings: PortalSettings;
};

export type PortalSettings = {
  company_name: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_logo_url: string | null;
  invoice_reply_email: string | null;
  invoice_footer_text: string | null;
  schedule_start_time: string;
  schedule_end_time: string;
  notification_new_job: boolean;
  notification_reschedule: boolean;
  notification_payment: boolean;
};

const DEFAULT_SETTINGS: PortalSettings = {
  company_name: null,
  company_address: null,
  company_phone: null,
  company_logo_url: null,
  invoice_reply_email: null,
  invoice_footer_text: null,
  schedule_start_time: "08:00",
  schedule_end_time: "17:00",
  notification_new_job: true,
  notification_reschedule: true,
  notification_payment: true,
};

// ─── Queries ────────────────────────────────────────────────────────

export async function getPortalUser(): Promise<PortalUser> {
  const { id } = await requirePortalUser();

  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("id, role, full_name, email, phone")
    .eq("id", id)
    .single();

  if (!profile) throw new Error("Profile not found.");

  const { data: settings } = await supabaseAdmin
    .from("portal_user_settings")
    .select("*")
    .eq("user_id", id)
    .maybeSingle();

  return {
    id: profile.id,
    role: profile.role || "homeowner",
    full_name: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    settings: settings
      ? {
          company_name: settings.company_name,
          company_address: settings.company_address,
          company_phone: settings.company_phone,
          company_logo_url: settings.company_logo_url,
          invoice_reply_email: settings.invoice_reply_email,
          invoice_footer_text: settings.invoice_footer_text,
          schedule_start_time: settings.schedule_start_time || "08:00",
          schedule_end_time: settings.schedule_end_time || "17:00",
          notification_new_job: settings.notification_new_job ?? true,
          notification_reschedule: settings.notification_reschedule ?? true,
          notification_payment: settings.notification_payment ?? true,
        }
      : DEFAULT_SETTINGS,
  };
}

// ─── Schedule Types ─────────────────────────────────────────────────

export type PortalScheduleJob = {
  id: string;
  type: "hes" | "inspector";
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  invoice_amount: number | null;
  special_notes: string | null;
  service_name: string | null;
  tier_name: string | null;
  catalog_total_price: number | null;
  payment_status: string | null;
  payment_id: string | null;
};

// ─── Schedule Queries ───────────────────────────────────────────────

async function findTeamMemberIds(
  userEmail: string
): Promise<{ hesIds: string[]; inspIds: string[] }> {
  const [hesRes, inspRes] = await Promise.all([
    supabaseAdmin
      .from("hes_team_members")
      .select("id")
      .eq("email", userEmail),
    supabaseAdmin
      .from("inspector_team_members")
      .select("id")
      .eq("email", userEmail),
  ]);
  return {
    hesIds: (hesRes.data ?? []).map((r: any) => r.id),
    inspIds: (inspRes.data ?? []).map((r: any) => r.id),
  };
}

// ─── Ownership check ────────────────────────────────────────────────

async function verifyJobOwnership(
  jobId: string,
  userEmail: string
): Promise<{ owned: boolean; jobType: "hes" | "inspector" }> {
  const { hesIds, inspIds } = await findTeamMemberIds(userEmail);

  // Check hes_schedule
  if (hesIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("hes_schedule")
      .select("id")
      .eq("id", jobId)
      .in("team_member_id", hesIds)
      .maybeSingle();
    if (data) return { owned: true, jobType: "hes" };
  }

  // Check inspector_schedule
  if (inspIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("inspector_schedule")
      .select("id")
      .eq("id", jobId)
      .in("team_member_id", inspIds)
      .maybeSingle();
    if (data) return { owned: true, jobType: "inspector" };
  }

  return { owned: false, jobType: "hes" };
}

function mapScheduleRow(
  row: any,
  type: "hes" | "inspector"
): PortalScheduleJob {
  return {
    id: row.id,
    type,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    address: row.address,
    city: row.city,
    state: row.state ?? "OR",
    zip: row.zip,
    scheduled_date: row.scheduled_date,
    scheduled_time: row.scheduled_time,
    status: row.status,
    invoice_amount: row.invoice_amount,
    special_notes: row.special_notes,
    service_name: row.service_name ?? (type === "hes" ? "HES Assessment" : "Home Inspection"),
    tier_name: row.tier_name,
    catalog_total_price: row.catalog_total_price,
    payment_status: row.payment_status ?? null,
    payment_id: row.payment_id ?? null,
  };
}

export async function fetchTechSchedule(
  date: string
): Promise<PortalScheduleJob[]> {
  console.log("\n========== fetchTechSchedule DEBUG ==========");
  console.log("[fetchTechSchedule] date param received:", date);
  console.log("[fetchTechSchedule] server Date.now():", new Date().toISOString());
  console.log("[fetchTechSchedule] server 'today' (UTC):", new Date().toISOString().slice(0, 10));

  const { id } = await requirePortalUser();
  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("email")
    .eq("id", id)
    .single();

  console.log("[fetchTechSchedule] auth user id:", id);
  console.log("[fetchTechSchedule] profile email:", profile?.email ?? "NOT FOUND");

  if (!profile?.email) {
    console.log("[fetchTechSchedule] EARLY EXIT: no email on profile");
    return [];
  }

  const { hesIds, inspIds } = await findTeamMemberIds(profile.email);
  console.log("[fetchTechSchedule] hesIds found:", hesIds);
  console.log("[fetchTechSchedule] inspIds found:", inspIds);

  if (hesIds.length === 0 && inspIds.length === 0) {
    console.log("[fetchTechSchedule] EARLY EXIT: no team member IDs found for email", profile.email);
    console.log("========== END fetchTechSchedule DEBUG ==========\n");
    return [];
  }

  const jobs: PortalScheduleJob[] = [];

  if (hesIds.length > 0) {
    // First: query WITHOUT date filter to see ALL jobs for this tech
    const { data: allJobs, error: allErr } = await supabaseAdmin
      .from("hes_schedule")
      .select("id, scheduled_date, scheduled_time, status, team_member_id, customer_name")
      .in("team_member_id", hesIds)
      .not("status", "in", '("cancelled","archived")')
      .order("scheduled_date", { ascending: true })
      .limit(20);
    console.log("[fetchTechSchedule] ALL hes_schedule jobs for this tech (up to 20):");
    console.log(JSON.stringify(allJobs, null, 2));
    if (allErr) console.log("[fetchTechSchedule] allJobs error:", allErr.message);

    // Now the actual filtered query
    const { data, error } = await supabaseAdmin
      .from("hes_schedule")
      .select("*")
      .in("team_member_id", hesIds)
      .eq("scheduled_date", date)
      .not("status", "in", '("cancelled","archived")')
      .order("scheduled_time", { ascending: true });

    console.log("[fetchTechSchedule] hes_schedule query for date", date, "→ rows:", data?.length ?? 0);
    if (error) console.log("[fetchTechSchedule] hes_schedule error:", error.message);
    if (data && data.length > 0) {
      console.log("[fetchTechSchedule] hes_schedule first row sample:", JSON.stringify(data[0], null, 2));
    }

    if (data) jobs.push(...data.map((r: any) => mapScheduleRow(r, "hes")));
  }

  if (inspIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("inspector_schedule")
      .select("*")
      .in("team_member_id", inspIds)
      .eq("scheduled_date", date)
      .not("status", "in", '("cancelled","archived")')
      .order("scheduled_time", { ascending: true });

    console.log("[fetchTechSchedule] inspector_schedule query for date", date, "→ rows:", data?.length ?? 0);
    if (error) console.log("[fetchTechSchedule] inspector_schedule error:", error.message);

    if (data)
      jobs.push(...data.map((r: any) => mapScheduleRow(r, "inspector")));
  }

  // Sort by time
  jobs.sort((a, b) => (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? ""));
  console.log("[fetchTechSchedule] total jobs returned:", jobs.length);
  console.log("========== END fetchTechSchedule DEBUG ==========\n");
  return jobs;
}

export async function fetchTechWeekSchedule(
  weekStartDate: string
): Promise<PortalScheduleJob[]> {
  const { id } = await requirePortalUser();
  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("email")
    .eq("id", id)
    .single();
  if (!profile?.email) return [];

  const start = new Date(weekStartDate + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const endStr = end.toISOString().slice(0, 10);

  const { hesIds, inspIds } = await findTeamMemberIds(profile.email);
  const jobs: PortalScheduleJob[] = [];

  if (hesIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("hes_schedule")
      .select("*")
      .in("team_member_id", hesIds)
      .gte("scheduled_date", weekStartDate)
      .lte("scheduled_date", endStr)
      .not("status", "in", '("cancelled","archived")')
      .order("scheduled_date")
      .order("scheduled_time", { ascending: true });
    if (data) jobs.push(...data.map((r: any) => mapScheduleRow(r, "hes")));
  }

  if (inspIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("inspector_schedule")
      .select("*")
      .in("team_member_id", inspIds)
      .gte("scheduled_date", weekStartDate)
      .lte("scheduled_date", endStr)
      .not("status", "in", '("cancelled","archived")')
      .order("scheduled_date")
      .order("scheduled_time", { ascending: true });
    if (data)
      jobs.push(...data.map((r: any) => mapScheduleRow(r, "inspector")));
  }

  jobs.sort(
    (a, b) =>
      a.scheduled_date.localeCompare(b.scheduled_date) ||
      (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? "")
  );
  return jobs;
}

// ─── Mutations ──────────────────────────────────────────────────────

export async function updateProfile(data: {
  full_name?: string;
  phone?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { id } = await requirePortalUser();
    const { error } = await supabaseAdmin
      .from("app_profiles")
      .update(data)
      .eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/portal/settings");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updatePortalSettings(data: {
  company_name?: string | null;
  company_address?: string | null;
  company_phone?: string | null;
  invoice_reply_email?: string | null;
  invoice_footer_text?: string | null;
  schedule_start_time?: string;
  schedule_end_time?: string;
  notification_new_job?: boolean;
  notification_reschedule?: boolean;
  notification_payment?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { id } = await requirePortalUser();
    const { error } = await supabaseAdmin
      .from("portal_user_settings")
      .upsert(
        { user_id: id, ...data, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    if (error) return { success: false, error: error.message };
    revalidatePath("/portal/settings");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ─── Job Detail Types ──────────────────────────────────────────────

export type PortalJobDetail = PortalScheduleJob & {
  team_member_name: string | null;
  tech_en_route_at: string | null;
  tech_arrived_at: string | null;
  job_started_at: string | null;
  job_completed_at: string | null;
  payment_received_at: string | null;
  leaf_delivery_status: string | null;
  stripe_checkout_session_id: string | null;
  checkout_url: string | null;
};

// ─── Fetch all tech jobs (for Jobs list page) ─────────────────────

export async function fetchTechJobs(
  filter?: "upcoming" | "in_progress" | "completed"
): Promise<PortalScheduleJob[]> {
  const { id } = await requirePortalUser();
  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("email")
    .eq("id", id)
    .single();
  if (!profile?.email) return [];

  const { hesIds, inspIds } = await findTeamMemberIds(profile.email);
  const jobs: PortalScheduleJob[] = [];

  const statusFilter = filter === "upcoming"
    ? ["scheduled", "pending", "confirmed", "rescheduled"]
    : filter === "in_progress"
    ? ["en_route", "on_site", "in_progress"]
    : filter === "completed"
    ? ["completed"]
    : null;

  async function queryTable(table: string, ids: string[], type: "hes" | "inspector") {
    if (ids.length === 0) return;
    let query = supabaseAdmin
      .from(table)
      .select("*")
      .in("team_member_id", ids)
      .not("status", "in", '("cancelled","archived")');

    if (statusFilter) {
      query = query.in("status", statusFilter);
    }

    query = query.order("scheduled_date", { ascending: filter === "completed" ? false : true })
      .order("scheduled_time", { ascending: true });

    const { data } = await query;
    if (data) jobs.push(...data.map((r: any) => mapScheduleRow(r, type)));
  }

  await Promise.all([
    queryTable("hes_schedule", hesIds, "hes"),
    queryTable("inspector_schedule", inspIds, "inspector"),
  ]);

  // Sort
  if (filter === "completed") {
    jobs.sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date) || (b.scheduled_time ?? "").localeCompare(a.scheduled_time ?? ""));
  } else {
    jobs.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date) || (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? ""));
  }
  return jobs;
}

// ─── Fetch single job detail ──────────────────────────────────────

export async function fetchJobDetail(
  jobId: string
): Promise<PortalJobDetail | null> {
  const { id } = await requirePortalUser();
  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("email, role")
    .eq("id", id)
    .single();

  // Admins can see any job; non-admins must own it
  const isAdmin = profile?.role === "admin";

  if (!isAdmin && profile?.email) {
    const { owned } = await verifyJobOwnership(jobId, profile.email);
    if (!owned) return null;
  }

  // Try hes_schedule first, then inspector_schedule
  const { data: hesRow } = await supabaseAdmin
    .from("hes_schedule")
    .select("*, hes_team_members(name)")
    .eq("id", jobId)
    .maybeSingle();

  if (hesRow) {
    return {
      ...mapScheduleRow(hesRow, "hes"),
      team_member_name: hesRow.hes_team_members?.name ?? null,
      tech_en_route_at: hesRow.tech_en_route_at ?? null,
      tech_arrived_at: hesRow.tech_arrived_at ?? null,
      job_started_at: hesRow.job_started_at ?? null,
      job_completed_at: hesRow.job_completed_at ?? null,
      payment_received_at: hesRow.payment_received_at ?? null,
      leaf_delivery_status: hesRow.leaf_delivery_status ?? null,
      stripe_checkout_session_id: hesRow.stripe_checkout_session_id ?? null,
      checkout_url: hesRow.checkout_url ?? null,
    };
  }

  const { data: inspRow } = await supabaseAdmin
    .from("inspector_schedule")
    .select("*, inspector_team_members(name)")
    .eq("id", jobId)
    .maybeSingle();

  if (inspRow) {
    return {
      ...mapScheduleRow(inspRow, "inspector"),
      team_member_name: inspRow.inspector_team_members?.name ?? null,
      tech_en_route_at: inspRow.tech_en_route_at ?? null,
      tech_arrived_at: inspRow.tech_arrived_at ?? null,
      job_started_at: inspRow.job_started_at ?? null,
      job_completed_at: inspRow.job_completed_at ?? null,
      payment_received_at: inspRow.payment_received_at ?? null,
      leaf_delivery_status: inspRow.leaf_delivery_status ?? null,
      stripe_checkout_session_id: inspRow.stripe_checkout_session_id ?? null,
      checkout_url: inspRow.checkout_url ?? null,
    };
  }

  return null;
}

// ─── Update job status (field tech transitions) ───────────────────

const FIELD_STATUS_TRANSITIONS: Record<string, { status: string; timestamp_col: string }> = {
  en_route: { status: "en_route", timestamp_col: "tech_en_route_at" },
  on_site: { status: "on_site", timestamp_col: "tech_arrived_at" },
  in_progress: { status: "in_progress", timestamp_col: "job_started_at" },
  completed: { status: "completed", timestamp_col: "job_completed_at" },
};

export async function updateJobStatus(
  jobId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { id } = await requirePortalUser();
    const { data: profile } = await supabaseAdmin
      .from("app_profiles")
      .select("full_name, email, role")
      .eq("id", id)
      .single();

    // Verify ownership (admins bypass)
    if (profile?.role !== "admin" && profile?.email) {
      const { owned } = await verifyJobOwnership(jobId, profile.email);
      if (!owned) return { success: false, error: "Job not assigned to you." };
    }

    const transition = FIELD_STATUS_TRANSITIONS[newStatus];
    const update: Record<string, unknown> = { status: newStatus };
    if (transition?.timestamp_col) {
      update[transition.timestamp_col] = new Date().toISOString();
    }

    // Try hes_schedule first
    const { data: hesRow } = await supabaseAdmin
      .from("hes_schedule")
      .update(update)
      .eq("id", jobId)
      .select("id")
      .maybeSingle();

    let jobType = "hes";
    if (!hesRow) {
      const { error } = await supabaseAdmin
        .from("inspector_schedule")
        .update(update)
        .eq("id", jobId);
      if (error) return { success: false, error: error.message };
      jobType = "inspector";
    }

    const statusLabels: Record<string, string> = {
      en_route: "Tech en route",
      on_site: "Tech arrived on site",
      in_progress: "Job started",
      completed: "Job completed",
    };

    await logJobActivity(
      jobId,
      `status_${newStatus}`,
      statusLabels[newStatus] || `Status changed to ${newStatus}`,
      { id, name: profile?.full_name ?? "Field Tech", role: "field_tech" },
      undefined,
      jobType
    );

    revalidatePath("/portal/jobs");
    revalidatePath("/portal/schedule");
    revalidatePath("/admin/schedule");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ─── Add a field note ──────────────────────────────────────────────

export async function addJobNote(
  jobId: string,
  note: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { id } = await requirePortalUser();
    const { data: profile } = await supabaseAdmin
      .from("app_profiles")
      .select("full_name, email, role")
      .eq("id", id)
      .single();

    // Verify ownership (admins bypass)
    if (profile?.role !== "admin" && profile?.email) {
      const { owned } = await verifyJobOwnership(jobId, profile.email);
      if (!owned) return { success: false, error: "Job not assigned to you." };
    }

    // Determine job type
    const { data: hesCheck } = await supabaseAdmin
      .from("hes_schedule")
      .select("id")
      .eq("id", jobId)
      .maybeSingle();
    const jobType = hesCheck ? "hes" : "inspector";

    await logJobActivity(
      jobId,
      "field_note",
      "Field note added",
      { id, name: profile?.full_name ?? "Field Tech", role: "field_tech" },
      { note },
      jobType
    );

    revalidatePath("/portal/jobs");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ─── Get job activity log ──────────────────────────────────────────

export async function getJobActivity(
  jobId: string
): Promise<ActivityLogEntry[]> {
  return fetchJobActivity(jobId);
}
