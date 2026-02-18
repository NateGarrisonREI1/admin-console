"use server";

import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated.");

  const { data: prof } = await supabase
    .from("app_profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if ((prof?.role || "homeowner") !== "admin") throw new Error("Admin only.");
}

export type AuthEventRow = {
  id: string;
  user_id: string | null;
  email: string;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function fetchAuthLogs(input?: {
  limit?: number;
  emailFilter?: string;
  actionFilter?: string;
}): Promise<AuthEventRow[]> {
  await requireAdmin();

  const limit = Math.min(input?.limit ?? 200, 1000);

  let query = supabaseAdmin
    .from("auth_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (input?.emailFilter) {
    query = query.ilike("email", `%${input.emailFilter}%`);
  }
  if (input?.actionFilter && input.actionFilter !== "all") {
    query = query.eq("action", input.actionFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[auth-logs] Fetch failed:", error);
    return [];
  }

  return (data ?? []) as AuthEventRow[];
}
