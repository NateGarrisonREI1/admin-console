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
  // Phase 8A routing
  routing_channel: string | null;
  exclusive_contractor_id: string | null;
  is_free_assignment: boolean;
  network_release_at: string | null;
};

export type JobBoardData = {
  leads: JobBoardLead[];
  brokerIds: string[];
  networkPartnerOf: string[]; // poster IDs whose rei_contractor_network includes this contractor
  stats: {
    totalAvailable: number;
    networkLeads: number;
    openMarketLeads: number;
    reservedLeads: number;
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
  // Phase 8A routing
  routing_channel: string | null;
  exclusive_contractor_id: string | null;
  is_free_assignment: boolean;
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
  networkPartnerOf: [],
  stats: { totalAvailable: 0, networkLeads: 0, openMarketLeads: 0, reservedLeads: 0 },
};

// ─── Fetch job board data ───────────────────────────────────────────

export async function fetchJobBoardData(): Promise<{ data: JobBoardData; isAdmin: boolean }> {
  try {
    const auth = await getContractorAuth();
    const isAdmin = auth.isAdmin;
    const userId = auth.userId;

    // Fetch all available leads
    const leadsRes = await supabaseAdmin
      .from("system_leads")
      .select("id, system_type, title, description, city, state, zip, area, home_year_built, home_sqft, home_type, beds, baths, price, has_leaf, posted_date, expiration_date, broker_id, is_exclusive, created_at, routing_channel, exclusive_contractor_id, is_free_assignment, network_release_at")
      .eq("status", "available")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);

    const allLeads = (leadsRes.data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      system_type: r.system_type as string,
      title: (r.title as string) ?? null,
      description: (r.description as string) ?? null,
      city: (r.city as string) ?? null,
      state: r.state as string,
      zip: r.zip as string,
      area: (r.area as string) ?? null,
      home_year_built: (r.home_year_built as number) ?? null,
      home_sqft: (r.home_sqft as number) ?? null,
      home_type: (r.home_type as string) ?? null,
      beds: (r.beds as number) ?? null,
      baths: r.baths != null ? Number(r.baths) : null,
      price: Number(r.price),
      has_leaf: !!(r.has_leaf),
      posted_date: (r.posted_date as string) ?? null,
      expiration_date: (r.expiration_date as string) ?? null,
      broker_id: (r.broker_id as string) ?? null,
      is_exclusive: !!(r.is_exclusive),
      created_at: r.created_at as string,
      routing_channel: (r.routing_channel as string) ?? null,
      exclusive_contractor_id: (r.exclusive_contractor_id as string) ?? null,
      is_free_assignment: !!(r.is_free_assignment),
      network_release_at: (r.network_release_at as string) ?? null,
    })) as JobBoardLead[];

    // Broker network IDs (from user_relationships — broker_contractor_connections)
    let brokerIds: string[] = [];
    if (!isAdmin) {
      const relRes = await supabaseAdmin
        .from("user_relationships")
        .select("related_user_id")
        .eq("user_id", userId)
        .eq("relationship_type", "in_broker_network");
      brokerIds = (relRes.data ?? []).map((r: { related_user_id: string }) => r.related_user_id);
    }

    // Check if this contractor is in any poster's rei_contractor_network
    // We match by email since network partners may not have platform accounts yet
    let networkPartnerOf: string[] = [];
    if (!isAdmin) {
      // First try matching by contractor_id (for platform users added to network)
      const { data: networkRows } = await supabaseAdmin
        .from("rei_contractor_network")
        .select("id")
        .eq("contractor_id", userId)
        .eq("status", "active");

      if (networkRows && networkRows.length > 0) {
        // Contractor is in REI's network — they can see internal_network leads
        // All internal_network leads are visible to any network member
        networkPartnerOf = ["__rei_network__"];
      }
    }

    const now = new Date().toISOString();

    // Categorize leads
    let visibleLeads: JobBoardLead[];
    if (isAdmin) {
      // Admin sees everything
      visibleLeads = allLeads;
    } else {
      visibleLeads = allLeads.filter((l) => {
        const channel = l.routing_channel || "open_market";

        // Exclusive leads: only visible to the assigned contractor
        if (channel === "exclusive") {
          return l.exclusive_contractor_id === userId;
        }

        // Internal network leads
        if (channel === "internal_network") {
          // If expired (past network_release_at), treat as open market — visible to all
          if (l.network_release_at && l.network_release_at < now) {
            return true;
          }
          // Otherwise only visible to network members and broker network
          const inNetwork = networkPartnerOf.length > 0;
          const inBrokerNetwork = l.broker_id ? brokerIds.includes(l.broker_id) : false;
          return inNetwork || inBrokerNetwork;
        }

        // Open market: visible to all
        return true;
      });
    }

    // Count stats
    const reservedLeads = visibleLeads.filter(
      (l) => l.routing_channel === "exclusive" && l.exclusive_contractor_id === userId
    ).length;

    const networkLeads = isAdmin
      ? visibleLeads.filter((l) => l.routing_channel === "internal_network").length
      : visibleLeads.filter((l) => {
          if (l.routing_channel !== "internal_network") return false;
          // Only count as "network" if still within network window
          if (l.network_release_at && l.network_release_at < now) return false;
          const inNetwork = networkPartnerOf.length > 0;
          const inBrokerNetwork = l.broker_id ? brokerIds.includes(l.broker_id) : false;
          return inNetwork || inBrokerNetwork;
        }).length;

    const openMarketLeads = visibleLeads.length - networkLeads - reservedLeads;

    return {
      data: {
        leads: visibleLeads,
        brokerIds,
        networkPartnerOf,
        stats: {
          totalAvailable: visibleLeads.length,
          networkLeads,
          openMarketLeads,
          reservedLeads,
        },
      },
      isAdmin,
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

  // Hide contact info unless purchased by this contractor or free exclusive assigned to them
  const isPurchasedByMe = data.purchased_by_contractor_id === userId;
  const isFreeExclusiveForMe =
    data.routing_channel === "exclusive" &&
    data.is_free_assignment &&
    data.exclusive_contractor_id === userId;

  const showContact = isPurchasedByMe || isFreeExclusiveForMe;

  return {
    id: data.id,
    system_type: data.system_type,
    title: data.title ?? null,
    description: data.description ?? null,
    city: data.city,
    state: data.state,
    zip: data.zip,
    area: data.area ?? null,
    address: showContact ? data.address : null,
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
    homeowner_name: showContact ? data.homeowner_name : null,
    homeowner_phone: showContact ? data.homeowner_phone : null,
    homeowner_email: showContact ? data.homeowner_email : null,
    best_contact_time: showContact ? data.best_contact_time : null,
    status: data.status,
    broker_id: data.broker_id ?? null,
    is_exclusive: data.is_exclusive ?? true,
    routing_channel: data.routing_channel ?? null,
    exclusive_contractor_id: data.exclusive_contractor_id ?? null,
    is_free_assignment: !!data.is_free_assignment,
  };
}

// ─── Accept free exclusive lead ─────────────────────────────────────

export async function acceptFreeLead(leadId: string): Promise<PurchaseResult> {
  const userId = await getContractorId();

  // Fetch lead
  const { data: lead } = await supabaseAdmin
    .from("system_leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (!lead) throw new Error("Lead not found");
  if (lead.status !== "available") throw new Error("Lead is no longer available");
  if (lead.routing_channel !== "exclusive") throw new Error("This lead is not an exclusive assignment");
  if (!lead.is_free_assignment) throw new Error("This lead requires payment");
  if (lead.exclusive_contractor_id !== userId) throw new Error("This lead is not assigned to you");

  // Update lead as purchased (free)
  await supabaseAdmin
    .from("system_leads")
    .update({
      status: "purchased",
      purchased_by_contractor_id: userId,
      purchased_date: new Date().toISOString(),
    })
    .eq("id", leadId);

  // Create/update contractor_lead_status
  const { data: existing } = await supabaseAdmin
    .from("contractor_lead_status")
    .select("id")
    .eq("contractor_id", userId)
    .eq("system_lead_id", leadId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("contractor_lead_status")
      .update({ status: "new" })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin
      .from("contractor_lead_status")
      .insert({
        contractor_id: userId,
        system_lead_id: leadId,
        status: "new",
      });
  }

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

  return {
    success: true,
    homeowner_name: lead.homeowner_name,
    homeowner_phone: lead.homeowner_phone,
    homeowner_email: lead.homeowner_email,
    address: lead.address,
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
