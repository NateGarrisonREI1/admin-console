// src/app/admin/settings/email-templates/actions.ts
"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getTemplateVariables } from "./shared";
import type { EmailTemplate } from "./shared";

// ─── Fetch all ─────────────────────────────────────────────────────

export async function fetchEmailTemplates(): Promise<EmailTemplate[]> {
  const { data, error } = await supabaseAdmin
    .from("email_templates")
    .select("*")
    .order("template_key");

  if (error) throw new Error(error.message);
  return (data ?? []) as EmailTemplate[];
}

// ─── Fetch one ─────────────────────────────────────────────────────

export async function fetchEmailTemplate(templateKey: string): Promise<EmailTemplate | null> {
  const { data, error } = await supabaseAdmin
    .from("email_templates")
    .select("*")
    .eq("template_key", templateKey)
    .single();

  if (error) return null;
  return data as EmailTemplate;
}

// ─── Upsert ────────────────────────────────────────────────────────

export async function upsertEmailTemplate(template: {
  template_key: string;
  subject: string;
  html_body: string;
}): Promise<void> {
  const { error } = await supabaseAdmin
    .from("email_templates")
    .upsert(
      {
        template_key: template.template_key,
        subject: template.subject,
        html_body: template.html_body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "template_key" }
    );

  if (error) throw new Error(error.message);
}

// ─── Delete ────────────────────────────────────────────────────────

export async function deleteEmailTemplate(templateKey: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("email_templates")
    .delete()
    .eq("template_key", templateKey);

  if (error) throw new Error(error.message);
}

// ─── Send test email ───────────────────────────────────────────────

export async function sendTestEmail(templateKey: string, toEmail: string): Promise<void> {
  const template = await fetchEmailTemplate(templateKey);
  if (!template) throw new Error(`Template "${templateKey}" not found`);

  const variables = getTemplateVariables(templateKey);

  // Replace variables with sample values
  let subject = template.subject;
  let htmlBody = template.html_body;
  for (const v of variables) {
    const pattern = new RegExp(`\\{\\{${v.key}\\}\\}`, "g");
    subject = subject.replace(pattern, v.sample);
    htmlBody = htmlBody.replace(pattern, v.sample);
  }

  // Dynamic import to avoid circular dependency issues
  const sgMail = (await import("@sendgrid/mail")).default;
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "support@renewableenergyincentives.com";

  if (!process.env.SENDGRID_API_KEY) {
    console.log("[EmailTemplates] No SENDGRID_API_KEY, logging test email:", { to: toEmail, subject });
    return;
  }

  await sgMail.send({
    from: { email: fromEmail, name: "LEAF Energy" },
    to: toEmail,
    subject: `[TEST] ${subject}`,
    html: htmlBody,
  });
}
