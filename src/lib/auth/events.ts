// src/lib/auth/events.ts
// Auth event logging + rate limiting via auth_events table.
// Uses supabaseAdmin (service role) to bypass RLS for inserts.

"use server";

import { supabaseAdmin } from "@/lib/supabase/server";

export type AuthAction =
  | "login_success"
  | "login_failed"
  | "password_reset_request"
  | "password_reset_complete"
  | "logout"
  | "role_change"
  | "account_locked";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/**
 * Log an auth event to the auth_events table.
 */
export async function logAuthEvent(input: {
  email: string;
  action: AuthAction;
  userId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await supabaseAdmin.from("auth_events").insert({
      email: input.email.toLowerCase().trim(),
      action: input.action,
      user_id: input.userId ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (err) {
    // Non-critical: don't break auth flow if logging fails
    console.error("[auth/events] Failed to log event:", err);
  }
}

/**
 * Check if an email is rate-limited due to too many failed login attempts.
 * Returns { allowed: true } or { allowed: false, retryAfterSeconds }.
 */
export async function checkLoginRateLimit(email: string): Promise<{
  allowed: boolean;
  retryAfterSeconds?: number;
  failedAttempts?: number;
}> {
  try {
    const cutoff = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();

    const { count, error } = await supabaseAdmin
      .from("auth_events")
      .select("id", { count: "exact", head: true })
      .eq("email", email.toLowerCase().trim())
      .eq("action", "login_failed")
      .gte("created_at", cutoff);

    if (error) {
      console.error("[auth/events] Rate limit check failed:", error);
      return { allowed: true }; // fail open — don't block login if rate limit check fails
    }

    const failedAttempts = count ?? 0;

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      // Find the most recent failure to calculate retry time
      const { data: latest } = await supabaseAdmin
        .from("auth_events")
        .select("created_at")
        .eq("email", email.toLowerCase().trim())
        .eq("action", "login_failed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const latestAt = latest?.created_at ? new Date(latest.created_at).getTime() : Date.now();
      const unlockAt = latestAt + LOCKOUT_MINUTES * 60 * 1000;
      const retryAfterSeconds = Math.max(0, Math.ceil((unlockAt - Date.now()) / 1000));

      if (retryAfterSeconds > 0) {
        return { allowed: false, retryAfterSeconds, failedAttempts };
      }
    }

    return { allowed: true, failedAttempts };
  } catch (err) {
    console.error("[auth/events] Rate limit check error:", err);
    return { allowed: true }; // fail open
  }
}

/**
 * Fetch recent auth events (for admin auth logs page).
 */
export async function fetchAuthEvents(input?: {
  limit?: number;
  emailFilter?: string;
  actionFilter?: string;
}) {
  const limit = Math.min(input?.limit ?? 200, 1000);

  let query = supabaseAdmin
    .from("auth_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (input?.emailFilter) {
    query = query.ilike("email", `%${input.emailFilter}%`);
  }
  if (input?.actionFilter) {
    query = query.eq("action", input.actionFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[auth/events] Fetch failed:", error);
    return [];
  }

  return data ?? [];
}
