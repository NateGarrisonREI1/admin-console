// src/app/(app)/broker/_components/BrokerSidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Bars3Icon, XMarkIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useIsMobile } from "@/lib/useMediaQuery";

const STORAGE_KEY = "rei_broker_sidebar_v3";

type LinkItem = { href: string; label: string };

const OVERVIEW: LinkItem[] = [
  { href: "/broker/dashboard", label: "Dashboard" },
  { href: "/broker/schedule", label: "Schedule" },
];

const PROJECTS: LinkItem[] = [
  { href: "/broker/projects", label: "My Projects" },
];

const MARKETPLACE: LinkItem[] = [
  { href: "/broker/leads", label: "Marketplace" },
];

const NETWORK: LinkItem[] = [
  { href: "/broker/team", label: "My Team" },
];

const TOOLS: LinkItem[] = [
  { href: "/broker/campaigns", label: "Campaigns" },
  { href: "/broker/contacts", label: "Contacts" },
];

function NavLink({ href, label, onClick }: LinkItem & { onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onClick}
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

// ─── Sidebar content (shared between desktop and mobile drawer) ──────

function SidebarContent({
  brokerName,
  brokerEmail,
  onNavClick,
}: {
  brokerName?: string;
  brokerEmail?: string;
  onNavClick?: () => void;
}) {
  const pathname = usePathname();
  const settingsActive = pathname?.startsWith("/broker/settings");

  return (
    <>
      {/* Broker identity */}
      {brokerName && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.3 }}>
            {brokerName}
          </div>
          {brokerEmail && (
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {brokerEmail}
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflow: "auto", paddingRight: 2 }}>
        <SectionLabel>Overview</SectionLabel>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {OVERVIEW.map((l) => <NavLink key={l.href} {...l} onClick={onNavClick} />)}
        </nav>

        <Divider />
        <SectionLabel>Projects</SectionLabel>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {PROJECTS.map((l) => <NavLink key={l.href} {...l} onClick={onNavClick} />)}
        </nav>

        <Divider />
        <SectionLabel>Marketplace</SectionLabel>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {MARKETPLACE.map((l) => <NavLink key={l.href} {...l} onClick={onNavClick} />)}
        </nav>

        <Divider />
        <SectionLabel>Network</SectionLabel>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NETWORK.map((l) => <NavLink key={l.href} {...l} onClick={onNavClick} />)}
        </nav>

        <Divider />
        <SectionLabel>Tools</SectionLabel>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {TOOLS.map((l) => <NavLink key={l.href} {...l} onClick={onNavClick} />)}
        </nav>
      </div>

      {/* Bottom: Settings + New Request CTA */}
      <div style={{ borderTop: "1px solid #334155", paddingTop: 12, marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <Link
          href="/broker/settings"
          onClick={onNavClick}
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

        <Link
          href="/broker/request"
          onClick={onNavClick}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "10px 12px",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 13,
            color: "#fff",
            background: "#10b981",
            border: "1px solid rgba(16,185,129,0.5)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#059669";
            e.currentTarget.style.boxShadow = "0 0 12px rgba(16,185,129,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#10b981";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <PlusIcon style={{ width: 16, height: 16 }} />
          New Request
        </Link>
      </div>
    </>
  );
}

// ─── Main component ─────────────────────────────────────────────────

export default function BrokerSidebar({
  brokerName,
  brokerEmail,
}: {
  brokerName?: string;
  brokerEmail?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  // Load desktop collapsed preference
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.collapsed === "boolean") setCollapsed(parsed.collapsed);
      }
    } catch {}
  }, []);

  // Persist desktop collapsed preference
  useEffect(() => {
    if (!isMobile) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ collapsed }));
      } catch {}
    }
  }, [collapsed, isMobile]);

  // Close mobile drawer on navigation
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      setMobileOpen(false);
      prevPathname.current = pathname;
    }
  }, [pathname]);

  // ── Mobile: hamburger + slide-in drawer ──
  if (isMobile) {
    return (
      <>
        {/* Hamburger button */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          style={{
            position: "fixed",
            top: 10,
            left: 14,
            zIndex: 11,
            width: 36,
            height: 36,
            borderRadius: 8,
            border: "1px solid #334155",
            background: "rgba(30,41,59,0.9)",
            color: "#94a3b8",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Bars3Icon style={{ width: 20, height: 20 }} />
        </button>

        {/* Backdrop */}
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 44,
            background: "rgba(0,0,0,0.5)",
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? "auto" : "none",
            transition: "opacity 200ms ease",
          }}
        />

        {/* Drawer */}
        <aside
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            height: "100%",
            width: 260,
            zIndex: 45,
            background: "#1e293b",
            borderRight: "1px solid #334155",
            padding: 14,
            display: "flex",
            flexDirection: "column",
            transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 250ms ease",
            overflow: "hidden",
          }}
        >
          {/* Drawer header */}
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
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
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
                flexShrink: 0,
              }}
            >
              <XMarkIcon style={{ width: 18, height: 18 }} />
            </button>
          </div>

          <SidebarContent brokerName={brokerName} brokerEmail={brokerEmail} onNavClick={() => setMobileOpen(false)} />
        </aside>
      </>
    );
  }

  // ── Desktop: collapsed rail ──
  if (collapsed) {
    return (
      <aside
        style={{
          width: 44,
          minWidth: 44,
          flexShrink: 0,
          borderRight: "1px solid #334155",
          background: "#1e293b",
          height: "100vh",
          position: "sticky",
          top: 0,
          overflowY: "auto",
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 14,
          gap: 8,
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
        {/* Collapsed CTA */}
        <Link
          href="/broker/request"
          title="New Request"
          style={{
            position: "absolute",
            bottom: 14,
            width: 30,
            height: 30,
            borderRadius: 8,
            background: "#10b981",
            display: "grid",
            placeItems: "center",
            textDecoration: "none",
          }}
        >
          <PlusIcon style={{ width: 16, height: 16, color: "#fff" }} />
        </Link>
      </aside>
    );
  }

  // ── Desktop: expanded sidebar ──
  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        flexShrink: 0,
        borderRight: "1px solid #334155",
        padding: 14,
        background: "#1e293b",
        height: "100vh",
        position: "sticky",
        top: 0,
        overflowY: "auto",
        zIndex: 40,
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

      <SidebarContent brokerName={brokerName} brokerEmail={brokerEmail} />
    </aside>
  );
}
