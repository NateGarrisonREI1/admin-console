// src/app/(app)/contractor/billing/page.tsx
export const dynamic = "force-dynamic";

import { fetchBillingData } from "./actions";
import BillingClient from "./BillingClient";

const adminBanner = {
  padding: "10px 20px",
  background: "rgba(59,130,246,0.12)",
  borderBottom: "1px solid rgba(59,130,246,0.25)",
  color: "#93c5fd",
  fontSize: 13,
  fontWeight: 500 as const,
  textAlign: "center" as const,
};

export default async function BillingPage() {
  const { data, isAdmin } = await fetchBillingData();
  return (
    <div>
      {isAdmin && <div style={adminBanner}>Admin Preview — viewing contractor billing as admin</div>}
      <BillingClient data={data} />
    </div>
  );
}
