// src/app/api/v1/leads/[id]/purchase/route.ts
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAuth, json } from "../../../_lib/auth";
import { ok, badRequest, notFound, serverError } from "@/types/api";
import type { BuyerType } from "@/types/schema";

type Ctx = { params: Promise<{ id: string }> };

const VALID_BUYER_TYPES: BuyerType[] = ["contractor", "broker", "other"];

/**
 * POST /api/v1/leads/[id]/purchase
 * Record a lead purchase. The authenticated user becomes the buyer.
 * Body: { buyer_type?: "contractor" | "broker" | "other" }
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // Body is optional for purchase — defaults apply
  }

  // Get the lead
  const { data: lead, error: leadErr } = await supabaseAdmin
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (leadErr || !lead) return json(notFound("Lead not found"));
  if (lead.status !== "active") {
    return json(badRequest(`Lead is not active (current status: ${lead.status})`));
  }
  if (lead.buyer_id) {
    return json(badRequest("Lead has already been purchased"));
  }

  const buyerType = String(body.buyer_type ?? auth.role ?? "contractor") as BuyerType;
  if (!VALID_BUYER_TYPES.includes(buyerType)) {
    return json(badRequest(`Invalid buyer_type. Must be one of: ${VALID_BUYER_TYPES.join(", ")}`));
  }

  const { data, error } = await supabaseAdmin
    .from("leads")
    .update({
      status: "sold",
      buyer_id: auth.userId,
      buyer_type: buyerType,
      sold_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("POST /api/v1/leads/[id]/purchase error:", error);
    return json(serverError(error.message));
  }

  return json(ok(data));
}
