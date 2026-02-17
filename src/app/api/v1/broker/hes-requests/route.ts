// GET /api/v1/broker/hes-requests — List broker's own HES requests
// POST /api/v1/broker/hes-requests — Submit new HES request

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireRole, json } from "@/app/api/v1/_lib/auth";
import { ok, created, badRequest, serverError } from "@/types/api";

export async function GET(req: NextRequest) {
  const auth = await requireRole("broker");
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(sp.get("per_page")) || 25));
  const offset = (page - 1) * perPage;

  let query = supabaseAdmin
    .from("hes_requests")
    .select("*", { count: "exact" })
    .eq("broker_id", auth.userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;

  if (error) return json(serverError(error.message));

  return json(ok({ items: data ?? [], total: count ?? 0, page, per_page: perPage }));
}

export async function POST(req: NextRequest) {
  const auth = await requireRole("broker");
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!body.property_address?.trim() || !body.city?.trim() || !body.state?.trim() || !body.zip?.trim()) {
    return json(badRequest("property_address, city, state, and zip are required"));
  }

  const { data, error } = await supabaseAdmin
    .from("hes_requests")
    .insert({
      broker_id: auth.userId,
      property_address: body.property_address.trim(),
      city: body.city.trim(),
      state: body.state.trim(),
      zip: body.zip.trim(),
      property_type: body.property_type ?? "single_family",
      requested_completion_date: body.requested_completion_date ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) return json(serverError(error.message));

  return json(created(data));
}
