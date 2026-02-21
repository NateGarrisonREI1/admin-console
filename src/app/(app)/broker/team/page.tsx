// src/app/(app)/broker/team/page.tsx
import { fetchBrokerContractors } from "./actions";
import BrokerTeamClient from "./BrokerTeamClient";

export default async function BrokerTeamPage() {
  const data = await fetchBrokerContractors();

  if (!data) {
    return (
      <div style={{ padding: 20 }}>
        <p style={{ color: "#94a3b8" }}>Unable to load team data. Please try again.</p>
      </div>
    );
  }

  return <BrokerTeamClient contractors={data.contractors} coverage={data.coverage} />;
}
