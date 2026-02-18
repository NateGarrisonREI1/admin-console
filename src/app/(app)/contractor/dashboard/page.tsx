export const dynamic = "force-dynamic";

import { fetchContractorDashboard } from "./actions";
import ContractorDashboardClient from "./ContractorDashboardClient";

export default async function ContractorDashboardPage() {
  const { data } = await fetchContractorDashboard();

  return <ContractorDashboardClient data={data} />;
}
