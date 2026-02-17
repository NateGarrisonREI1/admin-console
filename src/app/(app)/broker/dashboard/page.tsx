// src/app/(app)/broker/dashboard/page.tsx
export const dynamic = "force-dynamic";

import { fetchBrokerDashboard } from "./actions";
import BrokerDashboardClient from "./BrokerDashboardClient";

export default async function BrokerDashboardPage() {
  const data = await fetchBrokerDashboard();

  if (!data) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Unable to load dashboard. Please sign in as a broker.
        </div>
      </div>
    );
  }

  return <BrokerDashboardClient requests={data.requests} />;
}
