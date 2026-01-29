// src/app/admin/settings/page.tsx
import Link from "next/link";

function Card(props: { title: string; description: string; href: string }) {
  const { title, description, href } = props;

  return (
    <Link
      href={href}
      className={[
        "block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
        "transition-all duration-150",
        "hover:border-emerald-300 hover:shadow-md",
        "focus:outline-none focus:ring-2 focus:ring-emerald-300",
      ].join(" ")}
      style={{ textDecoration: "none" }}
    >
      <div className="text-base font-extrabold text-slate-900">{title}</div>
      <div className="mt-1.5 text-sm leading-snug text-slate-700/80">{description}</div>
      <div className="mt-3 text-sm font-extrabold text-[#43a419]">Open →</div>
    </Link>
  );
}

export default function SettingsPage() {
  return (
    <div style={{ padding: 18 }}>
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 950, marginBottom: 6, color: "#111827" }}>
          Settings
        </h1>
        <p style={{ opacity: 0.75, margin: 0, lineHeight: 1.45 }}>
          Admin settings and user management for the REI platform. Use the sections below to manage
          roles and view your network.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Card
          title="Users (All)"
          description="View all user accounts and filter by role (admin, contractor, affiliate, broker, homeowner)."
          href="/admin/settings/users"
        />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-emerald-50/50 p-4">
        <div className="text-sm font-extrabold text-slate-900">Coming next</div>
        <div className="mt-1.5 text-sm leading-snug text-slate-700/80">
          Role-aware access controls, admin user invites, user profile enrichment (email/name), and
          more configuration options for snapshot assumptions and incentive rules.
        </div>
      </div>
    </div>
  );
}
