// PATCH /api/v1/contractor/my-leads/[id] — Update lead status/notes

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireRole, json } from "@/app/api/v1/_lib/auth";
import { ok, badRequest, notFound, serverError } from "@/types/api";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_STATUSES = ["new", "contacted", "quoted", "closed", "lost"] as const;

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = await requireRole("contractor");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = await req.json();

  const clean: Record<string, unknown> = {};

  if (body.status != null) {
    if (!VALID_STATUSES.includes(body.status)) {
      return json(badRequest(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`));
    }
    clean.status = body.status;
    if (body.status === "closed") {
      clean.closed_date = new Date().toISOString();
    }
  }
  if (body.notes !== undefined) clean.notes = body.notes;
  if (body.quote_amount !== undefined) clean.quote_amount = body.quote_amount;

  if (Object.keys(clean).length === 0) {
    return json(badRequest("No valid fields to update"));
  }

  const { data, error } = await supabaseAdmin
    .from("contractor_lead_status")
    .update(clean)
    .eq("id", id)
    .eq("contractor_id", auth.userId)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") return json(notFound("Lead status not found"));
    return json(serverError(error.message));
  }

  return json(ok(data));
}
