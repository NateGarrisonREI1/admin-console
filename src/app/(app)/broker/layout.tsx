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

  // Get role + onboarding status from app_profiles
  const { data: profile } = await supabaseAdmin
    .from("app_profiles")
    .select("role, onboarding_complete, full_name, email")
    .eq("id", userId)
    .single();

  const role = (profile?.role as string) ?? "broker";
  const onboardingComplete = !!(profile as Record<string, unknown> | null)?.onboarding_complete;

  // Try to get broker company name for sidebar
  let brokerName = (profile as Record<string, unknown> | null)?.full_name as string | undefined;
  const brokerEmail = (profile as Record<string, unknown> | null)?.email as string | undefined;

  // If broker, get company name from brokers table
  if (role === "broker") {
    const { data: broker } = await supabaseAdmin
      .from("brokers")
      .select("company_name")
      .eq("user_id", userId)
      .single();
    if (broker?.company_name) brokerName = broker.company_name;
  }

  // Admin users: skip all onboarding checks, render normal layout
  if (role === "admin") {
    return (
      <BrokerLayoutShell brokerName={brokerName} brokerEmail={brokerEmail}>
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
    <BrokerLayoutShell brokerName={brokerName} brokerEmail={brokerEmail}>
      {children}
    </BrokerLayoutShell>
  );
}

function BrokerLayoutShell({
  children,
  brokerName,
  brokerEmail,
}: {
  children: React.ReactNode;
  brokerName?: string;
  brokerEmail?: string;
}) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#0f172a" }}>
      <BrokerSidebar brokerName={brokerName} brokerEmail={brokerEmail} />
      <main style={{ flex: 1, minWidth: 0, maxWidth: "100%", height: "100vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
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
              Broker Portal
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
