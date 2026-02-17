// POST /api/v1/admin/system-leads/[id]/post-for-sale — Post lead to job board
// POST /api/v1/admin/system-leads/[id]/assign-contractor — Assign directly
// PATCH /api/v1/admin/system-leads/[id] — Update lead fields

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

  // Handle post-for-sale action
  if (body.action === "post-for-sale") {
    if (!body.price && body.price !== 0) {
      return json(badRequest("price is required to post for sale"));
    }

    const updateData: Record<string, unknown> = {
      status: "available",
      price: body.price,
      posted_date: new Date().toISOString(),
    };

    if (body.expiration_date) {
      updateData.expiration_date = body.expiration_date;
    } else {
      // Default: 30 days from now
      const exp = new Date();
      exp.setDate(exp.getDate() + 30);
      updateData.expiration_date = exp.toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from("system_leads")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return json(notFound("System lead not found"));
      return json(serverError(error.message));
    }
    return json(ok(data));
  }

  // Handle assign-contractor action
  if (body.action === "assign-contractor") {
    if (!body.contractor_id) {
      return json(badRequest("contractor_id is required"));
    }

    const { data, error } = await supabaseAdmin
      .from("system_leads")
      .update({
        status: "purchased",
        purchased_by_contractor_id: body.contractor_id,
        purchased_date: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return json(notFound("System lead not found"));
      return json(serverError(error.message));
    }

    // Create contractor_lead_status row
    await supabaseAdmin.from("contractor_lead_status").insert({
      contractor_id: body.contractor_id,
      system_lead_id: id,
      status: "new",
    });

    return json(ok(data));
  }

  // Generic field update
  const allowed = ["price", "status", "expiration_date", "system_type", "homeowner_name", "homeowner_phone", "homeowner_email"];
  const clean: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) clean[key] = body[key];
  }

  if (Object.keys(clean).length === 0) {
    return json(badRequest("No valid fields to update"));
  }

  const { data, error } = await supabaseAdmin
    .from("system_leads")
    .update(clean)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") return json(notFound("System lead not found"));
    return json(serverError(error.message));
  }

  return json(ok(data));
}
