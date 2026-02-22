// src/app/(app)/broker/team/page.tsx
export const dynamic = "force-dynamic";

import { fetchBrokerTeam, fetchREIAssessors, fetchREIInspectors } from "./actions";
import BrokerTeamClient from "./BrokerTeamClient";

export default async function BrokerTeamPage() {
  const [data, assessors, inspectors] = await Promise.all([
    fetchBrokerTeam(),
    fetchREIAssessors(),
    fetchREIInspectors(),
  ]);

  if (!data) {
    return (
      <div style={{ padding: 20 }}>
        <p style={{ color: "#94a3b8" }}>Unable to load team data. Please try again.</p>
      </div>
    );
  }

  return (
    <BrokerTeamClient
      data={data}
      assessors={assessors}
      inspectors={inspectors}
    />
  );
}
