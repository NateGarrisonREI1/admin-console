"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { BrokerService } from "@/lib/services/BrokerService";

export async function fetchSettings() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(userId);
  return { broker };
}

export async function updateBrokerProfile(input: {
  company_name?: string;
  phone?: string;
  email?: string;
  bio?: string;
  service_areas?: string[];
  default_hvac_price?: number;
  default_solar_price?: number;
  default_water_price?: number;
  default_electrical_price?: number;
  default_insulation_price?: number;
  commission_split_percent?: number;
}) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(userId);
  await svc.updateBroker(broker.id, input as any);
}
