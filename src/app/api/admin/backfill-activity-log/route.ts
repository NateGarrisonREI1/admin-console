// GET /api/admin/backfill-activity-log — Backfill job_created entries for existing schedule jobs
// that don't already have an activity log entry.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  let backfilled = 0;

  // Get all existing job_activity_log job_ids with action = 'job_created'
  const { data: existing } = await supabaseAdmin
    .from("job_activity_log")
    .select("job_id")
    .eq("action", "job_created");

  const existingIds = new Set((existing ?? []).map((r: any) => r.job_id));

  // Backfill hes_schedule
  const { data: hesJobs } = await supabaseAdmin
    .from("hes_schedule")
    .select("id, customer_name, created_at")
    .not("status", "in", '("cancelled","archived")');

  for (const job of hesJobs ?? []) {
    if (existingIds.has(job.id)) continue;
    await supabaseAdmin.from("job_activity_log").insert({
      job_id: job.id,
      actor_name: "System (backfill)",
      actor_role: "system",
      action: "job_created",
      title: `Job scheduled — ${job.customer_name}`,
      details: { job_type: "hes" },
      created_at: job.created_at || new Date().toISOString(),
    });
    backfilled++;
  }

  // Backfill inspector_schedule
  const { data: inspJobs } = await supabaseAdmin
    .from("inspector_schedule")
    .select("id, customer_name, created_at")
    .not("status", "in", '("cancelled","archived")');

  for (const job of inspJobs ?? []) {
    if (existingIds.has(job.id)) continue;
    await supabaseAdmin.from("job_activity_log").insert({
      job_id: job.id,
      actor_name: "System (backfill)",
      actor_role: "system",
      action: "job_created",
      title: `Job scheduled — ${job.customer_name}`,
      details: { job_type: "inspector" },
      created_at: job.created_at || new Date().toISOString(),
    });
    backfilled++;
  }

  return NextResponse.json({
    success: true,
    backfilled,
    message: `Backfilled ${backfilled} job(s) with job_created activity log entries.`,
  });
}
