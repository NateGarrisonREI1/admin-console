// src/app/(app)/contractor/leads/[id]/page.tsx
export const dynamic = "force-dynamic";

import { fetchLeadDetail } from "./actions";
import LeadDetailClient from "./LeadDetailClient";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await fetchLeadDetail(id);

  if (!data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 24, color: "#ef4444" }}>
          Lead not found or access denied.
        </div>
      </div>
    );
  }

  return <LeadDetailClient data={data} />;
}
