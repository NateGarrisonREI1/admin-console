import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next");

  const supabase = await supabaseServer();

  // Handle PKCE code exchange (OAuth, magic link, invite)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const dest = new URL("/login", url.origin);
      dest.searchParams.set("error", error.message);
      return NextResponse.redirect(dest);
    }
  }
  // Handle token hash (invite/recovery links in non-PKCE flow)
  else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "invite" | "signup" | "recovery" | "email",
    });
    if (error) {
      const dest = new URL("/login", url.origin);
      dest.searchParams.set("error", error.message);
      return NextResponse.redirect(dest);
    }
  }
  // No auth params at all
  else {
    const dest = new URL("/login", url.origin);
    dest.searchParams.set("error", "missing_code");
    return NextResponse.redirect(dest);
  }

  // Get authenticated user
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  // If caller specified a "next" destination, honor it (e.g. password reset flow)
  if (next) {
    return NextResponse.redirect(new URL(next, url.origin));
  }

  // Get user profile (role + status + onboarding)
  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("role, status, onboarding_complete")
    .eq("id", userId)
    .single();

  const role = (profile?.role as string) ?? userData?.user?.user_metadata?.role ?? "homeowner";
  const status = (profile?.status as string) ?? null;

  // Invited user who hasn't set a password yet → send to set-password page
  if (status === "pending") {
    return NextResponse.redirect(new URL("/auth/set-password", url.origin));
  }

  // Route based on role + onboarding status
  switch (role) {
    case "admin":
      return NextResponse.redirect(new URL("/admin", url.origin));

    case "broker": {
      const onboarded = !!(profile as Record<string, unknown> | null)?.onboarding_complete;
      return NextResponse.redirect(
        new URL(onboarded ? "/broker/dashboard" : "/broker/onboarding", url.origin)
      );
    }

    case "contractor": {
      const { data: cp } = await supabaseAdmin
        .from("contractor_profiles")
        .select("onboarding_complete")
        .eq("id", userId)
        .single();
      const onboarded = !!cp?.onboarding_complete;
      return NextResponse.redirect(
        new URL(onboarded ? "/contractor/dashboard" : "/contractor/onboarding", url.origin)
      );
    }

    case "homeowner":
      return NextResponse.redirect(new URL("/homeowner/dashboard", url.origin));

    default:
      return NextResponse.redirect(new URL("/login", url.origin));
  }
}
