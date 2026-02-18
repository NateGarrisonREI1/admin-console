// src/app/admin/contractor-leads/page.tsx
import { fetchDirectLeadsTab } from "./actions";
import ContractorLeadsConsole from "./_components/AdminContractorLeadsConsole";

export const dynamic = "force-dynamic";

export default async function AdminContractorLeadsPage() {
  const directLeadsData = await fetchDirectLeadsTab();
  return <ContractorLeadsConsole directLeadsData={directLeadsData} />;
}
