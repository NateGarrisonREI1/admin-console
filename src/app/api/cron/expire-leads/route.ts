import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);

  // Raw token from query string
  const rawToken = (url.searchParams.get("token") ?? "").trim();

  // Secret from env
  const secret = (process.env.CRON_SECRET ?? "").trim();

  // Normalize "+" issues:
  // Some clients/urls can turn "+" into " " (space). Convert spaces back to plus.
  const token = rawToken.replace(/ /g, "+");

  // If CRON_SECRET is set, require it.
  if (secret && token !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("contractor_leads")
    .update({ status: "expired" })
    .eq("status", "open")
    .not("expires_at", "is", null)
    .lt("expires_at", nowIso)
    .select("id");

  if (error) {
    console.error("expire-leads error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, expired_count: (data ?? []).length });
}
