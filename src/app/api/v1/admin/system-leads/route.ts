// GET /api/v1/admin/system-leads — List system leads with filters
// POST /api/v1/admin/system-leads — Create a new system lead

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin, json } from "@/app/api/v1/_lib/auth";
import { ok, created, badRequest, serverError } from "@/types/api";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const systemType = sp.get("system_type");
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(sp.get("per_page")) || 25));
  const offset = (page - 1) * perPage;

  let query = supabaseAdmin
    .from("system_leads")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (status) query = query.eq("status", status);
  if (systemType) query = query.eq("system_type", systemType);

  const { data, error, count } = await query;

  if (error) return json(serverError(error.message));

  return json(ok({ items: data ?? [], total: count ?? 0, page, per_page: perPage }));
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { system_type, state, zip } = body;

  if (!system_type || !state || !zip) {
    return json(badRequest("system_type, state, and zip are required"));
  }

  const { data, error } = await supabaseAdmin
    .from("system_leads")
    .insert({
      system_type,
      state,
      zip,
      address: body.address ?? null,
      city: body.city ?? null,
      homeowner_name: body.homeowner_name ?? null,
      homeowner_phone: body.homeowner_phone ?? null,
      homeowner_email: body.homeowner_email ?? null,
      best_contact_time: body.best_contact_time ?? null,
      leaf_report_data: body.leaf_report_data ?? {},
      price: body.price ?? 0,
      homeowner_id: body.homeowner_id ?? null,
    })
    .select()
    .single();

  if (error) return json(serverError(error.message));

  return json(created(data));
}
