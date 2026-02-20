import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  try {
    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

    return NextResponse.json({
      customer_name: session.customer_details?.name ?? null,
      customer_email: session.customer_details?.email ?? null,
      amount_total: session.amount_total ? session.amount_total / 100 : null,
      service_name: session.line_items?.data[0]?.description ?? null,
      payment_status: session.payment_status,
    });
  } catch (err: any) {
    console.error("[session-details] Error:", err.message);
    return NextResponse.json({ error: "Failed to retrieve session" }, { status: 500 });
  }
}
