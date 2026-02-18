// src/app/api/v1/broker/assessments/route.ts
import { NextRequest } from "next/server";
import { requireRole, json } from "../../_lib/auth";
import { ok, created, badRequest, serverError } from "@/types/api";
import { BrokerService } from "@/lib/services/BrokerService";

/**
 * GET /api/v1/broker/assessments
 * List broker's assessments with optional status filter.
 */
export async function GET(req: NextRequest) {
  const auth = await requireRole("broker");
  if (!auth.ok) return auth.response;

  const status = req.nextUrl.searchParams.get("status") ?? undefined;

  try {
    const svc = new BrokerService();
    const broker = await svc.getOrCreateBroker(auth.userId);
    const assessments = await svc.getAssessments(broker.id, status);
    return json(ok(assessments));
  } catch (e: any) {
    console.error("GET /api/v1/broker/assessments error:", e);
    return json(serverError(e.message));
  }
}

/**
 * POST /api/v1/broker/assessments
 * Create a new assessment for the broker.
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

  const customerName = String(body.customer_name ?? "").trim();
  if (!customerName) return json(badRequest("customer_name is required"));

  try {
    const svc = new BrokerService();
    const broker = await svc.getOrCreateBroker(auth.userId);
    const assessment = await svc.createAssessment({
      broker_id: broker.id,
      customer_name: customerName,
      customer_email: body.customer_email ? String(body.customer_email).trim() : undefined,
      customer_phone: body.customer_phone ? String(body.customer_phone).trim() : undefined,
      address: body.address ? String(body.address).trim() : undefined,
      city: body.city ? String(body.city).trim() : undefined,
      state: body.state ? String(body.state).trim() : undefined,
      zip: body.zip ? String(body.zip).trim() : undefined,
    });
    return json(created(assessment));
  } catch (e: any) {
    console.error("POST /api/v1/broker/assessments error:", e);
    return json(serverError(e.message));
  }
}
