// src/app/admin/_components/AdminSidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "rei_admin_sidebar_v7";

type LinkItem = { href: string; label: string };

const OVERVIEW: LinkItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/marketplace", label: "Marketplace" },
];

const OPS: LinkItem[] = [
  { href: "/admin/team", label: "Team" },
  { href: "/admin/settings/services", label: "Service Catalog" },
  { href: "/admin/schedule", label: "Schedule" },
];

const BROKER_PLATFORM: LinkItem[] = [
  { href: "/admin/broker-platform", label: "Broker Dashboard" },
  { href: "/admin/brokers", label: "Brokers" },
];

const SYSTEM: LinkItem[] = [
  { href: "/admin/refunds", label: "Refunds" },
  { href: "/admin/auth-logs", label: "Auth Logs" },
];

const DASHBOARDS: LinkItem[] = [
  { href: "/contractor/job-board", label: "Contractor" },
  { href: "/broker/dashboard", label: "Broker" },
  { href: "/homeowner/dashboard", label: "Homeowner" },
  { href: "/affiliate/dashboard", label: "Affiliate" },
];

function NavLink({ href, label }: LinkItem) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/admin" && href !== "/" && pathname?.startsWith(href));

  return (
    <Link
      href={href}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        textDecoration: "none",
        fontWeight: 600,
        fontSize: 13,
        transition: "all 0.15s ease",
        color: isActive ? "#f1f5f9" : "#94a3b8",
        background: isActive ? "rgba(16,185,129,0.12)" : "transparent",
        border: isActive ? "1px solid rgba(16,185,129,0.25)" : "1px solid transparent",
        display: "block",
      }}
      onMouseEnter={(e) => {
        if (isActive) return;
        e.currentTarget.style.background = "rgba(148,163,184,0.08)";
        e.currentTarget.style.color = "#cbd5e1";
      }}
      onMouseLeave={(e) => {
        if (isActive) return;
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "#94a3b8";
      }}
    >
      {label}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        color: "#64748b",
        fontWeight: 700,
        marginBottom: 6,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ margin: "12px 0 10px", height: 1, background: "#334155" }} />;
}

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.collapsed === "boolean") setCollapsed(parsed.collapsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ collapsed }));
    } catch {}
  }, [collapsed]);

  const settingsActive = pathname?.startsWith("/admin/settings");

  // ── Collapsed: thin rail with just expand button ──
  if (collapsed) {
    return (
      <aside
        style={{
          width: 44,
          minWidth: 44,
          borderRight: "1px solid #334155",
          background: "#1e293b",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 14,
          transition: "width 0.15s ease",
        }}
      >
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            border: "1px solid #334155",
            background: "transparent",
            color: "#94a3b8",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            fontSize: 14,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(148,163,184,0.08)";
            e.currentTarget.style.color = "#cbd5e1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#94a3b8";
          }}
        >
          {"\u276F"}
        </button>
      </aside>
    );
  }

  // ── Expanded sidebar ──
  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        borderRight: "1px solid #334155",
        padding: 14,
        background: "#1e293b",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "width 0.15s ease",
      }}
    >
      {/* Header: logo + collapse button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          paddingBottom: 14,
          marginBottom: 14,
          borderBottom: "1px solid #334155",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Image
            src="/images/rei-logo.png"
            alt="REI"
            width={200}
            height={56}
            style={{ objectFit: "contain", maxWidth: "100%", height: "auto" }}
            priority
          />
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            border: "1px solid #334155",
            background: "transparent",
            color: "#94a3b8",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            fontSize: 14,
            transition: "all 0.15s ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(148,163,184,0.08)";
            e.currentTarget.style.borderColor = "#475569";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "#334155";
          }}
        >
          {"\u276E"}
        </button>
      </div>

      {/* Nav links */}
      <div style={{ flex: 1, overflow: "auto", paddingRight: 2 }}>
        <SectionLabel>Overview</SectionLabel>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {OVERVIEW.map((l) => <NavLink key={l.href} {...l} />)}
        </nav>

        <Divider />
        <SectionLabel>In-House Ops</SectionLabel>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {OPS.map((l) => <NavLink key={l.href} {...l} />)}
        </nav>

        <Divider />
        <SectionLabel>Broker Platform</SectionLabel>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {BROKER_PLATFORM.map((l) => <NavLink key={l.href} {...l} />)}
        </nav>

        <Divider />
        <SectionLabel>System</SectionLabel>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {SYSTEM.map((l) => <NavLink key={l.href} {...l} />)}
        </nav>

        <Divider />
        <SectionLabel>Dashboards</SectionLabel>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {DASHBOARDS.map((l) => <NavLink key={l.href} {...l} />)}
        </nav>
      </div>

      {/* Bottom: Settings */}
      <div style={{ borderTop: "1px solid #334155", paddingTop: 12, marginTop: 12 }}>
        <Link
          href="/admin/settings"
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 13,
            transition: "all 0.15s ease",
            color: settingsActive ? "#f1f5f9" : "#94a3b8",
            background: settingsActive ? "rgba(16,185,129,0.12)" : "transparent",
            border: settingsActive ? "1px solid rgba(16,185,129,0.25)" : "1px solid transparent",
            display: "block",
          }}
          onMouseEnter={(e) => {
            if (settingsActive) return;
            e.currentTarget.style.background = "rgba(148,163,184,0.08)";
            e.currentTarget.style.color = "#cbd5e1";
          }}
          onMouseLeave={(e) => {
            if (settingsActive) return;
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#94a3b8";
          }}
        >
          Settings
        </Link>
      </div>
    </aside>
  );
}
