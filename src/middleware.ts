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

function isAdminPublicPath(pathname: string) {
  return pathname === "/admin/login" || pathname === "/admin/reset-password";
}

function isAppPublicPath(pathname: string) {
  // routes allowed without session
  return (
    pathname === "/login" ||
    pathname === "/auth/callback" ||
    pathname.startsWith("/auth/callback")
  );
}

function isAppProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/broker") ||
    pathname.startsWith("/contractor") ||
    pathname.startsWith("/homeowner") ||
    pathname.startsWith("/affiliate")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ---------- ADMIN ----------
  if (pathname.startsWith("/admin")) {
    if (isAdminPublicPath(pathname)) return NextResponse.next();

    const res = NextResponse.next();
    const supabase = makeSupabase(req, res);

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;

    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    // Admin allowlist gate (your existing behavior)
    const { data: isAdmin, error } = await supabase.rpc("is_admin");
    if (error || !isAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("reason", "not_admin");
      return NextResponse.redirect(url);
    }

    return res;
  }

  // ---------- APP PORTALS (broker/contractor/homeowner/affiliate) ----------
  if (isAppProtectedPath(pathname)) {
    if (isAppPublicPath(pathname)) return NextResponse.next();

    const res = NextResponse.next();
    const supabase = makeSupabase(req, res);

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;

    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/broker/:path*", "/contractor/:path*", "/homeowner/:path*", "/affiliate/:path*"],
};
