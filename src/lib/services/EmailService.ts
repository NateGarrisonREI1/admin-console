// src/lib/services/EmailService.ts
// Email sending via SendGrid + campaign email helpers.
// Templates are loaded from the email_templates DB table with hardcoded fallbacks.

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
// DB template helper
// ──────────────────────────────────────────

async function getTemplateHtml(
  templateKey: string,
  variables: Record<string, string>
): Promise<{ subject: string; html: string } | null> {
  try {
    const { data } = await supabaseAdmin
      .from("email_templates")
      .select("subject, html_body")
      .eq("template_key", templateKey)
      .single();

    if (!data) return null;

    let subject: string = data.subject;
    let html: string = data.html_body;
    for (const [key, val] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      subject = subject.replace(pattern, val);
      html = html.replace(pattern, val);
    }
    return { subject, html };
  } catch {
    return null;
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

  // Try DB template first
  const tpl = await getTemplateHtml("receipt", {
    customer_name: customerName,
    service_name: serviceName,
    amount,
    paid_date: paidDate,
    report_url: reportUrl,
  });

  // Hardcoded fallback
  const fallbackHtml = `
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
    subject: tpl?.subject ?? `Payment Receipt — ${serviceName}`,
    html: tpl?.html ?? fallbackHtml,
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

  // Try DB template
  const tpl = await getTemplateHtml("campaign", {
    recipient_name: input.recipientName,
    broker_name: input.brokerName,
    subject: input.subject,
    message: paragraphs,
    click_url: clickUrl,
  });

  // Hardcoded fallback
  const fallbackHtml = `
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

  const finalHtml = tpl?.html
    ? `${tpl.html}<img src="${trackUrl}" width="1" height="1" alt="" style="display:none;" />`
    : fallbackHtml;

  await sendEmail({ to: input.to, subject: tpl?.subject ?? input.subject, html: finalHtml });
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
  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (!profile?.email) return;

  const buyerName = profile.full_name ?? "there";

  if (leadType === "system_lead") {
    const { data: lead } = await supabaseAdmin
      .from("system_leads")
      .select("system_type, city, state, zip, homeowner_name")
      .eq("id", leadId)
      .single();

    const leadTypeLabel = lead?.system_type ?? "System";
    const leadLocation = `${[lead?.city, lead?.state].filter(Boolean).join(", ")} ${lead?.zip ?? ""}`.trim();

    const tpl = await getTemplateHtml("payment_confirmation", {
      buyer_name: buyerName,
      lead_type_label: leadTypeLabel,
      lead_location: leadLocation,
      amount: amount.toFixed(2),
    });

    await sendEmail({
      to: profile.email,
      subject: tpl?.subject ?? `Lead Purchase Confirmation - ${leadTypeLabel}`,
      html: tpl?.html ?? `
        <h2>Lead Purchase Successful!</h2>
        <p>Hi ${buyerName},</p>
        <p>You've successfully purchased a <strong>${leadTypeLabel}</strong> lead.</p>
        <h3>Lead Location:</h3>
        <p>${leadLocation}</p>
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

    const leadLocation = `${lead?.property_address ?? ""}, ${[lead?.city, lead?.state].filter(Boolean).join(", ")} ${lead?.zip ?? ""}`.trim();

    const tpl = await getTemplateHtml("payment_confirmation", {
      buyer_name: buyerName,
      lead_type_label: "HES Assessment",
      lead_location: leadLocation,
      amount: amount.toFixed(2),
    });

    await sendEmail({
      to: profile.email,
      subject: tpl?.subject ?? "HES Lead Purchase Confirmation",
      html: tpl?.html ?? `
        <h2>HES Lead Purchase Successful!</h2>
        <p>Hi ${buyerName},</p>
        <p>You've purchased an HES assessment lead.</p>
        <h3>Property:</h3>
        <p>${leadLocation}</p>
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

  const buyerName = profile.full_name ?? "there";
  const reasonBlock = reason ? `<p><strong>Reason:</strong> ${reason}</p>` : "";

  const tpl = await getTemplateHtml("payment_failed", {
    buyer_name: buyerName,
    reason_block: reasonBlock,
  });

  await sendEmail({
    to: profile.email,
    subject: tpl?.subject ?? "Payment Failed",
    html: tpl?.html ?? `
      <h2>Payment Failed</h2>
      <p>Hi ${buyerName},</p>
      <p>Your recent lead purchase payment could not be processed.</p>
      ${reasonBlock}
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

  const contractorName = profile.full_name ?? "there";
  const refId = refundRequestId.slice(0, 8);

  const tpl = await getTemplateHtml("refund_requested", {
    contractor_name: contractorName,
    ref_id: refId,
  });

  await sendEmail({
    to: profile.email,
    subject: tpl?.subject ?? "Refund Request Submitted",
    html: tpl?.html ?? `
      <h2>Refund Request Received</h2>
      <p>Hi ${contractorName},</p>
      <p>We've received your refund request (ref: ${refId}).</p>
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

  const contractorName = profile.full_name ?? "there";

  const tpl = await getTemplateHtml("refund_approved", {
    contractor_name: contractorName,
    amount: amount.toFixed(2),
  });

  await sendEmail({
    to: profile.email,
    subject: tpl?.subject ?? "Refund Approved",
    html: tpl?.html ?? `
      <h2>Refund Approved</h2>
      <p>Hi ${contractorName},</p>
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

  const contractorName = profile.full_name ?? "there";

  const tpl = await getTemplateHtml("refund_denied", {
    contractor_name: contractorName,
    reason,
  });

  await sendEmail({
    to: profile.email,
    subject: tpl?.subject ?? "Refund Request Denied",
    html: tpl?.html ?? `
      <h2>Refund Request Denied</h2>
      <p>Hi ${contractorName},</p>
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

  const contractorName = profile.full_name ?? "there";

  const tpl = await getTemplateHtml("refund_more_info", {
    contractor_name: contractorName,
    question,
  });

  await sendEmail({
    to: profile.email,
    subject: tpl?.subject ?? "More Information Needed for Refund Request",
    html: tpl?.html ?? `
      <h2>More Information Needed</h2>
      <p>Hi ${contractorName},</p>
      <p>We need some additional information to process your refund request:</p>
      <blockquote style="border-left:3px solid #cbd5e1;padding-left:12px;color:#475569;">${question}</blockquote>
      <p>Please respond within <strong>7 days</strong> or your request may be automatically denied.</p>
    `,
  });
}

// ──────────────────────────────────────────
// Workflow emails — HES job flow
// ──────────────────────────────────────────

/**
 * Assessor en route notification to homeowner.
 */
export async function sendAssessorEnRouteEmail(params: {
  to: string;
  customerName: string;
  techName: string;
  serviceName?: string;
  eta?: string;
}): Promise<void> {
  const { to, customerName, techName, serviceName = "Home Energy Assessment", eta = "approximately 20 minutes" } = params;

  const tpl = await getTemplateHtml("assessor_en_route", {
    customer_name: customerName,
    tech_name: techName,
    service_name: serviceName,
    eta,
  });

  const fallbackHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 24px;text-align:center;border-bottom:2px solid #10b981;">
        <h1 style="color:#f1f5f9;font-size:24px;font-weight:700;margin:0 0 4px;">Your Assessor is On the Way</h1>
        <p style="color:#64748b;font-size:13px;margin:0;">LEAF Energy Services</p>
      </div>
      <div style="padding:32px 24px;">
        <p style="color:#e2e8f0;font-size:15px;margin:0 0 20px;">Hi ${customerName},</p>
        <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;">Your energy assessor <strong style="color:#10b981;">${techName}</strong> is on the way and should arrive in <strong style="color:#f1f5f9;">${eta}</strong>.</p>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">Please make sure the home is accessible. The assessor will evaluate your home's insulation, heating, cooling, windows, and more.</p>
      </div>
    </div>
  `;

  await sendEmail({
    to,
    subject: tpl?.subject ?? `Your ${serviceName} Assessor is On the Way`,
    html: tpl?.html ?? fallbackHtml,
  });
}

/**
 * Job confirmation email sent when a job is scheduled.
 * Optionally sends a copy to the broker.
 */
export async function sendJobConfirmationEmail(params: {
  to: string;
  customerName: string;
  scheduledDate: string;
  scheduledTime?: string;
  address: string;
  techName: string;
  serviceName?: string;
  brokerEmail?: string;
}): Promise<void> {
  const { to, customerName, scheduledDate, scheduledTime, address, techName, serviceName = "Home Energy Assessment", brokerEmail } = params;

  const tpl = await getTemplateHtml("job_confirmation", {
    customer_name: customerName,
    scheduled_date: scheduledDate,
    scheduled_time: scheduledTime || "TBD",
    address,
    tech_name: techName,
    service_name: serviceName,
  });

  const fallbackHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 24px;text-align:center;border-bottom:2px solid #10b981;">
        <h1 style="color:#f1f5f9;font-size:24px;font-weight:700;margin:0 0 4px;">Assessment Scheduled</h1>
        <p style="color:#64748b;font-size:13px;margin:0;">LEAF Energy Services</p>
      </div>
      <div style="padding:32px 24px;">
        <p style="color:#e2e8f0;font-size:15px;margin:0 0 20px;">Hi ${customerName},</p>
        <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;">Your home energy assessment has been scheduled.</p>
        <div style="background:rgba(30,41,59,0.8);border:1px solid rgba(51,65,85,0.5);border-radius:12px;padding:20px;margin:0 0 24px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:600;">DATE</td><td style="padding:6px 0;color:#e2e8f0;font-size:14px;text-align:right;">${scheduledDate}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:600;">TIME</td><td style="padding:6px 0;color:#e2e8f0;font-size:14px;text-align:right;">${scheduledTime || "TBD"}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:600;">ADDRESS</td><td style="padding:6px 0;color:#e2e8f0;font-size:14px;text-align:right;">${address}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:600;">ASSESSOR</td><td style="padding:6px 0;color:#e2e8f0;font-size:14px;text-align:right;">${techName}</td></tr>
          </table>
        </div>
        <p style="color:#64748b;font-size:13px;margin:0;text-align:center;">If you need to reschedule, please contact us.</p>
      </div>
    </div>
  `;

  const subject = tpl?.subject ?? `Your ${serviceName} is Confirmed — ${scheduledDate}`;
  const html = tpl?.html ?? fallbackHtml;

  await sendEmail({ to, subject, html });

  if (brokerEmail) {
    await sendEmail({ to: brokerEmail, subject, html });
  }
}

/**
 * Report delivery email to homeowner (reports only, no receipt).
 */
export async function sendReportDeliveryEmail(params: {
  to: string;
  customerName: string;
  address: string;
  hesReportUrl: string;
  leafReportUrl: string;
  serviceName?: string;
}): Promise<void> {
  const { to, customerName, address, hesReportUrl, leafReportUrl, serviceName = "Home Energy Assessment" } = params;

  const tpl = await getTemplateHtml("report_delivery", {
    customer_name: customerName,
    address,
    hes_report_url: hesReportUrl,
    leaf_report_url: leafReportUrl,
    service_name: serviceName,
  });

  const fallbackHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 24px;text-align:center;border-bottom:2px solid #10b981;">
        <h1 style="color:#f1f5f9;font-size:24px;font-weight:700;margin:0 0 4px;">Your Report is Ready</h1>
        <p style="color:#64748b;font-size:13px;margin:0;">LEAF Energy Services</p>
      </div>
      <div style="padding:32px 24px;">
        <p style="color:#e2e8f0;font-size:15px;margin:0 0 20px;">Hi ${customerName},</p>
        <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 8px;">Your home energy assessment for <strong style="color:#e2e8f0;">${address}</strong> is complete.</p>
        <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;">Here are your reports:</p>
        <div style="text-align:center;margin:0 0 16px;">
          <a href="${hesReportUrl}" style="display:inline-block;padding:14px 28px;background:#1e293b;color:#f1f5f9;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;border:1px solid #334155;margin:0 6px 8px;">View HES Report</a>
          <a href="${leafReportUrl}" style="display:inline-block;padding:14px 28px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;margin:0 6px 8px;">View LEAF Report</a>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    to,
    subject: tpl?.subject ?? `Your ${serviceName} Report is Ready`,
    html: tpl?.html ?? fallbackHtml,
  });
}

/**
 * Report delivery email to broker (for RMLS listing).
 */
export async function sendReportDeliveryBrokerEmail(params: {
  to: string;
  brokerName: string;
  address: string;
  hesReportUrl: string;
  homeownerName: string;
  serviceName?: string;
}): Promise<void> {
  const { to, brokerName, address, hesReportUrl, homeownerName, serviceName = "Home Energy Assessment" } = params;

  const tpl = await getTemplateHtml("report_delivery_broker", {
    broker_name: brokerName,
    address,
    hes_report_url: hesReportUrl,
    homeowner_name: homeownerName,
    service_name: serviceName,
  });

  const fallbackHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 24px;text-align:center;border-bottom:2px solid #10b981;">
        <h1 style="color:#f1f5f9;font-size:24px;font-weight:700;margin:0 0 4px;">HES Report Ready</h1>
        <p style="color:#64748b;font-size:13px;margin:0;">LEAF Energy Services</p>
      </div>
      <div style="padding:32px 24px;">
        <p style="color:#e2e8f0;font-size:15px;margin:0 0 20px;">Hi ${brokerName},</p>
        <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;">The HES report for <strong style="color:#e2e8f0;">${homeownerName}</strong> at <strong style="color:#e2e8f0;">${address}</strong> is now available for RMLS listing.</p>
        <div style="text-align:center;margin:0 0 16px;">
          <a href="${hesReportUrl}" style="display:inline-block;padding:14px 28px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View HES Report</a>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    to,
    subject: tpl?.subject ?? `${serviceName} Report Ready — ${address}`,
    html: tpl?.html ?? fallbackHtml,
  });
}

/**
 * Invoice email with Stripe payment link.
 */
export async function sendInvoiceEmail(params: {
  to: string;
  customerName: string;
  amount: string;
  serviceName: string;
  paymentLink: string;
}): Promise<void> {
  const { to, customerName, amount, serviceName, paymentLink } = params;

  const tpl = await getTemplateHtml("invoice", {
    customer_name: customerName,
    amount,
    service_name: serviceName,
    payment_link: paymentLink,
  });

  const fallbackHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 24px;text-align:center;border-bottom:2px solid #10b981;">
        <h1 style="color:#f1f5f9;font-size:24px;font-weight:700;margin:0 0 4px;">Invoice</h1>
        <p style="color:#64748b;font-size:13px;margin:0;">LEAF Energy Services</p>
      </div>
      <div style="padding:32px 24px;">
        <p style="color:#e2e8f0;font-size:15px;margin:0 0 20px;">Hi ${customerName},</p>
        <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;">Here is the invoice for your <strong style="color:#e2e8f0;">${serviceName}</strong>.</p>
        <div style="background:rgba(30,41,59,0.8);border:1px solid rgba(51,65,85,0.5);border-radius:12px;padding:20px;margin:0 0 24px;text-align:center;">
          <p style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;margin:0 0 4px;">Amount Due</p>
          <p style="color:#10b981;font-size:28px;font-weight:700;margin:0;">$${amount}</p>
        </div>
        <div style="text-align:center;">
          <a href="${paymentLink}" style="display:inline-block;padding:14px 32px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Pay Now</a>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    to,
    subject: tpl?.subject ?? `Invoice — ${serviceName}`,
    html: tpl?.html ?? fallbackHtml,
  });
}

/**
 * Early receipt email (payment received before report is ready).
 * Optionally includes PDF receipt as attachment.
 */
export async function sendEarlyReceiptEmail(params: {
  to: string;
  customerName: string;
  amount: string;
  serviceName: string;
  paidDate: string;
  receiptPdfBuffer?: Buffer;
  receiptFilename?: string;
}): Promise<void> {
  const { to, customerName, amount, serviceName, paidDate, receiptPdfBuffer, receiptFilename } = params;

  const tpl = await getTemplateHtml("payment_receipt_early", {
    customer_name: customerName,
    amount,
    service_name: serviceName,
    paid_date: paidDate,
  });

  const fallbackHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 24px;text-align:center;border-bottom:2px solid #10b981;">
        <h1 style="color:#f1f5f9;font-size:24px;font-weight:700;margin:0 0 4px;">Payment Received</h1>
        <p style="color:#64748b;font-size:13px;margin:0;">LEAF Energy Services</p>
      </div>
      <div style="padding:32px 24px;">
        <p style="color:#e2e8f0;font-size:15px;margin:0 0 20px;">Hi ${customerName},</p>
        <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;">Thank you for your payment. Your receipt is below.</p>
        <div style="background:rgba(30,41,59,0.8);border:1px solid rgba(51,65,85,0.5);border-radius:12px;padding:20px;margin:0 0 24px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;">Service</td><td style="padding:6px 0;color:#e2e8f0;font-size:14px;text-align:right;">${serviceName}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;">Date Paid</td><td style="padding:6px 0;color:#e2e8f0;font-size:14px;text-align:right;">${paidDate}</td></tr>
            <tr><td style="padding:12px 0 6px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;border-top:1px solid rgba(51,65,85,0.5);">Total Paid</td><td style="padding:12px 0 6px;color:#10b981;font-size:20px;font-weight:700;text-align:right;border-top:1px solid rgba(51,65,85,0.5);">$${amount}</td></tr>
          </table>
        </div>
        <p style="color:#94a3b8;font-size:13px;margin:0;text-align:center;">Your reports will be delivered once the assessment is complete.</p>
      </div>
    </div>
  `;

  const subject = tpl?.subject ?? `Payment Receipt — ${serviceName}`;
  const html = tpl?.html ?? fallbackHtml;

  if (receiptPdfBuffer && receiptFilename) {
    await sendEmailWithAttachments({
      to, subject, html,
      attachments: [{ filename: receiptFilename, content: receiptPdfBuffer }],
    });
  } else {
    await sendEmail({ to, subject, html });
  }
}

/**
 * Combined receipt + report delivery (payment received, reports now ready).
 */
export async function sendReceiptWithReportsEmail(params: {
  to: string;
  customerName: string;
  amount: string;
  hesReportUrl: string;
  leafReportUrl: string;
  serviceName?: string;
}): Promise<void> {
  const { to, customerName, amount, hesReportUrl, leafReportUrl, serviceName = "Home Energy Assessment" } = params;

  const tpl = await getTemplateHtml("payment_receipt", {
    customer_name: customerName,
    amount,
    hes_report_url: hesReportUrl,
    leaf_report_url: leafReportUrl,
    service_name: serviceName,
  });

  const fallbackHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 24px;text-align:center;border-bottom:2px solid #10b981;">
        <h1 style="color:#f1f5f9;font-size:24px;font-weight:700;margin:0 0 4px;">Your Reports &amp; Receipt</h1>
        <p style="color:#64748b;font-size:13px;margin:0;">LEAF Energy Services</p>
      </div>
      <div style="padding:32px 24px;">
        <p style="color:#e2e8f0;font-size:15px;margin:0 0 20px;">Hi ${customerName},</p>
        <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;">Your home energy reports are ready. Thank you for your payment of <strong style="color:#10b981;">$${amount}</strong>.</p>
        <div style="text-align:center;margin:0 0 16px;">
          <a href="${hesReportUrl}" style="display:inline-block;padding:14px 28px;background:#1e293b;color:#f1f5f9;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;border:1px solid #334155;margin:0 6px 8px;">View HES Report</a>
          <a href="${leafReportUrl}" style="display:inline-block;padding:14px 28px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;margin:0 6px 8px;">View LEAF Report</a>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    to,
    subject: tpl?.subject ?? `Payment Received — Your ${serviceName} Reports`,
    html: tpl?.html ?? fallbackHtml,
  });
}

/**
 * Orchestration: deliver reports to homeowner (+ broker if applicable),
 * update job record to delivered status.
 */
export async function deliverReports(
  jobId: string,
  jobType: "hes" | "inspector"
): Promise<{ error?: string }> {
  const table = jobType === "inspector" ? "inspector_schedule" : "hes_schedule";

  const { data: job, error: fetchErr } = await supabaseAdmin
    .from(table)
    .select("customer_name, customer_email, address, city, state, zip, payment_status, hes_report_url, leaf_report_url, invoice_amount, broker_id, service_name, tier_name")
    .eq("id", jobId)
    .single();

  if (fetchErr || !job) return { error: "Job not found" };
  if (!job.customer_email) return { error: "No customer email on file" };
  if (!job.hes_report_url) return { error: "No HES report URL — upload the report first" };

  const fullAddress = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");
  const leafUrl = job.leaf_report_url || `${APP_URL}/report/${jobId}`;
  const serviceName = [job.service_name, job.tier_name].filter(Boolean).join(" — ") || (jobType === "inspector" ? "Home Inspection" : "Home Energy Assessment");

  // Send to homeowner — paid gets combined receipt+reports, unpaid gets just reports
  if (job.payment_status === "paid") {
    const amount = job.invoice_amount ? Number(job.invoice_amount).toFixed(2) : "0.00";
    await sendReceiptWithReportsEmail({
      to: job.customer_email,
      customerName: job.customer_name,
      amount,
      hesReportUrl: job.hes_report_url,
      leafReportUrl: leafUrl,
      serviceName,
    });
  } else {
    await sendReportDeliveryEmail({
      to: job.customer_email,
      customerName: job.customer_name,
      address: fullAddress,
      hesReportUrl: job.hes_report_url,
      leafReportUrl: leafUrl,
      serviceName,
    });
  }

  // Send broker copy if applicable
  if (job.broker_id) {
    try {
      const { data: broker } = await supabaseAdmin
        .from("brokers")
        .select("company_name, user_id")
        .eq("id", job.broker_id)
        .single();

      if (broker?.user_id) {
        const { data: profile } = await supabaseAdmin
          .from("app_profiles")
          .select("email")
          .eq("id", broker.user_id)
          .single();

        if (profile?.email) {
          await sendReportDeliveryBrokerEmail({
            to: profile.email,
            brokerName: broker.company_name || "Broker",
            address: fullAddress,
            hesReportUrl: job.hes_report_url,
            homeownerName: job.customer_name,
            serviceName,
          });
        }
      }
    } catch (err: any) {
      console.error("[deliverReports] Broker email failed (non-blocking):", err?.message);
    }
  }

  // Update job record
  const now = new Date().toISOString();
  await supabaseAdmin.from(table).update({
    reports_sent_at: now,
    status: "delivered",
  }).eq("id", jobId);

  return {};
}
