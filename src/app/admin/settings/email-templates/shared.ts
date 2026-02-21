// src/app/admin/settings/email-templates/shared.ts
// Types, static variable definitions, and utility helpers shared by
// both the server actions and the client component.

export type EmailTemplateVariable = {
  key: string;
  label: string;
  sample: string;
};

export type EmailTemplate = {
  id: string;
  template_key: string;
  subject: string;
  html_body: string;
  is_default: boolean;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

// ─── Template metadata (name, description, ordering) ────────────────

export type TemplateCategory = "job_workflow" | "marketplace" | "broker_campaigns" | "refunds";

export type TemplateMeta = {
  name: string;
  description: string;
  group: TemplateCategory;
  order: number;
};

const TEMPLATE_META: Record<string, TemplateMeta> = {
  // Job Workflow
  job_confirmation:        { name: "Job Confirmation",             description: "Sent when a job is scheduled",                            group: "job_workflow", order: 1 },
  assessor_en_route:       { name: "Assessor En Route",            description: "Sent when tech is on the way",                            group: "job_workflow", order: 2 },
  invoice:                 { name: "Invoice",                      description: "Sent to request payment after assessment",                group: "job_workflow", order: 3 },
  payment_receipt_early:   { name: "Receipt — Early (Pre-Report)", description: "Sent when paid before report is ready",                   group: "job_workflow", order: 4 },
  payment_receipt:         { name: "Receipt — With Reports",       description: "Combined receipt + report delivery after invoice payment", group: "job_workflow", order: 5 },
  report_delivery:         { name: "Report Delivery",              description: "Delivers report + LEAF link to homeowner",                group: "job_workflow", order: 6 },
  report_delivery_broker:  { name: "Report Delivery (Broker)",     description: "Delivers report to broker for RMLS",                      group: "job_workflow", order: 7 },

  // Marketplace
  payment_confirmation:    { name: "Payment Confirmation",         description: "Lead purchase confirmation",                              group: "marketplace", order: 1 },
  payment_failed:          { name: "Payment Failed",               description: "Payment failure notification",                            group: "marketplace", order: 2 },
  receipt:                 { name: "Receipt",                      description: "Marketplace payment receipt",                             group: "marketplace", order: 3 },

  // Broker Campaigns
  campaign:               { name: "Broker Campaign",              description: "Broker campaign email to homeowners",                     group: "broker_campaigns", order: 1 },

  // Refunds
  refund_requested:        { name: "Refund Requested",             description: "Refund request submitted notification",                   group: "refunds", order: 1 },
  refund_approved:         { name: "Refund Approved",              description: "Refund approval notification",                            group: "refunds", order: 2 },
  refund_denied:           { name: "Refund Denied",                description: "Refund denial notification",                              group: "refunds", order: 3 },
  refund_more_info:        { name: "Refund — More Info",           description: "More information needed for refund",                      group: "refunds", order: 4 },
};

// ─── Category definitions (ordered for sidebar rendering) ────────────

export type CategoryDef = {
  key: TemplateCategory;
  label: string;
};

export const TEMPLATE_CATEGORIES: CategoryDef[] = [
  { key: "job_workflow",      label: "Job Workflow" },
  { key: "marketplace",       label: "Marketplace" },
  { key: "broker_campaigns",  label: "Broker Campaigns" },
  { key: "refunds",           label: "Refunds" },
];

// ─── Variable definitions (static — no DB column for these) ────────

const TEMPLATE_VARIABLES: Record<string, EmailTemplateVariable[]> = {
  job_confirmation: [
    { key: "customer_name", label: "Customer Name", sample: "Jane Smith" },
    { key: "service_name", label: "Service Name", sample: "Home Energy Assessment" },
    { key: "scheduled_date", label: "Date", sample: "February 25, 2026" },
    { key: "scheduled_time", label: "Time", sample: "10:00 AM" },
    { key: "address", label: "Address", sample: "1234 Oak St, Portland, OR 97201" },
    { key: "tech_name", label: "Assessor", sample: "Mike Johnson" },
  ],
  assessor_en_route: [
    { key: "customer_name", label: "Customer Name", sample: "Jane Smith" },
    { key: "service_name", label: "Service Name", sample: "Home Energy Assessment" },
    { key: "tech_name", label: "Assessor", sample: "Mike Johnson" },
    { key: "eta", label: "ETA", sample: "10:15 AM" },
  ],
  payment_receipt_early: [
    { key: "customer_name", label: "Customer Name", sample: "Jane Smith" },
    { key: "amount", label: "Amount", sample: "299.00" },
    { key: "service_name", label: "Service", sample: "HES Assessment" },
    { key: "paid_date", label: "Date Paid", sample: "02/25/26" },
  ],
  invoice: [
    { key: "customer_name", label: "Customer Name", sample: "Jane Smith" },
    { key: "amount", label: "Amount", sample: "299.00" },
    { key: "service_name", label: "Service", sample: "HES Assessment" },
    { key: "payment_link", label: "Payment Link", sample: "https://checkout.stripe.com/example" },
  ],
  report_delivery: [
    { key: "customer_name", label: "Customer Name", sample: "Jane Smith" },
    { key: "service_name", label: "Service Name", sample: "Home Energy Assessment" },
    { key: "address", label: "Address", sample: "1234 Oak St, Portland, OR 97201" },
    { key: "hes_report_url", label: "HES Report URL", sample: "https://leafenergy.app/reports/hes/abc123" },
    { key: "leaf_report_url", label: "LEAF Report URL", sample: "https://leafenergy.app/report/abc123" },
  ],
  report_delivery_broker: [
    { key: "broker_name", label: "Broker Name", sample: "Sarah Realty" },
    { key: "service_name", label: "Service Name", sample: "Home Energy Assessment" },
    { key: "address", label: "Address", sample: "1234 Oak St, Portland, OR 97201" },
    { key: "hes_report_url", label: "HES Report URL", sample: "https://leafenergy.app/reports/hes/abc123" },
    { key: "homeowner_name", label: "Homeowner", sample: "Jane Smith" },
  ],
  payment_receipt: [
    { key: "customer_name", label: "Customer Name", sample: "Jane Smith" },
    { key: "service_name", label: "Service Name", sample: "Home Energy Assessment" },
    { key: "amount", label: "Amount", sample: "299.00" },
    { key: "hes_report_url", label: "HES Report URL", sample: "https://leafenergy.app/reports/hes/abc123" },
    { key: "leaf_report_url", label: "LEAF Report URL", sample: "https://leafenergy.app/report/abc123" },
  ],
};

// ─── Public helpers ─────────────────────────────────────────────────

export function getTemplateMeta(templateKey: string): TemplateMeta {
  return TEMPLATE_META[templateKey] ?? {
    name: templateKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: "",
    group: "job_workflow" as TemplateCategory,
    order: 999,
  };
}

export function getTemplateDisplayName(templateKey: string): string {
  return getTemplateMeta(templateKey).name;
}

export function getTemplateVariables(templateKey: string): EmailTemplateVariable[] {
  return TEMPLATE_VARIABLES[templateKey] ?? [];
}

/** Get ordered template keys for a given category */
export function getTemplatekeysForCategory(category: TemplateCategory): string[] {
  return Object.entries(TEMPLATE_META)
    .filter(([, m]) => m.group === category)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key]) => key);
}

/** All known template keys (across all categories) */
export const ALL_TEMPLATE_KEYS = new Set(Object.keys(TEMPLATE_META));
