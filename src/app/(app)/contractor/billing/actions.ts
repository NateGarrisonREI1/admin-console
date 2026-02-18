"use server";

import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { StripeService } from "@/lib/services/StripeService";
import { getContractorAuth } from "../_actions/contractor";

// ─── Types ──────────────────────────────────────────────────────────

export type PaymentMethodInfo = {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
} | null;

export type SpendSummary = {
  thisMonth: { total: number; count: number };
  lastMonth: { total: number; count: number };
  allTime: { total: number; count: number; closeRate: number; avgCost: number };
};

export type TransactionRow = {
  id: string;
  amount: number;
  system_type: string | null;
  status: string;
  created_at: string;
  stripe_transaction_id: string | null;
  refunded_date: string | null;
  refund_status: string | null;
};

export type BillingPageData = {
  paymentMethod: PaymentMethodInfo;
  spend: SpendSummary;
  transactions: TransactionRow[];
};

// ─── Empty defaults ─────────────────────────────────────────────────

const EMPTY_BILLING: BillingPageData = {
  paymentMethod: null,
  spend: {
    thisMonth: { total: 0, count: 0 },
    lastMonth: { total: 0, count: 0 },
    allTime: { total: 0, count: 0, closeRate: 0, avgCost: 0 },
  },
  transactions: [],
};

// ─── Fetch billing data ─────────────────────────────────────────────

export async function fetchBillingData(): Promise<{ data: BillingPageData; isAdmin: boolean }> {
  try {
    const auth = await getContractorAuth();
    if (auth.isAdmin) return { data: EMPTY_BILLING, isAdmin: true };

    const userId = auth.userId;

    const { data: profile } = await supabaseAdmin
      .from("contractor_profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    let paymentMethod: PaymentMethodInfo = null;
    if (profile?.stripe_customer_id) {
      try {
        const methods = await stripe.paymentMethods.list({
          customer: profile.stripe_customer_id,
          type: "card",
          limit: 1,
        });
        if (methods.data.length > 0) {
          const card = methods.data[0].card;
          if (card) {
            paymentMethod = {
              brand: card.brand,
              last4: card.last4,
              exp_month: card.exp_month,
              exp_year: card.exp_year,
            };
          }
        }
      } catch {
        // Stripe unavailable — continue without payment method
      }
    }

    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("id, amount, system_type, status, created_at, stripe_transaction_id, refunded_date, refund_status")
      .eq("contractor_id", userId)
      .order("created_at", { ascending: false });

    const txns = (payments ?? []) as TransactionRow[];

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

    const completedTxns = txns.filter((t) => t.status === "completed");
    const thisMonth = completedTxns.filter((t) => t.created_at >= thisMonthStart);
    const lastMonth = completedTxns.filter((t) => t.created_at >= lastMonthStart && t.created_at < thisMonthStart);

    const { data: leadStatuses } = await supabaseAdmin
      .from("contractor_lead_status")
      .select("status")
      .eq("contractor_id", userId);

    const totalLeads = (leadStatuses ?? []).length;
    const closedLeads = (leadStatuses ?? []).filter(
      (l: { status: string }) => l.status === "closed"
    ).length;
    const closeRate = totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0;

    const allTimeTotal = completedTxns.reduce((s, t) => s + t.amount, 0);
    const allTimeCount = completedTxns.length;

    return {
      data: {
        paymentMethod,
        spend: {
          thisMonth: {
            total: thisMonth.reduce((s, t) => s + t.amount, 0),
            count: thisMonth.length,
          },
          lastMonth: {
            total: lastMonth.reduce((s, t) => s + t.amount, 0),
            count: lastMonth.length,
          },
          allTime: {
            total: allTimeTotal,
            count: allTimeCount,
            closeRate,
            avgCost: allTimeCount > 0 ? Math.round(allTimeTotal / allTimeCount) : 0,
          },
        },
        transactions: txns,
      },
      isAdmin: false,
    };
  } catch {
    return { data: EMPTY_BILLING, isAdmin: false };
  }
}

// ─── Update payment method ──────────────────────────────────────────

export async function createUpdatePaymentSetupIntent(): Promise<{ clientSecret: string }> {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user?.id) throw new Error("Not authenticated");

  const customerId = await StripeService.getOrCreateCustomer(
    user.id,
    user.email ?? ""
  );

  // Store in contractor_profiles
  await supabaseAdmin
    .from("contractor_profiles")
    .update({ stripe_customer_id: customerId })
    .eq("id", user.id);

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    metadata: { user_id: user.id },
  });

  return { clientSecret: setupIntent.client_secret! };
}
