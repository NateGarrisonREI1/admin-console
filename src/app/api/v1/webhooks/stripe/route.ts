// src/app/api/v1/webhooks/stripe/route.ts
// Stripe webhook handler for payment events.
// Registered at: https://dashboard.stripe.com/webhooks
// Events: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { StripeService } from "@/lib/services/StripeService";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  sendPaymentConfirmationEmail,
  sendPaymentFailureEmail,
} from "@/lib/services/EmailService";
import type { LeadType } from "@/types/stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = StripeService.verifyWebhookSignature(body, signature);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const userId = pi.metadata.user_id;
        const leadId = pi.metadata.lead_id;
        const leadType = pi.metadata.lead_type as LeadType;
        const chargeId =
          typeof pi.latest_charge === "string"
            ? pi.latest_charge
            : pi.latest_charge?.id ?? null;

        // Idempotent: skip if payment already recorded
        const { data: existing } = await supabaseAdmin
          .from("payments")
          .select("id")
          .eq("stripe_payment_intent_id", pi.id)
          .maybeSingle();

        if (!existing) {
          // Record payment
          await supabaseAdmin.from("payments").insert({
            contractor_id: userId,
            system_lead_id: leadType === "system_lead" ? leadId : null,
            hes_request_id: leadType === "hes_request" ? leadId : null,
            amount: pi.amount / 100,
            system_type: leadType === "system_lead" ? "system" : "hes",
            stripe_transaction_id: pi.id,
            stripe_payment_intent_id: pi.id,
            stripe_charge_id: chargeId,
            status: "completed",
          });

          // Mark lead as purchased
          if (leadType === "system_lead") {
            await supabaseAdmin
              .from("system_leads")
              .update({
                status: "purchased",
                purchased_by_contractor_id: userId,
                purchased_date: new Date().toISOString(),
              })
              .eq("id", leadId)
              .eq("status", "available");

            await supabaseAdmin.from("contractor_lead_status").insert({
              contractor_id: userId,
              system_lead_id: leadId,
              status: "new",
            });
          } else if (leadType === "hes_request") {
            await supabaseAdmin
              .from("hes_requests")
              .update({
                status: "assigned_affiliate",
                purchased_by_affiliate_id: userId,
                assigned_to_affiliate_id: userId,
                purchased_date: new Date().toISOString(),
              })
              .eq("id", leadId)
              .is("purchased_by_affiliate_id", null);
          }

          // Send confirmation email (fire-and-forget)
          sendPaymentConfirmationEmail(userId, leadId, pi.amount / 100, leadType).catch(
            (err) => console.error("[Stripe Webhook] Email error:", err)
          );
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const userId = pi.metadata.user_id;

        await supabaseAdmin.from("payments").insert({
          contractor_id: userId,
          system_lead_id: pi.metadata.lead_type === "system_lead" ? pi.metadata.lead_id : null,
          hes_request_id: pi.metadata.lead_type === "hes_request" ? pi.metadata.lead_id : null,
          amount: pi.amount / 100,
          stripe_payment_intent_id: pi.id,
          status: "failed",
        });

        sendPaymentFailureEmail(
          userId,
          pi.last_payment_error?.message
        ).catch((err) => console.error("[Stripe Webhook] Email error:", err));
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;

        await supabaseAdmin
          .from("payments")
          .update({ status: "refunded", refunded_date: new Date().toISOString() })
          .eq("stripe_charge_id", charge.id);
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Processing error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
