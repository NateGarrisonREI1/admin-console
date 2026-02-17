// GET /api/v1/affiliate/my-work — Affiliate's purchased HES requests

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireRole, json } from "@/app/api/v1/_lib/auth";
import { ok, serverError } from "@/types/api";

export async function GET(req: NextRequest) {
  const auth = await requireRole("affiliate");
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(sp.get("per_page")) || 25));
  const offset = (page - 1) * perPage;

  let query = supabaseAdmin
    .from("hes_requests")
    .select("*", { count: "exact" })
    .or(
      `purchased_by_affiliate_id.eq.${auth.userId},assigned_to_affiliate_id.eq.${auth.userId}`
    )
    .is("deleted_at", null)
    .order("purchased_date", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;

  if (error) return json(serverError(error.message));

  return json(ok({ items: data ?? [], total: count ?? 0, page, per_page: perPage }));
}
