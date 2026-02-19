// src/app/admin/brokers/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AdminOpsService } from "@/lib/services/AdminOpsService";
import type { AdminBrokerSummary } from "@/types/admin-ops";

export async function fetchBrokers(): Promise<AdminBrokerSummary[]> {
  const svc = new AdminOpsService();
  return svc.getBrokers();
}

export async function updateBrokerProfile(input: {
  brokerId: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    // Update app_profiles (name, email, phone)
    const { error: profileError } = await supabaseAdmin
      .from("app_profiles")
      .update({
        full_name: input.fullName || null,
        email: input.email || null,
        phone: input.phone || null,
      })
      .eq("id", input.userId);

    if (profileError) throw new Error(profileError.message);

    // Update brokers table (company_name)
    const { error: brokerError } = await supabaseAdmin
      .from("brokers")
      .update({ company_name: input.companyName || null })
      .eq("id", input.brokerId);

    if (brokerError) throw new Error(brokerError.message);

    revalidatePath(`/admin/brokers/${input.brokerId}`);
    revalidatePath("/admin/brokers");
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function toggleBrokerStatus(input: {
  userId: string;
  brokerId: string;
  newStatus: "active" | "disabled";
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("app_profiles")
      .update({ status: input.newStatus })
      .eq("id", input.userId);

    if (error) throw new Error(error.message);

    revalidatePath(`/admin/brokers/${input.brokerId}`);
    revalidatePath("/admin/brokers");
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
