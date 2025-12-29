import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div>
      <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 6 }}>
        Admin Console
      </h1>
      <p style={{ opacity: 0.75, marginBottom: 20 }}>
        Phase 3: System Catalog management only. Incentives/Settings are placeholders.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <Card
          title="Systems"
          desc="Browse systems, filter, and toggle active status."
          href="/admin/systems"
          live
        />

        <Card
          title="Incentives"
          desc="Placeholder. Phase 4+ will add read pages and later rules."
          href="/admin/incentives"
        />

        <Card
          title="Settings"
          desc="Placeholder. Phase 4+ global config and admin parameters."
          href="/admin/settings"
        />
      </div>
    </div>
  );
}

function Card({
  title,
  desc,
  href,
  live,
}: {
  title: string;
  desc: string;
  href: string;
  live?: boolean;
}) {
  return (
    <Link href={href} className="admin-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 900 }}>{title}</div>
        {live ? (
          <span className="pill-live">LIVE</span>
        ) : (
          <span className="pill-later">LATER</span>
        )}
      </div>

      <div style={{ opacity: 0.75, marginTop: 10 }}>{desc}</div>
      <div className="admin-card-cta">Open →</div>
    </Link>
  );
}

