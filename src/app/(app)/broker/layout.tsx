// src/app/(app)/broker/layout.tsx
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import BrokerSidebar from "./_components/BrokerSidebar";
import NewRequestModalProvider from "./_components/NewRequestModalProvider";
import ProfileMenu from "@/components/ProfileMenu";
import { fetchBrokerOnboardingData } from "./onboarding/actions";
import BrokerOnboardingClient from "./onboarding/BrokerOnboardingClient";
import { fetchServiceCatalog } from "./request/actions";
import type { BrokerProfile } from "./request/actions";
import type { ClientLinkInfo } from "./dashboard/actions";

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
    .select("role, onboarding_complete, full_name, email, phone")
    .eq("id", userId)
    .single();

  const role = (profile?.role as string) ?? "broker";
  const onboardingComplete = !!(profile as Record<string, unknown> | null)?.onboarding_complete;

  // Try to get broker company name for sidebar
  let brokerName = (profile as Record<string, unknown> | null)?.full_name as string | undefined;
  const brokerEmail = (profile as Record<string, unknown> | null)?.email as string | undefined;
  const profilePhone = (profile as Record<string, unknown> | null)?.phone as string | undefined;

  // Fetch broker data for modal (all roles that reach the broker portal need this)
  let brokerProfile: BrokerProfile | null = null;
  let clientLink: ClientLinkInfo = { referralCode: null, visits: 0, conversions: 0 };
  let brokerLogoUrl: string | null = null;

  const { data: brokerRow } = await supabaseAdmin
    .from("brokers")
    .select("id, company_name, phone, logo_url, referral_code, referral_link_visits, referral_link_conversions")
    .eq("user_id", userId)
    .maybeSingle();

  if (brokerRow) {
    if (brokerRow.company_name) brokerName = brokerRow.company_name as string;
    brokerLogoUrl = (brokerRow.logo_url as string) || null;

    brokerProfile = {
      userId,
      brokerId: brokerRow.id as string,
      fullName: (brokerName as string) || "Broker",
      email: (brokerEmail as string) || "",
      phone: (brokerRow.phone as string) || profilePhone || null,
      companyName: (brokerRow.company_name as string) || null,
    };

    clientLink = {
      referralCode: (brokerRow.referral_code as string) ?? null,
      visits: (brokerRow.referral_link_visits as number) ?? 0,
      conversions: (brokerRow.referral_link_conversions as number) ?? 0,
    };
  }

  // Admin users: skip all onboarding checks, render normal layout
  if (role === "admin") {
    return (
      <BrokerLayoutShell
        brokerName={brokerName}
        brokerEmail={brokerEmail}
        brokerLogoUrl={brokerLogoUrl}
        brokerProfile={brokerProfile}
        clientLink={clientLink}
      >
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
    <BrokerLayoutShell
      brokerName={brokerName}
      brokerEmail={brokerEmail}
      brokerLogoUrl={brokerLogoUrl}
      brokerProfile={brokerProfile}
      clientLink={clientLink}
    >
      {children}
    </BrokerLayoutShell>
  );
}

async function BrokerLayoutShell({
  children,
  brokerName,
  brokerEmail,
  brokerLogoUrl,
  brokerProfile,
  clientLink,
}: {
  children: React.ReactNode;
  brokerName?: string;
  brokerEmail?: string;
  brokerLogoUrl?: string | null;
  brokerProfile: BrokerProfile | null;
  clientLink: ClientLinkInfo;
}) {
  // Fetch catalog at the layout level so the modal has it everywhere
  const catalog = await fetchServiceCatalog();

  return (
    <NewRequestModalProvider
      broker={brokerProfile}
      catalog={catalog}
      clientLink={clientLink}
      brokerName={brokerName || "Broker"}
    >
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#0f172a" }}>
        <BrokerSidebar brokerName={brokerName} brokerEmail={brokerEmail} brokerLogoUrl={brokerLogoUrl} />
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

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {brokerLogoUrl && (
                <img
                  src={brokerLogoUrl}
                  alt=""
                  style={{ height: 32, borderRadius: 6, objectFit: "contain", border: "1px solid #334155" }}
                />
              )}
              <ProfileMenu settingsHref="/broker/settings" loginRedirect="/login" />
            </div>
          </header>

          <div style={{ padding: 20, flex: 1 }}>
            {children}
          </div>
        </main>
      </div>
    </NewRequestModalProvider>
  );
}
