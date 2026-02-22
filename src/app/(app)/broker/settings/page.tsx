// src/app/(app)/broker/settings/page.tsx
export const dynamic = "force-dynamic";

import { fetchBrokerSettings } from "./actions";
import BrokerSettingsClient from "./BrokerSettingsClient";

export default async function BrokerSettingsPage() {
  const settings = await fetchBrokerSettings();

  if (!settings) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{
          background: "#1e293b", border: "1px solid #334155", borderRadius: 12,
          padding: "32px 24px", display: "inline-block",
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f87171" }}>
            Unable to load settings.
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: "#94a3b8" }}>
            Please sign in as a broker.
          </div>
        </div>
      </div>
    );
  }

  return <BrokerSettingsClient settings={settings} />;
}
