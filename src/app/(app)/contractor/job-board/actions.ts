"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { StripeService } from "@/lib/services/StripeService";
import { getContractorAuth } from "../_actions/contractor";

// ─── Types ──────────────────────────────────────────────────────────

export type JobBoardLead = {
  id: string;
  system_type: string;
  title: string | null;
  description: string | null;
  city: string | null;
  state: string;
  zip: string;
  area: string | null;
  home_year_built: number | null;
  home_sqft: number | null;
  home_type: string | null;
  beds: number | null;
  baths: number | null;
  price: number;
  has_leaf: boolean;
  posted_date: string | null;
  expiration_date: string | null;
  broker_id: string | null;
  is_exclusive: boolean;
  created_at: string;
};

export type JobBoardData = {
  leads: JobBoardLead[];
  brokerIds: string[];
  stats: {
    totalAvailable: number;
    networkLeads: number;
    openMarketLeads: number;
  };
};

export type LeadDetail = {
  id: string;
  system_type: string;
  title: string | null;
  description: string | null;
  city: string | null;
  state: string;
  zip: string;
  area: string | null;
  address: string | null;
  home_year_built: number | null;
  home_sqft: number | null;
  home_type: string | null;
  beds: number | null;
  baths: number | null;
  price: number;
  has_leaf: boolean;
  leaf_report_data: Record<string, unknown> | null;
  posted_date: string | null;
  expiration_date: string | null;
  homeowner_name: string | null;
  homeowner_phone: string | null;
  homeowner_email: string | null;
  best_contact_time: string | null;
  status: string;
  broker_id: string | null;
  is_exclusive: boolean;
};

export type PurchaseResult = {
  success: boolean;
  homeowner_name: string | null;
  homeowner_phone: string | null;
  homeowner_email: string | null;
  address: string | null;
};

// ─── Auth helper ────────────────────────────────────────────────────

async function getContractorId(): Promise<string> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data?.user?.id) throw new Error("Not authenticated");
  return data.user.id;
}

// ─── Empty defaults ─────────────────────────────────────────────────

const EMPTY_DATA: JobBoardData = {
  leads: [],
  brokerIds: [],
  stats: { totalAvailable: 0, networkLeads: 0, openMarketLeads: 0 },
};

// ─── Fetch job board data ───────────────────────────────────────────

export async function fetchJobBoardData(): Promise<{ data: JobBoardData; isAdmin: boolean }> {
  try {
    const auth = await getContractorAuth();
    if (auth.isAdmin) return { data: EMPTY_DATA, isAdmin: true };

    const userId = auth.userId;

    const [relRes, leadsRes] = await Promise.all([
      supabaseAdmin
        .from("user_relationships")
        .select("related_user_id")
        .eq("user_id", userId)
        .eq("relationship_type", "in_broker_network"),
      supabaseAdmin
        .from("system_leads")
        .select("id, system_type, title, description, city, state, zip, area, home_year_built, home_sqft, home_type, beds, baths, price, has_leaf, posted_date, expiration_date, broker_id, is_exclusive, created_at")
        .eq("status", "available")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const brokerIds = (relRes.data ?? []).map((r: { related_user_id: string }) => r.related_user_id);
    const allLeads = (leadsRes.data ?? []) as JobBoardLead[];
    const networkLeads = allLeads.filter((l) => l.broker_id && brokerIds.includes(l.broker_id));

    return {
      data: {
        leads: allLeads,
        brokerIds,
        stats: {
          totalAvailable: allLeads.length,
          networkLeads: networkLeads.length,
          openMarketLeads: allLeads.length - networkLeads.length,
        },
      },
      isAdmin: false,
    };
  } catch {
    return { data: EMPTY_DATA, isAdmin: false };
  }
}

// ─── Fetch lead detail ──────────────────────────────────────────────

export async function fetchLeadDetail(leadId: string): Promise<LeadDetail | null> {
  const userId = await getContractorId();

  const { data, error } = await supabaseAdmin
    .from("system_leads")
    .select("*")
    .eq("id", leadId)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;

  // Hide contact info unless purchased by this contractor
  const isPurchasedByMe = data.purchased_by_contractor_id === userId;
  return {
    id: data.id,
    system_type: data.system_type,
    title: data.title ?? null,
    description: data.description ?? null,
    city: data.city,
    state: data.state,
    zip: data.zip,
    area: data.area ?? null,
    address: isPurchasedByMe ? data.address : null,
    home_year_built: data.home_year_built ?? null,
    home_sqft: data.home_sqft ?? null,
    home_type: data.home_type ?? null,
    beds: data.beds ?? null,
    baths: data.baths ?? null,
    price: data.price,
    has_leaf: !!data.has_leaf,
    leaf_report_data: data.leaf_report_data,
    posted_date: data.posted_date,
    expiration_date: data.expiration_date,
    homeowner_name: isPurchasedByMe ? data.homeowner_name : null,
    homeowner_phone: isPurchasedByMe ? data.homeowner_phone : null,
    homeowner_email: isPurchasedByMe ? data.homeowner_email : null,
    best_contact_time: isPurchasedByMe ? data.best_contact_time : null,
    status: data.status,
    broker_id: data.broker_id ?? null,
    is_exclusive: data.is_exclusive ?? true,
  };
}

// ─── Create payment intent ──────────────────────────────────────────

export async function createLeadPaymentIntent(leadId: string): Promise<{
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
}> {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user?.id) throw new Error("Not authenticated");

  // Verify lead is available
  const { data: lead } = await supabaseAdmin
    .from("system_leads")
    .select("id, price, status, expiration_date")
    .eq("id", leadId)
    .single();

  if (!lead) throw new Error("Lead not found");
  if (lead.status !== "available") throw new Error("Lead is no longer available");
  if (lead.expiration_date && new Date(lead.expiration_date) < new Date()) {
    throw new Error("Lead has expired");
  }

  return StripeService.createPaymentIntent(
    user.id,
    user.email ?? "",
    leadId,
    lead.price,
    "system_lead"
  );
}

// ─── Confirm purchase after Stripe payment ──────────────────────────

export async function confirmLeadPurchase(
  leadId: string,
  paymentIntentId: string
): Promise<PurchaseResult> {
  const userId = await getContractorId();

  // Verify payment succeeded
  await StripeService.verifyPaymentIntent(paymentIntentId);

  // Get lead details
  const { data: lead } = await supabaseAdmin
    .from("system_leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (!lead) throw new Error("Lead not found");
  if (lead.status !== "available") throw new Error("Lead already purchased");

  // Update lead as purchased
  await supabaseAdmin
    .from("system_leads")
    .update({
      status: "purchased",
      purchased_by_contractor_id: userId,
      purchased_date: new Date().toISOString(),
    })
    .eq("id", leadId);

  // Create contractor_lead_status
  await supabaseAdmin
    .from("contractor_lead_status")
    .insert({
      contractor_id: userId,
      system_lead_id: leadId,
      status: "new",
    });

  // Record payment
  await supabaseAdmin
    .from("payments")
    .insert({
      contractor_id: userId,
      system_lead_id: leadId,
      amount: lead.price,
      system_type: lead.system_type,
      stripe_transaction_id: paymentIntentId,
      status: "completed",
    });

  // Create contractor_customers entry
  await supabaseAdmin
    .from("contractor_customers")
    .insert({
      contractor_id: userId,
      lead_id: leadId,
      homeowner_name: lead.homeowner_name ?? "Unknown",
      homeowner_email: lead.homeowner_email,
      homeowner_phone: lead.homeowner_phone,
      homeowner_address: lead.address,
      job_type: lead.system_type,
      job_status: "purchased",
    });

  // Log revenue split: REI 30%, Poster 68.6% (70% - 2% service fee), Service fee 2%
  const totalAmount = Number(lead.price);
  const reiAmount = Math.round(totalAmount * 30) / 100;
  const serviceFee = Math.round(totalAmount * 2) / 100;
  const posterAmount = Math.round(totalAmount * 68.6) / 100;

  await supabaseAdmin
    .from("lead_transactions")
    .insert({
      lead_id: leadId,
      contractor_id: userId,
      poster_id: lead.broker_id ?? null,
      stripe_payment_intent_id: paymentIntentId,
      total_amount: totalAmount,
      rei_amount: reiAmount,
      poster_amount: posterAmount,
      service_fee: serviceFee,
      status: "completed",
    });

  return {
    success: true,
    homeowner_name: lead.homeowner_name,
    homeowner_phone: lead.homeowner_phone,
    homeowner_email: lead.homeowner_email,
    address: lead.address,
  };
}
