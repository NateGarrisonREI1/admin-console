// GET /api/v1/contractor/system-leads — Browse available system leads

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireRole, json } from "@/app/api/v1/_lib/auth";
import { ok, serverError } from "@/types/api";

export async function GET(req: NextRequest) {
  const auth = await requireRole("contractor");
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const systemType = sp.get("system_type");
  const zip = sp.get("zip");
  const state = sp.get("state");
  const priceMin = sp.get("price_min");
  const priceMax = sp.get("price_max");
  const sort = sp.get("sort") ?? "newest";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page")) || 25));
  const offset = (page - 1) * perPage;

  let query = supabaseAdmin
    .from("system_leads")
    .select(
      "id, system_type, city, state, zip, leaf_report_data, price, status, posted_date, expiration_date, created_at",
      { count: "exact" }
    )
    .eq("status", "available")
    .is("deleted_at", null)
    .range(offset, offset + perPage - 1);

  // Hide expired
  query = query.gt("expiration_date", new Date().toISOString());

  if (systemType) query = query.eq("system_type", systemType);
  if (zip) query = query.eq("zip", zip);
  if (state) query = query.eq("state", state);
  if (priceMin) query = query.gte("price", Number(priceMin));
  if (priceMax) query = query.lte("price", Number(priceMax));

  if (sort === "price_asc") {
    query = query.order("price", { ascending: true });
  } else if (sort === "price_desc") {
    query = query.order("price", { ascending: false });
  } else if (sort === "expiring") {
    query = query.order("expiration_date", { ascending: true });
  } else {
    query = query.order("posted_date", { ascending: false });
  }

  const { data, error, count } = await query;

  if (error) return json(serverError(error.message));

  return json(ok({ items: data ?? [], total: count ?? 0, page, per_page: perPage }));
}
