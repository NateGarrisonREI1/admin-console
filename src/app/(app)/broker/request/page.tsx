// src/app/(app)/broker/request/page.tsx
export const dynamic = "force-dynamic";

import { fetchBrokerProfile, fetchServiceCatalog } from "./actions";
import BrokerRequestClient from "./BrokerRequestClient";
import { redirect } from "next/navigation";

export default async function BrokerRequestPage() {
  const [broker, catalog] = await Promise.all([
    fetchBrokerProfile(),
    fetchServiceCatalog(),
  ]);

  if (!broker) {
    redirect("/login");
  }

  return <BrokerRequestClient broker={broker} catalog={catalog} />;
}
