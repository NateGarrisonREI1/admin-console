// src/app/(app)/broker/request/actions.ts
"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { BrokerService } from "@/lib/services/BrokerService";
import { logJobActivity } from "@/lib/activityLog";
import {
  fetchServiceCatalog,
  fetchServiceAddons,
} from "@/app/request/actions";

// Re-export server actions (types are imported directly by consumers from @/app/request/actions)
export { fetchServiceCatalog, fetchServiceAddons };

// ─── Types ──────────────────────────────────────────────────────────

export type BrokerProfile = {
  userId: string;
  brokerId: string;
  fullName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
};

export type BrokerRequestPayload = {
  // Service
  serviceTierId: string;
  addonIds: string[];
  // Property
  address: string;
  city: string;
  state: string;
  zip: string;
  // Homeowner
  homeownerPresent: boolean;
  homeownerName: string;
  homeownerEmail: string;
  homeownerPhone: string;
  // Scheduling
  preferredDate: string;
  preferredTime: string;
  // Payment
  payerType: "broker" | "homeowner" | "pay_now";
  // Notes
  notes: string;
};

export type BrokerRequestResult =
  | { success: true; referenceId: string }
  | { success: false; errors: Record<string, string> };

// ─── Auth helpers ───────────────────────────────────────────────────

async function getBrokerAuth(): Promise<{ userId: string; brokerId: string } | null> {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;
  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(userId);
  return { userId, brokerId: broker.id };
}

// ─── Fetch broker profile ───────────────────────────────────────────

export async function fetchBrokerProfile(): Promise<BrokerProfile | null> {
  const auth = await getBrokerAuth();
  if (!auth) return null;

  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("full_name, email, phone")
    .eq("id", auth.userId)
    .single();

  const { data: broker } = await supabaseAdmin
    .from("brokers")
    .select("company_name, phone")
    .eq("id", auth.brokerId)
    .single();

  return {
    userId: auth.userId,
    brokerId: auth.brokerId,
    fullName: (profile?.full_name as string) || "Broker",
    email: (profile?.email as string) || "",
    phone: (broker?.phone as string) || (profile?.phone as string) || null,
    companyName: (broker?.company_name as string) || null,
  };
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

function validatePayload(data: BrokerRequestPayload): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.serviceTierId) errors.serviceTierId = "Please select a home size";

  // Property
  if (!data.address.trim()) errors.address = "Address is required";
  if (!data.city.trim()) errors.city = "City is required";
  if (!data.state.trim()) errors.state = "State is required";
  if (!ZIP_RE.test(data.zip.trim())) errors.zip = "Valid 5-digit zip required";

  // Homeowner (if present)
  if (data.homeownerPresent) {
    if (!data.homeownerName.trim()) errors.homeownerName = "Homeowner name is required";
    if (!EMAIL_RE.test(data.homeownerEmail.trim())) errors.homeownerEmail = "Valid email required";
    if (stripPhone(data.homeownerPhone).length !== 10) errors.homeownerPhone = "Valid 10-digit phone required";
  }

  // Scheduling
  if (!data.preferredDate) {
    errors.preferredDate = "Date is required";
  } else if (data.preferredDate < tomorrowStr()) {
    errors.preferredDate = "Date must be tomorrow or later";
  }
  if (!data.preferredTime) errors.preferredTime = "Time preference is required";

  // Payment
  if (!data.payerType) errors.payerType = "Payment selection required";

  return errors;
}

// ─── Submit ─────────────────────────────────────────────────────────

export async function submitBrokerRequest(
  payload: BrokerRequestPayload,
): Promise<BrokerRequestResult> {
  // Auth
  const auth = await getBrokerAuth();
  if (!auth) return { success: false, errors: { _form: "Not authenticated." } };

  // Validate
  const errors = validatePayload(payload);
  if (Object.keys(errors).length > 0) return { success: false, errors };

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

  // Fetch broker profile for payer info
  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("full_name, email")
    .eq("id", auth.userId)
    .single();

  const brokerName = (profile?.full_name as string) || "Broker";
  const brokerEmail = (profile?.email as string) || "";

  // Determine customer and payer
  const isVacant = !payload.homeownerPresent;
  const custName = isVacant ? brokerName : payload.homeownerName.trim();
  const custEmail = isVacant ? brokerEmail : payload.homeownerEmail.trim();
  const custPhone = isVacant ? "" : stripPhone(payload.homeownerPhone);

  const payerIsBroker = payload.payerType === "broker" || payload.payerType === "pay_now";
  const payerName = payerIsBroker ? brokerName : (isVacant ? brokerName : payload.homeownerName.trim());
  const payerEmail = payerIsBroker ? brokerEmail : (isVacant ? brokerEmail : payload.homeownerEmail.trim());

  // Build notes
  const noteParts: string[] = [];
  if (payload.preferredTime) noteParts.push(`Preferred time: ${payload.preferredTime}`);
  if (payload.notes.trim()) noteParts.push(payload.notes.trim());

  const row: Record<string, unknown> = {
    status: "pending",
    customer_name: custName,
    customer_email: custEmail,
    customer_phone: custPhone || null,
    address: payload.address.trim(),
    city: payload.city.trim(),
    state: payload.state.trim(),
    zip: payload.zip.trim(),
    scheduled_date: payload.preferredDate,
    payment_status: payload.payerType === "pay_now" ? "pending" : "unpaid",
    requested_by: "broker",
    broker_id: auth.brokerId,
    payer_type: payload.payerType === "pay_now" ? "broker" : payload.payerType,
    payer_name: payerName,
    payer_email: payerEmail,
    network_status: "in_network",
    source: "broker_portal",
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

  // Insert into hes_schedule (all services go through this table)
  const { data: inserted, error } = await supabaseAdmin
    .from("hes_schedule")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error("[submitBrokerRequest] insert error:", error.message, error.details);
    return { success: false, errors: { _form: "Something went wrong. Please try again." } };
  }

  const jobId = inserted.id as string;
  const referenceId = `REI-${jobId.slice(0, 8).toUpperCase()}`;

  // Activity log
  await logJobActivity(
    jobId,
    "job_requested",
    "Broker service request submitted",
    { name: brokerName, role: "broker" },
    { ...payload, referenceId, brokerId: auth.brokerId },
    "hes",
  );

  return { success: true, referenceId };
}
