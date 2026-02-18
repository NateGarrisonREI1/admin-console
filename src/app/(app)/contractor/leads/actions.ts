"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getContractorAuth } from "../_actions/contractor";

// ─── Types ──────────────────────────────────────────────────────────

export type PurchasedLead = {
  id: string;
  system_lead_id: string;
  status: string;
  notes: string | null;
  quote_amount: number | null;
  closed_date: string | null;
  updated_at: string;
  system_lead: {
    system_type: string;
    city: string | null;
    state: string;
    homeowner_name: string | null;
    homeowner_phone: string | null;
    price: number;
    purchased_date: string | null;
  };
};

export type LeadsPageData = {
  leads: PurchasedLead[];
  stats: {
    totalPurchased: number;
    active: number;
    completed: number;
    totalSpent: number;
  };
};

// ─── Empty defaults ─────────────────────────────────────────────────

const EMPTY_DATA: LeadsPageData = {
  leads: [],
  stats: { totalPurchased: 0, active: 0, completed: 0, totalSpent: 0 },
};

// ─── Fetch leads ────────────────────────────────────────────────────

export async function fetchContractorLeads(): Promise<{ data: LeadsPageData; isAdmin: boolean }> {
  try {
    const auth = await getContractorAuth();
    if (auth.isAdmin) return { data: EMPTY_DATA, isAdmin: true };

    const userId = auth.userId;

    const { data, error } = await supabaseAdmin
      .from("contractor_lead_status")
      .select(`
        id, system_lead_id, status, notes, quote_amount, closed_date, updated_at,
        system_lead:system_leads!inner(
          system_type, city, state, homeowner_name, homeowner_phone, price, purchased_date
        )
      `)
      .eq("contractor_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);

    const leads: PurchasedLead[] = (data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      system_lead: Array.isArray(row.system_lead) ? row.system_lead[0] : row.system_lead,
    })) as PurchasedLead[];

    const activeStatuses = ["new", "contacted", "quoted", "scheduled", "in_progress"];
    const totalPurchased = leads.length;
    const active = leads.filter((l) => activeStatuses.includes(l.status)).length;
    const completed = leads.filter((l) => l.status === "closed").length;
    const totalSpent = leads.reduce((sum, l) => sum + (l.system_lead?.price ?? 0), 0);

    return {
      data: { leads, stats: { totalPurchased, active, completed, totalSpent } },
      isAdmin: false,
    };
  } catch {
    return { data: EMPTY_DATA, isAdmin: false };
  }
}
