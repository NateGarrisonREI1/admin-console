"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  CalendarIcon,
  BriefcaseIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ArrowsRightLeftIcon,
  GiftIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Tab = { href: string; label: string; icon: React.ReactNode };

const ico = { width: 20, height: 20 };

const FIELD_TECH_TABS: Tab[] = [
  { href: "/portal/schedule", label: "Schedule", icon: <CalendarIcon style={ico} /> },
  { href: "/portal/jobs", label: "Jobs", icon: <BriefcaseIcon style={ico} /> },
  { href: "/portal/settings", label: "Settings", icon: <Cog6ToothIcon style={ico} /> },
];

const AFFILIATE_TABS: Tab[] = [
  { href: "/portal/schedule", label: "Schedule", icon: <CalendarIcon style={ico} /> },
  { href: "/portal/referrals", label: "Referrals", icon: <GiftIcon style={ico} /> },
  { href: "/portal/commissions", label: "Commissions", icon: <CurrencyDollarIcon style={ico} /> },
  { href: "/portal/settings", label: "Settings", icon: <Cog6ToothIcon style={ico} /> },
];

const CONTRACTOR_TABS: Tab[] = [
  { href: "/portal/leads", label: "Leads", icon: <ChartBarIcon style={ico} /> },
  { href: "/portal/jobs", label: "Jobs", icon: <BriefcaseIcon style={ico} /> },
  { href: "/portal/settings", label: "Settings", icon: <Cog6ToothIcon style={ico} /> },
];

const HOMEOWNER_TABS: Tab[] = [
  { href: "/portal/home", label: "My Home", icon: <HomeIcon style={ico} /> },
  { href: "/portal/settings", label: "Settings", icon: <Cog6ToothIcon style={ico} /> },
];

function getTabsForRole(role: string): Tab[] {
  switch (role) {
    case "affiliate":
      return AFFILIATE_TABS;
    case "contractor":
      return CONTRACTOR_TABS;
    case "homeowner":
      return HOMEOWNER_TABS;
    default:
      // admin, rei_staff, hes_assessor, inspector, field_tech
      return FIELD_TECH_TABS;
  }
}

function getRoleBadgeLabel(role: string): string {
  switch (role) {
    case "admin": return "Admin";
    case "rei_staff": return "HES Assessor";
    case "hes_assessor": return "HES Assessor";
    case "inspector": return "Inspector";
    case "field_tech": return "Field Tech";
    case "affiliate": return "Affiliate";
    case "contractor": return "Contractor";
    case "homeowner": return "Homeowner";
    default: return role;
  }
}

export default function PortalShell({
  role,
  userName,
  userEmail,
  children,
}: {
  role: string;
  userName: string;
  userEmail: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const tabs = getTabsForRole(role);
  const initial = (userName || "U").charAt(0).toUpperCase();
  const isAdmin = role === "admin";

  async function handleLogout() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="portal-root" style={{ minHeight: "100vh", background: "#020617", color: "#fff" }}>
      {/* ── Header ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#0f172a",
          borderBottom: "1px solid rgba(51,65,85,0.5)",
          padding: "0 16px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left: Logo */}
        <Link href="/portal" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <Image
            src="/images/rei-logo.png"
            alt="REI"
            width={120}
            height={34}
            style={{ objectFit: "contain", height: "auto" }}
            priority
          />
        </Link>

        {/* Right: User info + logout */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isAdmin && (
            <Link
              href="/admin"
              style={{
                fontSize: 12,
                color: "#94a3b8",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid rgba(51,65,85,0.5)",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#cbd5e1";
                e.currentTarget.style.borderColor = "#475569";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#94a3b8";
                e.currentTarget.style.borderColor = "rgba(51,65,85,0.5)";
              }}
            >
              <ArrowsRightLeftIcon style={{ width: 12, height: 12 }} />
              Admin
            </Link>
          )}

          {/* Avatar + name + role */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #059669, #10b981)",
                display: "grid",
                placeItems: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {initial}
            </div>
            <div className="portal-user-info" style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{userName}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#10b981",
                  background: "rgba(16,185,129,0.12)",
                  padding: "1px 6px",
                  borderRadius: 9999,
                  width: "fit-content",
                  marginTop: 1,
                }}
              >
                {getRoleBadgeLabel(role)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            style={{
              background: "transparent",
              border: "1px solid rgba(51,65,85,0.5)",
              borderRadius: 8,
              color: "#94a3b8",
              cursor: "pointer",
              padding: 6,
              display: "grid",
              placeItems: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#f87171";
              e.currentTarget.style.borderColor = "rgba(248,113,113,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#94a3b8";
              e.currentTarget.style.borderColor = "rgba(51,65,85,0.5)";
            }}
          >
            <ArrowRightOnRectangleIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </header>

      {/* ── Tab Bar ── */}
      <nav
        style={{
          position: "sticky",
          top: 56,
          zIndex: 40,
          background: "#0f172a",
          borderBottom: "1px solid rgba(51,65,85,0.5)",
          display: "flex",
          justifyContent: "center",
          gap: 0,
          padding: "0 16px",
          overflowX: "auto",
        }}
      >
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname?.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "12px 16px",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                color: isActive ? "#10b981" : "#94a3b8",
                borderBottom: isActive ? "2px solid #10b981" : "2px solid transparent",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = "#94a3b8";
              }}
            >
              {tab.icon}
              <span className="portal-tab-label">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Content ── */}
      <main style={{ padding: "24px 16px", maxWidth: 672, margin: "0 auto" }}>
        {children}
      </main>

      {/* ── Responsive: hide tab labels on mobile, hide user name on small screens ── */}
      <style>{`
        @media (max-width: 640px) {
          .portal-tab-label { display: none; }
          .portal-user-info { display: none !important; }
        }
      `}</style>
    </div>
  );
}
