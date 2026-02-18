// src/app/(app)/contractor/network/brokers/page.tsx
export const dynamic = "force-dynamic";

import { fetchBrokersData } from "./actions";
import BrokersClient from "./BrokersClient";

const adminBanner = {
  padding: "10px 20px",
  background: "rgba(59,130,246,0.12)",
  borderBottom: "1px solid rgba(59,130,246,0.25)",
  color: "#93c5fd",
  fontSize: 13,
  fontWeight: 500 as const,
  textAlign: "center" as const,
};

export default async function BrokersPage() {
  const { data, isAdmin } = await fetchBrokersData();
  return (
    <div>
      {isAdmin && <div style={adminBanner}>Admin Preview — viewing broker connections as admin</div>}
      <BrokersClient data={data} />
    </div>
  );
}
