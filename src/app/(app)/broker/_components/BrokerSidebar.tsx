// src/app/(app)/broker/_components/BrokerSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "rei_broker_sidebar_v1";

type LinkItem = { href: string; label: string; icon: string };

const MAIN_LINKS: LinkItem[] = [
  { href: "/broker/dashboard", label: "Dashboard", icon: "\u2302" },
  { href: "/broker/contacts", label: "Contacts", icon: "\u2630" },
  { href: "/broker/campaigns", label: "Campaigns", icon: "\u2709" },
  { href: "/broker/network", label: "Network", icon: "\u2B21" },
  { href: "/broker/assessments", label: "Assessments", icon: "\u2637" },
  { href: "/broker/leads", label: "Leads", icon: "\u25CE" },
  { href: "/broker/analytics", label: "Analytics", icon: "\u25D4" },
];

function NavLink({ href, label, icon, collapsed }: LinkItem & { collapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));

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

export default function BrokerSidebar() {
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

  const settingsActive = pathname?.startsWith("/broker/settings");

  // ── Collapsed ──
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
            marginBottom: 12,
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

        {/* Nav icons */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
          {MAIN_LINKS.map((l) => (
            <NavLink key={l.href} {...l} collapsed />
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Settings gear */}
        <Link
          href="/broker/settings"
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

  // ── Expanded ──
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
      {/* Header: title + collapse */}
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
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#10b981",
            letterSpacing: "-0.01em",
          }}
        >
          Broker Console
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
          Navigation
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {MAIN_LINKS.map((l) => (
            <NavLink key={l.href} {...l} collapsed={false} />
          ))}
        </nav>
      </div>

      {/* Bottom: Settings */}
      <div style={{ borderTop: "1px solid #334155", paddingTop: 12, marginTop: 12 }}>
        <Link
          href="/broker/settings"
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
