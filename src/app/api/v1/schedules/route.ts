// src/app/api/v1/schedules/route.ts
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin, json } from "../_lib/auth";
import { ok, created, badRequest, serverError } from "@/types/api";

const VALID_KINDS = ["hes_visit", "inspection", "follow_up", "other"];
const VALID_STATUSES = ["pending", "confirmed", "completed", "canceled"];

/**
 * GET /api/v1/schedules
 * List appointments. Filter by job_id, type, status, date range.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = req.nextUrl;
  const jobId = url.searchParams.get("job_id");
  const kind = url.searchParams.get("type");
  const status = url.searchParams.get("status");
  const after = url.searchParams.get("after");
  const before = url.searchParams.get("before");
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page")) || 25));
  const offset = (page - 1) * perPage;

  let query = supabaseAdmin
    .from("admin_job_appointments")
    .select("*", { count: "exact" })
    .order("start_at", { ascending: true })
    .range(offset, offset + perPage - 1);

  if (jobId) query = query.eq("job_id", jobId);
  if (kind) query = query.eq("kind", kind);
  if (status) query = query.eq("status", status);
  if (after) query = query.gte("start_at", after);
  if (before) query = query.lte("start_at", before);

  const { data, error, count } = await query;

  if (error) {
    console.error("GET /api/v1/schedules error:", error);
    return json(serverError(error.message));
  }

  return json(ok({ items: data ?? [], total: count ?? 0, page, per_page: perPage }));
}

/**
 * POST /api/v1/schedules
 * Create a new appointment.
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

  const jobId = String(body.job_id ?? "").trim();
  const startAt = String(body.start_at ?? "").trim();
  const endAt = String(body.end_at ?? "").trim();
  const kind = String(body.type ?? body.kind ?? "inspection").trim().toLowerCase();

  if (!jobId) return json(badRequest("job_id is required"));
  if (!startAt) return json(badRequest("start_at is required"));
  if (!endAt) return json(badRequest("end_at is required"));
  if (!VALID_KINDS.includes(kind)) {
    return json(badRequest(`Invalid type. Must be one of: ${VALID_KINDS.join(", ")}`));
  }

  // Verify job exists
  const { data: job } = await supabaseAdmin
    .from("admin_jobs")
    .select("id")
    .eq("id", jobId)
    .single();

  if (!job) return json(badRequest("Job not found"));

  const row = {
    job_id: jobId,
    start_at: startAt,
    end_at: endAt,
    kind,
    status: "pending",
    assignee: body.assignee ? String(body.assignee) : "unassigned",
    notes: body.notes ? String(body.notes) : null,
  };

  const { data, error } = await supabaseAdmin
    .from("admin_job_appointments")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error("POST /api/v1/schedules error:", error);
    return json(serverError(error.message));
  }

  return json(created(data));
}
