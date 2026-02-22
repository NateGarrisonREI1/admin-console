// src/app/request/[brokerCode]/actions.ts
"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { logJobActivity } from "@/lib/activityLog";
import {
  fetchServiceCatalog,
  fetchServiceAddons,
} from "@/app/request/actions";

// Re-export server actions (types are imported directly by consumers from @/app/request/actions)
export { fetchServiceCatalog, fetchServiceAddons };

// ─── Types ──────────────────────────────────────────────────────────

export type BrokerInfo = {
  brokerId: string;
  brokerName: string;
  companyName: string | null;
  brokerEmail: string;
  logoUrl: string | null;
};

export type ClientFormPayload = {
  // Service
  serviceTierId: string;
  addonIds: string[];
  // Customer
  fullName: string;
  email: string;
  phone: string;
  // Property
  address: string;
  city: string;
  state: string;
  zip: string;
  // Scheduling
  preferredDate: string;
  preferredTime: string;
  // Notes
  notes: string;
  // Broker (from URL lookup — passed through for server-side validation)
  brokerCode: string;
};

export type ClientFormResult =
  | { success: true; referenceId: string }
  | { success: false; errors: Record<string, string> };

// ─── Lookup broker by referral code ─────────────────────────────────

export async function lookupBrokerByCode(code: string): Promise<BrokerInfo | null> {
  const { data: broker } = await supabaseAdmin
    .from("brokers")
    .select("id, user_id, company_name, logo_url")
    .eq("referral_code", code)
    .maybeSingle();

  if (!broker) return null;

  // Get broker name from app_profiles
  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("full_name, email")
    .eq("id", broker.user_id)
    .single();

  return {
    brokerId: broker.id,
    brokerName: (profile?.full_name as string) || "Broker",
    companyName: (broker.company_name as string) || null,
    brokerEmail: (profile?.email as string) || "",
    logoUrl: (broker.logo_url as string) || null,
  };
}

// ─── Increment referral link visits ─────────────────────────────────

export async function incrementReferralVisits(code: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from("brokers")
    .select("referral_link_visits")
    .eq("referral_code", code)
    .single();

  if (data) {
    await supabaseAdmin
      .from("brokers")
      .update({ referral_link_visits: ((data.referral_link_visits as number) || 0) + 1 })
      .eq("referral_code", code);
  }
}

// ─── Validation ─────────────────────────────────────────────────────

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

function validatePayload(data: ClientFormPayload): Record<string, string> {
  const errors: Record<string, string> = {};

  // Service
  if (!data.serviceTierId) errors.serviceTierId = "Please select a home size";

  // Customer
  if (!data.fullName.trim()) errors.fullName = "Name is required";
  if (!EMAIL_RE.test(data.email.trim())) errors.email = "Valid email required";
  if (stripPhone(data.phone).length !== 10) errors.phone = "Valid 10-digit phone required";

  // Property
  if (!data.address.trim()) errors.address = "Address is required";
  if (!data.city.trim()) errors.city = "City is required";
  if (!data.state.trim()) errors.state = "State is required";
  if (!ZIP_RE.test(data.zip.trim())) errors.zip = "Valid 5-digit zip required";

  // Scheduling
  if (!data.preferredDate) {
    errors.preferredDate = "Date is required";
  } else if (data.preferredDate < tomorrowStr()) {
    errors.preferredDate = "Date must be tomorrow or later";
  }
  if (!data.preferredTime) errors.preferredTime = "Time preference is required";

  return errors;
}

// ─── Submit ─────────────────────────────────────────────────────────

export async function submitBrokerClientRequest(
  payload: ClientFormPayload,
): Promise<ClientFormResult> {
  // Validate
  const errors = validatePayload(payload);
  if (Object.keys(errors).length > 0) return { success: false, errors };

  // Look up broker by referral code (server-side re-validation)
  const broker = await lookupBrokerByCode(payload.brokerCode);
  if (!broker) {
    return { success: false, errors: { _form: "Invalid referral link." } };
  }

  // Look up tier price server-side
  const { data: tier } = await supabaseAdmin
    .from("service_tiers")
    .select("id, name, size_label, price, category_id")
    .eq("id", payload.serviceTierId)
    .single();

  if (!tier) return { success: false, errors: { _form: "Invalid service tier selected." } };

  const { data: category } = await supabaseAdmin
    .from("service_categories")
    .select("id, name, slug")
    .eq("id", tier.category_id)
    .single();

  if (!category) return { success: false, errors: { _form: "Invalid service category." } };

  // Look up addon prices server-side
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

  // Build notes
  const noteParts: string[] = [];
  if (payload.preferredTime) noteParts.push(`Preferred time: ${payload.preferredTime}`);
  if (payload.notes.trim()) noteParts.push(payload.notes.trim());

  const row: Record<string, unknown> = {
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
    requested_by: "broker",
    broker_id: broker.brokerId,
    payer_type: "homeowner",
    payer_name: payload.fullName.trim(),
    payer_email: payload.email.trim(),
    network_status: "in_network",
    source: "broker_client_link",
    special_notes: noteParts.length > 0 ? noteParts.join("\n") : null,
    // Catalog fields
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

  // Insert into hes_schedule
  const { data: inserted, error } = await supabaseAdmin
    .from("hes_schedule")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error("[submitBrokerClientRequest] insert error:", error.message, error.details);
    return { success: false, errors: { _form: "Something went wrong. Please try again." } };
  }

  const jobId = inserted.id as string;
  const referenceId = `REI-${jobId.slice(0, 8).toUpperCase()}`;

  // Activity log
  await logJobActivity(
    jobId,
    "job_requested",
    "Client request via broker referral link",
    { name: payload.fullName.trim(), role: "homeowner" },
    { ...payload, referenceId, brokerId: broker.brokerId, brokerName: broker.brokerName },
    "hes",
  );

  // Increment referral conversions
  const { data: brokerRow } = await supabaseAdmin
    .from("brokers")
    .select("referral_link_conversions")
    .eq("referral_code", payload.brokerCode)
    .single();

  if (brokerRow) {
    await supabaseAdmin
      .from("brokers")
      .update({
        referral_link_conversions: ((brokerRow.referral_link_conversions as number) || 0) + 1,
      })
      .eq("referral_code", payload.brokerCode);
  }

  return { success: true, referenceId };
}
