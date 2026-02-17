// src/lib/services/StripeService.ts
// Server-side Stripe integration for payment intent creation,
// customer management, refunds, and webhook verification.

import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { LeadType, PaymentIntentResult, PaymentConfirmResult } from "@/types/stripe";

export class StripeService {
  /**
   * Get or create a Stripe customer for a user.
   * Stores the stripe_customer_id in app_profiles.
   */
  static async getOrCreateCustomer(
    userId: string,
    email: string,
    name?: string
  ): Promise<string> {
    // Check if customer already exists
    const { data: profile } = await supabaseAdmin
      .from("app_profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    if (profile?.stripe_customer_id) {
      return profile.stripe_customer_id;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      name: name ?? undefined,
      metadata: { user_id: userId },
    });

    // Persist to app_profiles
    await supabaseAdmin
      .from("app_profiles")
      .update({ stripe_customer_id: customer.id })
      .eq("id", userId);

    return customer.id;
  }

  /**
   * Create a Stripe payment intent for a lead purchase.
   * Returns the client secret so the frontend can complete payment.
   */
  static async createPaymentIntent(
    userId: string,
    email: string,
    leadId: string,
    amount: number,
    leadType: LeadType
  ): Promise<PaymentIntentResult> {
    const customerId = await this.getOrCreateCustomer(userId, email);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // cents
      currency: "usd",
      customer: customerId,
      metadata: {
        user_id: userId,
        lead_id: leadId,
        lead_type: leadType,
      },
      description:
        leadType === "system_lead"
          ? "System Lead Purchase"
          : "HES Request Purchase",
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      amount,
    };
  }

  /**
   * Verify a payment intent succeeded and return charge details.
   * Used after client-side payment to immediately unlock the lead.
   */
  static async verifyPaymentIntent(
    paymentIntentId: string
  ): Promise<PaymentConfirmResult> {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.status !== "succeeded") {
      throw new Error(`Payment not completed. Status: ${intent.status}`);
    }

    const chargeId =
      typeof intent.latest_charge === "string"
        ? intent.latest_charge
        : intent.latest_charge?.id ?? null;

    return {
      status: intent.status,
      amount: intent.amount / 100,
      chargeId,
    };
  }

  /**
   * Refund a payment by its payment intent ID.
   */
  static async refundPayment(paymentIntentId: string) {
    return stripe.refunds.create({
      payment_intent: paymentIntentId,
    });
  }

  /**
   * Verify a Stripe webhook signature and parse the event.
   */
  static verifyWebhookSignature(body: string, signature: string) {
    return stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  }
}
