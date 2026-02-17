// GET /api/v1/admin/refund-requests
// List all refund requests with optional filters (admin only).

import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/v1/_lib/auth";
import { RefundService } from "@/lib/services/RefundService";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const contractorId = url.searchParams.get("contractor_id") ?? undefined;
  const dateFrom = url.searchParams.get("date_from") ?? undefined;
  const dateTo = url.searchParams.get("date_to") ?? undefined;

  try {
    const requests = await RefundService.listRefundRequests({
      status,
      contractorId,
      dateFrom,
      dateTo,
    });
    return NextResponse.json({ data: requests, status: 200 });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    return NextResponse.json(
      { error: e.message },
      { status: e.statusCode ?? 500 }
    );
  }
}
