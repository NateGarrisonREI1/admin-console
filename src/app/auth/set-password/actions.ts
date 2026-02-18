// src/app/auth/set-password/actions.ts
"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

/**
 * After an invited user sets their password, mark their profile as active
 * and return their role for client-side redirect.
 */
export async function activateProfile(): Promise<{
  role: string;
  onboardingComplete: boolean;
}> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  // Update status from 'pending' to 'active'
  await supabaseAdmin
    .from("app_profiles")
    .update({ status: "active" })
    .eq("id", userId);

  // Get role + onboarding status
  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("role, onboarding_complete")
    .eq("id", userId)
    .single();

  const role = (profile?.role as string) ?? "homeowner";
  let onboardingComplete = !!(profile as Record<string, unknown> | null)?.onboarding_complete;

  // For contractors, check contractor_profiles table
  if (role === "contractor") {
    const { data: cp } = await supabaseAdmin
      .from("contractor_profiles")
      .select("onboarding_complete")
      .eq("id", userId)
      .single();
    onboardingComplete = !!cp?.onboarding_complete;
  }

  return { role, onboardingComplete };
}
