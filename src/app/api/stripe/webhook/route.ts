import { NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import { logJobActivity } from "@/lib/activityLog";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    console.error("[stripe-webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey);

  // Read raw body for signature verification
  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("[stripe-webhook] Signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const jobId = session.metadata?.job_id;
    const jobType = session.metadata?.job_type || "hes";

    if (!jobId) {
      console.error("[stripe-webhook] No job_id in session metadata");
      return NextResponse.json({ received: true });
    }

    const table = jobType === "inspector" ? "inspector_schedule" : "hes_schedule";
    const now = new Date().toISOString();

    // Update job with payment confirmation
    const { error: updateErr } = await supabaseAdmin.from(table).update({
      payment_status: "paid",
      payment_id: (session.payment_intent as string) || session.id,
      stripe_checkout_session_id: session.id,
      job_completed_at: now,
      payment_received_at: now,
      status: "completed",
      leaf_delivery_status: "queued",
    }).eq("id", jobId);

    if (updateErr) {
      console.error("[stripe-webhook] Failed to update job:", updateErr.message);
    }

    // Get amount for logging
    const amountPaid = session.amount_total
      ? (session.amount_total / 100).toFixed(2)
      : "unknown";

    // Log payment received
    await logJobActivity(
      jobId,
      "payment_received",
      `Payment received ($${amountPaid} via Stripe)`,
      { role: "system" },
      {
        amount: amountPaid,
        session_id: session.id,
        payment_intent: session.payment_intent,
        customer_email: session.customer_details?.email || session.metadata?.customer_email,
      },
      jobType
    );

    // Log job completed
    await logJobActivity(
      jobId,
      "job_completed",
      "Job completed",
      { role: "system" },
      undefined,
      jobType
    );

    console.log(`[stripe-webhook] Payment confirmed for job ${jobId} — $${amountPaid}`);
  }

  return NextResponse.json({ received: true });
}
