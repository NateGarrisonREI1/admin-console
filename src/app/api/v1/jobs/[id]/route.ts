// src/app/api/v1/jobs/[id]/route.ts
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin, json } from "../../_lib/auth";
import { ok, badRequest, notFound, serverError } from "@/types/api";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/jobs/[id]
 * Get a single job by ID, including cached simulation snapshot if available.
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  const { data: job, error } = await supabaseAdmin
    .from("admin_jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !job) return json(notFound("Job not found"));

  // Fetch cached simulation snapshot if available
  const { data: snapshot } = await supabaseAdmin
    .from("snapshot_cache")
    .select("id, simulation_job_id, snapshot_data, cached_at, expires_at")
    .eq("admin_job_id", id)
    .order("cached_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return json(ok({ ...job, simulation_snapshot: snapshot ?? null }));
}

/**
 * PATCH /api/v1/jobs/[id]
 * Update a job's fields.
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(badRequest("Invalid JSON body"));
  }

  // Allow-list of updatable fields
  const allowed = [
    "status", "address1", "address2", "city", "state", "zip",
    "customer_name", "customer_email", "customer_phone", "customer_type",
    "notes", "inspection_status", "requested_outputs",
    "simulation_job_id", "simulation_sync_status",
  ] as const;

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return json(badRequest("No valid fields to update"));
  }

  const { data, error } = await supabaseAdmin
    .from("admin_jobs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") return json(notFound("Job not found"));
    console.error("PATCH /api/v1/jobs/[id] error:", error);
    return json(serverError(error.message));
  }

  return json(ok(data));
}

/**
 * DELETE /api/v1/jobs/[id]
 * Delete a job and all related records (cascade).
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  // Check existence first
  const { data: job } = await supabaseAdmin
    .from("admin_jobs")
    .select("id")
    .eq("id", id)
    .single();

  if (!job) return json(notFound("Job not found"));

  const { error } = await supabaseAdmin
    .from("admin_jobs")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("DELETE /api/v1/jobs/[id] error:", error);
    return json(serverError(error.message));
  }

  return json(ok({ deleted: true }));
}
