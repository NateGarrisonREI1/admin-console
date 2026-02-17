// src/app/admin/refunds/page.tsx
export const dynamic = "force-dynamic";

import { fetchRefundRequests } from "./actions";
import AdminRefundsClient from "./AdminRefundsClient";

export default async function AdminRefundsPage() {
  const requests = await fetchRefundRequests();

  return <AdminRefundsClient initialRequests={requests} />;
}
