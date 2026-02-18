// src/app/(app)/contractor/leads/page.tsx
export const dynamic = "force-dynamic";

import { fetchContractorLeads } from "./actions";
import LeadsClient from "./LeadsClient";

const adminBanner = {
  padding: "10px 20px",
  background: "rgba(59,130,246,0.12)",
  borderBottom: "1px solid rgba(59,130,246,0.25)",
  color: "#93c5fd",
  fontSize: 13,
  fontWeight: 500 as const,
  textAlign: "center" as const,
};

export default async function MyLeadsPage() {
  const { data, isAdmin } = await fetchContractorLeads();
  return (
    <div>
      {isAdmin && <div style={adminBanner}>Admin Preview — viewing contractor leads as admin</div>}
      <LeadsClient data={data} />
    </div>
  );
}
