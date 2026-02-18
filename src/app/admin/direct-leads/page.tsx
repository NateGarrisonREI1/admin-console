export const dynamic = "force-dynamic";

import DirectLeadsClient from "./DirectLeadsClient";
import { fetchDirectLeads, fetchAssignmentOptions } from "./actions";

export default async function DirectLeadsPage() {
  const [leads, assignmentOptions] = await Promise.all([
    fetchDirectLeads(),
    fetchAssignmentOptions(),
  ]);

  return (
    <DirectLeadsClient
      leads={leads}
      hesMembers={assignmentOptions.hesMembers}
      inspectors={assignmentOptions.inspectors}
      partners={assignmentOptions.partners}
    />
  );
}
