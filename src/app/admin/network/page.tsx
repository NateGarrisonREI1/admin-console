// src/app/admin/network/page.tsx
export const dynamic = "force-dynamic";

import { fetchNetworkPartners } from "./actions";
import NetworkClient from "./NetworkClient";

export default async function NetworkPage() {
  const data = await fetchNetworkPartners();
  return <NetworkClient data={data} />;
}
