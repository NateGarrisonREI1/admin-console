// src/app/admin/_components/AdminHomeModules.tsx
import Link from "next/link";

export default function AdminHomeModules() {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 950 }}>Modules</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
            Jump into a console and get work done.
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <Card
          title="Job Board"
          desc="Manage open + sold leads. Adjust pricing, assign, remove."
          meta="LIVE"
          href="/admin/contractor-leads"
          tone="live"
        />

        <Card
          title="Schedule"
          desc="Manage upcoming assessments, inspections, and service requests."
          meta="LIVE"
          href="/admin/schedule"
          tone="live"
        />

        <Card
          title="Inspection Scheduler"
          desc="Calendar view and appointment management."
          meta="LIVE"
          href="/admin/schedule"
          tone="live"
        />

        <Card
          title="Settings"
          desc="Global config and admin parameters (phase 4+)."
          meta="LATER"
          href="/admin/settings"
          tone="later"
        />
      </div>
    </div>
  );
}

function Card({
  title,
  desc,
  href,
  meta,
  tone,
}: {
  title: string;
  desc: string;
  href: string;
  meta: string;
  tone: "live" | "later";
}) {
  const pillClass = tone === "live" ? "pill-live" : "pill-later";

  return (
    <Link href={href} className="admin-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 950 }}>{title}</div>
        <span className={pillClass}>{meta}</span>
      </div>

      <div style={{ opacity: 0.78, marginTop: 10 }}>{desc}</div>
      <div className="admin-card-cta">Open →</div>
    </Link>
  );
}
