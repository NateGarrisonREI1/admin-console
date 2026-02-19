// src/app/admin/settings/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { fetchLeadPricingConfig } from "../_actions/lead-pricing";
import LeadPricingClient from "./lead-pricing/LeadPricingClient";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function SettingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const tab = params.tab || "users";

  const leadPricingConfig = tab === "lead-pricing"
    ? await fetchLeadPricingConfig()
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", letterSpacing: -0.3, margin: 0 }}>
          Settings
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "#94a3b8", lineHeight: 1.45 }}>
          Admin settings and platform configuration.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: 4 }}>
        <TabLink href="/admin/settings?tab=users" active={tab === "users"}>Users</TabLink>
        <TabLink href="/admin/settings?tab=lead-pricing" active={tab === "lead-pricing"}>Lead Pricing</TabLink>
      </div>

      {/* Tab Content */}
      {tab === "users" && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Link
            href="/admin/settings/users"
            style={{
              display: "block",
              background: "linear-gradient(180deg, #273548 0%, #1e293b 100%)",
              border: "1px solid #334155",
              borderRadius: 12,
              padding: 16,
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>Users (All)</div>
            <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, color: "#94a3b8" }}>
              View all user accounts and filter by role (admin, contractor, affiliate, broker, homeowner).
            </div>
            <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: "#10b981" }}>Open →</div>
          </Link>
        </div>
      )}

      {tab === "lead-pricing" && (
        <LeadPricingClient config={leadPricingConfig} embedded />
      )}
    </div>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        padding: "8px 18px",
        borderRadius: 8,
        textDecoration: "none",
        fontWeight: 700,
        fontSize: 13,
        transition: "all 0.15s ease",
        color: active ? "#f1f5f9" : "#94a3b8",
        background: active ? "rgba(16,185,129,0.12)" : "transparent",
        border: active ? "1px solid rgba(16,185,129,0.25)" : "1px solid transparent",
      }}
    >
      {children}
    </Link>
  );
}
