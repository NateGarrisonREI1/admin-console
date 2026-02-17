// src/app/api/v1/customers/[id]/contact-history/route.ts
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin, requireAuth, json } from "../../../_lib/auth";
import { ok, created, badRequest, notFound, serverError } from "@/types/api";
import type { ContactMethod, ContactDirection } from "@/types/schema";

type Ctx = { params: Promise<{ id: string }> };

const VALID_METHODS: ContactMethod[] = ["phone", "email", "sms", "in_person", "system"];
const VALID_DIRECTIONS: ContactDirection[] = ["inbound", "outbound"];

/**
 * GET /api/v1/customers/[id]/contact-history
 * Get all contact log entries for a job.
 * Query params: method, direction, page, per_page
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const url = req.nextUrl;
  const method = url.searchParams.get("method");
  const direction = url.searchParams.get("direction");
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page")) || 50));
  const offset = (page - 1) * perPage;

  // Verify job exists
  const { data: job } = await supabaseAdmin
    .from("admin_jobs")
    .select("id")
    .eq("id", id)
    .single();

  if (!job) return json(notFound("Job not found"));

  let query = supabaseAdmin
    .from("contact_log")
    .select("*", { count: "exact" })
    .eq("admin_job_id", id)
    .order("contacted_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (method) query = query.eq("contact_method", method);
  if (direction) query = query.eq("direction", direction);

  const { data, error, count } = await query;

  if (error) {
    console.error("GET /api/v1/customers/[id]/contact-history error:", error);
    return json(serverError(error.message));
  }

  return json(ok({ items: data ?? [], total: count ?? 0, page, per_page: perPage }));
}

/**
 * POST /api/v1/customers/[id]/contact-history
 * Add a new contact log entry for a job.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(badRequest("Invalid JSON body"));
  }

  // Verify job exists
  const { data: job } = await supabaseAdmin
    .from("admin_jobs")
    .select("id")
    .eq("id", id)
    .single();

  if (!job) return json(notFound("Job not found"));

  const contactMethod = String(body.contact_method ?? "phone") as ContactMethod;
  const direction = String(body.direction ?? "outbound") as ContactDirection;

  if (!VALID_METHODS.includes(contactMethod)) {
    return json(badRequest(`Invalid contact_method. Must be one of: ${VALID_METHODS.join(", ")}`));
  }
  if (!VALID_DIRECTIONS.includes(direction)) {
    return json(badRequest(`Invalid direction. Must be one of: ${VALID_DIRECTIONS.join(", ")}`));
  }

  const row = {
    admin_job_id: id,
    contact_method: contactMethod,
    direction,
    subject: body.subject ? String(body.subject) : null,
    body: body.body ? String(body.body) : null,
    contacted_by: auth.userId,
    contacted_at: body.contacted_at ? String(body.contacted_at) : new Date().toISOString(),
    response_received: body.response_received === true,
    response_at: body.response_at ? String(body.response_at) : null,
  };

  const { data, error } = await supabaseAdmin
    .from("contact_log")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error("POST /api/v1/customers/[id]/contact-history error:", error);
    return json(serverError(error.message));
  }

  return json(created(data));
}
