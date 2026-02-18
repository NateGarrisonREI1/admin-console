// src/app/api/v1/broker/leads/route.ts
import { NextRequest } from "next/server";
import { requireRole, json } from "../../_lib/auth";
import { ok, created, badRequest, serverError } from "@/types/api";
import { BrokerService } from "@/lib/services/BrokerService";

/**
 * GET /api/v1/broker/leads
 * List broker's leads with optional status and system_type filters.
 */
export async function GET(req: NextRequest) {
  const auth = await requireRole("broker");
  if (!auth.ok) return auth.response;

  const status = req.nextUrl.searchParams.get("status") ?? undefined;

  try {
    const svc = new BrokerService();
    const broker = await svc.getOrCreateBroker(auth.userId);
    const leads = await svc.getLeads(broker.id, status);
    return json(ok(leads));
  } catch (e: any) {
    console.error("GET /api/v1/broker/leads error:", e);
    return json(serverError(e.message));
  }
}

/**
 * POST /api/v1/broker/leads
 * Post a new lead to the marketplace.
 */
export async function POST(req: NextRequest) {
  const auth = await requireRole("broker");
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(badRequest("Invalid JSON body"));
  }

  const systemType = String(body.system_type ?? "").trim();
  if (!systemType) return json(badRequest("system_type is required"));

  const price = Number(body.price);
  if (!price || price <= 0) return json(badRequest("price must be a positive number"));

  try {
    const svc = new BrokerService();
    const broker = await svc.getOrCreateBroker(auth.userId);
    const lead = await svc.postLead({
      broker_id: broker.id,
      assessment_id: body.assessment_id ? String(body.assessment_id) : undefined,
      lead_type: body.lead_type ? String(body.lead_type) : undefined,
      system_type: systemType,
      price,
      description: body.description ? String(body.description) : undefined,
      expiration_date: body.expiration_date ? String(body.expiration_date) : undefined,
      visibility: body.visibility ? String(body.visibility) : undefined,
      assigned_to_provider_id: body.assigned_to_provider_id ? String(body.assigned_to_provider_id) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
    });
    return json(created(lead));
  } catch (e: any) {
    console.error("POST /api/v1/broker/leads error:", e);
    return json(serverError(e.message));
  }
}
