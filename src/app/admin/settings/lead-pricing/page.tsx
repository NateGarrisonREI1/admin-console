// src/app/admin/settings/lead-pricing/page.tsx
export const dynamic = "force-dynamic";

import { fetchLeadPricingConfig } from "../../_actions/lead-pricing";
import LeadPricingClient from "./LeadPricingClient";

export default async function LeadPricingPage() {
  const config = await fetchLeadPricingConfig();
  return <LeadPricingClient config={config} />;
}
