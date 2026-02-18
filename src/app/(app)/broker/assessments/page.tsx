// src/app/(app)/broker/assessments/page.tsx
export const dynamic = "force-dynamic";

import { fetchAssessments } from "./actions";
import AssessmentsClient from "./AssessmentsClient";

export default async function AssessmentsPage() {
  const data = await fetchAssessments();

  if (!data) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
        }}
      >
        <div
          style={{
            borderRadius: 12,
            border: "1px solid rgba(248,113,113,0.30)",
            background: "rgba(248,113,113,0.10)",
            padding: 24,
            color: "#f87171",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Unable to load assessments. Please sign in as a broker.
        </div>
      </div>
    );
  }

  return <AssessmentsClient broker={data.broker} assessments={data.assessments} />;
}
