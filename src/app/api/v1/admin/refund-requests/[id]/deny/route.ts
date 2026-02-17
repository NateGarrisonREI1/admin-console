// POST /api/v1/admin/refund-requests/[id]/deny
// Admin denies a refund request.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/v1/_lib/auth";
import { RefundService } from "@/lib/services/RefundService";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const body = await request.json();
    const { reason } = body as { reason: string };

    if (!reason) {
      return NextResponse.json({ error: "reason is required" }, { status: 400 });
    }

    const updated = await RefundService.denyRefund(id, auth.userId, reason);

    return NextResponse.json({ data: updated, status: 200 });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    return NextResponse.json(
      { error: e.message },
      { status: e.statusCode ?? 500 }
    );
  }
}
