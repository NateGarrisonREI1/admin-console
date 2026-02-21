// src/app/api/seed-templates/route.ts
// One-time seed endpoint for email_templates table.
// Call via POST /api/seed-templates

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const TEMPLATES = [
  // ─── Workflow templates ───────────────────────────────────────────
  {
    template_key: "job_confirmation",
    subject: "Your {{service_name}} is Confirmed",
    html_body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:#0f172a;border-radius:12px;overflow:hidden;">
    <div style="padding:28px 24px;text-align:center;border-bottom:2px solid #10b981;">
      <div style="font-size:20px;font-weight:700;color:#10b981;letter-spacing:0.5px;">LEAF ENERGY</div>
      <p style="color:#64748b;font-size:12px;margin:4px 0 0;">Home Energy Score Program</p>
    </div>
    <div style="padding:32px 24px;">
      <h1 style="color:#f1f5f9;font-size:22px;font-weight:700;margin:0 0 16px;">{{service_name}} Confirmed</h1>
      <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 24px;">Hi {{customer_name}}, your {{service_name}} has been scheduled.</p>
      <div style="background:rgba(30,41,59,0.8);border:1px solid rgba(51,65,85,0.5);border-radius:12px;padding:20px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;">Date</td><td style="padding:8px 0;color:#e2e8f0;font-size:14px;font-weight:600;text-align:right;">{{scheduled_date}}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;">Time</td><td style="padding:8px 0;color:#e2e8f0;font-size:14px;text-align:right;">{{scheduled_time}}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;">Address</td><td style="padding:8px 0;color:#e2e8f0;font-size:14px;text-align:right;">{{address}}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;">Assessor</td><td style="padding:8px 0;color:#10b981;font-size:14px;font-weight:600;text-align:right;">{{tech_name}}</td></tr>
        </table>
      </div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">Please ensure someone 18+ is home during the assessment. The visit typically takes 1–2 hours.</p>
    </div>
    <div style="background:rgba(15,23,42,0.8);padding:20px 24px;text-align:center;border-top:1px solid rgba(51,65,85,0.3);">
      <p style="color:#64748b;font-size:12px;margin:0 0 4px;font-weight:600;">Renewable Energy Incentives</p>
      <p style="color:#475569;font-size:11px;margin:0;">Questions? <a href="mailto:support@renewableenergyincentives.com" style="color:#64748b;text-decoration:underline;">support@renewableenergyincentives.com</a></p>
    </div>
  </div>
</div>
</body></html>`,
    is_default: true,
  },
  {
    template_key: "assessor_en_route",
    subject: "Your {{service_name}} Assessor is On the Way",
    html_body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:#0f172a;border-radius:12px;overflow:hidden;">
    <div style="padding:28px 24px;text-align:center;border-bottom:2px solid #10b981;">
      <div style="font-size:20px;font-weight:700;color:#10b981;letter-spacing:0.5px;">LEAF ENERGY</div>
      <p style="color:#64748b;font-size:12px;margin:4px 0 0;">Home Energy Score Program</p>
    </div>
    <div style="padding:32px 24px;">
      <h1 style="color:#f1f5f9;font-size:22px;font-weight:700;margin:0 0 16px;">Your Assessor is En Route</h1>
      <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 24px;">Hi {{customer_name}}, your {{service_name}} assessor <strong style="color:#10b981;">{{tech_name}}</strong> is on the way and should arrive around <strong style="color:#f1f5f9;">{{eta}}</strong>.</p>
      <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">Please make sure the home is accessible. The assessor will evaluate your home's insulation, heating, cooling, windows, and more.</p>
    </div>
    <div style="background:rgba(15,23,42,0.8);padding:20px 24px;text-align:center;border-top:1px solid rgba(51,65,85,0.3);">
      <p style="color:#64748b;font-size:12px;margin:0 0 4px;font-weight:600;">Renewable Energy Incentives</p>
      <p style="color:#475569;font-size:11px;margin:0;">Questions? <a href="mailto:support@renewableenergyincentives.com" style="color:#64748b;text-decoration:underline;">support@renewableenergyincentives.com</a></p>
    </div>
  </div>
</div>
</body></html>`,
    is_default: true,
  },
  {
    template_key: "payment_receipt_early",
    subject: "Payment Confirmed — {{service_name}} Report Coming Soon",
    html_body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:#0f172a;border-radius:12px;overflow:hidden;">
    <div style="padding:28px 24px;text-align:center;border-bottom:2px solid #10b981;">
      <div style="font-size:20px;font-weight:700;color:#10b981;letter-spacing:0.5px;">LEAF ENERGY</div>
      <p style="color:#64748b;font-size:12px;margin:4px 0 0;">Home Energy Score Program</p>
    </div>
    <div style="padding:32px 24px;">
      <h1 style="color:#f1f5f9;font-size:22px;font-weight:700;margin:0 0 16px;">Payment Confirmed</h1>
      <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 24px;">Hi {{customer_name}}, thank you for your payment. Here's your summary:</p>
      <div style="background:rgba(30,41,59,0.8);border:1px solid rgba(51,65,85,0.5);border-radius:12px;padding:20px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;">Service</td><td style="padding:8px 0;color:#e2e8f0;font-size:14px;font-weight:600;text-align:right;">{{service_name}}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;">Date Paid</td><td style="padding:8px 0;color:#e2e8f0;font-size:14px;text-align:right;">{{paid_date}}</td></tr>
          <tr><td style="padding:12px 0 6px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;border-top:1px solid rgba(51,65,85,0.5);">Amount</td><td style="padding:12px 0 6px;color:#10b981;font-size:20px;font-weight:700;text-align:right;border-top:1px solid rgba(51,65,85,0.5);">\${{amount}}</td></tr>
        </table>
      </div>
      <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:16px 20px;margin:0 0 16px;">
        <p style="color:#10b981;font-size:14px;font-weight:600;margin:0 0 6px;">What's Next?</p>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">Your official {{service_name}} report and LEAF energy analysis are being prepared. You'll receive both reports via email within 24 hours.</p>
      </div>
    </div>
    <div style="background:rgba(15,23,42,0.8);padding:20px 24px;text-align:center;border-top:1px solid rgba(51,65,85,0.3);">
      <p style="color:#64748b;font-size:12px;margin:0 0 4px;font-weight:600;">Renewable Energy Incentives</p>
      <p style="color:#475569;font-size:11px;margin:0;">Questions? <a href="mailto:support@renewableenergyincentives.com" style="color:#64748b;text-decoration:underline;">support@renewableenergyincentives.com</a></p>
    </div>
  </div>
</div>
</body></html>`,
    is_default: true,
  },
  {
    template_key: "invoice",
    subject: "Invoice for Your {{service_name}}",
    html_body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:#0f172a;border-radius:12px;overflow:hidden;">
    <div style="padding:28px 24px;text-align:center;border-bottom:2px solid #10b981;">
      <div style="font-size:20px;font-weight:700;color:#10b981;letter-spacing:0.5px;">LEAF ENERGY</div>
      <p style="color:#64748b;font-size:12px;margin:4px 0 0;">Home Energy Score Program</p>
    </div>
    <div style="padding:32px 24px;">
      <h1 style="color:#f1f5f9;font-size:22px;font-weight:700;margin:0 0 16px;">Invoice</h1>
      <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 24px;">Hi {{customer_name}}, here is the invoice for your {{service_name}}.</p>
      <div style="background:rgba(30,41,59,0.8);border:1px solid rgba(51,65,85,0.5);border-radius:12px;padding:20px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;">Service</td><td style="padding:8px 0;color:#e2e8f0;font-size:14px;font-weight:600;text-align:right;">{{service_name}}</td></tr>
          <tr><td style="padding:12px 0 6px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;border-top:1px solid rgba(51,65,85,0.5);">Amount Due</td><td style="padding:12px 0 6px;color:#10b981;font-size:22px;font-weight:700;text-align:right;border-top:1px solid rgba(51,65,85,0.5);">\${{amount}}</td></tr>
        </table>
      </div>
      <div style="text-align:center;margin:0 0 24px;">
        <a href="{{payment_link}}" style="display:inline-block;padding:16px 48px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:18px;">Pay Now</a>
      </div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;text-align:center;">Once payment is confirmed, your {{service_name}} report and LEAF energy analysis will be emailed to you.</p>
    </div>
    <div style="background:rgba(15,23,42,0.8);padding:20px 24px;text-align:center;border-top:1px solid rgba(51,65,85,0.3);">
      <p style="color:#64748b;font-size:12px;margin:0 0 4px;font-weight:600;">Renewable Energy Incentives</p>
      <p style="color:#475569;font-size:11px;margin:0;">Questions? <a href="mailto:support@renewableenergyincentives.com" style="color:#64748b;text-decoration:underline;">support@renewableenergyincentives.com</a></p>
    </div>
  </div>
</div>
</body></html>`,
    is_default: true,
  },
  {
    template_key: "report_delivery",
    subject: "Your {{service_name}} Report is Ready",
    html_body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:#0f172a;border-radius:12px;overflow:hidden;">
    <div style="padding:28px 24px;text-align:center;border-bottom:2px solid #10b981;">
      <div style="font-size:20px;font-weight:700;color:#10b981;letter-spacing:0.5px;">LEAF ENERGY</div>
      <p style="color:#64748b;font-size:12px;margin:4px 0 0;">Home Energy Score Program</p>
    </div>
    <div style="padding:32px 24px;">
      <h1 style="color:#f1f5f9;font-size:22px;font-weight:700;margin:0 0 16px;">Your Reports Are Ready</h1>
      <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 8px;">Hi {{customer_name}}, the assessment for <strong style="color:#f1f5f9;">{{address}}</strong> is complete.</p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">Your official {{service_name}} report and personalized LEAF energy analysis are ready to view.</p>
      <div style="text-align:center;margin:0 0 16px;">
        <a href="{{hes_report_url}}" style="display:inline-block;padding:14px 32px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;margin:0 0 12px;width:220px;box-sizing:border-box;">View HES Report</a>
      </div>
      <div style="text-align:center;margin:0 0 24px;">
        <a href="{{leaf_report_url}}" style="display:inline-block;padding:14px 32px;background:#3b82f6;color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;width:220px;box-sizing:border-box;">View LEAF Analysis</a>
      </div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;text-align:center;">These links will remain active. You can access your reports any time.</p>
    </div>
    <div style="background:rgba(15,23,42,0.8);padding:20px 24px;text-align:center;border-top:1px solid rgba(51,65,85,0.3);">
      <p style="color:#64748b;font-size:12px;margin:0 0 4px;font-weight:600;">Renewable Energy Incentives</p>
      <p style="color:#475569;font-size:11px;margin:0;">Questions? <a href="mailto:support@renewableenergyincentives.com" style="color:#64748b;text-decoration:underline;">support@renewableenergyincentives.com</a></p>
    </div>
  </div>
</div>
</body></html>`,
    is_default: true,
  },
  {
    template_key: "report_delivery_broker",
    subject: "{{service_name}} Report Ready — {{address}}",
    html_body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:#0f172a;border-radius:12px;overflow:hidden;">
    <div style="padding:28px 24px;text-align:center;border-bottom:2px solid #10b981;">
      <div style="font-size:20px;font-weight:700;color:#10b981;letter-spacing:0.5px;">LEAF ENERGY</div>
      <p style="color:#64748b;font-size:12px;margin:4px 0 0;">Home Energy Score Program</p>
    </div>
    <div style="padding:32px 24px;">
      <h1 style="color:#f1f5f9;font-size:22px;font-weight:700;margin:0 0 16px;">{{service_name}} Report Ready</h1>
      <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 24px;">Hi {{broker_name}}, the {{service_name}} report for <strong style="color:#f1f5f9;">{{address}}</strong> (homeowner: {{homeowner_name}}) is ready for download.</p>
      <div style="text-align:center;margin:0 0 24px;">
        <a href="{{hes_report_url}}" style="display:inline-block;padding:14px 32px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;">Download HES Report</a>
      </div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;text-align:center;">Use this report for your RMLS listing. The link will remain active.</p>
    </div>
    <div style="background:rgba(15,23,42,0.8);padding:20px 24px;text-align:center;border-top:1px solid rgba(51,65,85,0.3);">
      <p style="color:#64748b;font-size:12px;margin:0 0 4px;font-weight:600;">Renewable Energy Incentives</p>
      <p style="color:#475569;font-size:11px;margin:0;">Questions? <a href="mailto:support@renewableenergyincentives.com" style="color:#64748b;text-decoration:underline;">support@renewableenergyincentives.com</a></p>
    </div>
  </div>
</div>
</body></html>`,
    is_default: true,
  },
  {
    template_key: "payment_receipt",
    subject: "Payment Received — Your {{service_name}} Reports",
    html_body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
  <div style="background:#0f172a;border-radius:12px;overflow:hidden;">
    <div style="padding:28px 24px;text-align:center;border-bottom:2px solid #10b981;">
      <div style="font-size:20px;font-weight:700;color:#10b981;letter-spacing:0.5px;">LEAF ENERGY</div>
      <p style="color:#64748b;font-size:12px;margin:4px 0 0;">Home Energy Score Program</p>
    </div>
    <div style="padding:32px 24px;">
      <h1 style="color:#f1f5f9;font-size:22px;font-weight:700;margin:0 0 16px;">Payment Received</h1>
      <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 24px;">Hi {{customer_name}}, thank you for your payment of <strong style="color:#10b981;">\${{amount}}</strong>. Your reports are ready.</p>
      <div style="text-align:center;margin:0 0 16px;">
        <a href="{{hes_report_url}}" style="display:inline-block;padding:14px 32px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;margin:0 0 12px;width:220px;box-sizing:border-box;">View HES Report</a>
      </div>
      <div style="text-align:center;margin:0 0 24px;">
        <a href="{{leaf_report_url}}" style="display:inline-block;padding:14px 32px;background:#3b82f6;color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;width:220px;box-sizing:border-box;">View LEAF Analysis</a>
      </div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;text-align:center;">These links will remain active. You can access your reports any time.</p>
    </div>
    <div style="background:rgba(15,23,42,0.8);padding:20px 24px;text-align:center;border-top:1px solid rgba(51,65,85,0.3);">
      <p style="color:#64748b;font-size:12px;margin:0 0 4px;font-weight:600;">Renewable Energy Incentives</p>
      <p style="color:#475569;font-size:11px;margin:0;">Questions? <a href="mailto:support@renewableenergyincentives.com" style="color:#64748b;text-decoration:underline;">support@renewableenergyincentives.com</a></p>
    </div>
  </div>
</div>
</body></html>`,
    is_default: true,
  },

  // ─── Legacy templates ─────────────────────────────────────────────
  {
    template_key: "receipt",
    subject: "Payment Receipt — {{service_name}}",
    html_body: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;border-radius:12px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 24px;text-align:center;border-bottom:2px solid #10b981;">
    <h1 style="color:#f1f5f9;font-size:24px;font-weight:700;margin:0 0 4px;">Payment Receipt</h1>
    <p style="color:#64748b;font-size:13px;margin:0;">LEAF Energy Services</p>
  </div>
  <div style="padding:32px 24px;">
    <p style="color:#e2e8f0;font-size:15px;margin:0 0 20px;">Hi {{customer_name}},</p>
    <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 24px;">Thank you for your payment. Your receipt is attached to this email.</p>
    <div style="background:rgba(30,41,59,0.8);border:1px solid rgba(51,65,85,0.5);border-radius:12px;padding:20px;margin:0 0 24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;">Service</td><td style="padding:6px 0;color:#e2e8f0;font-size:14px;font-weight:600;text-align:right;">{{service_name}}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;">Date</td><td style="padding:6px 0;color:#e2e8f0;font-size:14px;text-align:right;">{{paid_date}}</td></tr>
        <tr><td style="padding:12px 0 6px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;border-top:1px solid rgba(51,65,85,0.5);">Total Paid</td><td style="padding:12px 0 6px;color:#10b981;font-size:20px;font-weight:700;text-align:right;border-top:1px solid rgba(51,65,85,0.5);">\${{amount}}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:0 0 24px;">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 12px;">Your LEAF Home Energy Report:</p>
      <a href="{{report_url}}" style="display:inline-block;padding:14px 32px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">View Your LEAF Report</a>
    </div>
    <p style="color:#475569;font-size:12px;margin:24px 0 0;text-align:center;">A PDF copy of your receipt is attached to this email.</p>
  </div>
  <div style="background:rgba(15,23,42,0.8);padding:20px 24px;text-align:center;border-top:1px solid rgba(51,65,85,0.3);">
    <p style="color:#64748b;font-size:12px;margin:0 0 4px;font-weight:600;">Renewable Energy Incentives</p>
    <p style="color:#475569;font-size:11px;margin:0;">Questions? <a href="mailto:support@renewableenergyincentives.com" style="color:#64748b;text-decoration:underline;">support@renewableenergyincentives.com</a></p>
  </div>
</div>`,
    is_default: true,
  },
  {
    template_key: "campaign",
    subject: "{{subject}}",
    html_body: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b;">
  <p style="margin:0 0 12px;">Hi {{recipient_name}},</p>
  {{message}}
  <div style="margin:24px 0;text-align:center;">
    <a href="{{click_url}}" style="display:inline-block;padding:14px 32px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">View Your Assessment</a>
  </div>
  <p style="color:#64748b;font-size:13px;margin-top:24px;">This assessment was prepared for you by {{broker_name}} through the LEAF Home Energy Program.</p>
</div>`,
    is_default: true,
  },
  {
    template_key: "payment_confirmation",
    subject: "Lead Purchase Confirmation - {{lead_type_label}}",
    html_body: `<h2>Lead Purchase Successful!</h2>
<p>Hi {{buyer_name}},</p>
<p>You've successfully purchased a <strong>{{lead_type_label}}</strong> lead.</p>
<h3>Lead Location:</h3>
<p>{{lead_location}}</p>
<h3>Payment:</h3>
<p><strong>Amount:</strong> \${{amount}}</p>
<p>Log in to your dashboard for full details.</p>`,
    is_default: true,
  },
  {
    template_key: "payment_failed",
    subject: "Payment Failed",
    html_body: `<h2>Payment Failed</h2>
<p>Hi {{buyer_name}},</p>
<p>Your recent lead purchase payment could not be processed.</p>
{{reason_block}}
<p>Please try again or contact support.</p>`,
    is_default: true,
  },
  {
    template_key: "refund_requested",
    subject: "Refund Request Submitted",
    html_body: `<h2>Refund Request Received</h2>
<p>Hi {{contractor_name}},</p>
<p>We've received your refund request (ref: {{ref_id}}).</p>
<p>Our team will review it within 3-5 business days. You'll receive an email once a decision is made.</p>`,
    is_default: true,
  },
  {
    template_key: "refund_approved",
    subject: "Refund Approved",
    html_body: `<h2>Refund Approved</h2>
<p>Hi {{contractor_name}},</p>
<p>Your refund of <strong>\${{amount}}</strong> has been approved and is being processed.</p>
<p>You should see the refund in your account within 3-5 business days.</p>`,
    is_default: true,
  },
  {
    template_key: "refund_denied",
    subject: "Refund Request Denied",
    html_body: `<h2>Refund Request Denied</h2>
<p>Hi {{contractor_name}},</p>
<p>Unfortunately, your refund request has been denied.</p>
<p><strong>Reason:</strong> {{reason}}</p>
<p>If you have questions, please contact our support team.</p>`,
    is_default: true,
  },
  {
    template_key: "refund_more_info",
    subject: "More Information Needed for Refund Request",
    html_body: `<h2>More Information Needed</h2>
<p>Hi {{contractor_name}},</p>
<p>We need some additional information to process your refund request:</p>
<blockquote style="border-left:3px solid #cbd5e1;padding-left:12px;color:#475569;">{{question}}</blockquote>
<p>Please respond within <strong>7 days</strong> or your request may be automatically denied.</p>`,
    is_default: true,
  },
];

export async function POST() {
  try {
    // Check if table exists by attempting a select
    const { error: checkErr } = await supabaseAdmin
      .from("email_templates")
      .select("id")
      .limit(1);

    if (checkErr) {
      // Table likely doesn't exist — create it
      console.log("[seed-templates] Table check failed, attempting to create:", checkErr.message);

      const createSQL = `
        CREATE TABLE IF NOT EXISTS email_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          template_key TEXT UNIQUE NOT NULL,
          subject TEXT NOT NULL,
          html_body TEXT NOT NULL,
          is_default BOOLEAN DEFAULT false,
          updated_by UUID,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
      `;

      // Try via rpc if a sql-execution function exists
      const { error: rpcErr } = await supabaseAdmin.rpc("exec_sql", { sql: createSQL });
      if (rpcErr) {
        return NextResponse.json({
          error: "email_templates table does not exist and cannot be auto-created",
          hint: "Run this SQL in the Supabase SQL Editor, then call this endpoint again",
          sql: createSQL.trim(),
        }, { status: 500 });
      }
    }

    // Upsert all templates
    const { data, error: upsertErr } = await supabaseAdmin
      .from("email_templates")
      .upsert(TEMPLATES, { onConflict: "template_key" })
      .select("template_key, subject");

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: data?.length ?? 0,
      templates: data,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
