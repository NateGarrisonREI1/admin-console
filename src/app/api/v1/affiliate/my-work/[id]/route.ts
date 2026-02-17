// PATCH /api/v1/affiliate/my-work/[id] — Update work status, upload report

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireRole, json } from "@/app/api/v1/_lib/auth";
import { ok, badRequest, notFound, serverError } from "@/types/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = await requireRole("affiliate");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = await req.json();

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from("hes_requests")
    .select("id, status")
    .eq("id", id)
    .or(
      `purchased_by_affiliate_id.eq.${auth.userId},assigned_to_affiliate_id.eq.${auth.userId}`
    )
    .single();

  if (!existing) return json(notFound("Work item not found"));

  const clean: Record<string, unknown> = {};

  if (body.action === "mark-complete") {
    clean.status = "completed";
    clean.completion_date = new Date().toISOString();
    if (body.hes_report_url) clean.hes_report_url = body.hes_report_url;
  } else {
    if (body.notes !== undefined) clean.notes = body.notes;
    if (body.hes_report_url !== undefined) clean.hes_report_url = body.hes_report_url;
  }

  if (Object.keys(clean).length === 0) {
    return json(badRequest("No valid fields to update"));
  }

  const { data, error } = await supabaseAdmin
    .from("hes_requests")
    .update(clean)
    .eq("id", id)
    .select()
    .single();

  if (error) return json(serverError(error.message));

  return json(ok(data));
}
