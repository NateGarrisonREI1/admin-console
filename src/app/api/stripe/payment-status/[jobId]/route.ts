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
  const { data: hesRow, error: hesErr } = await supabaseAdmin
    .from("hes_schedule")
    .select("payment_status, payment_received_at, catalog_total_price, invoice_amount")
    .eq("id", jobId)
    .maybeSingle();

  if (hesErr) {
    console.error("[payment-status] hes_schedule query error:", hesErr.message);
    // Column may not exist yet — fall back to minimal select
    const { data: hesFallback } = await supabaseAdmin
      .from("hes_schedule")
      .select("payment_status, invoice_amount")
      .eq("id", jobId)
      .maybeSingle();

    if (hesFallback) {
      return NextResponse.json({
        payment_status: hesFallback.payment_status || "none",
        payment_received_at: null,
        catalog_total_price: hesFallback.invoice_amount,
      });
    }
  }

  if (hesRow) {
    return NextResponse.json({
      payment_status: hesRow.payment_status || "none",
      payment_received_at: hesRow.payment_received_at,
      catalog_total_price: hesRow.catalog_total_price ?? hesRow.invoice_amount,
    });
  }

  // Try inspector_schedule
  const { data: inspRow, error: inspErr } = await supabaseAdmin
    .from("inspector_schedule")
    .select("payment_status, payment_received_at, catalog_total_price, invoice_amount")
    .eq("id", jobId)
    .maybeSingle();

  if (inspErr) {
    console.error("[payment-status] inspector_schedule query error:", inspErr.message);
    const { data: inspFallback } = await supabaseAdmin
      .from("inspector_schedule")
      .select("payment_status, invoice_amount")
      .eq("id", jobId)
      .maybeSingle();

    if (inspFallback) {
      return NextResponse.json({
        payment_status: inspFallback.payment_status || "none",
        payment_received_at: null,
        catalog_total_price: inspFallback.invoice_amount,
      });
    }
  }

  if (inspRow) {
    return NextResponse.json({
      payment_status: inspRow.payment_status || "none",
      payment_received_at: inspRow.payment_received_at,
      catalog_total_price: inspRow.catalog_total_price ?? inspRow.invoice_amount,
    });
  }

  return NextResponse.json({ error: "Job not found." }, { status: 404 });
}
