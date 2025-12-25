"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = searchParams.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // If already logged in, go straight to admin
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!cancelled && !error && data.session) {
        router.replace(nextPath);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, nextPath]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    if (data.session) {
      router.replace(nextPath);
    } else {
      setMsg("Logged in, but no session was returned. Check Supabase Auth settings.");
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1 style={{ marginBottom: 8 }}>LEAF Admin Login</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Sign in to access the admin console.
      </p>

      <form onSubmit={handleLogin} style={{ marginTop: 16 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@company.com"
          style={{
            width: "100%",
            padding: 10,
            border: "1px solid #ccc",
            borderRadius: 6,
            marginBottom: 12,
          }}
        />

        <label style={{ display: "block", marginBottom: 6 }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          style={{
            width: "100%",
            padding: 10,
            border: "1px solid #ccc",
            borderRadius: 6,
            marginBottom: 12,
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 6,
            border: "1px solid #333",
            background: loading ? "#f3f3f3" : "white",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        {msg && (
          <p style={{ marginTop: 12, color: "crimson" }}>
            {msg}
          </p>
        )}
      </form>
    </main>
  );
}
