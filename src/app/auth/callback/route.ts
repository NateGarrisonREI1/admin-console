import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  // If no code, bounce to login with an error (prevents weird states)
  if (!code) {
    const dest = new URL("/login", url.origin);
    dest.searchParams.set("error", "missing_code");
    return NextResponse.redirect(dest);
  }

  // IMPORTANT: exchange code for session on the server so cookies are set properly
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const dest = new URL("/login", url.origin);
    dest.searchParams.set("error", error.message);
    return NextResponse.redirect(dest);
  }

  // Send user to the intended page after the session is established
  return NextResponse.redirect(new URL(next, url.origin));
}
