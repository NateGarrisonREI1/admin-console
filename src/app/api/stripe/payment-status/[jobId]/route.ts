import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  // Authenticate
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Try hes_schedule first
  const { data: hesRow } = await supabaseAdmin
    .from("hes_schedule")
    .select("payment_status, payment_received_at, catalog_total_price, invoice_amount")
    .eq("id", jobId)
    .maybeSingle();

  if (hesRow) {
    return NextResponse.json({
      payment_status: hesRow.payment_status || "none",
      payment_received_at: hesRow.payment_received_at,
      catalog_total_price: hesRow.catalog_total_price ?? hesRow.invoice_amount,
    });
  }

  // Try inspector_schedule
  const { data: inspRow } = await supabaseAdmin
    .from("inspector_schedule")
    .select("payment_status, payment_received_at, catalog_total_price, invoice_amount")
    .eq("id", jobId)
    .maybeSingle();

  if (inspRow) {
    return NextResponse.json({
      payment_status: inspRow.payment_status || "none",
      payment_received_at: inspRow.payment_received_at,
      catalog_total_price: inspRow.catalog_total_price ?? inspRow.invoice_amount,
    });
  }

  return NextResponse.json({ error: "Job not found." }, { status: 404 });
}
