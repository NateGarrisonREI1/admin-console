// src/app/(app)/contractor/customers/page.tsx
export const dynamic = "force-dynamic";

import { fetchCustomersData } from "./actions";
import CustomersClient from "./CustomersClient";

const adminBanner = {
  padding: "10px 20px",
  background: "rgba(59,130,246,0.12)",
  borderBottom: "1px solid rgba(59,130,246,0.25)",
  color: "#93c5fd",
  fontSize: 13,
  fontWeight: 500 as const,
  textAlign: "center" as const,
};

export default async function CustomersPage() {
  const { data, isAdmin } = await fetchCustomersData();
  return (
    <div>
      {isAdmin && <div style={adminBanner}>Admin Preview — viewing contractor customers as admin</div>}
      <CustomersClient data={data} />
    </div>
  );
}
