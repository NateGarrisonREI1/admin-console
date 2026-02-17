// POST /api/v1/contractor/leads/[leadId]/request-refund
// Contractor submits a refund request for a purchased lead.

import { NextResponse } from "next/server";
import { requireRole, json } from "@/app/api/v1/_lib/auth";
import { RefundService } from "@/lib/services/RefundService";
import type { RefundReasonCategory, LeadType } from "@/types/stripe";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const auth = await requireRole("contractor");
  if (!auth.ok) return auth.response;

  const { leadId } = await params;

  try {
    const body = await request.json();
    const {
      reason,
      reasonCategory,
      notes,
      leadType = "system_lead",
    } = body as {
      reason: string;
      reasonCategory: RefundReasonCategory;
      notes?: string;
      leadType?: LeadType;
    };

    if (!reason) {
      return NextResponse.json({ error: "reason is required" }, { status: 400 });
    }
    if (!reasonCategory) {
      return NextResponse.json({ error: "reasonCategory is required" }, { status: 400 });
    }

    const refundReq = await RefundService.requestRefund(
      auth.userId,
      leadId,
      leadType,
      reason,
      reasonCategory,
      notes
    );

    return NextResponse.json({ data: refundReq, status: 201 }, { status: 201 });
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    return NextResponse.json(
      { error: e.message },
      { status: e.statusCode ?? 500 }
    );
  }
}
