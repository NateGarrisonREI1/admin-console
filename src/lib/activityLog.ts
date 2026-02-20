import { supabaseAdmin } from "@/lib/supabase/server";

export type ActivityLogEntry = {
  id: string;
  job_id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string;
  action: string;
  title: string;
  details: Record<string, any> | null;
  created_at: string;
};

export async function logJobActivity(
  jobId: string,
  action: string,
  title: string,
  actor?: { id?: string; name?: string; role?: string },
  details?: Record<string, any>,
  jobType?: string
): Promise<void> {
  const merged = { ...(details ?? {}), ...(jobType ? { job_type: jobType } : {}) };
  const row = {
    job_id: jobId,
    actor_id: actor?.id ?? null,
    actor_name: actor?.name ?? "System",
    actor_role: actor?.role ?? "system",
    action,
    title,
    details: Object.keys(merged).length > 0 ? merged : null,
  };
  console.log(`[activity-log] Inserting "${action}" for job ${jobId}`, JSON.stringify(row));
  try {
    const { data, error } = await supabaseAdmin.from("job_activity_log").insert(row).select();
    if (error) {
      console.error(`[activity-log] INSERT failed for "${action}" job ${jobId}:`, error.message, error.details, error.hint);
    } else {
      console.log(`[activity-log] INSERT OK for "${action}" job ${jobId}`, data);
    }
  } catch (err: any) {
    console.error(`[activity-log] THROWN error for "${action}" job ${jobId}:`, err?.message ?? err);
  }
}

export async function fetchJobActivity(
  jobId: string
): Promise<ActivityLogEntry[]> {
  const { data, error } = await supabaseAdmin
    .from("job_activity_log")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error(`[activity-log] Failed to fetch activity for job ${jobId}:`, error.message);
    return [];
  }
  return (data ?? []) as ActivityLogEntry[];
}
