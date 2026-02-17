// GET /api/v1/affiliate/analytics — Affiliate performance metrics

import { supabaseAdmin } from "@/lib/supabase/server";
import { requireRole, json } from "@/app/api/v1/_lib/auth";
import { ok, serverError } from "@/types/api";

export async function GET() {
  const auth = await requireRole("affiliate");
  if (!auth.ok) return auth.response;

  try {
    const { data: work } = await supabaseAdmin
      .from("hes_requests")
      .select("status, purchased_date, completion_date")
      .or(
        `purchased_by_affiliate_id.eq.${auth.userId},assigned_to_affiliate_id.eq.${auth.userId}`
      )
      .is("deleted_at", null);

    const all = work ?? [];
    const total = all.length;
    const completed = all.filter((w: { status: string }) => w.status === "completed").length;
    const inProgress = all.filter((w: { status: string }) =>
      w.status === "assigned_affiliate"
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Average completion time (days)
    const completedItems = all.filter(
      (w: { status: string; purchased_date: string | null; completion_date: string | null }) =>
        w.status === "completed" && w.purchased_date && w.completion_date
    );

    let avgCompletionDays = 0;
    if (completedItems.length > 0) {
      const totalDays = completedItems.reduce((sum: number, w: { purchased_date: string | null; completion_date: string | null }) => {
        const start = new Date(w.purchased_date!).getTime();
        const end = new Date(w.completion_date!).getTime();
        return sum + (end - start) / 86400000;
      }, 0);
      avgCompletionDays = Math.round(totalDays / completedItems.length);
    }

    // Revenue
    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("amount")
      .eq("contractor_id", auth.userId)
      .eq("status", "completed");

    const revenue = (payments ?? []).reduce(
      (sum: number, p: { amount: number }) => sum + Number(p.amount ?? 0),
      0
    );

    return json(
      ok({
        total_purchased: total,
        in_progress: inProgress,
        completed,
        completion_rate: completionRate,
        avg_completion_days: avgCompletionDays,
        total_revenue: revenue,
      })
    );
  } catch (e: unknown) {
    return json(serverError(e instanceof Error ? e.message : "Analytics query failed"));
  }
}
