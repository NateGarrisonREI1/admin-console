import Link from "next/link";
import { headers } from "next/headers";

function NavItem({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 10px",
        margin: "0 6px",
        borderRadius: 12,
        textDecoration: "none",
        color: "#101828",
        fontWeight: 700,
        position: "relative",
        background: active ? "rgba(67,164,25,.10)" : "transparent",
      }}
    >
      {active ? (
        <span
          style={{
            position: "absolute",
            left: -6,
            top: 10,
            bottom: 10,
            width: 4,
            borderRadius: 999,
            background: "#43a419",
          }}
        />
      ) : null}

      <span
        aria-hidden="true"
        style={{
          width: 18,
          height: 18,
          borderRadius: 6,
          background: "rgba(16,24,40,.08)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color: "rgba(16,24,40,.75)",
        }}
      >
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server component: get current path from request headers (works without client hooks)
  const h = headers();
  const pathname =
    h.get("x-invoke-path") ||
    h.get("next-url") ||
    h.get("x-matched-path") ||
    "";

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const shellBg = "#f6f7fb";
  const panel = "#ffffff";
  const border = "#e7e9f0";
  const text = "#101828";
  const muted = "#667085";
  const reiGreen = "#43a419";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: shellBg,
        color: text,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "270px 1fr", minHeight: "100vh" }}>
        {/* SIDEBAR */}
        <aside
          style={{
            background: panel,
            borderRight: `1px solid ${border}`,
            padding: "18px 14px",
            position: "sticky",
            top: 0,
            height: "100vh",
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 8px 14px" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(67,164,25,.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: reiGreen,
                fontWeight: 900,
                letterSpacing: 0.2,
              }}
            >
              REI
            </div>

            <div style={{ lineHeight: 1.05 }}>
              <div style={{ fontWeight: 900, fontSize: 14 }}>Renewable Energy Incentives</div>
              <div style={{ fontSize: 12, color: muted }}>Management Console</div>
            </div>
          </div>

          {/* NAV */}
          <nav style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
            <NavItem href="/admin" label="Home" icon="🏠" active={isActive("/admin")} />

            <div
              style={{
                marginTop: 10,
                padding: "8px 8px 6px",
                fontSize: 11,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: muted,
              }}
            >
              Projects
            </div>

            <NavItem href="/admin/customers" label="Customers" icon="👤" active={isActive("/admin/customers")} />
            <NavItem href="/admin/jobs" label="Jobs" icon="🧾" active={isActive("/admin/jobs")} />
            <NavItem
              href="/admin/snapshots"
              label="LEAF System Snapshots"
              icon="🧩"
              active={isActive("/admin/snapshots")}
            />

            <div
              style={{
                marginTop: 10,
                padding: "8px 8px 6px",
                fontSize: 11,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: muted,
              }}
            >
              Operations
            </div>

            {/* Optional placeholders (remove if you don't want them yet) */}
            <NavItem href="/admin/dvi-jobs" label="DVI Jobs" icon="📋" active={isActive("/admin/dvi-jobs")} />
            <NavItem href="/admin/users" label="Users" icon="👥" active={isActive("/admin/users")} />
          </nav>

          {/* Footer */}
          <div style={{ marginTop: "auto", fontSize: 12, color: muted, padding: "14px 8px 0" }}>
            <div style={{ fontWeight: 800 }}>v0 (scaffold)</div>
            <div>Auth disabled • Supabase connected</div>
          </div>
        </aside>

        {/* MAIN */}
        <section style={{ display: "flex", flexDirection: "column" }}>
          {/* Top bar */}
          <header
            style={{
              background: panel,
              borderBottom: `1px solid ${border}`,
              padding: "16px 22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "rgba(67,164,25,.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: reiGreen,
                  fontWeight: 900,
                }}
                aria-hidden="true"
              >
                {isActive("/admin/snapshots")
                  ? "🧩"
                  : isActive("/admin/jobs")
                  ? "🧾"
                  : isActive("/admin/customers")
                  ? "👤"
                  : "🏠"}
              </div>

              <div>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
                  {isActive("/admin/snapshots")
                    ? "LEAF System Snapshots"
                    : isActive("/admin/jobs")
                    ? "Jobs"
                    : isActive("/admin/customers")
                    ? "Customers"
                    : "Home"}
                </h1>
                <div style={{ marginTop: 2, fontSize: 12, color: muted }}>
                  {isActive("/admin/snapshots")
                    ? "Snapshot management"
                    : isActive("/admin/jobs")
                    ? "Job management"
                    : isActive("/admin/customers")
                    ? "Customer management"
                    : "Management console"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  background: "#2f6fed",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                }}
                aria-label="User"
              >
                N
              </div>
            </div>
          </header>

          {/* Page content */}
          <main style={{ padding: "18px 22px 28px" }}>{children}</main>
        </section>
      </div>
    </div>
  );
}
