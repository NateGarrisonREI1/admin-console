// src/lib/services/EmailService.ts
// Email sending via SendGrid + campaign email helpers.

import sgMail from "@sendgrid/mail";
import { supabaseAdmin } from "@/lib/supabase/server";

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "support@renewableenergyincentives.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://leafenergy.app";

// Init SendGrid once
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

async function sendEmail(payload: EmailPayload) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log("[EmailService] No SENDGRID_API_KEY set, logging email:", {
      to: payload.to,
      subject: payload.subject,
    });
    return;
  }

  console.log("[EmailService] Sending email:", { to: payload.to, subject: payload.subject, from: FROM_EMAIL });

  try {
    const [response] = await sgMail.send({
      from: { email: FROM_EMAIL, name: "LEAF Energy" },
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    console.log("[EmailService] SendGrid response:", response.statusCode);
  } catch (err: any) {
    console.error("[EmailService] SendGrid error:", err?.response?.body || err.message || err);
    throw err;
  }
}

async function sendEmailWithAttachments(payload: {
  to: string;
  subject: string;
  html: string;
  attachments: { filename: string; content: Buffer }[];
}) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log("[EmailService] No SENDGRID_API_KEY set, logging email:", {
      to: payload.to,
      subject: payload.subject,
      attachmentCount: payload.attachments.length,
    });
    return;
  }

  console.log("[EmailService] Sending email with attachments:", {
    to: payload.to,
    subject: payload.subject,
    from: FROM_EMAIL,
    attachments: payload.attachments.map((a) => a.filename),
  });

  try {
    const [response] = await sgMail.send({
      from: { email: FROM_EMAIL, name: "LEAF Energy" },
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      attachments: payload.attachments.map((a) => ({
        filename: a.filename,
        content: a.content.toString("base64"),
        type: "application/pdf",
        disposition: "attachment",
      })),
    });
    console.log("[EmailService] SendGrid response:", response.statusCode);
  } catch (err: any) {
    console.error("[EmailService] SendGrid error:", err?.response?.body || err.message || err);
    throw err;
  }
}

// ──────────────────────────────────────────
// Receipt email
// ──────────────────────────────────────────

export async function sendReceiptEmail(params: {
  to: string;
  customerName: string;
  serviceName: string;
  amount: string;
  paidDate: string;
  reportUrl: string;
  receiptPdfBuffer: Buffer;
  receiptFilename: string;
}): Promise<void> {
  const { to, customerName, serviceName, amount, paidDate, reportUrl, receiptPdfBuffer, receiptFilename } = params;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 24px;text-align:center;border-bottom:2px solid #10b981;">
        <h1 style="color:#f1f5f9;font-size:24px;font-weight:700;margin:0 0 4px;">Payment Receipt</h1>
        <p style="color:#64748b;font-size:13px;margin:0;">LEAF Energy Services</p>
      </div>
      <div style="padding:32px 24px;">
        <p style="color:#e2e8f0;font-size:15px;margin:0 0 20px;">Hi ${customerName},</p>
        <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Thank you for your payment. Your receipt is attached to this email.
        </p>
        <div style="background:rgba(30,41,59,0.8);border:1px solid rgba(51,65,85,0.5);border-radius:12px;padding:20px;margin:0 0 24px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;">Service</td>
              <td style="padding:6px 0;color:#e2e8f0;font-size:14px;font-weight:600;text-align:right;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;">Date</td>
              <td style="padding:6px 0;color:#e2e8f0;font-size:14px;text-align:right;">${paidDate}</td>
            </tr>
            <tr>
              <td style="padding:12px 0 6px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;border-top:1px solid rgba(51,65,85,0.5);">Total Paid</td>
              <td style="padding:12px 0 6px;color:#10b981;font-size:20px;font-weight:700;text-align:right;border-top:1px solid rgba(51,65,85,0.5);">$${amount}</td>
            </tr>
          </table>
        </div>
        <div style="text-align:center;margin:0 0 24px;">
          <p style="color:#94a3b8;font-size:13px;margin:0 0 12px;">Your LEAF Home Energy Report:</p>
          <a href="${reportUrl}" style="display:inline-block;padding:14px 32px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
            View Your LEAF Report
          </a>
        </div>
        <p style="color:#475569;font-size:12px;margin:24px 0 0;text-align:center;">
          A PDF copy of your receipt is attached to this email.
        </p>
      </div>
      <div style="background:rgba(15,23,42,0.8);padding:20px 24px;text-align:center;border-top:1px solid rgba(51,65,85,0.3);">
        <p style="color:#64748b;font-size:12px;margin:0 0 4px;font-weight:600;">Renewable Energy Incentives</p>
        <p style="color:#475569;font-size:11px;margin:0;">
          Questions? <a href="mailto:support@renewableenergyincentives.com" style="color:#64748b;text-decoration:underline;">support@renewableenergyincentives.com</a>
        </p>
      </div>
    </div>
  `;

  await sendEmailWithAttachments({
    to,
    subject: `Payment Receipt — ${serviceName}`,
    html,
    attachments: [{ filename: receiptFilename, content: receiptPdfBuffer }],
  });
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
