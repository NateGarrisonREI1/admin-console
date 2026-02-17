// GET /api/v1/broker/hes-requests/[id] — HES request detail + download link

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireRole, json } from "@/app/api/v1/_lib/auth";
import { ok, notFound, serverError } from "@/types/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await requireRole("broker");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  const { data, error } = await supabaseAdmin
    .from("hes_requests")
    .select("*")
    .eq("id", id)
    .eq("broker_id", auth.userId)
    .is("deleted_at", null)
    .single();

  if (error || !data) return json(notFound("HES request not found"));

  return json(ok(data));
}
