"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

export type BrokerHesRequest = {
  id: string;
  property_address: string;
  city: string;
  state: string;
  zip: string;
  property_type: string;
  status: string;
  requested_completion_date: string | null;
  completion_date: string | null;
  hes_report_url: string | null;
  created_at: string;
  notes: string | null;
};

export async function fetchBrokerDashboard() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  const { data: requests } = await supabaseAdmin
    .from("hes_requests")
    .select("id, property_address, city, state, zip, property_type, status, requested_completion_date, completion_date, hes_report_url, created_at, notes")
    .eq("broker_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  return {
    requests: (requests ?? []) as BrokerHesRequest[],
  };
}

export async function submitHesRequest(formData: {
  property_address: string;
  city: string;
  state: string;
  zip: string;
  property_type: string;
  requested_completion_date: string | null;
  notes: string;
}) {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { error } = await supabaseAdmin
    .from("hes_requests")
    .insert({
      broker_id: userId,
      property_address: formData.property_address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      zip: formData.zip.trim(),
      property_type: formData.property_type || "single_family",
      requested_completion_date: formData.requested_completion_date || null,
      notes: formData.notes?.trim() || null,
    });

  if (error) throw new Error(error.message);
}
