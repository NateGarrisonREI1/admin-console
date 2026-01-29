"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Role = "admin" | "broker" | "contractor" | "homeowner" | "affiliate";

function rolePrefix(role: Role) {
  switch (role) {
    case "admin":
      return "/admin";
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

function safeNextForRole(role: Role, nextPath: string | null) {
  if (!nextPath) return null;

  // Always allow the canonical router page
  if (nextPath === "/dashboard" || nextPath.startsWith("/dashboard?")) return nextPath;

  // Admin can go anywhere
  if (role === "admin") return nextPath;

  // Non-admin: only allow within their role prefix
  const prefix = rolePrefix(role);
  if (nextPath === prefix || nextPath.startsWith(prefix + "/")) return nextPath;

  return null;
}

export default function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = sp.get("next"); // IMPORTANT: do NOT default this

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

      // Ensure profile exists + determine role (still valuable so app_profiles is always seeded)
      const { ensureProfileAndGetRole } = await import("@/lib/auth/role");
      const role = (await ensureProfileAndGetRole(supabase as any, user.id)) as Role;

      // ✅ NEW: default to /dashboard so routing is centralized server-side
      const safeNext = safeNextForRole(role, next);
      const dest = safeNext ?? "/dashboard";

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
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
