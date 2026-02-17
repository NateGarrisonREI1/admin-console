// src/app/(app)/contractor/dashboard/page.tsx
export const dynamic = "force-dynamic";

import { fetchContractorDashboard } from "./actions";
import ContractorDashboardClient from "./ContractorDashboardClient";

export default async function ContractorDashboardPage() {
  const data = await fetchContractorDashboard();

  if (!data) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Unable to load dashboard. Please sign in as a contractor.
        </div>
      </div>
    );
  }

  return (
    <ContractorDashboardClient
      available={data.available}
      myLeads={data.my_leads}
      stats={data.stats}
    />
  );
}
