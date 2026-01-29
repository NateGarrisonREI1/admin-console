//src/app/admin/reset-password/ResetPasswordForm.tsx
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function ResetPasswordForm() {
  const router = useRouter();
  const sp = useSearchParams();

  const [email, setEmail] = React.useState("nate@renewableenergyincentives.com");
  const [pw1, setPw1] = React.useState("");
  const [pw2, setPw2] = React.useState("");

  const [busy, setBusy] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);

  // 1) On mount: try to establish a recovery session if needed
  React.useEffect(() => {
    let cancelled = false;

    async function boot() {
      setErr(null);
      setMsg(null);

      const supabase = supabaseBrowser();

      // If Supabase uses the "code" flow, exchange it for a session.
      const code = sp.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled && error) setErr(error.message);
      }

      // Check if we have a session now
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data?.session) {
        setReady(true);
      } else {
        setReady(false);
        setErr("Auth session missing. Open this page from the password reset email link.");
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [sp]);

  async function resendReset() {
    const e = email.trim();
    if (!e) {
      setErr("Enter your email first.");
      return;
    }

    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      const supabase = supabaseBrowser();
      const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
const redirectTo = `${base}/admin/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo });
      if (error) throw error;

      setMsg("Reset email sent (if the account exists). Check your inbox/spam.");
    } catch (e: any) {
      setErr(e?.message || "Could not send reset email");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!ready) {
      setErr("Auth session missing. Use the email reset link first.");
      return;
    }

    if (pw1.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (pw1 !== pw2) {
      setErr("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;

      setMsg("Password updated. Redirecting to login…");

      setTimeout(() => {
        router.replace("/admin/login");
        router.refresh();
      }, 600);
    } catch (e: any) {
      setErr(e?.message || "Could not update password. Try opening the reset link again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
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

      {!ready ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-800">Need a reset link?</div>
          <div className="mt-1 text-sm text-slate-600">
            Enter your email and we’ll send a password reset link.
          </div>

          <div className="mt-3">
            <label className="text-xs font-semibold text-slate-600">Email</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={resendReset}
            className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send reset email"}
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">New password</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Confirm new password</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </div>

          <button
            disabled={busy}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            type="submit"
          >
            {busy ? "Updating…" : "Set new password"}
          </button>
        </form>
      )}
    </div>
  );
}
