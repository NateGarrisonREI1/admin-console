// src/lib/services/EmailService.ts
// Email sending via Resend + campaign email helpers.

import { supabaseAdmin } from "@/lib/supabase/server";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@leafenergy.app";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://leafenergy.app";

// Lazy-init Resend to avoid build-time errors when API key is missing
let _resend: import("resend").Resend | null = null;
function getResend() {
  if (!_resend && process.env.RESEND_API_KEY) {
    const { Resend } = require("resend") as typeof import("resend");
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

async function sendEmail(payload: EmailPayload) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[EmailService] No RESEND_API_KEY set, logging email:", {
      to: payload.to,
      subject: payload.subject,
    });
    return;
  }

  const resend = getResend();
  if (!resend) return;

  try {
    const { error } = await resend.emails.send({
      from: `LEAF Energy <${FROM_EMAIL}>`,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    });
    if (error) console.error("[EmailService] Send failed:", error.message);
  } catch (err) {
    console.error("[EmailService] Send error:", err);
  }
}

// ──────────────────────────────────────────
// Campaign email helpers
// ──────────────────────────────────────────

export interface CampaignEmailInput {
  to: string;
  recipientName: string;
  brokerName: string;
  subject: string;
  message: string;
  recipientId: string;
}

export async function sendCampaignEmail(input: CampaignEmailInput): Promise<boolean> {
  const trackUrl = `${APP_URL}/api/v1/broker/campaigns/track?rid=${input.recipientId}&event=open`;
  const clickUrl = `${APP_URL}/api/v1/broker/campaigns/track?rid=${input.recipientId}&event=click`;

  const paragraphs = input.message
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => `<p style="margin:0 0 12px;">${l}</p>`)
    .join("");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b;">
      <p style="margin:0 0 12px;">Hi ${input.recipientName},</p>
      ${paragraphs}
      <div style="margin:24px 0;text-align:center;">
        <a href="${clickUrl}" style="display:inline-block;padding:14px 32px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
          View Your Assessment
        </a>
      </div>
      <p style="color:#64748b;font-size:13px;margin-top:24px;">
        This assessment was prepared for you by ${input.brokerName} through the LEAF Home Energy Program.
      </p>
      <img src="${trackUrl}" width="1" height="1" alt="" style="display:none;" />
    </div>
  `;

  await sendEmail({ to: input.to, subject: input.subject, html });
  return true;
}

export async function sendBatchCampaignEmails(
  emails: CampaignEmailInput[],
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < emails.length; i += 10) {
    const batch = emails.slice(i, i + 10);
    const results = await Promise.allSettled(batch.map((e) => sendCampaignEmail(e)));

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) sent++;
      else failed++;
    }

    if (i + 10 < emails.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return { sent, failed };
}

/**
 * Send a payment confirmation email with lead details.
 */
export async function sendPaymentConfirmationEmail(
  userId: string,
  leadId: string,
  amount: number,
  leadType: "system_lead" | "hes_request"
) {
  // Get user email
  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (!profile?.email) return;

  if (leadType === "system_lead") {
    const { data: lead } = await supabaseAdmin
      .from("system_leads")
      .select("system_type, city, state, zip, homeowner_name")
      .eq("id", leadId)
      .single();

    await sendEmail({
      to: profile.email,
      subject: `Lead Purchase Confirmation - ${lead?.system_type ?? "System"}`,
      html: `
        <h2>Lead Purchase Successful!</h2>
        <p>Hi ${profile.full_name ?? "there"},</p>
        <p>You've successfully purchased a <strong>${lead?.system_type ?? "system"}</strong> lead.</p>
        <h3>Lead Location:</h3>
        <p>${[lead?.city, lead?.state].filter(Boolean).join(", ")} ${lead?.zip ?? ""}</p>
        <h3>Payment:</h3>
        <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
        <p>Log in to your dashboard for full homeowner contact details.</p>
      `,
    });
  } else {
    const { data: lead } = await supabaseAdmin
      .from("hes_requests")
      .select("property_address, city, state, zip")
      .eq("id", leadId)
      .single();

    await sendEmail({
      to: profile.email,
      subject: "HES Lead Purchase Confirmation",
      html: `
        <h2>HES Lead Purchase Successful!</h2>
        <p>Hi ${profile.full_name ?? "there"},</p>
        <p>You've purchased an HES assessment lead.</p>
        <h3>Property:</h3>
        <p>${lead?.property_address ?? ""}, ${[lead?.city, lead?.state].filter(Boolean).join(", ")} ${lead?.zip ?? ""}</p>
        <h3>Payment:</h3>
        <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
        <p>Log in to your dashboard for full details and to mark the assessment complete.</p>
      `,
    });
  }
}

/**
 * Send a payment failure notification.
 */
export async function sendPaymentFailureEmail(
  userId: string,
  reason?: string
) {
  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (!profile?.email) return;

  await sendEmail({
    to: profile.email,
    subject: "Payment Failed",
    html: `
      <h2>Payment Failed</h2>
      <p>Hi ${profile.full_name ?? "there"},</p>
      <p>Your recent lead purchase payment could not be processed.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
      <p>Please try again or contact support.</p>
    `,
  });
}

// ──────────────────────────────────────────
// Refund emails
// ──────────────────────────────────────────

/**
 * Notify contractor that their refund request was submitted.
 */
export async function sendRefundRequestedEmail(
  contractorId: string,
  leadId: string,
  refundRequestId: string
) {
  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("email, full_name")
    .eq("id", contractorId)
    .single();

  if (!profile?.email) return;

  await sendEmail({
    to: profile.email,
    subject: "Refund Request Submitted",
    html: `
      <h2>Refund Request Received</h2>
      <p>Hi ${profile.full_name ?? "there"},</p>
      <p>We've received your refund request (ref: ${refundRequestId.slice(0, 8)}).</p>
      <p>Our team will review it within 3-5 business days. You'll receive an email once a decision is made.</p>
    `,
  });
}

/**
 * Notify contractor that their refund was approved.
 */
export async function sendRefundApprovedEmail(
  contractorId: string,
  amount: number
) {
  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("email, full_name")
    .eq("id", contractorId)
    .single();

  if (!profile?.email) return;

  await sendEmail({
    to: profile.email,
    subject: "Refund Approved",
    html: `
      <h2>Refund Approved</h2>
      <p>Hi ${profile.full_name ?? "there"},</p>
      <p>Your refund of <strong>$${amount.toFixed(2)}</strong> has been approved and is being processed.</p>
      <p>You should see the refund in your account within 3-5 business days.</p>
    `,
  });
}

/**
 * Notify contractor that their refund was denied.
 */
export async function sendRefundDeniedEmail(
  contractorId: string,
  reason: string
) {
  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("email, full_name")
    .eq("id", contractorId)
    .single();

  if (!profile?.email) return;

  await sendEmail({
    to: profile.email,
    subject: "Refund Request Denied",
    html: `
      <h2>Refund Request Denied</h2>
      <p>Hi ${profile.full_name ?? "there"},</p>
      <p>Unfortunately, your refund request has been denied.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>If you have questions, please contact our support team.</p>
    `,
  });
}

/**
 * Notify contractor that more info is needed for their refund.
 */
export async function sendRefundMoreInfoEmail(
  contractorId: string,
  question: string
) {
  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("email, full_name")
    .eq("id", contractorId)
    .single();

  if (!profile?.email) return;

  await sendEmail({
    to: profile.email,
    subject: "More Information Needed for Refund Request",
    html: `
      <h2>More Information Needed</h2>
      <p>Hi ${profile.full_name ?? "there"},</p>
      <p>We need some additional information to process your refund request:</p>
      <blockquote style="border-left:3px solid #cbd5e1;padding-left:12px;color:#475569;">${question}</blockquote>
      <p>Please respond within <strong>7 days</strong> or your request may be automatically denied.</p>
    `,
  });
}
