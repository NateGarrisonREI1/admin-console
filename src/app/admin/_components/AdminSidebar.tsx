// src/app/admin/_components/AdminSidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "rei_admin_sidebar_v6";

type LinkItem = { href: string; label: string; icon: string };

const OVERVIEW: LinkItem[] = [
  { href: "/admin", label: "Dashboard", icon: "\u2302" },
];

const OPS: LinkItem[] = [
  { href: "/admin/team", label: "REI Team", icon: "\u2637" },
  { href: "/admin/settings/services", label: "Service Catalog", icon: "\u25C9" },
  { href: "/admin/settings/lead-pricing", label: "Lead Pricing", icon: "\u25CE" },
  { href: "/admin/direct-leads", label: "Direct Leads", icon: "\u2794" },
  { href: "/admin/jobs", label: "Projects", icon: "\u25A3" },
];

const BROKER_PLATFORM: LinkItem[] = [
  { href: "/admin/broker-platform", label: "Broker Dashboard", icon: "\u25C8" },
  { href: "/admin/brokers", label: "Brokers", icon: "\u2B21" },
  { href: "/admin/partners", label: "Partner Network", icon: "\u2696" },
];

const SYSTEM: LinkItem[] = [
  { href: "/admin/intake", label: "Admin Intake", icon: "\u2630" },
  { href: "/admin/refunds", label: "Refunds", icon: "\u21A9" },
  { href: "/admin/auth-logs", label: "Auth Logs", icon: "\u2263" },
];

const DASHBOARDS: LinkItem[] = [
  { href: "/contractor/job-board", label: "Contractor", icon: "\u2692" },
  { href: "/broker/dashboard", label: "Broker", icon: "\u2709" },
  { href: "/homeowner/dashboard", label: "Homeowner", icon: "\u2302" },
  { href: "/affiliate/dashboard", label: "Affiliate", icon: "\u2734" },
];

function NavLink({ href, label, icon, collapsed }: LinkItem & { collapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/admin" && href !== "/" && pathname?.startsWith(href));

  if (collapsed) {
    return (
      <Link
        href={href}
        title={label}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          textDecoration: "none",
          fontSize: 16,
          lineHeight: 1,
          transition: "all 0.15s ease",
          color: isActive ? "#f1f5f9" : "#94a3b8",
          background: isActive ? "rgba(16,185,129,0.12)" : "transparent",
          border: isActive ? "1px solid rgba(16,185,129,0.25)" : "1px solid transparent",
          display: "grid",
          placeItems: "center",
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
        {icon}
      </Link>
    );
  }

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

function CollapsedDivider() {
  return <div style={{ width: 24, height: 1, background: "#334155", margin: "6px 0" }} />;
}

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Load collapsed state from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.collapsed === "boolean") setCollapsed(parsed.collapsed);
      }
    } catch {}
  }, []);

  // Persist collapsed state
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ collapsed }));
    } catch {}
  }, [collapsed]);

  const settingsActive = pathname?.startsWith("/admin/settings");

  // ── Collapsed: 60px with icons ──
  if (collapsed) {
    return (
      <aside
        style={{
          width: 60,
          minWidth: 60,
          borderRight: "1px solid #334155",
          background: "#1e293b",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "14px 0",
          transition: "width 0.15s ease",
        }}
      >
        {/* Expand button */}
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: "1px solid #334155",
            background: "transparent",
            color: "#94a3b8",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            fontSize: 14,
            transition: "all 0.15s ease",
            marginBottom: 8,
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

        {/* Nav icons by section */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center", flex: 1, overflow: "auto" }}>
          {OVERVIEW.map((l) => <NavLink key={l.href} {...l} collapsed />)}
          <CollapsedDivider />
          {OPS.map((l) => <NavLink key={l.href} {...l} collapsed />)}
          <CollapsedDivider />
          {BROKER_PLATFORM.map((l) => <NavLink key={l.href} {...l} collapsed />)}
          <CollapsedDivider />
          {SYSTEM.map((l) => <NavLink key={l.href} {...l} collapsed />)}
          <CollapsedDivider />
          {DASHBOARDS.map((l) => <NavLink key={l.href} {...l} collapsed />)}
        </nav>

        {/* Settings gear */}
        <Link
          href="/admin/settings"
          title="Settings"
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: settingsActive ? "1px solid rgba(16,185,129,0.25)" : "1px solid transparent",
            background: settingsActive ? "rgba(16,185,129,0.12)" : "transparent",
            color: settingsActive ? "#f1f5f9" : "#94a3b8",
            display: "grid",
            placeItems: "center",
            fontSize: 16,
            textDecoration: "none",
            transition: "all 0.15s ease",
            marginTop: 8,
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
          {"\u2699"}
        </Link>
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
          {OVERVIEW.map((l) => <NavLink key={l.href} {...l} collapsed={false} />)}
        </nav>

        <Divider />
        <SectionLabel>In-House Ops</SectionLabel>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {OPS.map((l) => <NavLink key={l.href} {...l} collapsed={false} />)}
        </nav>

        <Divider />
        <SectionLabel>Broker Platform</SectionLabel>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {BROKER_PLATFORM.map((l) => <NavLink key={l.href} {...l} collapsed={false} />)}
        </nav>

        <Divider />
        <SectionLabel>System</SectionLabel>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {SYSTEM.map((l) => <NavLink key={l.href} {...l} collapsed={false} />)}
        </nav>

        <Divider />
        <SectionLabel>Dashboards</SectionLabel>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {DASHBOARDS.map((l) => <NavLink key={l.href} {...l} collapsed={false} />)}
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
            display: "flex",
            alignItems: "center",
            gap: 8,
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
          <span style={{ fontSize: 16 }}>{"\u2699"}</span>
          Settings
        </Link>
      </div>
    </aside>
  );
}
