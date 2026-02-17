// GET /api/v1/affiliate/hes-leads — Browse available HES leads for purchase

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireRole, json } from "@/app/api/v1/_lib/auth";
import { ok, serverError } from "@/types/api";

export async function GET(req: NextRequest) {
  const auth = await requireRole("affiliate");
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const state = sp.get("state");
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page")) || 25));
  const offset = (page - 1) * perPage;

  let query = supabaseAdmin
    .from("hes_requests")
    .select(
      "id, property_address, city, state, zip, property_type, requested_completion_date, price, posted_for_sale_date, created_at",
      { count: "exact" }
    )
    .not("posted_for_sale_date", "is", null)
    .is("purchased_by_affiliate_id", null)
    .is("deleted_at", null)
    .neq("status", "cancelled")
    .neq("status", "completed")
    .order("posted_for_sale_date", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (state) query = query.eq("state", state);

  const { data, error, count } = await query;

  if (error) return json(serverError(error.message));

  return json(ok({ items: data ?? [], total: count ?? 0, page, per_page: perPage }));
}
