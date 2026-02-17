// src/app/api/v1/jobs/route.ts
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin, json } from "../_lib/auth";
import { ok, created, badRequest, serverError } from "@/types/api";

/**
 * GET /api/v1/jobs
 * List jobs with optional filters: status, customer, date range, pagination.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = req.nextUrl;
  const status = url.searchParams.get("status");
  const customer = url.searchParams.get("customer");
  const after = url.searchParams.get("after");
  const before = url.searchParams.get("before");
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page")) || 25));
  const offset = (page - 1) * perPage;

  let query = supabaseAdmin
    .from("admin_jobs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (status) query = query.eq("status", status);
  if (customer) query = query.ilike("customer_name", `%${customer}%`);
  if (after) query = query.gte("created_at", after);
  if (before) query = query.lte("created_at", before);

  const { data, error, count } = await query;

  if (error) {
    console.error("GET /api/v1/jobs error:", error);
    return json(serverError(error.message));
  }

  return json(ok({ items: data ?? [], total: count ?? 0, page, per_page: perPage }));
}

/**
 * POST /api/v1/jobs
 * Create a new admin job.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(badRequest("Invalid JSON body"));
  }

  const state = String(body.state ?? "").trim();
  const zip = String(body.zip ?? "").trim();

  if (!state || state.length !== 2) return json(badRequest("state is required (2-letter code)"));
  if (!zip || zip.length < 5) return json(badRequest("zip is required (5+ digits)"));

  const row = {
    state: state.toUpperCase(),
    zip,
    address1: body.address1 ? String(body.address1) : null,
    address2: body.address2 ? String(body.address2) : null,
    city: body.city ? String(body.city) : null,
    customer_name: body.customer_name ? String(body.customer_name) : null,
    customer_email: body.customer_email ? String(body.customer_email) : null,
    customer_phone: body.customer_phone ? String(body.customer_phone) : null,
    customer_type: body.customer_type ? String(body.customer_type) : null,
    notes: body.notes ? String(body.notes) : null,
    status: "new",
  };

  const { data, error } = await supabaseAdmin
    .from("admin_jobs")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error("POST /api/v1/jobs error:", error);
    return json(serverError(error.message));
  }

  return json(created(data));
}
