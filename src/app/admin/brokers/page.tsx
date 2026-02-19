// src/app/admin/brokers/page.tsx
export const dynamic = "force-dynamic";

import { fetchBrokers, fetchBrokersWithHealth } from "./data";
import BrokersClient from "./BrokersClient";

export default async function BrokersPage() {
  const [brokers, healthData] = await Promise.all([
    fetchBrokers(),
    fetchBrokersWithHealth(),
  ]);
  return <BrokersClient brokers={brokers} healthData={healthData} />;
}
