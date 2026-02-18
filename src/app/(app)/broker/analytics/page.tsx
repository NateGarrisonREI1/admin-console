export const dynamic = "force-dynamic";

import { fetchAnalytics } from "./actions";
import AnalyticsClient from "./AnalyticsClient";

export default async function BrokerAnalyticsPage() {
  const data = await fetchAnalytics();

  if (!data) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 24, display: "inline-block" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f87171" }}>Unable to load analytics.</div>
          <div style={{ marginTop: 8, fontSize: 13, color: "#94a3b8" }}>Please sign in as a broker.</div>
        </div>
      </div>
    );
  }

  return <AnalyticsClient broker={data.broker} analytics={data.analytics} />;
}
