// src/app/request/actions.ts
"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { logJobActivity } from "@/lib/activityLog";

// ─── Types ──────────────────────────────────────────────────────────

export type SubmitResult =
  | { success: true; referenceId: string }
  | { success: false; errors: Record<string, string> };

export type ServiceTier = {
  tierId: string;
  name: string;
  sizeLabel: string;
  sqFtMin: number;
  sqFtMax: number | null;
  price: number;
};

export type ServiceCategory = {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  tiers: ServiceTier[];
};

export type ServiceAddon = {
  id: string;
  name: string;
  slug: string;
  price: number;
};

type HomeownerPayload = {
  role: "homeowner";
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  preferredDate: string;
  preferredTime: string;
  source: string;
  notes: string;
  serviceTierId: string;
  addonIds: string[];
};

type BrokerPayload = {
  role: "broker";
  brokerName: string;
  brokerage: string;
  brokerEmail: string;
  brokerPhone: string;
  homeownerPresent: boolean;
  homeownerName: string;
  homeownerEmail: string;
  homeownerPhone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  payerType: "broker" | "homeowner";
  preferredDate: string;
  preferredTime: string;
  notes: string;
  serviceTierId: string;
  addonIds: string[];
};

type FormPayload = HomeownerPayload | BrokerPayload;

// ─── Fetch service catalog ──────────────────────────────────────────

export async function fetchServiceCatalog(): Promise<ServiceCategory[]> {
  const { data: categories } = await supabaseAdmin
    .from("service_categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order");

  if (!categories?.length) return [];

  const { data: tiers } = await supabaseAdmin
    .from("service_tiers")
    .select("id, category_id, name, size_label, sq_ft_min, sq_ft_max, price")
    .eq("is_active", true)
    .order("sort_order");

  return categories.map((cat) => ({
    categoryId: cat.id,
    categoryName: cat.name,
    categorySlug: cat.slug,
    tiers: (tiers ?? [])
      .filter((t) => t.category_id === cat.id)
      .map((t) => ({
        tierId: t.id,
        name: t.name,
        sizeLabel: t.size_label,
        sqFtMin: t.sq_ft_min,
        sqFtMax: t.sq_ft_max,
        price: t.price,
      })),
  }));
}

export async function fetchServiceAddons(categoryId: string): Promise<ServiceAddon[]> {
  const { data } = await supabaseAdmin
    .from("service_addons")
    .select("id, name, slug, price")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("sort_order");

  return (data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    price: a.price,
  }));
}

// ─── Validation helpers ─────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP_RE = /^\d{5}$/;

function stripPhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function validateCommonAddress(
  data: { address: string; city: string; state: string; zip: string },
  errors: Record<string, string>
) {
  if (!data.address.trim()) errors.address = "Address is required";
  if (!data.city.trim()) errors.city = "City is required";
  if (!data.state.trim()) errors.state = "State is required";
  if (!ZIP_RE.test(data.zip.trim())) errors.zip = "Valid 5-digit zip required";
}

function validateScheduling(
  data: { preferredDate: string; preferredTime: string },
  errors: Record<string, string>
) {
  if (!data.preferredDate) {
    errors.preferredDate = "Date is required";
  } else if (data.preferredDate < tomorrowStr()) {
    errors.preferredDate = "Date must be tomorrow or later";
  }
  if (!data.preferredTime) errors.preferredTime = "Time preference is required";
}

function validateHomeowner(data: HomeownerPayload): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.fullName.trim()) errors.fullName = "Name is required";
  if (!EMAIL_RE.test(data.email.trim())) errors.email = "Valid email required";
  if (stripPhone(data.phone).length !== 10) errors.phone = "Valid 10-digit phone required";
  if (!data.serviceTierId) errors.serviceTierId = "Please select a home size";
  validateCommonAddress(data, errors);
  validateScheduling(data, errors);
  return errors;
}

function validateBroker(data: BrokerPayload): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.brokerName.trim()) errors.brokerName = "Name is required";
  if (!data.brokerage.trim()) errors.brokerage = "Company is required";
  if (!EMAIL_RE.test(data.brokerEmail.trim())) errors.brokerEmail = "Valid email required";
  if (stripPhone(data.brokerPhone).length !== 10) errors.brokerPhone = "Valid 10-digit phone required";

  if (data.homeownerPresent) {
    if (!data.homeownerName.trim()) errors.homeownerName = "Homeowner name is required";
    if (!EMAIL_RE.test(data.homeownerEmail.trim())) errors.homeownerEmail = "Valid email required";
    if (stripPhone(data.homeownerPhone).length !== 10) errors.homeownerPhone = "Valid 10-digit phone required";
  }

  if (!data.serviceTierId) errors.serviceTierId = "Please select a home size";
  validateCommonAddress(data, errors);
  if (!data.payerType) errors.payerType = "Payment selection required";
  validateScheduling(data, errors);
  return errors;
}

// ─── Main server action ─────────────────────────────────────────────

export async function submitJobRequest(payload: FormPayload): Promise<SubmitResult> {
  // Validate
  const errors =
    payload.role === "homeowner"
      ? validateHomeowner(payload)
      : validateBroker(payload);

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  // ── Look up tier price server-side (don't trust client) ───────
  const { data: tier } = await supabaseAdmin
    .from("service_tiers")
    .select("id, name, size_label, price, category_id")
    .eq("id", payload.serviceTierId)
    .single();

  if (!tier) {
    return { success: false, errors: { _form: "Invalid service tier selected." } };
  }

  const { data: category } = await supabaseAdmin
    .from("service_categories")
    .select("id, name, slug")
    .eq("id", tier.category_id)
    .single();

  if (!category) {
    return { success: false, errors: { _form: "Invalid service category." } };
  }

  // ── Look up addon prices server-side ──────────────────────────
  let addonTotal = 0;
  const validAddonIds: string[] = [];
  if (payload.addonIds.length > 0) {
    const { data: addons } = await supabaseAdmin
      .from("service_addons")
      .select("id, price")
      .in("id", payload.addonIds)
      .eq("is_active", true);

    for (const addon of addons ?? []) {
      addonTotal += addon.price;
      validAddonIds.push(addon.id);
    }
  }

  const catalogBasePrice = tier.price;
  const catalogTotalPrice = catalogBasePrice + addonTotal;

  // Build insert row
  // Note: scheduled_time is a `time` column (HH:MM:SS) — store text preference in special_notes
  let row: Record<string, unknown>;

  function buildNotes(preferredTime: string, notes: string): string | null {
    const parts: string[] = [];
    if (preferredTime) parts.push(`Preferred time: ${preferredTime}`);
    if (notes.trim()) parts.push(notes.trim());
    return parts.length > 0 ? parts.join("\n") : null;
  }

  const catalogFields = {
    service_category_id: category.id,
    service_tier_id: tier.id,
    addon_ids: validAddonIds.length > 0 ? validAddonIds : null,
    catalog_base_price: catalogBasePrice,
    catalog_addon_total: addonTotal || null,
    catalog_total_price: catalogTotalPrice,
    service_name: category.name,
    tier_name: tier.name,
    invoice_amount: catalogTotalPrice,
    home_sqft_range: tier.size_label,
  };

  if (payload.role === "homeowner") {
    row = {
      status: "pending",
      customer_name: payload.fullName.trim(),
      customer_email: payload.email.trim(),
      customer_phone: stripPhone(payload.phone),
      address: payload.address.trim(),
      city: payload.city.trim(),
      state: payload.state.trim(),
      zip: payload.zip.trim(),
      scheduled_date: payload.preferredDate,
      payment_status: "unpaid",
      requested_by: "homeowner",
      payer_type: "homeowner",
      payer_name: payload.fullName.trim(),
      payer_email: payload.email.trim(),
      source: payload.source || null,
      special_notes: buildNotes(payload.preferredTime, payload.notes),
      ...catalogFields,
    };
  } else {
    const isVacant = !payload.homeownerPresent;
    const custName = isVacant ? payload.brokerName.trim() : payload.homeownerName.trim();
    const custEmail = isVacant ? payload.brokerEmail.trim() : payload.homeownerEmail.trim();
    const custPhone = isVacant ? stripPhone(payload.brokerPhone) : stripPhone(payload.homeownerPhone);

    const payerIsBroker = payload.payerType === "broker";
    row = {
      status: "pending",
      customer_name: custName,
      customer_email: custEmail,
      customer_phone: custPhone,
      address: payload.address.trim(),
      city: payload.city.trim(),
      state: payload.state.trim(),
      zip: payload.zip.trim(),
      scheduled_date: payload.preferredDate,
      payment_status: "unpaid",
      requested_by: "broker",
      payer_type: payload.payerType,
      payer_name: payerIsBroker ? payload.brokerName.trim() : (isVacant ? payload.brokerName.trim() : payload.homeownerName.trim()),
      payer_email: payerIsBroker ? payload.brokerEmail.trim() : (isVacant ? payload.brokerEmail.trim() : payload.homeownerEmail.trim()),
      broker_id: null,
      source: "broker_referral",
      special_notes: buildNotes(payload.preferredTime, payload.notes),
      ...catalogFields,
    };
  }

  // Insert
  const { data, error } = await supabaseAdmin
    .from("hes_schedule")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error("[submitJobRequest] insert error:", error.message, error.details, error.hint, error.code);
    console.error("[submitJobRequest] row attempted:", JSON.stringify(row, null, 2));
    return { success: false, errors: { _form: "Something went wrong. Please try again." } };
  }

  const jobId = data.id as string;
  const referenceId = jobId.slice(0, 8).toUpperCase();

  // Activity log
  await logJobActivity(
    jobId,
    "job_requested",
    "Assessment request submitted",
    { name: payload.role === "homeowner" ? (payload as HomeownerPayload).fullName : (payload as BrokerPayload).brokerName, role: payload.role },
    { ...payload, referenceId },
    "hes"
  );

  return { success: true, referenceId };
}
