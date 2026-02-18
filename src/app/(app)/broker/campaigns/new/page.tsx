// src/app/(app)/broker/campaigns/new/page.tsx
export const dynamic = "force-dynamic";

import { fetchCampaignContacts } from "../actions";
import NewCampaignClient from "./NewCampaignClient";

export default async function NewCampaignPage() {
  const data = await fetchCampaignContacts();

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
          Unable to load contacts. Please sign in as a broker.
        </div>
      </div>
    );
  }

  return (
    <NewCampaignClient broker={data.broker} contacts={data.contacts} />
  );
}
