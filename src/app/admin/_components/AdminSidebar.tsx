// src/app/admin/_components/AdminSidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const GREEN = "#43a419";
const STORAGE_KEY = "rei_admin_sidebar_prefs_v4";

type LinkItem = { href: string; label: string; group: "admin" | "dash" };

const ALL_ADMIN_LINKS: LinkItem[] = [
  { href: "/admin", label: "Home", group: "admin" },
  { href: "/admin/intake", label: "Admin Intake", group: "admin" },
  { href: "/admin/jobs", label: "Projects", group: "admin" },
  { href: "/admin/contractor-leads", label: "Job Board", group: "admin" },
  { href: "/admin/upgrade-catalog", label: "Upgrade Catalog", group: "admin" },
  { href: "/admin/incentives", label: "Rebates & Incentives", group: "admin" },
  { href: "/admin/schedule", label: "Inspection Scheduler", group: "admin" },

  // Settings
  { href: "/admin/settings", label: "Settings", group: "admin" },
  { href: "/admin/settings/users", label: "— Users (All)", group: "admin" },
];

const ALL_DASHBOARD_LINKS: LinkItem[] = [
  // NOTE: keep these as-is for now to avoid breaking existing temp shortcuts.
  // If/when you move dashboards to /app/*, update these hrefs too.
  { href: "/contractor/job-board", label: "Contractor Dashboard", group: "dash" },
  { href: "/broker/dashboard", label: "Broker Dashboard", group: "dash" },
  { href: "/homeowner/dashboard", label: "Homeowner Dashboard", group: "dash" },
  { href: "/affiliate/dashboard", label: "Affiliate Dashboard", group: "dash" },
];

const ALL_LINKS: LinkItem[] = [...ALL_ADMIN_LINKS, ...ALL_DASHBOARD_LINKS];

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));

  return (
    <Link
      href={href}
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        textDecoration: "none",
        fontWeight: 800,
        transition: "all 0.15s ease",
        color: isActive ? GREEN : "#111827",
        background: isActive ? "rgba(67,164,25,0.12)" : "transparent",
        border: isActive ? "1px solid rgba(67,164,25,0.35)" : "1px solid transparent",
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
      {label}
    </Link>
  );
}

function KebabButton({
  open,
  onToggle,
  btnRef,
}: {
  open: boolean;
  onToggle: () => void;
  btnRef: React.RefObject<HTMLButtonElement>;
}) {
  return (
    <button
      ref={btnRef}
      type="button"
      aria-label="Sidebar settings"
      onClick={onToggle}
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        border: open ? "1px solid rgba(67,164,25,0.35)" : "1px solid #e5e7eb",
        background: open ? "rgba(67,164,25,0.10)" : "white",
        color: open ? GREEN : "#111827",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        transition: "all 0.15s ease",
        boxShadow: open ? "0 8px 20px rgba(0,0,0,0.10)" : "none",
      }}
      onMouseEnter={(e) => {
        if (open) return;
        e.currentTarget.style.background = "rgba(67,164,25,0.08)";
        e.currentTarget.style.border = "1px solid rgba(67,164,25,0.25)";
        e.currentTarget.style.color = GREEN;
      }}
      onMouseLeave={(e) => {
        if (open) return;
        e.currentTarget.style.background = "white";
        e.currentTarget.style.border = "1px solid #e5e7eb";
        e.currentTarget.style.color = "#111827";
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>⋮</span>
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 900, margin: "10px 0 6px" }}>
      {children}
    </div>
  );
}

function TogglePill({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      style={{
        width: 54,
        height: 30,
        borderRadius: 999,
        border: checked ? "1px solid rgba(67,164,25,0.35)" : "1px solid #e5e7eb",
        background: checked ? "rgba(67,164,25,0.14)" : "#f8fafc",
        position: "relative",
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 26 : 3,
          width: 24,
          height: 24,
          borderRadius: 999,
          background: checked ? GREEN : "white",
          border: checked ? "1px solid rgba(0,0,0,0.06)" : "1px solid #e5e7eb",
          boxShadow: "0 4px 10px rgba(0,0,0,0.10)",
          transition: "all 0.15s ease",
        }}
      />
    </button>
  );
}

function CheckboxRow({
  label,
  rightTag,
  checked,
  onToggle,
}: {
  label: string;
  rightTag?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 12,
        border: "1px solid #f1f5f9",
        cursor: "pointer",
        userSelect: "none",
        background: checked ? "rgba(67,164,25,0.06)" : "white",
      }}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} style={{ accentColor: GREEN }} />
      <span style={{ fontSize: 13, fontWeight: 900, color: "#111827" }}>{label}</span>
      {rightTag ? (
        <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.55, fontWeight: 900 }}>
          {rightTag}
        </span>
      ) : null}
    </label>
  );
}

export default function AdminSidebar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"minimal" | "normal">("minimal");

  const [visibleHrefs, setVisibleHrefs] = useState<Set<string>>(() => new Set(ALL_LINKS.map((l) => l.href)));

  const [minimalMode, setMinimalMode] = useState(false);
  const [minimalHrefs, setMinimalHrefs] = useState<Set<string>>(() => {
    // Updated minimal defaults to avoid any deleted settings pages
    return new Set([
      "/admin",
      "/admin/jobs",
      "/admin/contractor-leads",
      "/admin/settings/users",
      "/contractor/job-board",
    ]);
  });

  const kebabBtnRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popPos, setPopPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed) return;

      if (typeof parsed.minimalMode === "boolean") setMinimalMode(parsed.minimalMode);

      if (Array.isArray(parsed.visibleHrefs)) {
        const v = new Set<string>();
        for (const h of parsed.visibleHrefs) if (typeof h === "string") v.add(h);
        if (v.size > 0) setVisibleHrefs(v);
      }

      if (Array.isArray(parsed.minimalHrefs)) {
        const m = new Set<string>();
        for (const h of parsed.minimalHrefs) if (typeof h === "string") m.add(h);
        if (m.size > 0) setMinimalHrefs(m);
      }

      if (parsed.activeTab === "minimal" || parsed.activeTab === "normal") setActiveTab(parsed.activeTab);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          minimalMode,
          visibleHrefs: Array.from(visibleHrefs),
          minimalHrefs: Array.from(minimalHrefs),
          activeTab,
        })
      );
    } catch {}
  }, [minimalMode, visibleHrefs, minimalHrefs, activeTab]);

  function toggleInSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, href: string) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      if (next.size === 0) return new Set(prev);
      return next;
    });
  }

  function showAllNormal() {
    setVisibleHrefs(new Set(ALL_LINKS.map((l) => l.href)));
  }

  function resetMinimalToDefault() {
    setMinimalHrefs(
      new Set([
        "/admin",
        "/admin/jobs",
        "/admin/contractor-leads",
        "/admin/settings/users",
        "/contractor/job-board",
      ])
    );
  }

  const activeSet = minimalMode ? minimalHrefs : visibleHrefs;

  const adminLinks = useMemo(() => ALL_ADMIN_LINKS.filter((l) => activeSet.has(l.href)), [activeSet]);
  const dashboardLinks = useMemo(() => ALL_DASHBOARD_LINKS.filter((l) => activeSet.has(l.href)), [activeSet]);

  function recomputePopoverPosition() {
    const btn = kebabBtnRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const popW = 320;
    const margin = 12;

    let left = rect.right + 10;
    if (left + popW > window.innerWidth - margin) {
      left = rect.left - popW - 10;
    }
    left = Math.max(margin, Math.min(left, window.innerWidth - popW - margin));

    let top = rect.top;
    const maxTop = window.innerHeight - margin;
    top = Math.max(margin, Math.min(top, maxTop));

    setPopPos({ top, left });
  }

  function toggleMenu() {
    setMenuOpen((v) => {
      const next = !v;
      if (!v && next) {
        setTimeout(() => recomputePopoverPosition(), 0);
      }
      return next;
    });
  }

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!menuOpen) return;
      const pop = popoverRef.current;
      const btn = kebabBtnRef.current;
      if (!pop || !btn) return;
      if (e.target instanceof Node && !pop.contains(e.target) && !btn.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (!menuOpen) return;
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onResize = () => recomputePopoverPosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    if (!popPos) return;
    const pop = popoverRef.current;
    if (!pop) return;

    const margin = 12;
    const h = pop.getBoundingClientRect().height;
    let top = popPos.top;
    if (top + h > window.innerHeight - margin) top = window.innerHeight - margin - h;
    top = Math.max(margin, top);
    if (top !== popPos.top) setPopPos({ top, left: popPos.left });
  }, [menuOpen, popPos]);

  return (
    <aside
      style={{
        width: 270,
        borderRight: "1px solid #e5e7eb",
        padding: 16,
        background: "white",
        position: "relative",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <Image
            src="/brand/rei-logo.png"
            alt="Renewable Energy Incentives"
            width={210}
            height={60}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        <KebabButton open={menuOpen} onToggle={toggleMenu} btnRef={kebabBtnRef} />
      </div>

      {minimalMode && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(67,164,25,0.25)",
            background: "rgba(67,164,25,0.08)",
            color: GREEN,
            fontWeight: 950,
            fontSize: 12,
            width: "fit-content",
            marginBottom: 12,
          }}
        >
          Minimal mode
        </div>
      )}

      {/* Nav scroll area */}
      <div style={{ flex: 1, overflow: "auto", paddingRight: 2 }}>
        <div style={{ fontSize: 12, opacity: 0.55, marginBottom: 10 }}>ADMIN NAVIGATION</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {adminLinks.map((l) => (
            <NavLink key={l.href} href={l.href} label={l.label} />
          ))}
        </nav>

        <div style={{ margin: "20px 0 10px", height: 1, background: "#e5e7eb" }} />

        <div style={{ fontSize: 12, opacity: 0.55, marginBottom: 10 }}>DASHBOARDS (TEMP)</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {dashboardLinks.map((l) => (
            <NavLink key={l.href} href={l.href} label={l.label} />
          ))}
        </nav>

        <div style={{ marginTop: 18, fontSize: 12, opacity: 0.55 }}>
          Tip: Dashboards are temporary shortcuts during buildout.
        </div>
      </div>

      {/* FIXED popover */}
      {menuOpen && popPos && (
        <div
          ref={popoverRef}
          style={{
            position: "fixed",
            top: popPos.top,
            left: popPos.left,
            width: 320,
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            background: "white",
            boxShadow: "0 22px 50px rgba(0,0,0,0.18)",
            padding: 12,
            zIndex: 9999,
            maxHeight: "calc(100vh - 24px)",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 950, color: "#111827" }}>Sidebar settings</div>
              <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>Choose what appears in the left nav.</div>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "white",
                cursor: "pointer",
                fontWeight: 900,
              }}
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "10px 10px",
              borderRadius: 14,
              border: "1px solid #f1f5f9",
              background: "white",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 950, color: "#111827" }}>Minimal mode</div>
              <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>
                When enabled, sidebar shows only your Minimal Set.
              </div>
            </div>
            <TogglePill checked={minimalMode} onChange={setMinimalMode} />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setActiveTab("minimal")}
              style={{
                flex: 1,
                padding: "9px 10px",
                borderRadius: 12,
                border: activeTab === "minimal" ? "1px solid rgba(67,164,25,0.35)" : "1px solid #e5e7eb",
                background: activeTab === "minimal" ? "rgba(67,164,25,0.10)" : "white",
                color: activeTab === "minimal" ? GREEN : "#111827",
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              Minimal Set
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("normal")}
              style={{
                flex: 1,
                padding: "9px 10px",
                borderRadius: 12,
                border: activeTab === "normal" ? "1px solid rgba(67,164,25,0.35)" : "1px solid #e5e7eb",
                background: activeTab === "normal" ? "rgba(67,164,25,0.10)" : "white",
                color: activeTab === "normal" ? GREEN : "#111827",
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              Normal Set
            </button>
          </div>

          <div style={{ marginTop: 10, overflow: "auto", maxHeight: "calc(100vh - 260px)", paddingRight: 4 }}>
            {activeTab === "minimal" ? (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={resetMinimalToDefault}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid rgba(67,164,25,0.25)",
                      background: "rgba(67,164,25,0.08)",
                      color: GREEN,
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    Reset minimal
                  </button>
                </div>

                <SectionTitle>Admin nav</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {ALL_ADMIN_LINKS.map((l) => (
                    <CheckboxRow
                      key={`min-${l.href}`}
                      label={l.label}
                      rightTag="ADMIN"
                      checked={minimalHrefs.has(l.href)}
                      onToggle={() => toggleInSet(setMinimalHrefs, l.href)}
                    />
                  ))}
                </div>

                <SectionTitle>Dashboards</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {ALL_DASHBOARD_LINKS.map((l) => (
                    <CheckboxRow
                      key={`min-${l.href}`}
                      label={l.label}
                      rightTag="DASH"
                      checked={minimalHrefs.has(l.href)}
                      onToggle={() => toggleInSet(setMinimalHrefs, l.href)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={showAllNormal}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      background: "white",
                      fontWeight: 950,
                      cursor: "pointer",
                    }}
                  >
                    Show all
                  </button>
                </div>

                <SectionTitle>All items</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {ALL_LINKS.map((l) => (
                    <CheckboxRow
                      key={`vis-${l.href}`}
                      label={l.label}
                      rightTag={l.group === "admin" ? "ADMIN" : "DASH"}
                      checked={visibleHrefs.has(l.href)}
                      onToggle={() => toggleInSet(setVisibleHrefs, l.href)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
