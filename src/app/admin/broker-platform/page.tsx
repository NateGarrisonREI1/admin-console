// src/app/admin/broker-platform/page.tsx
export const dynamic = "force-dynamic";

import { fetchBrokerPlatformData } from "./actions";
import BrokerPlatformClient from "./BrokerPlatformClient";

export default async function BrokerPlatformPage() {
  const data = await fetchBrokerPlatformData();
  return <BrokerPlatformClient data={data} />;
}
