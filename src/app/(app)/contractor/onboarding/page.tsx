// src/app/(app)/contractor/onboarding/page.tsx
// Onboarding gate removed — this page only renders when navigated to directly.
// The onboarding flow will be re-enabled when the invite/signup flow is built.
export const dynamic = "force-dynamic";

import { fetchContractorProfile } from "../_actions/contractor";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const profile = await fetchContractorProfile();

  // If no profile exists yet, render with empty defaults
  const defaults = profile ?? {
    id: "",
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
