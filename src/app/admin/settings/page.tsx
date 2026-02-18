// src/app/admin/settings/page.tsx
import Link from "next/link";

function Card(props: { title: string; description: string; href: string }) {
  const { title, description, href } = props;

  return (
    <Link
      href={href}
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
      <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, color: "#94a3b8" }}>{description}</div>
      <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: "#10b981" }}>Open →</div>
    </Link>
  );
}

export default function SettingsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", letterSpacing: -0.3 }}>
          Settings
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "#94a3b8", lineHeight: 1.45 }}>
          Admin settings and user management for the REI platform. Use the sections below to manage
          roles and view your network.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Card
          title="Users (All)"
          description="View all user accounts and filter by role (admin, contractor, affiliate, broker, homeowner)."
          href="/admin/settings/users"
        />
      </div>

      <div
        style={{
          borderRadius: 12,
          border: "1px solid rgba(16,185,129,0.20)",
          background: "rgba(16,185,129,0.06)",
          padding: 16,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>Coming next</div>
        <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, color: "#94a3b8" }}>
          Role-aware access controls, admin user invites, user profile enrichment (email/name), and
          more configuration options for snapshot assumptions and incentive rules.
        </div>
      </div>
    </div>
  );
}
