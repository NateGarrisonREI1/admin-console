"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { RefundService } from "@/lib/services/RefundService";
import type { RefundRequestWithDetails } from "@/types/stripe";

export async function fetchRefundRequests(
  status?: string
): Promise<RefundRequestWithDetails[]> {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) return [];

  return RefundService.listRefundRequests({ status });
}

export async function fetchRefundRequestDetail(id: string) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) throw new Error("Not authenticated");

  return RefundService.getRefundRequestWithDetails(id);
}

export async function approveRefundAction(refundRequestId: string, adminNotes?: string) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  return RefundService.approveRefund(refundRequestId, userId, adminNotes);
}

export async function denyRefundAction(refundRequestId: string, reason: string) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  return RefundService.denyRefund(refundRequestId, userId, reason);
}

export async function requestMoreInfoAction(refundRequestId: string, question: string) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  return RefundService.requestMoreInfo(refundRequestId, userId, question);
}
