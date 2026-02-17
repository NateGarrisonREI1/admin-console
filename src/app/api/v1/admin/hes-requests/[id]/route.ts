// PATCH /api/v1/admin/hes-requests/[id] — Assign or update HES request

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin, json } from "@/app/api/v1/_lib/auth";
import { ok, badRequest, notFound, serverError } from "@/types/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = await req.json();

  // Assign to internal user
  if (body.action === "assign-internal") {
    const { data, error } = await supabaseAdmin
      .from("hes_requests")
      .update({
        status: "assigned_internal",
        assigned_to_internal_user_id: body.internal_user_id ?? null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return json(notFound());
      return json(serverError(error.message));
    }
    return json(ok(data));
  }

  // Post for sale (to affiliates)
  if (body.action === "post-for-sale") {
    const { data, error } = await supabaseAdmin
      .from("hes_requests")
      .update({
        posted_for_sale_date: new Date().toISOString(),
        price: body.price ?? 10,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return json(notFound());
      return json(serverError(error.message));
    }
    return json(ok(data));
  }

  // Generic update
  const allowed = ["status", "notes", "completion_date", "hes_report_url"];
  const clean: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) clean[key] = body[key];
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

  if (error) {
    if (error.code === "PGRST116") return json(notFound());
    return json(serverError(error.message));
  }

  return json(ok(data));
}
