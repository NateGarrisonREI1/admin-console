"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = sp.get("next") || "/homeowner/dashboard";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setErr(null);
  setBusy(true);

  try {
    const supabase = supabaseBrowser();

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    const user = userRes?.user;
    if (!user) throw new Error("No user returned after login.");

    // Fetch / create profile -> role
    const { defaultPathForRole, ensureProfileAndGetRole } = await import("@/lib/auth/role");
    const role = await ensureProfileAndGetRole(supabase as any, user.id);

    // If there is a next param, honor it. Otherwise send to role home.
    const dest = next ? next : defaultPathForRole(role);

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
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {err}
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
