"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { BrokerService } from "@/lib/services/BrokerService";

export async function fetchAssessments() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(userId);
  const assessments = await svc.getAssessments(broker.id);
  return { broker, assessments };
}

export async function createAssessment(input: {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(userId);
  await svc.createAssessment({ broker_id: broker.id, ...input });
}
