"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { checkLoginRateLimit, logAuthEvent } from "@/lib/auth/events";

type Role = "admin" | "rei_staff" | "broker" | "contractor" | "homeowner" | "affiliate";

function rolePrefix(role: Role) {
  switch (role) {
    case "admin":
      return "/admin";
    case "rei_staff":
      return "/rei-team";
    case "broker":
      return "/broker";
    case "contractor":
      return "/contractor";
    case "affiliate":
      return "/affiliate";
    case "homeowner":
    default:
      return "/homeowner";
  }
}

function roleHome(role: Role) {
  switch (role) {
    case "broker":
      return "/broker/dashboard";
    case "contractor":
      return "/contractor/dashboard";
    default:
      return rolePrefix(role);
  }
}

function safeNextForRole(role: Role, nextPath: string | null) {
  if (!nextPath) return null;

  if (
    nextPath === "/login" ||
    nextPath.startsWith("/login?") ||
    nextPath === "/reset-password" ||
    nextPath.startsWith("/reset-password") ||
    nextPath.startsWith("/auth/")
  ) {
    return null;
  }

  if (role === "admin") return nextPath;

  const prefix = rolePrefix(role);
  if (nextPath === prefix || nextPath.startsWith(prefix + "/")) return nextPath;

  return null;
}

function formatRetry(seconds: number): string {
  const mins = Math.ceil(seconds / 60);
  return mins === 1 ? "1 minute" : `${mins} minutes`;
}

export default function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = sp.get("next");
  const errorParam = sp.get("error");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [processingInvite, setProcessingInvite] = React.useState(false);

  // ─── Handle invite link hash tokens ───────────────────────────────
  React.useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) return;

    // Parse hash fragment: #access_token=xxx&refresh_token=yyy&...
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) return;

    setProcessingInvite(true);

    // Clear hash from URL to prevent re-processing
    window.history.replaceState(null, "", window.location.pathname);

    (async () => {
      try {
        const supabase = supabaseBrowser();
        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionErr) throw sessionErr;

        // Invited users need to set their password
        router.replace("/auth/set-password");
        router.refresh();
      } catch (e: unknown) {
        setProcessingInvite(false);
        setErr(
          e instanceof Error
            ? e.message
            : "Failed to process invite. Please try again or request a new link."
        );
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Friendly error for missing_code without hash tokens ──────────
  React.useEffect(() => {
    if (errorParam === "missing_code" && !processingInvite) {
      // Only show if we didn't find hash tokens (otherwise the invite flow handles it)
      const hash = window.location.hash;
      if (!hash || !hash.includes("access_token")) {
        setErr("Your invite link may have expired. Please request a new one.");
      }
    }
  }, [errorParam, processingInvite]);

  // Show loading state while processing invite tokens
  if (processingInvite) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div
          className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500"
        />
        <p className="text-sm font-semibold text-slate-600">
          Setting up your account...
        </p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    const trimmedEmail = email.trim();

    try {
      // Rate limit check
      const rateCheck = await checkLoginRateLimit(trimmedEmail);
      if (!rateCheck.allowed) {
        const retryMsg = rateCheck.retryAfterSeconds
          ? `Try again in ${formatRetry(rateCheck.retryAfterSeconds)}.`
          : "Try again later.";
        setErr(`Too many login attempts. ${retryMsg}`);
        setBusy(false);
        return;
      }

      const supabase = supabaseBrowser();

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        // Log failed attempt
        logAuthEvent({
          email: trimmedEmail,
          action: "login_failed",
          metadata: { reason: error.message },
        });
        throw error;
      }

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userRes?.user;
      if (!user) throw new Error("No user returned after login.");

      // Log successful login
      logAuthEvent({
        email: trimmedEmail,
        action: "login_success",
        userId: user.id,
      });

      // Ensure profile exists + determine role
      const { ensureProfileAndGetRole } = await import("@/lib/auth/role");
      const role = (await ensureProfileAndGetRole(supabase as any, user.id)) as Role;

      const safeNext = safeNextForRole(role, next);
      const dest = safeNext ?? roleHome(role);

      router.replace(dest);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {err ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-900">
          {err}
        </div>
      ) : null}

      <div>
        <label className="text-xs font-extrabold text-slate-600">Email</label>
        <input
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          placeholder="you@company.com"
        />
      </div>

      <div>
        <label className="text-xs font-extrabold text-slate-600">Password</label>
        <input
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </div>

      <button
        disabled={busy}
        className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
        type="submit"
      >
        {busy ? "Signing in\u2026" : "Sign in"}
      </button>
    </form>
  );
}
