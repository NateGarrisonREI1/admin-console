// POST /api/v1/admin/refund-requests/[id]/request-info
// Admin requests more information from the contractor.

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
    const { question } = body as { question: string };

    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    const updated = await RefundService.requestMoreInfo(id, auth.userId, question);

    return NextResponse.json({ data: updated, status: 200 });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    return NextResponse.json(
      { error: e.message },
      { status: e.statusCode ?? 500 }
    );
  }
}
