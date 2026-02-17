"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { StripeService } from "@/lib/services/StripeService";

export type AvailableHesLead = {
  id: string;
  property_address: string;
  city: string;
  state: string;
  zip: string;
  property_type: string;
  requested_completion_date: string | null;
  price: number;
  posted_for_sale_date: string | null;
};

export type MyWorkItem = {
  id: string;
  property_address: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  purchased_date: string | null;
  completion_date: string | null;
  hes_report_url: string | null;
  notes: string | null;
};

export type AffiliateStats = {
  total_purchased: number;
  in_progress: number;
  completed: number;
  completion_rate: number;
  avg_completion_days: number;
};

export async function fetchAffiliateDashboard() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  // Available HES leads
  const { data: available } = await supabaseAdmin
    .from("hes_requests")
    .select("id, property_address, city, state, zip, property_type, requested_completion_date, price, posted_for_sale_date")
    .not("posted_for_sale_date", "is", null)
    .is("purchased_by_affiliate_id", null)
    .is("deleted_at", null)
    .neq("status", "cancelled")
    .neq("status", "completed")
    .order("posted_for_sale_date", { ascending: false })
    .limit(50);

  // My work
  const { data: myWork } = await supabaseAdmin
    .from("hes_requests")
    .select("id, property_address, city, state, zip, status, purchased_date, completion_date, hes_report_url, notes")
    .or(`purchased_by_affiliate_id.eq.${userId},assigned_to_affiliate_id.eq.${userId}`)
    .is("deleted_at", null)
    .order("purchased_date", { ascending: false });

  // Stats
  const all = myWork ?? [];
  const total = all.length;
  const completed = all.filter((w: { status: string }) => w.status === "completed").length;
  const inProgress = all.filter((w: { status: string }) => w.status === "assigned_affiliate").length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const completedItems = all.filter(
    (w: { status: string; purchased_date: string | null; completion_date: string | null }) =>
      w.status === "completed" && w.purchased_date && w.completion_date
  );
  let avgDays = 0;
  if (completedItems.length > 0) {
    const totalDays = completedItems.reduce((sum: number, w: { purchased_date: string | null; completion_date: string | null }) => {
      return sum + (new Date(w.completion_date!).getTime() - new Date(w.purchased_date!).getTime()) / 86400000;
    }, 0);
    avgDays = Math.round(totalDays / completedItems.length);
  }

  return {
    available: (available ?? []) as AvailableHesLead[],
    my_work: (myWork ?? []) as MyWorkItem[],
    stats: {
      total_purchased: total,
      in_progress: inProgress,
      completed,
      completion_rate: completionRate,
      avg_completion_days: avgDays,
    } as AffiliateStats,
  };
}

/**
 * Create a Stripe payment intent for purchasing an HES lead.
 * Returns the clientSecret for use with Stripe Elements on the frontend.
 */
export async function createHesLeadPurchaseIntent(leadId: string) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user?.id) throw new Error("Not authenticated");

  const { data: lead } = await supabaseAdmin
    .from("hes_requests")
    .select("id, price, purchased_by_affiliate_id")
    .eq("id", leadId)
    .is("deleted_at", null)
    .single();

  if (!lead) throw new Error("Lead not found");
  if (lead.purchased_by_affiliate_id) throw new Error("Already purchased");

  const result = await StripeService.createPaymentIntent(
    user.id,
    user.email ?? "",
    leadId,
    lead.price ?? 10,
    "hes_request"
  );

  return { clientSecret: result.clientSecret };
}

export async function markWorkComplete(workId: string, reportUrl?: string) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const updates: Record<string, unknown> = {
    status: "completed",
    completion_date: new Date().toISOString(),
  };
  if (reportUrl) updates.hes_report_url = reportUrl;

  const { error } = await supabaseAdmin
    .from("hes_requests")
    .update(updates)
    .eq("id", workId)
    .or(`purchased_by_affiliate_id.eq.${userId},assigned_to_affiliate_id.eq.${userId}`);

  if (error) throw new Error(error.message);
}
