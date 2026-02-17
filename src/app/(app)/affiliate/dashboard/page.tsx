// src/app/(app)/affiliate/dashboard/page.tsx
export const dynamic = "force-dynamic";

import { fetchAffiliateDashboard } from "./actions";
import AffiliateDashboardClient from "./AffiliateDashboardClient";

export default async function AffiliateDashboardPage() {
  const data = await fetchAffiliateDashboard();

  if (!data) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Unable to load dashboard. Please sign in as an HES affiliate.
        </div>
      </div>
    );
  }

  return (
    <AffiliateDashboardClient
      available={data.available}
      myWork={data.my_work}
      stats={data.stats}
    />
  );
}
