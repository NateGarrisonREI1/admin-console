// src/app/api/v1/broker/dashboard/route.ts
import { requireRole, json } from "../../_lib/auth";
import { ok, serverError } from "@/types/api";
import { BrokerService } from "@/lib/services/BrokerService";

/**
 * GET /api/v1/broker/dashboard
 * Get broker dashboard KPIs for the last 30 days.
 */
export async function GET() {
  const auth = await requireRole("broker");
  if (!auth.ok) return auth.response;

  try {
    const svc = new BrokerService();
    const broker = await svc.getOrCreateBroker(auth.userId);
    const kpis = await svc.getDashboardKPIs(broker.id);
    return json(ok({ broker, kpis }));
  } catch (e: any) {
    console.error("GET /api/v1/broker/dashboard error:", e);
    return json(serverError(e.message));
  }
}
