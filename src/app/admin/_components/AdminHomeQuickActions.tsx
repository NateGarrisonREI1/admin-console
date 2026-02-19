"use client";

// src/app/admin/_components/AdminHomeQuickActions.tsx
import Link from "next/link";

export default function AdminHomeQuickActions() {
  return (
    <div
      style={{
        border: "1px solid #334155",
        background: "#1e293b",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Quick actions</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            The stuff you'll click all day.
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 10,
        }}
      >
        <Action href="/admin/intake" title="Create intake" desc="Start a new job/intake flow." />
        <Action href="/admin/schedule" title="View schedule" desc="See upcoming jobs and statuses." />
        <Action href="/admin/contractor-leads" title="Open job board" desc="Manage open & sold leads." />
        <Action href="/admin/schedule" title="Inspection scheduler" desc="Manage calendar + appointments." />
      </div>
    </div>
  );
}

function Action({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        borderRadius: 10,
        border: "1px solid #334155",
        background: "linear-gradient(180deg, #273548 0%, #1e293b 100%)",
        padding: 14,
        color: "#f1f5f9",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(16,185,129,0.30)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.25)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#334155";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0px)";
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{title}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{desc}</div>
      <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: "#10b981" }}>
        Open {"\u2192"}
      </div>
    </Link>
  );
}
