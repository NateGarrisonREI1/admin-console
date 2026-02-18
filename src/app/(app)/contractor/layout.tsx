// src/app/(app)/contractor/layout.tsx
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import ContractorSidebar from "./_components/ContractorSidebar";
import { fetchContractorProfile } from "./_actions/contractor";
import OnboardingClient from "./onboarding/OnboardingClient";

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
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
    .select("role")
    .eq("id", userId)
    .single();

  const role = (profile?.role as string) ?? "contractor";

  // Admin: skip all onboarding checks, render normal layout
  if (role === "admin") {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a" }}>
        <ContractorSidebar />
        <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
      </div>
    );
  }

  // Non-contractor roles: render normal layout
  if (role !== "contractor") {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a" }}>
        <ContractorSidebar />
        <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
      </div>
    );
  }

  // Contractor: check onboarding status
  const { data: cp } = await supabaseAdmin
    .from("contractor_profiles")
    .select("onboarding_complete")
    .eq("id", userId)
    .single();

  const onboardingComplete = !!cp?.onboarding_complete;

  // Contractor with incomplete onboarding: render onboarding inline (no redirect)
  if (!onboardingComplete) {
    const contractorProfile = await fetchContractorProfile();
    const defaults = contractorProfile ?? {
      id: userId,
      company_name: null,
      system_specialties: [],
      service_radius_miles: 25,
      service_zip_codes: [],
      phone: null,
      email: null,
      website: null,
      license_number: null,
      insurance_verified: false,
      stripe_customer_id: null,
      onboarding_complete: false,
      created_at: "",
      updated_at: "",
    };
    return <OnboardingClient profile={defaults} />;
  }

  // Contractor with completed onboarding: normal layout
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a" }}>
      <ContractorSidebar />
      <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
    </div>
  );
}
