// src/app/admin/team/page.tsx
export const dynamic = "force-dynamic";

import { fetchTeamData } from "./data";
import TeamPageClient from "./TeamPageClient";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const data = await fetchTeamData();
  return (
    <TeamPageClient
      data={data}
      initialTab={params.tab}
    />
  );
}
