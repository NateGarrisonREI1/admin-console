// src/lib/services/RefundService.ts
// Refund request management: creation, risk scoring, admin review.

import { supabaseAdmin } from "@/lib/supabase/server";
import { StripeService } from "./StripeService";
import { AuditLogService } from "./AuditLogService";
import {
  sendRefundRequestedEmail,
  sendRefundApprovedEmail,
  sendRefundDeniedEmail,
  sendRefundMoreInfoEmail,
} from "./EmailService";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  AuthorizationError,
  InternalError,
} from "./errors";
import type {
  RefundRequest,
  RefundRequestWithDetails,
  RefundReasonCategory,
  ContractorRefundStats,
  LeadType,
} from "@/types/stripe";

/** Configurable refund window in days. */
const REFUND_WINDOW_DAYS = 30;

export class RefundService {
  // ────────────────────────────────────────
  // Contractor: request a refund
  // ────────────────────────────────────────

  static async requestRefund(
    contractorId: string,
    leadId: string,
    leadType: LeadType,
    reason: string,
    reasonCategory: RefundReasonCategory,
    notes?: string
  ): Promise<RefundRequest> {
    if (!reason || reason.trim().length === 0) {
      throw new ValidationError("Reason is required");
    }

    // Find the payment for this lead
    const paymentFilter =
      leadType === "system_lead"
        ? { system_lead_id: leadId }
        : { hes_request_id: leadId };

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, amount, created_at, stripe_payment_intent_id, refund_status")
      .eq("contractor_id", contractorId)
      .eq(leadType === "system_lead" ? "system_lead_id" : "hes_request_id", leadId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!payment) {
      throw new NotFoundError("Payment for this lead");
    }

    // Already refunded or has pending request
    if (payment.refund_status && payment.refund_status !== "none") {
      throw new ConflictError(
        `A refund has already been ${payment.refund_status} for this lead`
      );
    }

    // Check refund window
    const purchaseDate = new Date(payment.created_at);
    const daysSincePurchase =
      (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePurchase > REFUND_WINDOW_DAYS) {
      throw new ValidationError(
        `Refund window has expired. Refunds must be requested within ${REFUND_WINDOW_DAYS} days of purchase.`
      );
    }

    // Check for duplicate pending request
    const { data: existing } = await supabaseAdmin
      .from("refund_requests")
      .select("id")
      .eq("contractor_id", contractorId)
      .eq("lead_id", leadId)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      throw new ConflictError("A refund request is already pending for this lead");
    }

    // Calculate risk score
    const riskScore = await this.calculateRefundRisk(contractorId, payment.amount, daysSincePurchase, notes);

    // Create refund request
    const { data: refundReq, error } = await supabaseAdmin
      .from("refund_requests")
      .insert({
        payment_id: payment.id,
        contractor_id: contractorId,
        lead_id: leadId,
        lead_type: leadType,
        reason: reason.trim(),
        reason_category: reasonCategory,
        notes: notes?.trim() || null,
        risk_score: riskScore,
      })
      .select()
      .single();

    if (error) throw new InternalError(error.message);

    // Update payment refund status
    await supabaseAdmin
      .from("payments")
      .update({ refund_status: "requested", refund_request_id: refundReq.id })
      .eq("id", payment.id);

    // Audit + email (fire-and-forget)
    AuditLogService.logRefundRequested(contractorId, refundReq.id).catch(console.error);
    sendRefundRequestedEmail(contractorId, leadId, refundReq.id).catch(console.error);

    return refundReq as RefundRequest;
  }

  // ────────────────────────────────────────
  // Risk scoring
  // ────────────────────────────────────────

  static async calculateRefundRisk(
    contractorId: string,
    amount: number,
    daysSincePurchase: number,
    notes?: string | null
  ): Promise<number> {
    let score = 0;

    // Recent refund requests (>2 in last 7 days = +30)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: recentRefunds } = await supabaseAdmin
      .from("refund_requests")
      .select("id", { count: "exact", head: true })
      .eq("contractor_id", contractorId)
      .gte("requested_date", sevenDaysAgo);

    if ((recentRefunds ?? 0) > 2) score += 30;

    // High refund rate (>30% = +25)
    const { count: totalPurchases } = await supabaseAdmin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("contractor_id", contractorId)
      .eq("status", "completed");

    const { count: totalRefundReqs } = await supabaseAdmin
      .from("refund_requests")
      .select("id", { count: "exact", head: true })
      .eq("contractor_id", contractorId);

    const total = totalPurchases ?? 0;
    const refunds = totalRefundReqs ?? 0;
    if (total > 0 && refunds / total > 0.3) score += 25;

    // Short notes (<10 chars = +15)
    if (notes && notes.trim().length > 0 && notes.trim().length < 10) score += 15;

    // Same-day refund (+20)
    if (daysSincePurchase < 1) score += 20;

    // High amount (>$100 = +10)
    if (amount > 100) score += 10;

    return Math.min(score, 100);
  }

  // ────────────────────────────────────────
  // Admin: approve refund
  // ────────────────────────────────────────

  static async approveRefund(
    refundRequestId: string,
    adminId: string,
    adminNotes?: string
  ): Promise<RefundRequest> {
    const req = await this.getRefundRequest(refundRequestId);

    if (req.status !== "pending" && req.status !== "more_info_requested") {
      throw new ConflictError(`Cannot approve a refund with status "${req.status}"`);
    }

    // Get the payment's Stripe payment intent ID
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, amount, stripe_payment_intent_id")
      .eq("id", req.payment_id)
      .single();

    if (!payment) throw new NotFoundError("Payment", req.payment_id);

    // Issue Stripe refund
    let stripeRefundId: string | null = null;
    if (payment.stripe_payment_intent_id) {
      const refund = await StripeService.refundPayment(payment.stripe_payment_intent_id);
      stripeRefundId = refund.id;
    }

    const now = new Date().toISOString();

    // Update refund request
    const { data: updated, error } = await supabaseAdmin
      .from("refund_requests")
      .update({
        status: "approved",
        reviewed_by: adminId,
        reviewed_date: now,
        admin_notes: adminNotes?.trim() || null,
        refund_date: now,
      })
      .eq("id", refundRequestId)
      .select()
      .single();

    if (error) throw new InternalError(error.message);

    // Update payment
    await supabaseAdmin
      .from("payments")
      .update({
        refund_status: "refunded",
        refund_amount: payment.amount,
        refund_stripe_id: stripeRefundId,
        refund_date: now,
        status: "refunded",
      })
      .eq("id", payment.id);

    // Audit + email
    AuditLogService.logRefundApproved(adminId, refundRequestId, payment.amount).catch(console.error);
    sendRefundApprovedEmail(req.contractor_id, payment.amount).catch(console.error);

    return updated as RefundRequest;
  }

  // ────────────────────────────────────────
  // Admin: deny refund
  // ────────────────────────────────────────

  static async denyRefund(
    refundRequestId: string,
    adminId: string,
    reason: string
  ): Promise<RefundRequest> {
    const req = await this.getRefundRequest(refundRequestId);

    if (req.status !== "pending" && req.status !== "more_info_requested") {
      throw new ConflictError(`Cannot deny a refund with status "${req.status}"`);
    }

    const now = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from("refund_requests")
      .update({
        status: "denied",
        reviewed_by: adminId,
        reviewed_date: now,
        admin_notes: reason.trim(),
      })
      .eq("id", refundRequestId)
      .select()
      .single();

    if (error) throw new InternalError(error.message);

    // Update payment refund status
    await supabaseAdmin
      .from("payments")
      .update({ refund_status: "denied" })
      .eq("id", req.payment_id);

    // Audit + email
    AuditLogService.logRefundDenied(adminId, refundRequestId, reason).catch(console.error);
    sendRefundDeniedEmail(req.contractor_id, reason).catch(console.error);

    return updated as RefundRequest;
  }

  // ────────────────────────────────────────
  // Admin: request more info
  // ────────────────────────────────────────

  static async requestMoreInfo(
    refundRequestId: string,
    adminId: string,
    question: string
  ): Promise<RefundRequest> {
    if (!question || question.trim().length === 0) {
      throw new ValidationError("Question is required");
    }

    const req = await this.getRefundRequest(refundRequestId);

    if (req.status !== "pending") {
      throw new ConflictError(`Cannot request info for a refund with status "${req.status}"`);
    }

    const now = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from("refund_requests")
      .update({
        status: "more_info_requested",
        info_requested: question.trim(),
        info_requested_date: now,
        reviewed_by: adminId,
      })
      .eq("id", refundRequestId)
      .select()
      .single();

    if (error) throw new InternalError(error.message);

    // Audit + email
    AuditLogService.logRefundInfoRequested(adminId, refundRequestId, question).catch(console.error);
    sendRefundMoreInfoEmail(req.contractor_id, question).catch(console.error);

    return updated as RefundRequest;
  }

  // ────────────────────────────────────────
  // Queries
  // ────────────────────────────────────────

  static async getRefundRequest(id: string): Promise<RefundRequest> {
    const { data, error } = await supabaseAdmin
      .from("refund_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) throw new NotFoundError("Refund request", id);

    return data as RefundRequest;
  }

  /**
   * Get a refund request with full details for admin review.
   */
  static async getRefundRequestWithDetails(id: string): Promise<RefundRequestWithDetails> {
    const req = await this.getRefundRequest(id);

    // Get payment amount
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("amount")
      .eq("id", req.payment_id)
      .single();

    // Get contractor profile
    const { data: profile } = await supabaseAdmin
      .from("app_profiles")
      .select("full_name, email")
      .eq("id", req.contractor_id)
      .single();

    const { data: contractorProfile } = await supabaseAdmin
      .from("contractor_profiles")
      .select("company_name")
      .eq("id", req.contractor_id)
      .maybeSingle();

    // Get lead details
    let leadAddress: string | null = null;
    let leadSystemType: string | null = null;

    if (req.lead_type === "system_lead") {
      const { data: lead } = await supabaseAdmin
        .from("system_leads")
        .select("city, state, zip, system_type")
        .eq("id", req.lead_id)
        .single();
      if (lead) {
        leadAddress = [lead.city, lead.state, lead.zip].filter(Boolean).join(", ");
        leadSystemType = lead.system_type;
      }
    } else {
      const { data: lead } = await supabaseAdmin
        .from("hes_requests")
        .select("property_address, city, state")
        .eq("id", req.lead_id)
        .single();
      if (lead) {
        leadAddress = [lead.property_address, lead.city, lead.state].filter(Boolean).join(", ");
        leadSystemType = "HES";
      }
    }

    // Get contractor stats
    const stats = await this.getContractorStats(req.contractor_id);

    return {
      ...req,
      contractor_name: profile?.full_name ?? null,
      contractor_email: profile?.email ?? null,
      contractor_company: contractorProfile?.company_name ?? null,
      lead_address: leadAddress,
      lead_system_type: leadSystemType,
      amount: payment?.amount ?? 0,
      contractor_stats: stats,
    };
  }

  /**
   * List refund requests with optional filters (admin).
   */
  static async listRefundRequests(filters: {
    status?: string;
    contractorId?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<RefundRequestWithDetails[]> {
    let query = supabaseAdmin
      .from("refund_requests")
      .select("*")
      .order("requested_date", { ascending: false });

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters.contractorId) {
      query = query.eq("contractor_id", filters.contractorId);
    }
    if (filters.dateFrom) {
      query = query.gte("requested_date", filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte("requested_date", filters.dateTo);
    }

    const { data, error } = await query;
    if (error) throw new InternalError(error.message);

    // Enrich each request with details
    const enriched: RefundRequestWithDetails[] = [];
    for (const req of data ?? []) {
      const detail = await this.getRefundRequestWithDetails(req.id);
      enriched.push(detail);
    }

    return enriched;
  }

  /**
   * List refund requests for a specific contractor.
   */
  static async listContractorRefunds(contractorId: string): Promise<RefundRequest[]> {
    const { data, error } = await supabaseAdmin
      .from("refund_requests")
      .select("*")
      .eq("contractor_id", contractorId)
      .order("requested_date", { ascending: false });

    if (error) throw new InternalError(error.message);

    return (data ?? []) as RefundRequest[];
  }

  // ────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────

  private static async getContractorStats(contractorId: string): Promise<ContractorRefundStats> {
    // Total purchases
    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("amount")
      .eq("contractor_id", contractorId)
      .eq("status", "completed");

    const totalPurchased = payments?.length ?? 0;
    const avgLeadValue =
      totalPurchased > 0
        ? (payments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0) / totalPurchased
        : 0;

    // Closed leads
    const { count: totalClosed } = await supabaseAdmin
      .from("contractor_lead_status")
      .select("id", { count: "exact", head: true })
      .eq("contractor_id", contractorId)
      .eq("status", "closed");

    const conversionRate =
      totalPurchased > 0 ? Math.round(((totalClosed ?? 0) / totalPurchased) * 100) : 0;

    // Refund history
    const { count: prevRequests } = await supabaseAdmin
      .from("refund_requests")
      .select("id", { count: "exact", head: true })
      .eq("contractor_id", contractorId);

    const { count: prevApprovals } = await supabaseAdmin
      .from("refund_requests")
      .select("id", { count: "exact", head: true })
      .eq("contractor_id", contractorId)
      .eq("status", "approved");

    return {
      total_purchased: totalPurchased,
      total_closed: totalClosed ?? 0,
      conversion_rate: conversionRate,
      previous_refund_requests: prevRequests ?? 0,
      previous_refund_approvals: prevApprovals ?? 0,
      avg_lead_value: Math.round(avgLeadValue * 100) / 100,
    };
  }
}
