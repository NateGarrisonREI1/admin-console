// GET /api/v1/contractor/system-leads/[id] — Lead detail
// POST /api/v1/contractor/system-leads/[id]/purchase — Purchase lead

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireRole, json } from "@/app/api/v1/_lib/auth";
import { ok, badRequest, notFound, serverError } from "@/types/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await requireRole("contractor");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  const { data, error } = await supabaseAdmin
    .from("system_leads")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) return json(notFound("System lead not found"));

  // If not purchased by this contractor, hide contact info
  if (data.purchased_by_contractor_id !== auth.userId) {
    data.homeowner_name = null;
    data.homeowner_phone = null;
    data.homeowner_email = null;
    data.best_contact_time = null;
  }

  return json(ok(data));
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = await requireRole("contractor");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  // Fetch the lead
  const { data: lead, error: fetchErr } = await supabaseAdmin
    .from("system_leads")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !lead) return json(notFound("System lead not found"));

  if (lead.status !== "available") {
    return json(badRequest("This lead is no longer available"));
  }

  if (lead.expiration_date && new Date(lead.expiration_date) < new Date()) {
    return json(badRequest("This lead has expired"));
  }

  // Process purchase (Stripe integration placeholder)
  const { data, error } = await supabaseAdmin
    .from("system_leads")
    .update({
      status: "purchased",
      purchased_by_contractor_id: auth.userId,
      purchased_date: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return json(serverError(error.message));

  // Create lead status tracking row
  await supabaseAdmin.from("contractor_lead_status").insert({
    contractor_id: auth.userId,
    system_lead_id: id,
    status: "new",
  });

  // Record payment
  await supabaseAdmin.from("payments").insert({
    contractor_id: auth.userId,
    system_lead_id: id,
    amount: lead.price,
    system_type: lead.system_type,
    status: "completed", // Placeholder until Stripe
  });

  return json(ok(data));
}
