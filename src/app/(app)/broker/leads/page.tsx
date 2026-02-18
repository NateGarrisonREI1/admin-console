// src/app/(app)/broker/leads/page.tsx
export const dynamic = "force-dynamic";

import { fetchLeads } from "./actions";
import LeadsClient from "./LeadsClient";

export default async function BrokerLeadsPage() {
  const data = await fetchLeads();

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
            borderRadius: 16,
            border: "1px solid rgba(239,68,68,0.35)",
            background: "rgba(239,68,68,0.08)",
            padding: 24,
            color: "#ef4444",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Unable to load leads. Please sign in as a broker.
        </div>
      </div>
    );
  }

  return (
    <LeadsClient
      broker={data.broker}
      leads={data.leads}
      assessments={data.assessments}
      providers={data.providers}
    />
  );
}
