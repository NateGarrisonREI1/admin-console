// src/app/admin/schedule/page.tsx
export const dynamic = "force-dynamic";

import { fetchScheduleData } from "./data";
import SchedulePageClient from "./SchedulePageClient";

export default async function SchedulePage() {
  const data = await fetchScheduleData();
  return <SchedulePageClient data={data} />;
}
