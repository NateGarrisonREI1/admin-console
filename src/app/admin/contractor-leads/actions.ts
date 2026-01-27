//src/app/admin/contractor-leads/actions.ts// 
"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  const user = data.user;
  if (!user) throw new Error("Not authenticated");

  const { data: profile, error: pErr } = await supabase
    .from("app_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (pErr) throw new Error(pErr.message);
  if (profile?.role !== "admin") throw new Error("Not authorized");

  return { user };
}

export async function adminUpdateLeadPrice(leadId: string, priceCents: number) {
  await requireAdmin();
  const v = Math.max(0, Math.floor(Number(priceCents || 0)));

  const { error } = await supabaseAdmin
    .from("contractor_leads")
    .update({ price_cents: v })
    .eq("id", leadId);

  if (error) throw new Error(error.message);
}

export async function adminAssignLead(leadId: string, contractorUserId: string | null) {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("contractor_leads")
    .update({ assigned_to_user_id: contractorUserId })
    .eq("id", leadId);

  if (error) throw new Error(error.message);
}

export async function adminRemoveLead(leadId: string, reason?: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("contractor_leads")
    .update({
      status: "cancelled",
      removed_at: new Date().toISOString(),
      removed_reason: reason ?? "Removed by admin",
    })
    .eq("id", leadId);

  if (error) throw new Error(error.message);
}
