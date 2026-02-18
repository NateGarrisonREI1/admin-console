// src/app/auth/set-password/SetPasswordClient.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { validatePassword } from "@/lib/auth/password";
import { activateProfile } from "./actions";

// ─── Design tokens ──────────────────────────────────────────────────
const BG = "#0f172a";
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const EMERALD = "#10b981";

function roleDestination(role: string, onboardingComplete: boolean): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "broker":
      return onboardingComplete ? "/broker/dashboard" : "/broker/onboarding";
    case "contractor":
      return onboardingComplete ? "/contractor/dashboard" : "/contractor/onboarding";
    case "homeowner":
      return "/homeowner/dashboard";
    default:
      return "/login";
  }
}

export default function SetPasswordClient() {
  const router = useRouter();

  // Stable supabase client — created once per component lifecycle
  const supabaseRef = React.useRef(supabaseBrowser());

  const [loading, setLoading] = React.useState(true);
  const [email, setEmail] = React.useState("");
  const [noSession, setNoSession] = React.useState(false);

  const [pw1, setPw1] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // ─── Check session on mount ───────────────────────────────────────
  React.useEffect(() => {
    (async () => {
      try {
        const supabase = supabaseRef.current;
        const { data, error: sessionErr } = await supabase.auth.getSession();

        if (sessionErr) {
          console.error("[set-password] getSession error:", sessionErr);
          setNoSession(true);
          setLoading(false);
          return;
        }

        if (!data.session) {
          console.error("[set-password] No active session found");
          setNoSession(true);
          setLoading(false);
          return;
        }

        setEmail(data.session.user.email ?? "");
        setLoading(false);
      } catch (e) {
        console.error("[set-password] Session check failed:", e);
        setNoSession(true);
        setLoading(false);
      }
    })();
  }, []);

  // Live validation feedback
  const checks = React.useMemo(() => validatePassword(pw1, email), [pw1, email]);
  const mismatch = pw2.length > 0 && pw1 !== pw2;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (pw1 !== pw2) {
      setError("Passwords do not match.");
      return;
    }

    const validation = validatePassword(pw1, email);
    if (!validation.valid) {
      setError(validation.errors.join(". ") + ".");
      return;
    }

    setBusy(true);
    try {
      const supabase = supabaseRef.current;

      // Verify session is still valid before updating
      const { data: sessionCheck } = await supabase.auth.getSession();
      if (!sessionCheck.session) {
        setError("Your session has expired. Please use your invite link again.");
        setBusy(false);
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password: pw1 });
      if (updateErr) {
        console.error("[set-password] updateUser error:", updateErr);
        throw updateErr;
      }

      // Mark profile as active and get redirect destination
      const { role, onboardingComplete } = await activateProfile();
      setSuccess(true);

      const dest = roleDestination(role, onboardingComplete);
      setTimeout(() => {
        router.replace(dest);
        router.refresh();
      }, 600);
    } catch (e: unknown) {
      console.error("[set-password] handleSubmit error:", e);
      setError(e instanceof Error ? e.message : "Failed to set password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // ─── Loading state ────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: "50%",
              border: `3px solid ${BORDER}`, borderTopColor: EMERALD,
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: TEXT_DIM, fontSize: 14, fontWeight: 500 }}>
            Checking your session...
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // ─── No session state ─────────────────────────────────────────────
  if (noSession) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
          <div
            style={{
              width: 48, height: 48, borderRadius: 14,
              background: "rgba(239,68,68,0.15)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: "0 0 8px" }}>
            Session Expired
          </h1>
          <p style={{ fontSize: 14, color: TEXT_DIM, marginBottom: 24 }}>
            Your invite link may have expired. Please request a new one from your admin.
          </p>
          <a
            href="/login"
            style={{
              display: "inline-block",
              padding: "10px 24px", borderRadius: 8,
              background: EMERALD, color: "#fff",
              fontSize: 14, fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  // ─── Password form ────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo / Branding */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${EMERALD}, #059669)`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: 0 }}>
            Set Your Password
          </h1>
          <p style={{ fontSize: 13, color: TEXT_DIM, marginTop: 6, fontWeight: 500 }}>
            Welcome! Create a secure password to get started.
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            padding: 24,
          }}
        >
          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid rgba(239,68,68,0.3)",
                background: "rgba(239,68,68,0.08)",
                fontSize: 13,
                fontWeight: 600,
                color: "#f87171",
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                marginBottom: 16,
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid rgba(16,185,129,0.3)",
                background: "rgba(16,185,129,0.08)",
                fontSize: 13,
                fontWeight: 600,
                color: EMERALD,
              }}
            >
              Password set! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Email (read-only) */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                Email
              </label>
              <div
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${BORDER}`,
                  background: "rgba(148,163,184,0.06)",
                  color: TEXT_SEC,
                  fontSize: 13,
                  fontWeight: 500,
                  boxSizing: "border-box",
                }}
              >
                {email || "—"}
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                Password <span style={{ color: "#f87171" }}>*</span>
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                placeholder="Create a strong password"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${BORDER}`,
                  background: BG,
                  color: TEXT,
                  fontSize: 13,
                  fontWeight: 500,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Password requirements */}
            {pw1.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {[
                  { label: "12+ characters", pass: pw1.length >= 12 },
                  { label: "Uppercase letter", pass: /[A-Z]/.test(pw1) },
                  { label: "Lowercase letter", pass: /[a-z]/.test(pw1) },
                  { label: "Number", pass: /[0-9]/.test(pw1) },
                  { label: "Special character", pass: /[^A-Za-z0-9]/.test(pw1) },
                ].map(({ label, pass }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: pass ? "rgba(16,185,129,0.15)" : "rgba(148,163,184,0.1)",
                        border: `1px solid ${pass ? "rgba(16,185,129,0.3)" : "rgba(148,163,184,0.2)"}`,
                      }}
                    >
                      {pass && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1 4l2 2 4-4" stroke={EMERALD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span style={{ color: pass ? EMERALD : TEXT_DIM }}>{label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Confirm Password */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                Confirm Password <span style={{ color: "#f87171" }}>*</span>
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="Confirm your password"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${mismatch ? "rgba(239,68,68,0.5)" : BORDER}`,
                  background: BG,
                  color: TEXT,
                  fontSize: 13,
                  fontWeight: 500,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {mismatch && (
                <div style={{ fontSize: 12, color: "#f87171", fontWeight: 600, marginTop: 4 }}>
                  Passwords do not match
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={busy || success || !checks.valid || mismatch}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                background: busy || success || !checks.valid || mismatch ? "rgba(16,185,129,0.3)" : EMERALD,
                color: "#fff",
                border: "none",
                cursor: busy || success || !checks.valid || mismatch ? "not-allowed" : "pointer",
                opacity: busy || success ? 0.7 : 1,
                transition: "background 0.15s, opacity 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              {busy ? "Setting password..." : success ? "Redirecting..." : "Set Password & Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
