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

    // ─── Post-payment: PDF receipt + email (fire-and-forget) ────────
    try {
      const customerEmail = session.customer_details?.email || session.metadata?.customer_email;

      if (customerEmail) {
        // Fetch job details for the receipt
        const { data: jobRow } = await supabaseAdmin
          .from(table)
          .select("customer_name, customer_email, address, city, state, zip, scheduled_date, service_name, tier_name")
          .eq("id", jobId)
          .single();

        if (jobRow) {
          const serviceName =
            [jobRow.service_name, jobRow.tier_name].filter(Boolean).join(" — ") ||
            (jobType === "inspector" ? "Home Inspection" : "HES Assessment");
          const address = [jobRow.address, jobRow.city, jobRow.state, jobRow.zip].filter(Boolean).join(", ");

          // 1. Generate PDF
          const { generateReceiptPdf } = await import("@/lib/generateReceipt");
          const pdfBuffer = await generateReceiptPdf({
            jobId,
            jobType: jobType as "hes" | "inspector",
            customerName: jobRow.customer_name,
            customerEmail,
            serviceName,
            address,
            scheduledDate: jobRow.scheduled_date,
            amountCents: session.amount_total || 0,
            paymentId: (session.payment_intent as string) || session.id,
            stripeSessionId: session.id,
            paidAt: now,
          });

          const receiptFilename = `LEAF-Receipt-${jobId.slice(0, 8)}.pdf`;
          const storagePath = `receipts/${jobType}/${jobId}/${receiptFilename}`;

          // 2. Upload to Supabase Storage
          const { error: uploadErr } = await supabaseAdmin.storage
            .from("job-files")
            .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

          let receiptUrl: string | null = null;
          if (uploadErr) {
            console.error("[stripe-webhook] Receipt upload failed:", uploadErr.message);
          } else {
            const { data: signedData } = await supabaseAdmin.storage
              .from("job-files")
              .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10);
            receiptUrl = signedData?.signedUrl ?? null;
          }

          // 3. Save receipt_url on job record
          if (receiptUrl) {
            await supabaseAdmin.from(table).update({ receipt_url: receiptUrl }).eq("id", jobId);
          }

          // 4. Send receipt email
          const { sendReceiptEmail } = await import("@/lib/services/EmailService");
          const LEAF_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://leafenergy.app";
          const reportUrl = `${LEAF_APP_URL}/report/${jobId}`;
          const paidDate = new Date(now).toLocaleDateString("en-US", {
            month: "long", day: "numeric", year: "numeric",
          });

          await sendReceiptEmail({
            to: customerEmail,
            customerName: jobRow.customer_name,
            serviceName,
            amount: amountPaid,
            paidDate,
            reportUrl,
            receiptPdfBuffer: pdfBuffer,
            receiptFilename,
          });

          // 5. Log activity
          await logJobActivity(
            jobId,
            "receipt_sent",
            `Receipt emailed to ${customerEmail}`,
            { role: "system" },
            { receipt_url: receiptUrl, email: customerEmail },
            jobType
          );

          console.log(`[stripe-webhook] Receipt generated and emailed for job ${jobId}`);
        }
      } else {
        console.log(`[stripe-webhook] No customer email for receipt — job ${jobId}`);
      }
    } catch (receiptErr: any) {
      console.error("[stripe-webhook] Receipt/email error (non-blocking):", receiptErr?.message ?? receiptErr);
    }
  }

  return NextResponse.json({ received: true });
}
