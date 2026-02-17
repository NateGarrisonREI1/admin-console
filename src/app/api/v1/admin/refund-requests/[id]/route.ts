// GET /api/v1/admin/refund-requests/[id]
// Get a single refund request with full details (admin only).

import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/v1/_lib/auth";
import { RefundService } from "@/lib/services/RefundService";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const detail = await RefundService.getRefundRequestWithDetails(id);
    return NextResponse.json({ data: detail, status: 200 });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    return NextResponse.json(
      { error: e.message },
      { status: e.statusCode ?? 500 }
    );
  }
}
