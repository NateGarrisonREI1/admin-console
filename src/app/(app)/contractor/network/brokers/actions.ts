"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { getContractorAuth } from "../../_actions/contractor";

// ─── Types ──────────────────────────────────────────────────────────

export type BrokerConnection = {
  id: string;
  broker_id: string;
  broker_name: string | null;
  broker_company: string | null;
  broker_email: string | null;
  connected_since: string;
  leads_count: number;
  jobs_completed: number;
};

export type AvailableBroker = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
};

export type BrokersPageData = {
  connections: BrokerConnection[];
  available: AvailableBroker[];
};

// ─── Auth ───────────────────────────────────────────────────────────

async function getContractorId(): Promise<string> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data?.user?.id) throw new Error("Not authenticated");
  return data.user.id;
}

// ─── Empty defaults ─────────────────────────────────────────────────

const EMPTY_DATA: BrokersPageData = { connections: [], available: [] };

// ─── Fetch brokers data ─────────────────────────────────────────────

export async function fetchBrokersData(): Promise<{ data: BrokersPageData; isAdmin: boolean }> {
  try {
    const auth = await getContractorAuth();
    if (auth.isAdmin) return { data: EMPTY_DATA, isAdmin: true };

    const userId = auth.userId;

    const { data: rels } = await supabaseAdmin
      .from("user_relationships")
      .select("id, related_user_id, created_at")
      .eq("user_id", userId)
      .eq("relationship_type", "in_broker_network");

    const brokerIds = (rels ?? []).map((r: { related_user_id: string }) => r.related_user_id);

    let connections: BrokerConnection[] = [];
    if (brokerIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("app_profiles")
        .select("id, full_name, company_name, email")
        .in("id", brokerIds);

      const profileMap = new Map(
        (profiles ?? []).map((p: Record<string, unknown>) => [p.id as string, p])
      );

      const { data: leads } = await supabaseAdmin
        .from("system_leads")
        .select("broker_id, status")
        .in("broker_id", brokerIds)
        .eq("purchased_by_contractor_id", userId);

      const leadCounts = new Map<string, { total: number; completed: number }>();
      for (const l of leads ?? []) {
        const row = l as { broker_id: string; status: string };
        const cur = leadCounts.get(row.broker_id) ?? { total: 0, completed: 0 };
        cur.total++;
        if (row.status === "purchased") cur.completed++;
        leadCounts.set(row.broker_id, cur);
      }

      connections = (rels ?? []).map((r: Record<string, unknown>) => {
        const brokerId = r.related_user_id as string;
        const profile = profileMap.get(brokerId) as Record<string, unknown> | undefined;
        const counts = leadCounts.get(brokerId) ?? { total: 0, completed: 0 };
        return {
          id: r.id as string,
          broker_id: brokerId,
          broker_name: (profile?.full_name as string) ?? null,
          broker_company: (profile?.company_name as string) ?? null,
          broker_email: (profile?.email as string) ?? null,
          connected_since: r.created_at as string,
          leads_count: counts.total,
          jobs_completed: counts.completed,
        };
      });
    }

    const { data: allBrokers } = await supabaseAdmin
      .from("app_profiles")
      .select("id, full_name, company_name, email")
      .eq("role", "broker")
      .limit(50);

    const available = (allBrokers ?? [])
      .filter((b: Record<string, unknown>) => !brokerIds.includes(b.id as string))
      .map((b: Record<string, unknown>) => ({
        id: b.id as string,
        full_name: b.full_name as string | null,
        company_name: b.company_name as string | null,
        email: b.email as string | null,
      }));

    return { data: { connections, available }, isAdmin: false };
  } catch {
    return { data: EMPTY_DATA, isAdmin: false };
  }
}

// ─── Request broker connection ──────────────────────────────────────

export async function requestBrokerConnection(brokerId: string): Promise<void> {
  const userId = await getContractorId();

  // Check if already connected
  const { data: existing } = await supabaseAdmin
    .from("user_relationships")
    .select("id")
    .eq("user_id", userId)
    .eq("related_user_id", brokerId)
    .eq("relationship_type", "in_broker_network")
    .maybeSingle();

  if (existing) throw new Error("Already connected to this broker");

  const { error } = await supabaseAdmin
    .from("user_relationships")
    .insert({
      user_id: userId,
      related_user_id: brokerId,
      relationship_type: "in_broker_network",
      metadata: { source: "contractor_request" },
    });

  if (error) throw new Error(error.message);
}
