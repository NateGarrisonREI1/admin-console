// src/types/stripe.ts
// Stripe + payment-related type definitions.

export type LeadType = "system_lead" | "hes_request";

export type PaymentIntentResult = {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
};

export type PaymentConfirmResult = {
  status: string;
  amount: number;
  chargeId: string | null;
};

export type StripeWebhookMetadata = {
  user_id: string;
  lead_id: string;
  lead_type: LeadType;
};

export type PurchaseIntentRequest = {
  leadId: string;
  leadType: LeadType;
};

// ──────────────────────────────────────────
// Refund types
// ──────────────────────────────────────────

export type RefundRequestStatus = "pending" | "approved" | "denied" | "more_info_requested";

export type RefundReasonCategory =
  | "no_response"
  | "competitor"
  | "bad_quality"
  | "not_interested"
  | "duplicate"
  | "other";

export const REFUND_REASON_LABELS: Record<RefundReasonCategory, string> = {
  no_response: "No homeowner response",
  competitor: "Already working with competitor",
  bad_quality: "Invalid / bad lead quality",
  not_interested: "Customer not interested",
  duplicate: "Duplicate lead",
  other: "Other",
};

export type RefundRequest = {
  id: string;
  payment_id: string;
  contractor_id: string;
  lead_id: string;
  lead_type: LeadType;
  reason: string;
  reason_category: RefundReasonCategory;
  notes: string | null;
  requested_date: string;
  status: RefundRequestStatus;
  reviewed_by: string | null;
  reviewed_date: string | null;
  admin_notes: string | null;
  refund_date: string | null;
  info_requested: string | null;
  info_requested_date: string | null;
  info_response: string | null;
  info_response_date: string | null;
  risk_score: number;
  created_at: string;
  updated_at: string;
};

export type RefundRequestWithDetails = RefundRequest & {
  contractor_name: string | null;
  contractor_email: string | null;
  contractor_company: string | null;
  lead_address: string | null;
  lead_system_type: string | null;
  amount: number;
  contractor_stats: ContractorRefundStats;
};

export type ContractorRefundStats = {
  total_purchased: number;
  total_closed: number;
  conversion_rate: number;
  previous_refund_requests: number;
  previous_refund_approvals: number;
  avg_lead_value: number;
};

export type PaymentRefundStatus = "none" | "requested" | "approved" | "denied" | "refunded";

// ──────────────────────────────────────────
// Audit log types
// ──────────────────────────────────────────

export type AuditLog = {
  id: string;
  action: string;
  actor_id: string | null;
  actor_role: string | null;
  resource_type: string;
  resource_id: string;
  changes: Record<string, unknown> | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
};
