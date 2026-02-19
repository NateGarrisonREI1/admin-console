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
  const routingChannel = sp.get("routing_channel");
  const sort = sp.get("sort") ?? "newest";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const perPage = Math.min(50, Math.max(1, Number(sp.get("per_page")) || 25));
  const offset = (page - 1) * perPage;

  let query = supabaseAdmin
    .from("system_leads")
    .select(
      "id, system_type, city, state, zip, leaf_report_data, price, status, posted_date, expiration_date, created_at, routing_channel, exclusive_contractor_id, is_free_assignment, network_release_at",
      { count: "exact" }
    )
    .eq("status", "available")
    .is("deleted_at", null)
    .range(offset, offset + perPage - 1);

  // Hide expired
  query = query.gt("expiration_date", new Date().toISOString());

  // Filter by routing channel
  if (routingChannel === "exclusive") {
    query = query.eq("routing_channel", "exclusive").eq("exclusive_contractor_id", auth.userId);
  } else if (routingChannel === "internal_network") {
    query = query.eq("routing_channel", "internal_network");
  } else if (routingChannel === "open_market") {
    query = query.or("routing_channel.eq.open_market,routing_channel.is.null");
  }

  // Exclude exclusive leads not assigned to this contractor (unless explicitly filtered)
  if (!routingChannel) {
    query = query.or(
      `routing_channel.neq.exclusive,exclusive_contractor_id.eq.${auth.userId},routing_channel.is.null`
    );
  }

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
