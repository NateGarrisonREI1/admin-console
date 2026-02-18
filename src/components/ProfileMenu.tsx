// src/components/ProfileMenu.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

interface ProfileMenuProps {
  settingsHref: string;
  loginRedirect: string;
}

export default function ProfileMenu({ settingsHref, loginRedirect }: ProfileMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      const meta = data.user?.user_metadata;
      setName(meta?.full_name ?? meta?.name ?? null);
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const initials = name
    ? name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : email
      ? email[0].toUpperCase()
      : "?";

  async function signOut() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.replace(loginRedirect);
    router.refresh();
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Avatar button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: open ? "rgba(16,185,129,0.25)" : "rgba(16,185,129,0.12)",
          border: open ? "1px solid rgba(16,185,129,0.5)" : "1px solid rgba(16,185,129,0.25)",
          color: "#10b981",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(16,185,129,0.25)";
          e.currentTarget.style.borderColor = "rgba(16,185,129,0.5)";
        }}
        onMouseLeave={(e) => {
          if (open) return;
          e.currentTarget.style.background = "rgba(16,185,129,0.12)";
          e.currentTarget.style.borderColor = "rgba(16,185,129,0.25)";
        }}
      >
        {initials}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 200,
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 12,
            padding: 6,
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            zIndex: 100,
          }}
        >
          {/* User info */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #334155", marginBottom: 4 }}>
            {name && (
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{name}</div>
            )}
            {email && (
              <div style={{ fontSize: 11, color: "#64748b", marginTop: name ? 2 : 0 }}>{email}</div>
            )}
          </div>

          {/* Settings */}
          <Link
            href={settingsHref}
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 8,
              textDecoration: "none",
              color: "#94a3b8",
              fontSize: 13,
              fontWeight: 500,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(16,185,129,0.08)";
              e.currentTarget.style.color = "#f1f5f9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#94a3b8";
            }}
          >
            <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{"\u2699"}</span>
            Settings
          </Link>

          {/* Sign out */}
          <button
            type="button"
            onClick={signOut}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "#94a3b8",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s ease",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.08)";
              e.currentTarget.style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#94a3b8";
            }}
          >
            <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{"\u2192"}</span>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
