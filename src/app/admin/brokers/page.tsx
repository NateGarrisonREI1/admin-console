// src/app/admin/brokers/page.tsx
export const dynamic = "force-dynamic";

import { fetchBrokers } from "./actions";
import { fetchBrokerHealthList } from "../contractor-leads/actions";
import BrokersClient from "./BrokersClient";

export default async function BrokersPage() {
  const [brokers, healthData] = await Promise.all([
    fetchBrokers(),
    fetchBrokerHealthList(),
  ]);
  return <BrokersClient brokers={brokers} healthData={healthData} />;
}
