// src/lib/services/AuditLogService.ts
// Audit logging for admin and user actions.

import { supabaseAdmin } from "@/lib/supabase/server";

export class AuditLogService {
  static async log(
    action: string,
    actorId: string,
    actorRole: string,
    resourceType: string,
    resourceId: string,
    changes?: Record<string, unknown> | null,
    details?: string | null
  ) {
    await supabaseAdmin.from("audit_logs").insert({
      action,
      actor_id: actorId,
      actor_role: actorRole,
      resource_type: resourceType,
      resource_id: resourceId,
      changes: changes ?? null,
      details: details ?? null,
    });
  }

  static async logRefundRequested(contractorId: string, refundRequestId: string) {
    await this.log(
      "refund_requested",
      contractorId,
      "contractor",
      "refund_request",
      refundRequestId,
      null,
      "Contractor submitted a refund request"
    );
  }

  static async logRefundApproved(adminId: string, refundRequestId: string, amount: number) {
    await this.log(
      "refund_approved",
      adminId,
      "admin",
      "refund_request",
      refundRequestId,
      { amount },
      "Admin approved refund request"
    );
  }

  static async logRefundDenied(adminId: string, refundRequestId: string, reason: string) {
    await this.log(
      "refund_denied",
      adminId,
      "admin",
      "refund_request",
      refundRequestId,
      { reason },
      "Admin denied refund request"
    );
  }

  static async logRefundInfoRequested(adminId: string, refundRequestId: string, question: string) {
    await this.log(
      "refund_info_requested",
      adminId,
      "admin",
      "refund_request",
      refundRequestId,
      { question },
      "Admin requested more info for refund"
    );
  }
}
