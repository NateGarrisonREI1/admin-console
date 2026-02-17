// src/app/api/v1/jobs/[id]/simulation/route.ts
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin, json } from "../../../_lib/auth";
import { ok, notFound, serverError } from "@/types/api";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/jobs/[id]/simulation
 * Get the cached simulation snapshot for a job.
 * Returns snapshot data, cache age, and expiration.
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  // Verify job exists
  const { data: job } = await supabaseAdmin
    .from("admin_jobs")
    .select("id, simulation_job_id, last_simulation_sync, simulation_sync_status")
    .eq("id", id)
    .single();

  if (!job) return json(notFound("Job not found"));

  // Get latest cached snapshot
  const { data: snapshot } = await supabaseAdmin
    .from("snapshot_cache")
    .select("*")
    .eq("admin_job_id", id)
    .order("cached_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!snapshot) {
    return json(ok({
      cached: false,
      snapshot: null,
      job_sync: {
        simulation_job_id: job.simulation_job_id,
        last_sync: job.last_simulation_sync,
        sync_status: job.simulation_sync_status,
      },
    }));
  }

  const cachedAt = new Date(snapshot.cached_at);
  const expiresAt = new Date(snapshot.expires_at);
  const ageMs = Date.now() - cachedAt.getTime();
  const expired = Date.now() > expiresAt.getTime();

  return json(ok({
    cached: true,
    expired,
    snapshot: snapshot.snapshot_data,
    cache_info: {
      id: snapshot.id,
      cached_at: snapshot.cached_at,
      expires_at: snapshot.expires_at,
      age_seconds: Math.round(ageMs / 1000),
      simulation_job_id: snapshot.simulation_job_id,
    },
    job_sync: {
      simulation_job_id: job.simulation_job_id,
      last_sync: job.last_simulation_sync,
      sync_status: job.simulation_sync_status,
    },
  }));
}

/**
 * POST /api/v1/jobs/[id]/simulation
 * Force-refresh the simulation snapshot from leaf-diagnose-sim-2.
 * In practice this marks the job for re-sync; the actual fetch
 * happens via webhook or a background process.
 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  const { data: job } = await supabaseAdmin
    .from("admin_jobs")
    .select("id, simulation_job_id")
    .eq("id", id)
    .single();

  if (!job) return json(notFound("Job not found"));

  // Mark for re-sync
  const { error } = await supabaseAdmin
    .from("admin_jobs")
    .update({ simulation_sync_status: "pending" })
    .eq("id", id);

  if (error) {
    console.error("POST /api/v1/jobs/[id]/simulation error:", error);
    return json(serverError(error.message));
  }

  return json(ok({
    refresh_requested: true,
    simulation_job_id: job.simulation_job_id,
  }));
}
