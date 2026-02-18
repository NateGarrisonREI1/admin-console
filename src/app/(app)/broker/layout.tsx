// src/app/(app)/broker/layout.tsx
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import BrokerSidebar from "./_components/BrokerSidebar";
import ProfileMenu from "@/components/ProfileMenu";
import { fetchBrokerOnboardingData } from "./onboarding/actions";
import BrokerOnboardingClient from "./onboarding/BrokerOnboardingClient";

export default async function BrokerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id;

  // Not authenticated — let middleware handle
  if (!userId) {
    return <>{children}</>;
  }

  // Get role from app_profiles
  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("role, onboarding_complete")
    .eq("id", userId)
    .single();

  const role = (profile?.role as string) ?? "broker";
  const onboardingComplete = !!(profile as Record<string, unknown> | null)?.onboarding_complete;

  // Admin users: skip all onboarding checks, render normal layout
  if (role === "admin") {
    return (
      <BrokerLayoutShell>
        {children}
      </BrokerLayoutShell>
    );
  }

  // Broker users with incomplete onboarding: show onboarding inline (no redirect)
  if (role === "broker" && !onboardingComplete) {
    const onboardingData = await fetchBrokerOnboardingData();
    return <BrokerOnboardingClient profile={onboardingData} />;
  }

  // Everyone else: normal layout
  return (
    <BrokerLayoutShell>
      {children}
    </BrokerLayoutShell>
  );
}

function BrokerLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a" }}>
      <BrokerSidebar />
      <main style={{ flex: 1, minWidth: 0, maxWidth: "100%", display: "flex", flexDirection: "column" }}>
        <header
          style={{
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            borderBottom: "1px solid #334155",
            padding: "12px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 8px rgba(16,185,129,0.4)",
              }}
            />
            <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>
              Broker Console
            </span>
          </div>

          <ProfileMenu settingsHref="/broker/settings" loginRedirect="/login" />
        </header>

        <div style={{ padding: 20, flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
