// GET /api/v1/contractor/my-leads — Contractor's purchased leads

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireRole, json } from "@/app/api/v1/_lib/auth";
import { ok, serverError } from "@/types/api";

export async function GET(req: NextRequest) {
  const auth = await requireRole("contractor");
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(sp.get("per_page")) || 25));
  const offset = (page - 1) * perPage;

  // Join system_leads with contractor_lead_status
  let query = supabaseAdmin
    .from("contractor_lead_status")
    .select(
      `
      id,
      status,
      notes,
      quote_amount,
      closed_date,
      updated_at,
      system_lead:system_leads!inner(
        id,
        system_type,
        address,
        city,
        state,
        zip,
        homeowner_name,
        homeowner_phone,
        homeowner_email,
        best_contact_time,
        leaf_report_data,
        price,
        purchased_date
      )
    `,
      { count: "exact" }
    )
    .eq("contractor_id", auth.userId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;

  if (error) return json(serverError(error.message));

  return json(ok({ items: data ?? [], total: count ?? 0, page, per_page: perPage }));
}
