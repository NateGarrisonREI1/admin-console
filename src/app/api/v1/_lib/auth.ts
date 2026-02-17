// src/app/api/v1/_lib/auth.ts
// Shared auth helpers for v1 API routes.

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { ApiResponse } from "@/types/api";
import { unauthorized, forbidden } from "@/types/api";

type AuthResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; response: NextResponse };

/**
 * Authenticate the request and return the user ID + role.
 * Returns a NextResponse error if auth fails.
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { ok: false, response: json(unauthorized()) };
  }

  const { data: profile } = await supabase
    .from("app_profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const role = profile?.role ?? "homeowner";

  return { ok: true, userId: data.user.id, role };
}

/**
 * Require the user to have the admin role.
 */
export async function requireAdmin(): Promise<AuthResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  if (auth.role !== "admin") {
    return { ok: false, response: json(forbidden("Admin role required")) };
  }

  return auth;
}

/**
 * Require the user to have a specific role (or admin).
 */
export async function requireRole(role: string): Promise<AuthResult> {
  const auth = await requireAuth();
  if (!auth.ok) return auth;

  if (auth.role !== role && auth.role !== "admin") {
    return { ok: false, response: json(forbidden(`${role} role required`)) };
  }

  return auth;
}

/** Wrap an ApiResponse into a NextResponse with proper status code. */
export function json<T>(body: ApiResponse<T>): NextResponse {
  return NextResponse.json(body, { status: body.status });
}
