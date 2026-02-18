"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { getContractorAuth } from "../../_actions/contractor";

// ─── Types ──────────────────────────────────────────────────────────

export type NetworkContact = {
  id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  company_name: string | null;
  trade: string | null;
  notes: string | null;
  created_at: string;
};

export type CustomerForReferral = {
  id: string;
  homeowner_name: string;
  homeowner_address: string | null;
  homeowner_phone: string | null;
  job_type: string;
};

export type ReferralRow = {
  id: string;
  to_contact_name: string | null;
  customer_name: string;
  job_description: string | null;
  sent_via: string;
  sent_at: string;
  status: string;
};

export type ContractorsPageData = {
  contacts: NetworkContact[];
  customers: CustomerForReferral[];
  referrals: ReferralRow[];
};

// ─── Auth ───────────────────────────────────────────────────────────

async function getContractorId(): Promise<string> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data?.user?.id) throw new Error("Not authenticated");
  return data.user.id;
}

// ─── Empty defaults ─────────────────────────────────────────────────

const EMPTY_DATA: ContractorsPageData = { contacts: [], customers: [], referrals: [] };

// ─── Fetch network data ─────────────────────────────────────────────

export async function fetchContractorsData(): Promise<{ data: ContractorsPageData; isAdmin: boolean }> {
  try {
    const auth = await getContractorAuth();
    if (auth.isAdmin) return { data: EMPTY_DATA, isAdmin: true };

    const userId = auth.userId;

    const [contactsRes, customersRes, referralsRes] = await Promise.all([
      supabaseAdmin
        .from("contractor_network")
        .select("*")
        .eq("contractor_id", userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("contractor_customers")
        .select("id, homeowner_name, homeowner_address, homeowner_phone, job_type")
        .eq("contractor_id", userId)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("contractor_referrals")
        .select("id, to_contact_name, customer_name, job_description, sent_via, sent_at, status")
        .eq("from_contractor_id", userId)
        .order("sent_at", { ascending: false })
        .limit(20),
    ]);

    return {
      data: {
        contacts: (contactsRes.data ?? []) as NetworkContact[],
        customers: (customersRes.data ?? []) as CustomerForReferral[],
        referrals: (referralsRes.data ?? []) as ReferralRow[],
      },
      isAdmin: false,
    };
  } catch {
    return { data: EMPTY_DATA, isAdmin: false };
  }
}

// ─── Add contact ────────────────────────────────────────────────────

export async function addNetworkContact(data: {
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  company_name?: string;
  trade?: string;
  notes?: string;
}): Promise<void> {
  const userId = await getContractorId();
  const { error } = await supabaseAdmin
    .from("contractor_network")
    .insert({ contractor_id: userId, ...data });
  if (error) throw new Error(error.message);
}

// ─── Update contact ─────────────────────────────────────────────────

export async function updateNetworkContact(
  id: string,
  data: {
    contact_name?: string;
    contact_email?: string | null;
    contact_phone?: string | null;
    company_name?: string | null;
    trade?: string | null;
    notes?: string | null;
  }
): Promise<void> {
  const userId = await getContractorId();
  const { error } = await supabaseAdmin
    .from("contractor_network")
    .update(data)
    .eq("id", id)
    .eq("contractor_id", userId);
  if (error) throw new Error(error.message);
}

// ─── Delete contact ─────────────────────────────────────────────────

export async function deleteNetworkContact(id: string): Promise<void> {
  const userId = await getContractorId();
  const { error } = await supabaseAdmin
    .from("contractor_network")
    .delete()
    .eq("id", id)
    .eq("contractor_id", userId);
  if (error) throw new Error(error.message);
}

// ─── Send referral ──────────────────────────────────────────────────

export async function sendReferral(data: {
  to_contact_id: string;
  customer_id: string;
  job_description: string;
  sent_via: "email" | "text";
}): Promise<void> {
  const userId = await getContractorId();

  // Get contact info
  const { data: contact } = await supabaseAdmin
    .from("contractor_network")
    .select("contact_name, contact_email, contact_phone")
    .eq("id", data.to_contact_id)
    .eq("contractor_id", userId)
    .single();

  if (!contact) throw new Error("Contact not found");

  // Get customer info
  const { data: customer } = await supabaseAdmin
    .from("contractor_customers")
    .select("id, homeowner_name, homeowner_phone, homeowner_address")
    .eq("id", data.customer_id)
    .eq("contractor_id", userId)
    .single();

  if (!customer) throw new Error("Customer not found");

  const { error } = await supabaseAdmin
    .from("contractor_referrals")
    .insert({
      from_contractor_id: userId,
      to_contact_name: contact.contact_name,
      to_contact_email: contact.contact_email,
      to_contact_phone: contact.contact_phone,
      customer_id: customer.id,
      customer_name: customer.homeowner_name,
      customer_phone: customer.homeowner_phone,
      customer_address: customer.homeowner_address,
      job_description: data.job_description,
      sent_via: data.sent_via,
      status: "sent",
    });

  if (error) throw new Error(error.message);
}
