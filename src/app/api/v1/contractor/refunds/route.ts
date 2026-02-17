// GET /api/v1/contractor/refunds
// List refund requests for the authenticated contractor.

import { NextResponse } from "next/server";
import { requireRole } from "@/app/api/v1/_lib/auth";
import { RefundService } from "@/lib/services/RefundService";

export async function GET() {
  const auth = await requireRole("contractor");
  if (!auth.ok) return auth.response;

  try {
    const refunds = await RefundService.listContractorRefunds(auth.userId);
    return NextResponse.json({ data: refunds, status: 200 });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    return NextResponse.json(
      { error: e.message },
      { status: e.statusCode ?? 500 }
    );
  }
}
