// GET /api/v1/admin/analytics — Admin dashboard KPI metrics

import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin, json } from "@/app/api/v1/_lib/auth";
import { ok, serverError } from "@/types/api";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  try {
    // Leads posted this month
    const { count: leadsPosted } = await supabaseAdmin
      .from("system_leads")
      .select("*", { count: "exact", head: true })
      .gte("posted_date", monthStart)
      .is("deleted_at", null);

    // Leads sold this month
    const { count: leadsSold } = await supabaseAdmin
      .from("system_leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "purchased")
      .gte("purchased_date", monthStart)
      .is("deleted_at", null);

    // Revenue this month
    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("amount")
      .eq("status", "completed")
      .gte("created_at", monthStart);

    const revenue = (payments ?? []).reduce(
      (sum: number, p: { amount: number }) => sum + Number(p.amount ?? 0),
      0
    );

    // Total available leads
    const { count: availableLeads } = await supabaseAdmin
      .from("system_leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "available")
      .is("deleted_at", null);

    // Pending HES requests
    const { count: pendingHes } = await supabaseAdmin
      .from("hes_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .is("deleted_at", null);

    return json(
      ok({
        leads_posted_this_month: leadsPosted ?? 0,
        leads_sold_this_month: leadsSold ?? 0,
        revenue_this_month: revenue,
        available_leads: availableLeads ?? 0,
        pending_hes_requests: pendingHes ?? 0,
      })
    );
  } catch (e: unknown) {
    return json(serverError(e instanceof Error ? e.message : "Analytics query failed"));
  }
}
