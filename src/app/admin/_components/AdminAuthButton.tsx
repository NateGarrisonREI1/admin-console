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
      {email ? <div style={{ fontSize: 12, opacity: 0.75 }}>{email}</div> : null}
      <button
        type="button"
        onClick={signOut}
        style={{
          fontSize: 12,
          fontWeight: 700,
          border: "1px solid #e5e7eb",
          background: "white",
          padding: "6px 10px",
          borderRadius: 8,
        }}
      >
        Sign out
      </button>
    </div>
  );
}
