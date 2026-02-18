// src/app/(app)/contractor/job-board/page.tsx
export const dynamic = "force-dynamic";

import { fetchJobBoardData } from "./actions";
import JobBoardClient from "./JobBoardClient";

const adminBanner = {
  padding: "10px 20px",
  background: "rgba(59,130,246,0.12)",
  borderBottom: "1px solid rgba(59,130,246,0.25)",
  color: "#93c5fd",
  fontSize: 13,
  fontWeight: 500 as const,
  textAlign: "center" as const,
};

export default async function JobBoardPage() {
  const { data, isAdmin } = await fetchJobBoardData();
  return (
    <div>
      {isAdmin && <div style={adminBanner}>Admin Preview — viewing contractor job board as admin</div>}
      <JobBoardClient data={data} />
    </div>
  );
}
