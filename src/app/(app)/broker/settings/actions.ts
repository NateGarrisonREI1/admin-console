// src/app/(app)/broker/settings/actions.ts
"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Types ──────────────────────────────────────────────────────────

export type BrokerSettings = {
  userId: string;
  brokerId: string;
  fullName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  logoUrl: string | null;
  referralCode: string | null;
  referralVisits: number;
  referralConversions: number;
};

// ─── Auth helper ────────────────────────────────────────────────────

async function getAuth(): Promise<{ userId: string } | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ? { userId: data.user.id } : null;
}

// ─── Fetch settings ─────────────────────────────────────────────────

export async function fetchBrokerSettings(): Promise<BrokerSettings | null> {
  const auth = await getAuth();
  if (!auth) return null;

  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("full_name, email, phone")
    .eq("id", auth.userId)
    .single();

  const { data: broker } = await supabaseAdmin
    .from("brokers")
    .select("id, company_name, phone, logo_url, referral_code, referral_link_visits, referral_link_conversions")
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!broker) return null;

  return {
    userId: auth.userId,
    brokerId: broker.id as string,
    fullName: (profile?.full_name as string) || "Broker",
    email: (profile?.email as string) || "",
    phone: (broker.phone as string) || (profile?.phone as string) || null,
    companyName: (broker.company_name as string) || null,
    logoUrl: (broker.logo_url as string) || null,
    referralCode: (broker.referral_code as string) || null,
    referralVisits: (broker.referral_link_visits as number) || 0,
    referralConversions: (broker.referral_link_conversions as number) || 0,
  };
}

// ─── Update profile ─────────────────────────────────────────────────

export async function updateBrokerProfile(data: {
  fullName: string;
  phone: string;
  companyName: string;
}): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuth();
  if (!auth) return { success: false, error: "Not authenticated" };

  const { data: broker } = await supabaseAdmin
    .from("brokers")
    .select("id")
    .eq("user_id", auth.userId)
    .single();
  if (!broker) return { success: false, error: "Broker not found" };

  await supabaseAdmin
    .from("app_profiles")
    .update({ full_name: data.fullName.trim(), phone: data.phone.trim() || null })
    .eq("id", auth.userId);

  await supabaseAdmin
    .from("brokers")
    .update({ company_name: data.companyName.trim() || null, phone: data.phone.trim() || null })
    .eq("id", broker.id);

  revalidatePath("/broker", "layout");
  return { success: true };
}

// ─── Update referral code ───────────────────────────────────────────

export async function updateReferralCode(
  code: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuth();
  if (!auth) return { success: false, error: "Not authenticated" };

  const cleaned = code.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!cleaned || cleaned.length < 3)
    return { success: false, error: "Code must be at least 3 characters" };
  if (cleaned.length > 30)
    return { success: false, error: "Code must be 30 characters or less" };

  const { data: existing } = await supabaseAdmin
    .from("brokers")
    .select("id")
    .eq("referral_code", cleaned)
    .neq("user_id", auth.userId)
    .maybeSingle();

  if (existing) return { success: false, error: "This code is already taken" };

  await supabaseAdmin
    .from("brokers")
    .update({ referral_code: cleaned })
    .eq("user_id", auth.userId);

  revalidatePath("/broker", "layout");
  return { success: true };
}

// ─── Upload broker logo ─────────────────────────────────────────────

export async function uploadBrokerLogo(
  formData: FormData,
): Promise<{ success: boolean; url?: string; error?: string }> {
  const auth = await getAuth();
  if (!auth) return { success: false, error: "Not authenticated" };

  const file = formData.get("file") as File | null;
  if (!file) return { success: false, error: "No file provided" };

  const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml"];
  if (!allowedTypes.includes(file.type))
    return { success: false, error: "Only PNG, JPG, and SVG files are accepted" };
  if (file.size > 2 * 1024 * 1024)
    return { success: false, error: "File must be under 2MB" };

  const { data: broker } = await supabaseAdmin
    .from("brokers")
    .select("id")
    .eq("user_id", auth.userId)
    .single();
  if (!broker) return { success: false, error: "Broker not found" };

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const storagePath = `broker-logos/${broker.id}/logo.${ext}`;

  // Remove any old logo files first
  for (const oldExt of ["png", "jpg", "jpeg", "svg"]) {
    await supabaseAdmin.storage
      .from("job-files")
      .remove([`broker-logos/${broker.id}/logo.${oldExt}`]);
  }

  const { error: uploadErr } = await supabaseAdmin.storage
    .from("job-files")
    .upload(storagePath, file, { contentType: file.type, upsert: true });

  if (uploadErr) {
    console.error("[uploadBrokerLogo] upload error:", uploadErr.message);
    return { success: false, error: "Upload failed. Please try again." };
  }

  // Signed URL with 10-year expiry
  const { data: signed } = await supabaseAdmin.storage
    .from("job-files")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10);

  const url = signed?.signedUrl || null;
  if (!url) return { success: false, error: "Could not generate URL" };

  await supabaseAdmin
    .from("brokers")
    .update({ logo_url: url })
    .eq("id", broker.id);

  revalidatePath("/broker", "layout");
  return { success: true, url };
}

// ─── Remove broker logo ─────────────────────────────────────────────

export async function removeBrokerLogo(): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuth();
  if (!auth) return { success: false, error: "Not authenticated" };

  const { data: broker } = await supabaseAdmin
    .from("brokers")
    .select("id")
    .eq("user_id", auth.userId)
    .single();
  if (!broker) return { success: false, error: "Broker not found" };

  for (const ext of ["png", "jpg", "jpeg", "svg"]) {
    await supabaseAdmin.storage
      .from("job-files")
      .remove([`broker-logos/${broker.id}/logo.${ext}`]);
  }

  await supabaseAdmin
    .from("brokers")
    .update({ logo_url: null })
    .eq("id", broker.id);

  revalidatePath("/broker", "layout");
  return { success: true };
}
