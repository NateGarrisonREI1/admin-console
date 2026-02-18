"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getContractorAuth } from "../_actions/contractor";

// ─── Types ──────────────────────────────────────────────────────────

export type CustomerRow = {
  id: string;
  homeowner_name: string;
  homeowner_email: string | null;
  homeowner_phone: string | null;
  homeowner_address: string | null;
  job_type: string;
  job_date: string | null;
  job_status: string;
  notes: string | null;
  created_at: string;
};

export type CustomersPageData = {
  customers: CustomerRow[];
  stats: {
    total: number;
    completed: number;
    inProgress: number;
  };
};

// ─── Empty defaults ─────────────────────────────────────────────────

const EMPTY_DATA: CustomersPageData = {
  customers: [],
  stats: { total: 0, completed: 0, inProgress: 0 },
};

// ─── Fetch customers ────────────────────────────────────────────────

export async function fetchCustomersData(): Promise<{ data: CustomersPageData; isAdmin: boolean }> {
  try {
    const auth = await getContractorAuth();
    if (auth.isAdmin) return { data: EMPTY_DATA, isAdmin: true };

    const userId = auth.userId;

    const { data, error } = await supabaseAdmin
      .from("contractor_customers")
      .select("*")
      .eq("contractor_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const customers = (data ?? []) as CustomerRow[];
    const completed = customers.filter((c) => c.job_status === "completed").length;
    const inProgress = customers.filter((c) => c.job_status !== "completed").length;

    return {
      data: { customers, stats: { total: customers.length, completed, inProgress } },
      isAdmin: false,
    };
  } catch {
    return { data: EMPTY_DATA, isAdmin: false };
  }
}
