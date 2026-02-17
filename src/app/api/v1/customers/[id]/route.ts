// src/app/api/v1/customers/[id]/route.ts
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin, json } from "../../_lib/auth";
import { ok, badRequest, notFound, serverError } from "@/types/api";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/customers/[id]
 * Get customer details from admin_jobs by job ID.
 * Returns customer fields + job metadata.
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  const { data: job, error } = await supabaseAdmin
    .from("admin_jobs")
    .select("id, customer_name, customer_email, customer_phone, customer_type, address1, address2, city, state, zip, created_at")
    .eq("id", id)
    .single();

  if (error || !job) return json(notFound("Customer/job not found"));

  return json(ok(job));
}

/**
 * PATCH /api/v1/customers/[id]
 * Update customer fields on an admin_job.
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

  const allowed = [
    "customer_name", "customer_email", "customer_phone", "customer_type",
    "address1", "address2", "city", "state", "zip",
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
    .select("id, customer_name, customer_email, customer_phone, customer_type, address1, address2, city, state, zip")
    .single();

  if (error) {
    if (error.code === "PGRST116") return json(notFound("Customer/job not found"));
    console.error("PATCH /api/v1/customers/[id] error:", error);
    return json(serverError(error.message));
  }

  return json(ok(data));
}
