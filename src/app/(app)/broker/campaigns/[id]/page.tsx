// src/app/(app)/broker/campaigns/[id]/page.tsx
export const dynamic = "force-dynamic";

import { fetchCampaignPerformance } from "./actions";
import CampaignDetailClient from "./CampaignDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CampaignDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await fetchCampaignPerformance(id);

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
          Unable to load campaign. Please sign in as a broker.
        </div>
      </div>
    );
  }

  return <CampaignDetailClient performance={data} />;
}
