"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { BrokerService } from "@/lib/services/BrokerService";
import type { Broker, BrokerKPIs, BrokerContractor, BrokerLead } from "@/types/broker";

export type BrokerDashboardData = {
  broker: Broker;
  kpis: BrokerKPIs;
  contractors: BrokerContractor[];
  recentLeads: BrokerLead[];
  topContractors: {
    id: string;
    name: string;
    leads_sent: number;
    jobs_closed: number;
    conversion_rate: number;
    revenue: number;
  }[];
};

export async function fetchBrokerDashboard(): Promise<BrokerDashboardData | null> {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  const svc = new BrokerService();

  const broker = await svc.getOrCreateBroker(userId);
  const kpis = await svc.getDashboardKPIs(broker.id);

  // Fetch active contractors (top performers by network)
  const contractors = await svc.getContractors(broker.id, "active");

  // Fetch the most recent 10 leads
  const allLeads = await svc.getLeads(broker.id);
  const recentLeads = allLeads.slice(0, 10);

  // Build top-contractors from lead purchase data
  const { data: contractorLeadsRaw } = await supabaseAdmin
    .from("broker_leads")
    .select("purchased_by_contractor_id, status, broker_commission")
    .eq("broker_id", broker.id)
    .not("purchased_by_contractor_id", "is", null);

  const contractorMap: Record<string, { leads: number; closed: number; revenue: number }> = {};
  for (const l of (contractorLeadsRaw ?? []) as any[]) {
    const cid = l.purchased_by_contractor_id as string;
    if (!cid) continue;
    if (!contractorMap[cid]) contractorMap[cid] = { leads: 0, closed: 0, revenue: 0 };
    contractorMap[cid].leads++;
    if (l.status === "closed") {
      contractorMap[cid].closed++;
      contractorMap[cid].revenue += l.broker_commission ?? 0;
    }
  }

  const contractorIds = Object.keys(contractorMap);
  const contractorNames: Record<string, string> = {};
  if (contractorIds.length > 0) {
    const { data: names } = await supabaseAdmin
      .from("broker_contractors")
      .select("id, contractor_name")
      .in("id", contractorIds);
    for (const n of (names ?? []) as any[]) {
      contractorNames[n.id] = n.contractor_name;
    }
  }

  const topContractors = Object.entries(contractorMap)
    .map(([id, stats]) => ({
      id,
      name: contractorNames[id] || "Unknown",
      leads_sent: stats.leads,
      jobs_closed: stats.closed,
      conversion_rate: stats.leads > 0 ? Math.round((stats.closed / stats.leads) * 100) : 0,
      revenue: stats.revenue,
    }))
    .sort((a, b) => b.jobs_closed - a.jobs_closed)
    .slice(0, 10);

  return {
    broker,
    kpis,
    contractors,
    recentLeads,
    topContractors,
  };
}
