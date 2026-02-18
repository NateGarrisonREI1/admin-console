// src/app/admin/team/[id]/page.tsx
export const dynamic = "force-dynamic";

import { fetchTeamMemberDetail } from "../actions";
import type { MemberType } from "../actions";
import TeamMemberDetailClient from "./TeamMemberDetailClient";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
};

export default async function TeamMemberDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { type } = await searchParams;
  const memberType: MemberType = type === "inspector" ? "inspector" : "hes";
  const data = await fetchTeamMemberDetail(id, memberType);
  return <TeamMemberDetailClient data={data} />;
}
