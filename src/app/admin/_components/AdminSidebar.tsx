"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const GREEN = "#43a419";

const links = [
  { href: "/admin", label: "Home" },
  { href: "/admin/systems", label: "Systems" },
  { href: "/admin/incentives", label: "Incentives (placeholder)" },
  { href: "/admin/settings", label: "Settings (placeholder)" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 270,
        borderRight: "1px solid #e5e7eb",
        padding: 16,
        background: "white",
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <Image
          src="/brand/rei-logo.png"
          alt="Renewable Energy Incentives"
          width={210}
          height={60}
          style={{ objectFit: "contain" }}
          priority
        />
      </div>

      <div style={{ fontSize: 12, opacity: 0.55, marginBottom: 10 }}>
        ADMIN NAVIGATION
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {links.map((l) => {
          const isActive =
            pathname === l.href || (l.href !== "/admin" && pathname?.startsWith(l.href));

          return (
            <Link
              key={l.href}
              href={l.href}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                textDecoration: "none",
                fontWeight: 700,
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
        Tip: Systems is the only live module in Phase 3.
      </div>
    </aside>
  );
}

