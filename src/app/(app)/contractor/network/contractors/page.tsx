// src/app/(app)/contractor/network/contractors/page.tsx
export const dynamic = "force-dynamic";

import { fetchContractorsData } from "./actions";
import ContractorsClient from "./ContractorsClient";

const adminBanner = {
  padding: "10px 20px",
  background: "rgba(59,130,246,0.12)",
  borderBottom: "1px solid rgba(59,130,246,0.25)",
  color: "#93c5fd",
  fontSize: 13,
  fontWeight: 500 as const,
  textAlign: "center" as const,
};

export default async function ContractorsPage() {
  const { data, isAdmin } = await fetchContractorsData();
  return (
    <div>
      {isAdmin && <div style={adminBanner}>Admin Preview — viewing contractor network as admin</div>}
      <ContractorsClient data={data} />
    </div>
  );
}
