// src/app/api/v1/leads/route.ts
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin, json } from "../_lib/auth";
import { ok, created, badRequest, serverError } from "@/types/api";
import type { LeadStatus } from "@/types/schema";

const VALID_STATUSES: LeadStatus[] = ["draft", "active", "sold", "expired", "canceled"];

/**
 * GET /api/v1/leads
 * List leads with filters: status, price range, date range, pagination.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = req.nextUrl;
  const status = url.searchParams.get("status");
  const priceMin = url.searchParams.get("price_min");
  const priceMax = url.searchParams.get("price_max");
  const postedAfter = url.searchParams.get("posted_after");
  const postedBefore = url.searchParams.get("posted_before");
  const jobId = url.searchParams.get("job_id");
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page")) || 25));
  const offset = (page - 1) * perPage;

  let query = supabaseAdmin
    .from("leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (status) query = query.eq("status", status);
  if (jobId) query = query.eq("admin_job_id", jobId);
  if (priceMin) query = query.gte("price", Number(priceMin));
  if (priceMax) query = query.lte("price", Number(priceMax));
  if (postedAfter) query = query.gte("posted_at", postedAfter);
  if (postedBefore) query = query.lte("posted_at", postedBefore);

  const { data, error, count } = await query;

  if (error) {
    console.error("GET /api/v1/leads error:", error);
    return json(serverError(error.message));
  }

  return json(ok({ items: data ?? [], total: count ?? 0, page, per_page: perPage }));
}

/**
 * POST /api/v1/leads
 * Create a new lead from an admin job.
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

  const adminJobId = String(body.admin_job_id ?? "").trim();
  if (!adminJobId) return json(badRequest("admin_job_id is required"));

  // Verify job exists
  const { data: job } = await supabaseAdmin
    .from("admin_jobs")
    .select("id")
    .eq("id", adminJobId)
    .single();

  if (!job) return json(badRequest("Job not found"));

  const status = String(body.status ?? "draft") as LeadStatus;
  if (!VALID_STATUSES.includes(status)) {
    return json(badRequest(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`));
  }

  const row = {
    admin_job_id: adminJobId,
    status,
    price: body.price != null ? Number(body.price) : null,
    notes: body.notes ? String(body.notes) : null,
    service_tags: Array.isArray(body.service_tags)
      ? body.service_tags.map(String)
      : [],
    posted_at: status === "active" ? new Date().toISOString() : null,
  };

  const { data, error } = await supabaseAdmin
    .from("leads")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error("POST /api/v1/leads error:", error);
    return json(serverError(error.message));
  }

  return json(created(data));
}
