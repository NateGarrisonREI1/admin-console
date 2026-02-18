// src/app/api/v1/broker/leads/[id]/route.ts
import { NextRequest } from "next/server";
import { requireRole, json } from "../../../_lib/auth";
import { ok, badRequest, notFound, serverError } from "@/types/api";
import { BrokerService } from "@/lib/services/BrokerService";
import { NotFoundError } from "@/lib/services/errors";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/broker/leads/[id]
 * Get a single lead by ID with joined assessment and contractor data.
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireRole("broker");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  try {
    const svc = new BrokerService();
    const lead = await svc.getLead(id);
    return json(ok(lead));
  } catch (e: any) {
    if (e instanceof NotFoundError) return json(notFound(e.message));
    console.error("GET /api/v1/broker/leads/[id] error:", e);
    return json(serverError(e.message));
  }
}

/**
 * PATCH /api/v1/broker/leads/[id]
 * Update lead fields (price, status, notes, expiration).
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
  if ("price" in body) updates.price = body.price != null ? Number(body.price) : null;
  if ("status" in body) updates.status = String(body.status);
  if ("notes" in body) updates.notes = body.notes ? String(body.notes) : null;
  if ("expiration_date" in body) updates.expiration_date = body.expiration_date ? String(body.expiration_date) : null;
  if ("description" in body) updates.description = body.description ? String(body.description) : null;
  if ("visibility" in body) updates.visibility = String(body.visibility);

  if (Object.keys(updates).length === 0) {
    return json(badRequest("No valid fields to update"));
  }

  try {
    const svc = new BrokerService();
    const lead = await svc.updateLead(id, updates as any);
    return json(ok(lead));
  } catch (e: any) {
    if (e instanceof NotFoundError) return json(notFound(e.message));
    console.error("PATCH /api/v1/broker/leads/[id] error:", e);
    return json(serverError(e.message));
  }
}

/**
 * DELETE /api/v1/broker/leads/[id]
 * Hard-delete a lead.
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireRole("broker");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  try {
    const svc = new BrokerService();
    await svc.deleteLead(id);
    return json(ok({ deleted: true }));
  } catch (e: any) {
    if (e instanceof NotFoundError) return json(notFound(e.message));
    console.error("DELETE /api/v1/broker/leads/[id] error:", e);
    return json(serverError(e.message));
  }
}
