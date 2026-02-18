// src/app/(app)/contractor/_actions/contractor.ts
"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

// ─── Types ──────────────────────────────────────────────────────────

export type ContractorProfileData = {
  id: string;
  company_name: string | null;
  system_specialties: string[];
  service_radius_miles: number;
  service_zip_codes: string[];
  phone: string | null;
  email: string | null;
  website: string | null;
  license_number: string | null;
  insurance_verified: boolean;
  stripe_customer_id: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
};

// ─── Auth helpers ───────────────────────────────────────────────────

async function getContractorId(): Promise<string> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data?.user?.id) throw new Error("Not authenticated");
  return data.user.id;
}

export type ContractorAuth = {
  userId: string;
  role: string;
  isAdmin: boolean;
};

export async function getContractorAuth(): Promise<ContractorAuth> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data?.user?.id) throw new Error("Not authenticated");

  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const role = (profile?.role as string) ?? "contractor";
  return { userId: data.user.id, role, isAdmin: role === "admin" };
}

// ─── Onboarding check ──────────────────────────────────────────────

export async function checkOnboardingStatus(): Promise<{
  complete: boolean;
  hasProfile: boolean;
}> {
  const userId = await getContractorId();
  const { data } = await supabaseAdmin
    .from("contractor_profiles")
    .select("onboarding_complete")
    .eq("id", userId)
    .single();

  if (!data) return { complete: false, hasProfile: false };
  return { complete: !!data.onboarding_complete, hasProfile: true };
}

// ─── Fetch profile ──────────────────────────────────────────────────

export async function fetchContractorProfile(): Promise<ContractorProfileData | null> {
  const userId = await getContractorId();
  const { data, error } = await supabaseAdmin
    .from("contractor_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data as ContractorProfileData | null;
}

// ─── Ensure profile exists ──────────────────────────────────────────

export async function ensureContractorProfile(): Promise<ContractorProfileData> {
  const userId = await getContractorId();
  const { data: existing } = await supabaseAdmin
    .from("contractor_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (existing) return existing as ContractorProfileData;

  const { data: created, error } = await supabaseAdmin
    .from("contractor_profiles")
    .insert({ id: userId })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return created as ContractorProfileData;
}

// ─── Update profile ────────────────────────────────────────────────

export async function updateContractorProfile(updates: {
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  license_number?: string | null;
  system_specialties?: string[];
  service_zip_codes?: string[];
  service_types?: string[];
  service_areas?: string[];
  service_radius_miles?: number;
  insurance_verified?: boolean;
  onboarding_complete?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getContractorId();
    const { error } = await supabaseAdmin
      .from("contractor_profiles")
      .upsert({ id: userId, ...updates }, { onConflict: "id" });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ─── Complete onboarding ────────────────────────────────────────────

export async function completeOnboarding() {
  const userId = await getContractorId();
  const { error } = await supabaseAdmin
    .from("contractor_profiles")
    .update({ onboarding_complete: true })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

// ─── Stripe SetupIntent for saving payment method ───────────────────

export async function createSetupIntent(): Promise<{ clientSecret: string }> {
  const { stripe } = await import("@/lib/stripe");
  const { StripeService } = await import("@/lib/services/StripeService");

  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user?.id) throw new Error("Not authenticated");

  const customerId = await StripeService.getOrCreateCustomer(
    user.id,
    user.email ?? "",
  );

  // Also store in contractor_profiles
  await supabaseAdmin
    .from("contractor_profiles")
    .update({ stripe_customer_id: customerId })
    .eq("id", user.id);

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    metadata: { user_id: user.id },
  });

  return { clientSecret: setupIntent.client_secret! };
}

// ─── Check if contractor has payment method ─────────────────────────

export async function hasPaymentMethod(): Promise<boolean> {
  const { stripe } = await import("@/lib/stripe");

  const userId = await getContractorId();
  const { data } = await supabaseAdmin
    .from("contractor_profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (!data?.stripe_customer_id) return false;

  const methods = await stripe.paymentMethods.list({
    customer: data.stripe_customer_id,
    type: "card",
    limit: 1,
  });

  return methods.data.length > 0;
}
