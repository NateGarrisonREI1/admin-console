// src/app/admin/marketplace/page.tsx
export const dynamic = "force-dynamic";

import { fetchMarketplaceData } from "../_actions/marketplace";
import MarketplaceClient from "./MarketplaceClient";

export default async function MarketplacePage() {
  const data = await fetchMarketplaceData();
  return <MarketplaceClient data={data} />;
}
