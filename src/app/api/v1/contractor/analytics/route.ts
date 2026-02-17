// GET /api/v1/contractor/analytics — Contractor dashboard metrics

import { supabaseAdmin } from "@/lib/supabase/server";
import { requireRole, json } from "@/app/api/v1/_lib/auth";
import { ok, serverError } from "@/types/api";

export async function GET() {
  const auth = await requireRole("contractor");
  if (!auth.ok) return auth.response;

  try {
    const { data: statuses } = await supabaseAdmin
      .from("contractor_lead_status")
      .select("status")
      .eq("contractor_id", auth.userId);

    const all = statuses ?? [];
    const total = all.length;
    const inProgress = all.filter((s: { status: string }) =>
      ["new", "contacted", "quoted"].includes(s.status)
    ).length;
    const closed = all.filter((s: { status: string }) => s.status === "closed").length;
    const conversionRate = total > 0 ? Math.round((closed / total) * 100) : 0;

    return json(
      ok({
        total_purchased: total,
        in_progress: inProgress,
        closed,
        conversion_rate: conversionRate,
      })
    );
  } catch (e: unknown) {
    return json(serverError(e instanceof Error ? e.message : "Analytics query failed"));
  }
}
