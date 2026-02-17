// POST /api/v1/admin/refund-requests/[id]/approve
// Admin approves a refund request, triggering Stripe refund.

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
    const { adminNotes } = body as { adminNotes?: string };

    const updated = await RefundService.approveRefund(id, auth.userId, adminNotes);

    return NextResponse.json({ data: updated, status: 200 });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    return NextResponse.json(
      { error: e.message },
      { status: e.statusCode ?? 500 }
    );
  }
}
