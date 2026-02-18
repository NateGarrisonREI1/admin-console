"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

export type BrokerOnboardingData = {
  company_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  bio: string | null;
  service_areas: string[];
  brand_color: string | null;
  tagline: string | null;
  onboarding_complete: boolean;
};

async function getBrokerId(): Promise<string> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data?.user?.id) throw new Error("Not authenticated");
  return data.user.id;
}

export async function fetchBrokerOnboardingData(): Promise<BrokerOnboardingData> {
  const userId = await getBrokerId();
  const { data } = await supabaseAdmin
    .from("app_profiles")
    .select("full_name, phone, email, onboarding_complete")
    .eq("id", userId)
    .single();

  return {
    company_name: (data?.full_name as string) || null,
    phone: (data?.phone as string) || null,
    email: (data?.email as string) || null,
    website: null,
    bio: null,
    service_areas: [],
    brand_color: null,
    tagline: null,
    onboarding_complete: !!(data as Record<string, unknown> | null)?.onboarding_complete,
  };
}

export async function updateBrokerOnboarding(updates: {
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  bio?: string | null;
  service_areas?: string[];
  brand_color?: string | null;
  tagline?: string | null;
  onboarding_complete?: boolean;
}) {
  const userId = await getBrokerId();

  // Store broker-specific onboarding data in app_profiles metadata columns
  // We use full_name for company name, and JSON metadata for the rest
  const profilePatch: Record<string, unknown> = {};
  if (updates.company_name !== undefined) profilePatch.full_name = updates.company_name;
  if (updates.phone !== undefined) profilePatch.phone = updates.phone;
  if (updates.email !== undefined) profilePatch.email = updates.email;
  if (updates.onboarding_complete !== undefined) profilePatch.onboarding_complete = updates.onboarding_complete;

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await supabaseAdmin
      .from("app_profiles")
      .update(profilePatch)
      .eq("id", userId);
    if (error) throw new Error(error.message);
  }
}
