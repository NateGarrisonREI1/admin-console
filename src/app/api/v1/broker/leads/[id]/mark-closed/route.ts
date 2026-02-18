// src/app/api/v1/broker/leads/[id]/mark-closed/route.ts
import { NextRequest } from "next/server";
import { requireRole, json } from "../../../../_lib/auth";
import { ok, notFound, serverError } from "@/types/api";
import { BrokerService } from "@/lib/services/BrokerService";
import { NotFoundError } from "@/lib/services/errors";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/broker/leads/[id]/mark-closed
 * Mark a sold lead as closed and calculate broker commission.
 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const auth = await requireRole("broker");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  try {
    const svc = new BrokerService();
    const broker = await svc.getOrCreateBroker(auth.userId);
    const lead = await svc.markLeadClosed(id, broker.id);
    return json(ok(lead));
  } catch (e: any) {
    if (e instanceof NotFoundError) return json(notFound(e.message));
    console.error("POST /api/v1/broker/leads/[id]/mark-closed error:", e);
    return json(serverError(e.message));
  }
}
