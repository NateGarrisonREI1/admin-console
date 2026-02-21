// src/app/(app)/broker/leads/page.tsx
export const dynamic = "force-dynamic";

import { fetchBrokerMarketplaceData } from "./actions";
import LeadsClient from "./LeadsClient";

export default async function BrokerLeadsPage() {
  const data = await fetchBrokerMarketplaceData();
  return <LeadsClient data={data} />;
}
