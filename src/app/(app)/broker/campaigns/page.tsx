// src/app/(app)/broker/campaigns/page.tsx
export const dynamic = "force-dynamic";

import { fetchCampaigns } from "./actions";
import CampaignsClient from "./CampaignsClient";

export default async function CampaignsPage() {
  const data = await fetchCampaigns();

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
          Unable to load campaigns. Please sign in as a broker.
        </div>
      </div>
    );
  }

  return (
    <CampaignsClient broker={data.broker} campaigns={data.campaigns} />
  );
}
