"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GREEN = "#43a419";

const links = [
  { href: "/contractor", label: "Home" },
  { href: "/contractor/job-board", label: "Open Job Board" },
  { href: "/contractor/leads", label: "My Leads" },
  { href: "/contractor/refunds", label: "Refund Requests" }, // placeholder (we’ll build)
  { href: "/contractor/settings", label: "Settings" }, // placeholder
];

export default function ContractorSidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 270,
        borderRight: "1px solid #e5e7eb",
        padding: 16,
        background: "white",
        minHeight: "100vh",
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "rgba(67,164,25,0.12)",
              border: "1px solid rgba(67,164,25,0.35)",
              color: GREEN,
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
            }}
          >
            L
          </div>
          <div>
            <div style={{ fontWeight: 900, lineHeight: 1.1 }}>Contractor Portal</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>Leads • Jobs • Earnings (soon)</div>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, opacity: 0.55, marginBottom: 10 }}>
        CONTRACTOR NAVIGATION
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {links.map((l) => {
          const isActive =
            pathname === l.href || (l.href !== "/contractor" && pathname?.startsWith(l.href));

          return (
            <Link
              key={l.href}
              href={l.href}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                textDecoration: "none",
                fontWeight: 800,
                transition: "all 0.15s ease",
                color: isActive ? GREEN : "#111827",
                background: isActive ? "rgba(67,164,25,0.12)" : "transparent",
                border: isActive ? `1px solid rgba(67,164,25,0.35)` : "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (isActive) return;
                e.currentTarget.style.background = "rgba(67,164,25,0.10)";
                e.currentTarget.style.color = GREEN;
              }}
              onMouseLeave={(e) => {
                if (isActive) return;
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#111827";
              }}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 18, fontSize: 12, opacity: 0.55 }}>
        Tip: “My Leads” will show purchased leads once checkout is wired.
      </div>
    </aside>
  );
}
