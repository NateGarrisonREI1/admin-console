// src/app/api/v1/schedules/[id]/route.ts
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin, json } from "../../_lib/auth";
import { ok, badRequest, notFound, serverError } from "@/types/api";

type Ctx = { params: Promise<{ id: string }> };

const VALID_STATUSES = ["pending", "confirmed", "completed", "canceled"];

/**
 * PATCH /api/v1/schedules/[id]
 * Update an appointment's fields (status, time, assignee, notes).
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

  const updates: Record<string, unknown> = {};

  if ("status" in body) {
    const s = String(body.status);
    if (!VALID_STATUSES.includes(s)) {
      return json(badRequest(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`));
    }
    updates.status = s;
  }
  if ("start_at" in body) updates.start_at = String(body.start_at);
  if ("end_at" in body) updates.end_at = String(body.end_at);
  if ("assignee" in body) updates.assignee = String(body.assignee);
  if ("notes" in body) updates.notes = body.notes ? String(body.notes) : null;

  if (Object.keys(updates).length === 0) {
    return json(badRequest("No valid fields to update"));
  }

  const { data, error } = await supabaseAdmin
    .from("admin_job_appointments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") return json(notFound("Appointment not found"));
    console.error("PATCH /api/v1/schedules/[id] error:", error);
    return json(serverError(error.message));
  }

  return json(ok(data));
}

/**
 * DELETE /api/v1/schedules/[id]
 * Cancel an appointment (sets status to canceled).
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  const { data, error } = await supabaseAdmin
    .from("admin_job_appointments")
    .update({ status: "canceled" })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") return json(notFound("Appointment not found"));
    console.error("DELETE /api/v1/schedules/[id] error:", error);
    return json(serverError(error.message));
  }

  return json(ok(data));
}
