// src/app/api/v1/broker/analytics/route.ts
import { requireRole, json } from "../../_lib/auth";
import { ok, serverError } from "@/types/api";
import { BrokerService } from "@/lib/services/BrokerService";

/**
 * GET /api/v1/broker/analytics
 * Get full broker analytics: KPIs, leads by system type, top contractors.
 */
export async function GET() {
  const auth = await requireRole("broker");
  if (!auth.ok) return auth.response;

  try {
    const svc = new BrokerService();
    const broker = await svc.getOrCreateBroker(auth.userId);
    const analytics = await svc.getAnalytics(broker.id);
    return json(ok(analytics));
  } catch (e: any) {
    console.error("GET /api/v1/broker/analytics error:", e);
    return json(serverError(e.message));
  }
}
