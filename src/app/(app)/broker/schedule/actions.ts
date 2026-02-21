// src/app/(app)/broker/schedule/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { BrokerService } from "@/lib/services/BrokerService";

// ─── Types ──────────────────────────────────────────────────────────

export type BrokerJob = {
  id: string;
  type: "hes" | "inspector";
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  payment_status: string | null;
  invoice_amount: number | null;
  network_status: string | null;
  team_member_id: string | null;
  team_member_name: string | null;
  service_name: string | null;
  tier_name: string | null;
  hes_report_url: string | null;
  leaf_report_url: string | null;
  leaf_tier: string | null;
  delivered_by: string | null;
  reports_sent_at: string | null;
  external_assessor_name: string | null;
  external_assessor_company: string | null;
  external_assessor_email: string | null;
  created_at: string;
};

// ─── Helpers ────────────────────────────────────────────────────────

async function getBroker() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;
  const svc = new BrokerService();
  return svc.getOrCreateBroker(userId);
}

const COLS = `id, customer_name, customer_email, customer_phone, address, city, state, zip,
  scheduled_date, scheduled_time, status, payment_status, invoice_amount, network_status,
  team_member_id, team_member_name, service_name, tier_name,
  hes_report_url, leaf_report_url, leaf_tier, delivered_by, reports_sent_at,
  external_assessor_name, external_assessor_company, external_assessor_email, created_at`;

// ─── Fetch ALL broker jobs ──────────────────────────────────────────

export async function fetchBrokerAllJobs(): Promise<BrokerJob[]> {
  const broker = await getBroker();
  if (!broker) return [];

  const [{ data: hes }, { data: insp }] = await Promise.all([
    supabaseAdmin
      .from("hes_schedule")
      .select(COLS)
      .eq("broker_id", broker.id)
      .not("status", "in", "(cancelled,archived)")
      .order("scheduled_date", { ascending: false }),
    supabaseAdmin
      .from("inspector_schedule")
      .select(COLS)
      .eq("broker_id", broker.id)
      .not("status", "in", "(cancelled,archived)")
      .order("scheduled_date", { ascending: false }),
  ]);

  const jobs: BrokerJob[] = [
    ...(hes ?? []).map((r: any) => ({ ...r, type: "hes" as const })),
    ...(insp ?? []).map((r: any) => ({ ...r, type: "inspector" as const })),
  ];
  jobs.sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));
  return jobs;
}
