// src/app/api/v1/broker/contractors/[id]/route.ts
import { NextRequest } from "next/server";
import { requireRole, json } from "../../../_lib/auth";
import { ok, badRequest, notFound, serverError } from "@/types/api";
import { BrokerService } from "@/lib/services/BrokerService";
import { NotFoundError } from "@/lib/services/errors";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/broker/contractors/[id]
 * Get a single contractor by ID.
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireRole("broker");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  try {
    const svc = new BrokerService();
    const contractor = await svc.getContractor(id);
    return json(ok(contractor));
  } catch (e: any) {
    if (e instanceof NotFoundError) return json(notFound(e.message));
    console.error("GET /api/v1/broker/contractors/[id] error:", e);
    return json(serverError(e.message));
  }
}

/**
 * PATCH /api/v1/broker/contractors/[id]
 * Update a contractor's details.
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireRole("broker");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(badRequest("Invalid JSON body"));
  }

  const updates: Record<string, unknown> = {};
  if ("contractor_name" in body) updates.contractor_name = String(body.contractor_name).trim();
  if ("contractor_email" in body) updates.contractor_email = body.contractor_email ? String(body.contractor_email).trim() : null;
  if ("contractor_phone" in body) updates.contractor_phone = body.contractor_phone ? String(body.contractor_phone).trim() : null;
  if ("service_types" in body && Array.isArray(body.service_types)) updates.service_types = body.service_types.map(String);
  if ("lead_cost_override" in body) updates.lead_cost_override = body.lead_cost_override != null ? Number(body.lead_cost_override) : null;
  if ("commission_split_override" in body) updates.commission_split_override = body.commission_split_override != null ? Number(body.commission_split_override) : null;
  if ("status" in body) updates.status = String(body.status);
  if ("notes" in body) updates.notes = body.notes ? String(body.notes) : null;

  if (Object.keys(updates).length === 0) {
    return json(badRequest("No valid fields to update"));
  }

  try {
    const svc = new BrokerService();
    const contractor = await svc.updateContractor(id, updates as any);
    return json(ok(contractor));
  } catch (e: any) {
    if (e instanceof NotFoundError) return json(notFound(e.message));
    console.error("PATCH /api/v1/broker/contractors/[id] error:", e);
    return json(serverError(e.message));
  }
}

/**
 * DELETE /api/v1/broker/contractors/[id]
 * Soft-remove a contractor (sets status to "removed").
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireRole("broker");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  try {
    const svc = new BrokerService();
    await svc.removeContractor(id);
    return json(ok({ removed: true }));
  } catch (e: any) {
    if (e instanceof NotFoundError) return json(notFound(e.message));
    console.error("DELETE /api/v1/broker/contractors/[id] error:", e);
    return json(serverError(e.message));
  }
}
