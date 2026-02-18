export const dynamic = "force-dynamic";

import { fetchAuthLogs } from "./actions";
import AuthLogsClient from "./AuthLogsClient";

export default async function AdminAuthLogsPage() {
  const events = await fetchAuthLogs({ limit: 200 });
  return <AuthLogsClient initialEvents={events} />;
}
