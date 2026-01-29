import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function makeSupabase(req: NextRequest, res: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        res.cookies.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

/**
 * Global public auth routes (not all are in matcher, but safe to keep)
 */
function isGlobalPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/reset-password" ||
    pathname === "/auth/callback" ||
    pathname.startsWith("/auth/callback")
  );
}

function isAdminPath(pathname: string) {
  return pathname.startsWith("/admin");
}

function isPortalProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/broker") ||
    pathname.startsWith("/contractor") ||
    pathname.startsWith("/homeowner") ||
    pathname.startsWith("/affiliate")
  );
}

function redirectToLogin(req: NextRequest, nextPath: string, extra?: Record<string, string>) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", nextPath || "/");
  if (extra) {
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  }
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  /**
   * IMPORTANT:
   * Supabase recovery links may land on /admin/reset-password with ?code=...
   * If we redirect that URL, the code/session exchange can fail.
   */

  // 0) Canonicalize /admin/login -> /login (avoid loops)
  if (pathname === "/admin/login") {
    return redirectToLogin(req, "/admin");
  }

  // 0b) Allow reset-password under /admin through (including potential nested paths)
  if (pathname === "/admin/reset-password" || pathname.startsWith("/admin/reset-password/")) {
    return NextResponse.next();
  }

  // 1) Allow global public auth routes (safety)
  if (isGlobalPublicPath(pathname)) {
    return NextResponse.next();
  }

  // ---------- ADMIN ----------
  if (isAdminPath(pathname)) {
    const res = NextResponse.next();
    const supabase = makeSupabase(req, res);

    const { data: userRes, error: uErr } = await supabase.auth.getUser();
    const user = userRes?.user;

    // Not logged in -> send to login
    if (uErr || !user) {
      return redirectToLogin(req, pathname);
    }

    // Logged in but not admin -> send to login w/ reason
    const { data: isAdmin, error: aErr } = await supabase.rpc("is_admin");
    if (aErr || !isAdmin) {
      return redirectToLogin(req, pathname, { reason: "not_admin" });
    }

    return res;
  }

  // ---------- APP PORTALS (broker/contractor/homeowner/affiliate) ----------
  if (isPortalProtectedPath(pathname)) {
    const res = NextResponse.next();
    const supabase = makeSupabase(req, res);

    const { data: userRes, error: uErr } = await supabase.auth.getUser();
    const user = userRes?.user;

    if (uErr || !user) {
      return redirectToLogin(req, pathname);
    }

    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/broker/:path*", "/contractor/:path*", "/homeowner/:path*", "/affiliate/:path*"],
};
