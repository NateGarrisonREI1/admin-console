// src/app/(app)/broker/dashboard/page.tsx
export const dynamic = "force-dynamic";

import { fetchBrokerDashboard } from "./actions";
import BrokerDashboardClient from "./BrokerDashboardClient";

export default async function BrokerDashboardPage() {
  const data = await fetchBrokerDashboard();

  if (!data) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
        }}
      >
        <div
          style={{
            background: "#1e293b",
            border: "1px solid #ef4444",
            borderRadius: 12,
            padding: "20px 28px",
            color: "#fca5a5",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Unable to load dashboard. Please sign in as a broker.
        </div>
      </div>
    );
  }

  return (
    <BrokerDashboardClient
      broker={data.broker}
      kpis={data.kpis}
      contractors={data.contractors}
      recentLeads={data.recentLeads}
      topContractors={data.topContractors}
    />
  );
}
