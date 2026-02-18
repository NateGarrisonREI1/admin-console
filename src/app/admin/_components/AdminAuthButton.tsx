"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function AdminAuthButton() {
  const router = useRouter();
  const [email, setEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  async function signOut() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {email ? (
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{email}</div>
      ) : null}
      <button
        type="button"
        onClick={signOut}
        style={{
          fontSize: 12,
          fontWeight: 600,
          border: "1px solid #334155",
          background: "#1e293b",
          color: "#cbd5e1",
          padding: "6px 12px",
          borderRadius: 8,
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#273548";
          e.currentTarget.style.borderColor = "#475569";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#1e293b";
          e.currentTarget.style.borderColor = "#334155";
        }}
      >
        Sign out
      </button>
    </div>
  );
}
