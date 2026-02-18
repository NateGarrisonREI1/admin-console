"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { BrokerService } from "@/lib/services/BrokerService";
import type { CampaignPerformance } from "@/types/broker";

export async function fetchCampaignPerformance(
  campaignId: string,
): Promise<CampaignPerformance | null> {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  const svc = new BrokerService();
  // Validate broker access
  await svc.getOrCreateBroker(userId);
  return svc.getCampaignPerformance(campaignId);
}
