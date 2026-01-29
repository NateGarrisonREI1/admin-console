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
 * Canonical public auth routes for the whole app
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

  // 0) If anyone hits /admin/login or /admin/reset-password, force canonical /login
  //    (We do this BEFORE the /admin guard to avoid loops and “admin chrome on login”.)
  if (pathname === "/admin/login" || pathname === "/admin/reset-password") {
    return redirectToLogin(req, "/admin");
  }

  // 1) Allow global public auth routes
  //    NOTE: config.matcher does not include /login by default; keeping this for safety.
  if (isGlobalPublicPath(pathname)) {
    return NextResponse.next();
  }

  // ---------- ADMIN ----------
  if (isAdminPath(pathname)) {
    const res = NextResponse.next();
    const supabase = makeSupabase(req, res);

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;

    if (!user) {
      return redirectToLogin(req, pathname);
    }

    // Admin allowlist gate (your existing behavior)
    const { data: isAdmin, error } = await supabase.rpc("is_admin");

    if (error || !isAdmin) {
      return redirectToLogin(req, pathname, { reason: "not_admin" });
    }

    return res;
  }

  // ---------- APP PORTALS (broker/contractor/homeowner/affiliate) ----------
  if (isPortalProtectedPath(pathname)) {
    const res = NextResponse.next();
    const supabase = makeSupabase(req, res);

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;

    if (!user) {
      return redirectToLogin(req, pathname);
    }

    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/broker/:path*",
    "/contractor/:path*",
    "/homeowner/:path*",
    "/affiliate/:path*",
    // Optional: if you ever want middleware to run on /login for uniform behavior:
    // "/login",
  ],
};
