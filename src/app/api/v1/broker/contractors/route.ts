// src/app/api/v1/broker/contractors/route.ts
import { NextRequest } from "next/server";
import { requireRole, json } from "../../_lib/auth";
import { ok, created, badRequest, serverError } from "@/types/api";
import { BrokerService } from "@/lib/services/BrokerService";

/**
 * GET /api/v1/broker/contractors
 * List broker's contractors with optional status filter.
 */
export async function GET(req: NextRequest) {
  const auth = await requireRole("broker");
  if (!auth.ok) return auth.response;

  const status = req.nextUrl.searchParams.get("status") ?? undefined;

  try {
    const svc = new BrokerService();
    const broker = await svc.getOrCreateBroker(auth.userId);
    const contractors = await svc.getContractors(broker.id, status);
    return json(ok(contractors));
  } catch (e: any) {
    console.error("GET /api/v1/broker/contractors error:", e);
    return json(serverError(e.message));
  }
}

/**
 * POST /api/v1/broker/contractors
 * Add a contractor to the broker's network.
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

  const contractorName = String(body.contractor_name ?? "").trim();
  if (!contractorName) return json(badRequest("contractor_name is required"));

  try {
    const svc = new BrokerService();
    const broker = await svc.getOrCreateBroker(auth.userId);
    const contractor = await svc.createContractor({
      broker_id: broker.id,
      contractor_name: contractorName,
      contractor_email: body.contractor_email ? String(body.contractor_email).trim() : undefined,
      contractor_phone: body.contractor_phone ? String(body.contractor_phone).trim() : undefined,
      service_types: Array.isArray(body.service_types) ? body.service_types.map(String) : [],
      lead_cost_override: body.lead_cost_override != null ? Number(body.lead_cost_override) : undefined,
      commission_split_override: body.commission_split_override != null ? Number(body.commission_split_override) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
    });
    return json(created(contractor));
  } catch (e: any) {
    console.error("POST /api/v1/broker/contractors error:", e);
    return json(serverError(e.message));
  }
}
