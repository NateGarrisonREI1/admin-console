// src/app/admin/team/page.tsx
export const dynamic = "force-dynamic";

import { fetchTeamData } from "./actions";
import TeamPageClient from "./TeamPageClient";

export default async function TeamPage() {
  const data = await fetchTeamData();
  return <TeamPageClient data={data} />;
}
