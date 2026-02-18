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
    .select("full_name, phone, email, website, bio, service_areas, brand_color, tagline, onboarding_complete")
    .eq("id", userId)
    .single();

  return {
    company_name: (data?.full_name as string) || null,
    phone: (data?.phone as string) || null,
    email: (data?.email as string) || null,
    website: (data?.website as string) || null,
    bio: (data?.bio as string) || null,
    service_areas: (data?.service_areas as string[]) ?? [],
    brand_color: (data?.brand_color as string) || null,
    tagline: (data?.tagline as string) || null,
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
}): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getBrokerId();

    const profilePatch: Record<string, unknown> = { id: userId };
    if (updates.company_name !== undefined) profilePatch.full_name = updates.company_name;
    if (updates.phone !== undefined) profilePatch.phone = updates.phone;
    if (updates.email !== undefined) profilePatch.email = updates.email;
    if (updates.website !== undefined) profilePatch.website = updates.website;
    if (updates.bio !== undefined) profilePatch.bio = updates.bio;
    if (updates.service_areas !== undefined) profilePatch.service_areas = updates.service_areas;
    if (updates.brand_color !== undefined) profilePatch.brand_color = updates.brand_color;
    if (updates.tagline !== undefined) profilePatch.tagline = updates.tagline;
    if (updates.onboarding_complete !== undefined) profilePatch.onboarding_complete = updates.onboarding_complete;

    const { error } = await supabaseAdmin
      .from("app_profiles")
      .upsert(profilePatch, { onConflict: "id" });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
