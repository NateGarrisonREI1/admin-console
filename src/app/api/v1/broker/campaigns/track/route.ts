// src/app/api/v1/broker/campaigns/track/route.ts
// Tracking pixel + click tracking for campaign emails
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// 1x1 transparent GIF
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(req: NextRequest) {
  const rid = req.nextUrl.searchParams.get("rid");
  const event = req.nextUrl.searchParams.get("event");

  if (rid && event) {
    const now = new Date().toISOString();

    if (event === "open") {
      // Update recipient as opened (only if not already)
      const { data: recipient } = await supabaseAdmin
        .from("campaign_recipients")
        .select("id, campaign_id, opened_at")
        .eq("id", rid)
        .single();

      if (recipient && !recipient.opened_at) {
        await supabaseAdmin
          .from("campaign_recipients")
          .update({ status: "opened", opened_at: now })
          .eq("id", rid);

        // Increment campaign opened_count (direct update)
        const { data: camp } = await supabaseAdmin
          .from("broker_campaigns")
          .select("opened_count")
          .eq("id", recipient.campaign_id)
          .single();

        if (camp) {
          await supabaseAdmin
            .from("broker_campaigns")
            .update({ opened_count: ((camp as { opened_count: number }).opened_count ?? 0) + 1 })
            .eq("id", recipient.campaign_id);
        }
      }

      // Return tracking pixel
      return new NextResponse(PIXEL, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    if (event === "click") {
      // Update recipient as clicked
      const { data: recipient } = await supabaseAdmin
        .from("campaign_recipients")
        .select("id, campaign_id, clicked_at, opened_at")
        .eq("id", rid)
        .single();

      if (recipient) {
        const updates: Record<string, unknown> = { status: "clicked", clicked_at: now };
        if (!recipient.opened_at) updates.opened_at = now;

        await supabaseAdmin
          .from("campaign_recipients")
          .update(updates)
          .eq("id", rid);
      }

      // Redirect to the LEAF assessment page
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leafenergy.app";
      return NextResponse.redirect(`${appUrl}/homeowner/dashboard`);
    }
  }

  // Default: return pixel
  return new NextResponse(PIXEL, {
    headers: { "Content-Type": "image/gif" },
  });
}
