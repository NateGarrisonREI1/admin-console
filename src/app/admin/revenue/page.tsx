// src/app/admin/revenue/page.tsx
export const dynamic = "force-dynamic";

import { fetchRevenueData } from "./actions";
import RevenueClient from "./RevenueClient";

export default async function RevenuePage() {
  const data = await fetchRevenueData();
  return <RevenueClient breakdown={data.breakdown} brokers={data.brokers} />;
}
