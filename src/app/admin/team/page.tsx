// src/app/admin/team/page.tsx
export const dynamic = "force-dynamic";

import { fetchTeamData } from "./data";
import { fetchPartners, fetchDispatches } from "../partners/data";
import TeamPageClient from "./TeamPageClient";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const [data, partners, dispatches] = await Promise.all([
    fetchTeamData(),
    fetchPartners(),
    fetchDispatches(),
  ]);
  return (
    <TeamPageClient
      data={data}
      partners={partners}
      dispatches={dispatches}
      initialTab={params.tab}
    />
  );
}
