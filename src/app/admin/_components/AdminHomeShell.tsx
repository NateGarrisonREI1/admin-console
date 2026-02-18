// src/app/admin/_components/AdminHomeShell.tsx
import { fetchMorningBrief } from "../_actions/morning-brief";
import MorningBriefClient from "./MorningBriefClient";

export default async function AdminHomeShell() {
  const data = await fetchMorningBrief();
  return <MorningBriefClient data={data} />;
}
