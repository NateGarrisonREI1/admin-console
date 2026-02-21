// src/app/(app)/broker/schedule/page.tsx
export const dynamic = "force-dynamic";

import { fetchBrokerAllJobs } from "./actions";
import BrokerScheduleClient from "./BrokerScheduleClient";

export default async function BrokerSchedulePage() {
  const jobs = await fetchBrokerAllJobs();

  return <BrokerScheduleClient jobs={jobs} />;
}
