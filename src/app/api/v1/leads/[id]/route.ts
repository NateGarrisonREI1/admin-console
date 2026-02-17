// src/app/api/v1/leads/[id]/route.ts
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin, json } from "../../_lib/auth";
import { ok, badRequest, notFound, serverError } from "@/types/api";
import type { LeadStatus, BuyerType } from "@/types/schema";

type Ctx = { params: Promise<{ id: string }> };

const VALID_STATUSES: LeadStatus[] = ["draft", "active", "sold", "expired", "canceled"];
const VALID_BUYER_TYPES: BuyerType[] = ["contractor", "broker", "other"];

/**
 * GET /api/v1/leads/[id]
 * Get a single lead by ID.
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  const { data, error } = await supabaseAdmin
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return json(notFound("Lead not found"));

  return json(ok(data));
}

/**
 * PATCH /api/v1/leads/[id]
 * Update a lead's fields.
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
    const s = String(body.status) as LeadStatus;
    if (!VALID_STATUSES.includes(s)) {
      return json(badRequest(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`));
    }
    updates.status = s;
    // Auto-set posted_at when activating
    if (s === "active" && !("posted_at" in body)) {
      updates.posted_at = new Date().toISOString();
    }
  }
  if ("price" in body) updates.price = body.price != null ? Number(body.price) : null;
  if ("notes" in body) updates.notes = body.notes ? String(body.notes) : null;
  if ("posted_at" in body) updates.posted_at = body.posted_at;
  if ("expires_at" in body) updates.expires_at = body.expires_at;
  if ("service_tags" in body && Array.isArray(body.service_tags)) {
    updates.service_tags = body.service_tags.map(String);
  }

  if (Object.keys(updates).length === 0) {
    return json(badRequest("No valid fields to update"));
  }

  const { data, error } = await supabaseAdmin
    .from("leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") return json(notFound("Lead not found"));
    console.error("PATCH /api/v1/leads/[id] error:", error);
    return json(serverError(error.message));
  }

  return json(ok(data));
}

/**
 * DELETE /api/v1/leads/[id]
 * Delete a lead entirely. Use PATCH { status: "canceled" } to soft-delete.
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id")
    .eq("id", id)
    .single();

  if (!lead) return json(notFound("Lead not found"));

  const { error } = await supabaseAdmin
    .from("leads")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("DELETE /api/v1/leads/[id] error:", error);
    return json(serverError(error.message));
  }

  return json(ok({ deleted: true }));
}
