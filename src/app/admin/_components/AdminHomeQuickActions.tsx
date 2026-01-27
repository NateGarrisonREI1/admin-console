"use client";

// src/app/admin/_components/AdminHomeQuickActions.tsx
import Link from "next/link";


export default function AdminHomeQuickActions() {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        background: "white",
        borderRadius: 16,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 950 }}>Quick actions</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
            The stuff you’ll click all day.
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        <Action href="/admin/intake" title="Create intake" desc="Start a new job/intake flow." />
        <Action href="/admin/jobs" title="View projects" desc="See active jobs and statuses." />
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
        borderRadius: 14,
        border: "1px solid #eef2f7",
        background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
        padding: 12,
        color: "#111827",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.border = "1px solid rgba(67,164,25,0.25)";
        e.currentTarget.style.boxShadow = "0 14px 28px rgba(0,0,0,0.08)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.border = "1px solid #eef2f7";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0px)";
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 950 }}>{title}</div>
      <div style={{ fontSize: 12, opacity: 0.72, marginTop: 4 }}>{desc}</div>
      <div style={{ marginTop: 10, fontSize: 12, fontWeight: 900, color: "#2f7a12" }}>
        Open →
      </div>
    </Link>
  );
}
