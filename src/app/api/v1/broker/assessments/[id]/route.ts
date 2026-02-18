// src/app/api/v1/broker/assessments/[id]/route.ts
import { NextRequest } from "next/server";
import { requireRole, json } from "../../../_lib/auth";
import { ok, notFound, serverError } from "@/types/api";
import { BrokerService } from "@/lib/services/BrokerService";
import { NotFoundError } from "@/lib/services/errors";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/broker/assessments/[id]
 * Get a single assessment by ID.
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireRole("broker");
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  try {
    const svc = new BrokerService();
    const assessment = await svc.getAssessment(id);
    return json(ok(assessment));
  } catch (e: any) {
    if (e instanceof NotFoundError) return json(notFound(e.message));
    console.error("GET /api/v1/broker/assessments/[id] error:", e);
    return json(serverError(e.message));
  }
}
