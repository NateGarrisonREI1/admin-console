"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { BrokerService } from "@/lib/services/BrokerService";
import type { Broker, BrokerLead, BrokerAssessment, BrokerContractor } from "@/types/broker";

export type LeadsPageData = {
  broker: Broker;
  leads: BrokerLead[];
  assessments: BrokerAssessment[];
  providers: BrokerContractor[];
};

export async function fetchLeads(): Promise<LeadsPageData | null> {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(userId);
  const [leads, assessments, allProviders] = await Promise.all([
    svc.getLeads(broker.id),
    svc.getAssessments(broker.id, "completed"),
    svc.getContractors(broker.id, "active"),
  ]);
  // Only return HES assessors and inspectors for lead assignment
  const providers = allProviders.filter(
    (p) => p.provider_type === "hes_assessor" || p.provider_type === "inspector"
  );
  return { broker, leads, assessments, providers };
}

export async function postLead(input: {
  broker_id: string;
  assessment_id?: string;
  lead_type?: string;
  system_type: string;
  price: number;
  visibility?: string;
  assigned_to_provider_id?: string;
  expiration_date?: string;
  description?: string;
  notes?: string;
}): Promise<BrokerLead> {
  const svc = new BrokerService();
  return svc.postLead(input);
}

export async function updateLead(
  id: string,
  updates: { price?: number; expiration_date?: string; notes?: string; status?: string }
): Promise<BrokerLead> {
  const svc = new BrokerService();
  return svc.updateLead(id, updates as any);
}

export async function markLeadClosed(id: string, brokerId: string): Promise<BrokerLead> {
  const svc = new BrokerService();
  return svc.markLeadClosed(id, brokerId);
}

export async function deleteLead(id: string): Promise<void> {
  const svc = new BrokerService();
  return svc.deleteLead(id);
}
