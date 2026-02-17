// GET /api/v1/affiliate/hes-leads/[id] — HES lead detail
// POST /api/v1/affiliate/hes-leads/[id] — Purchase HES lead

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireRole, json } from "@/app/api/v1/_lib/auth";
import { ok, badRequest, notFound, serverError } from "@/types/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await requireRole("affiliate");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  const { data, error } = await supabaseAdmin
    .from("hes_requests")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) return json(notFound("HES lead not found"));

  return json(ok(data));
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = await requireRole("affiliate");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  const { data: lead, error: fetchErr } = await supabaseAdmin
    .from("hes_requests")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !lead) return json(notFound("HES lead not found"));

  if (lead.purchased_by_affiliate_id) {
    return json(badRequest("This lead has already been purchased"));
  }

  if (!lead.posted_for_sale_date) {
    return json(badRequest("This lead is not available for purchase"));
  }

  const { data, error } = await supabaseAdmin
    .from("hes_requests")
    .update({
      status: "assigned_affiliate",
      purchased_by_affiliate_id: auth.userId,
      assigned_to_affiliate_id: auth.userId,
      purchased_date: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return json(serverError(error.message));

  // Record payment
  await supabaseAdmin.from("payments").insert({
    contractor_id: auth.userId,
    hes_request_id: id,
    amount: lead.price ?? 10,
    system_type: "hes",
    status: "completed",
  });

  return json(ok(data));
}
