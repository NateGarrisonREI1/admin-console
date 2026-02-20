import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { logJobActivity } from "@/lib/activityLog";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // 1. Check Stripe config
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { error: "Stripe not configured — contact your administrator." },
      { status: 503 }
    );
  }

  const stripe = new Stripe(stripeKey);

  // 2. Authenticate portal user
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  // 3. Parse body
  const body = await request.json();
  const jobId = body.job_id as string;
  if (!jobId) {
    return NextResponse.json({ error: "job_id required." }, { status: 400 });
  }

  // 4. Fetch job (try hes_schedule first, then inspector_schedule)
  let job: any = null;
  let jobType: "hes" | "inspector" = "hes";

  const { data: hesRow } = await supabaseAdmin
    .from("hes_schedule")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (hesRow) {
    job = hesRow;
    jobType = "hes";
  } else {
    const { data: inspRow } = await supabaseAdmin
      .from("inspector_schedule")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (inspRow) {
      job = inspRow;
      jobType = "inspector";
    }
  }

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  // 5. Determine amount
  const totalPrice = job.catalog_total_price ?? job.invoice_amount;
  if (!totalPrice || totalPrice <= 0) {
    return NextResponse.json(
      { error: "No price set for this job." },
      { status: 400 }
    );
  }

  // 6. Build service description
  const serviceName = [job.service_name, job.tier_name].filter(Boolean).join(" — ")
    || (jobType === "hes" ? "HES Assessment" : "Home Inspection");
  const addr = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // 7. Create Stripe Checkout Session
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: serviceName,
              description: addr ? `Service at ${addr}` : undefined,
            },
            unit_amount: Math.round(totalPrice * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        job_id: jobId,
        job_type: jobType,
        tech_id: user.id,
        customer_email: job.customer_email || "",
      },
      customer_email: job.customer_email || undefined,
      success_url: `${appUrl}/payment/success?job_id=${jobId}`,
      cancel_url: `${appUrl}/portal/jobs/${jobId}`,
    });

    // 8. Update job with payment link info
    const table = jobType === "hes" ? "hes_schedule" : "inspector_schedule";
    await supabaseAdmin.from(table).update({
      stripe_payment_link_id: session.id,
      payment_status: "pending",
    }).eq("id", jobId);

    // 9. Log activity
    await logJobActivity(
      jobId,
      "payment_link_created",
      `Payment link created ($${totalPrice})`,
      { id: user.id, name: profile?.full_name ?? "Field Tech", role: "field_tech" },
      { amount: totalPrice, session_id: session.id },
      jobType
    );

    return NextResponse.json({
      url: session.url,
      id: session.id,
    });
  } catch (err: any) {
    console.error("[stripe] Payment link error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to create payment link." },
      { status: 500 }
    );
  }
}
