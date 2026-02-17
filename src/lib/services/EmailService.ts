// src/lib/services/EmailService.ts
// Email notification helpers.
// Currently logs emails to console. Swap in Resend/SendGrid when ready.

import { supabaseAdmin } from "@/lib/supabase/server";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

async function sendEmail(payload: EmailPayload) {
  // TODO: Replace with Resend or SendGrid integration
  console.log("[EmailService] Would send email:", {
    to: payload.to,
    subject: payload.subject,
  });
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
