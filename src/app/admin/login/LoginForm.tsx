"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = sp.get("next") || "/admin";
  const reason = sp.get("reason");

  const [email, setEmail] = React.useState("nate@renewableenergyincentives.com");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);

    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      router.replace(next);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function onResetPassword() {
    const e = email.trim();
    if (!e) {
      setErr("Enter your email first.");
      return;
    }

    setErr(null);
    setMsg(null);
    setBusy(true);

    try {
      const supabase = supabaseBrowser();

      // IMPORTANT: must match your reset page route
      const redirectTo = `${window.location.origin}/auth/callback?next=/admin/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo,
      });

      if (error) throw error;

      setMsg("If that email exists, a reset link was sent. Check your inbox/spam.");
    } catch (e: any) {
      setErr(e?.message || "Could not send reset email");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {reason === "not_admin" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Signed in, but not allowlisted as admin.
        </div>
      ) : null}

      {err ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {err}
        </div>
      ) : null}

      {msg ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {msg}
        </div>
      ) : null}

      <div>
        <label className="text-xs font-semibold text-slate-600">Email</label>
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-600">Password</label>
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
        />

        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={onResetPassword}
            disabled={busy}
            className="text-xs font-semibold text-slate-700 hover:underline disabled:opacity-60"
          >
            Forgot password?
          </button>

          <div className="text-[11px] text-slate-500">
            Reset goes to <span className="font-mono">/admin/reset-password</span>
          </div>
        </div>
      </div>

      <button
        disabled={busy}
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        type="submit"
      >
        {busy ? "Working…" : "Sign in"}
      </button>
    </form>
  );
}
