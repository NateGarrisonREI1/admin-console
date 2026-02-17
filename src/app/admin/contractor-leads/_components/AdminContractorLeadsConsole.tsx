// src/app/admin/contractor-leads/_components/AdminContractorLeadsConsole.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";

import { updateLeadAction, removeLeadAction } from "../actions";

type LeadRow = {
  id: string;
  admin_job_id?: string | null;

  title: string | null;
  summary?: string | null;

  location: string | null;
  status: string | null;

  price_cents: number | null;
  created_at: string | null;
  expires_at: string | null;

  system_catalog_id?: string | null;
  is_assigned_only?: boolean | null;
  assigned_contractor_profile_id?: string | null;

  sold_at: string | null;
  sold_to_user_id: string | null;

  removed_at: string | null;
  removed_reason: string | null;
};

type Opt = { id: string; name: string };

function dollarsToCents(input: string) {
  const s = input.trim();
  if (!s) return null;
  const v = Number(s);
  if (!Number.isFinite(v)) return null;
  return Math.round(v * 100);
}

function centsToDollars(cents?: number | null) {
  if (typeof cents !== "number") return "";
  return (cents / 100).toFixed(2);
}

function isoToLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function AdminContractorLeadsConsole(props: {
  tab: "open" | "purchased";
  page: number;
  pageSize: number;
  totalCount: number;
  leads: LeadRow[];
  contractors?: Opt[];
  systems?: Opt[];
}) {
  const { tab, page, pageSize, totalCount, leads } = props;

  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // kebab open row id
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // right drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeLead, setActiveLead] = useState<LeadRow | null>(null);

  // dropdown options come from server props (Option A)
  const contractorOptions = useMemo(() => props.contractors ?? [], [props.contractors]);
  const systemOptions = useMemo(() => props.systems ?? [], [props.systems]);

  // drawer fields
  const [priceDollars, setPriceDollars] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [systemId, setSystemId] = useState<string>("");
  const [assignedContractorId, setAssignedContractorId] = useState<string>("");
  const [assignedOnly, setAssignedOnly] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("");
  const [summary, setSummary] = useState<string>("");

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize));

  function tabHref(nextTab: "open" | "purchased") {
    const sp = new URLSearchParams();
    sp.set("tab", nextTab);
    sp.set("page", "1");
    return `/admin/contractor-leads?${sp.toString()}`;
  }

  function pageHref(nextPage: number) {
    const sp = new URLSearchParams();
    sp.set("tab", tab);
    sp.set("page", String(nextPage));
    return `/admin/contractor-leads?${sp.toString()}`;
  }

  // close kebab on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!openMenuId) return;
      const el = menuRefs.current[openMenuId];
      if (el && !el.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openMenuId]);

  // escape closes menu/drawer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuId(null);
        if (!isPending) setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPending]);

  function openDrawer(lead: LeadRow) {
    setActiveLead(lead);

    setPriceDollars(centsToDollars(lead.price_cents));
    setExpiresAt(isoToLocalInput(lead.expires_at));
    setSystemId(lead.system_catalog_id ?? "");
    setAssignedContractorId(lead.assigned_contractor_profile_id ?? "");
    setAssignedOnly(Boolean(lead.is_assigned_only));
    setTitle(lead.title ?? "");
    setSummary(lead.summary ?? "");

    setDrawerOpen(true);
    setOpenMenuId(null);
  }

  async function saveLead() {
    if (!activeLead?.id) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("lead_id", activeLead.id);

        const cents = dollarsToCents(priceDollars);
        if (cents != null) fd.set("price_cents", String(cents));

        // datetime-local -> server action should convert to ISO (same pattern as jobs)
        if (expiresAt) fd.set("expires_at", expiresAt);
        else fd.set("expires_at", "");

        fd.set("system_catalog_id", systemId || "");
        fd.set("assigned_contractor_profile_id", assignedContractorId || "");
        fd.set("is_assigned_only", assignedOnly ? "on" : "");

        fd.set("title", title.trim());
        fd.set("summary", summary.trim());

        await updateLeadAction(fd);

        setDrawerOpen(false);
        router.refresh();
      } catch (e: any) {
        console.error(e);
        alert(e?.message ?? "Failed to update lead.");
      }
    });
  }

  async function removeLead(lead: LeadRow) {
    const ok = confirm("Remove this lead? It will disappear from the contractor job board.");
    if (!ok) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("lead_id", lead.id);
        await removeLeadAction(fd);

        setDrawerOpen(false);
        setOpenMenuId(null);
        router.refresh();
      } catch (e: any) {
        console.error(e);
        alert(e?.message ?? "Failed to remove lead.");
      }
    });
  }

  const showingFrom = Math.min((page - 1) * pageSize + 1, totalCount || 0);
  const showingTo = Math.min(page * pageSize, totalCount || 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: -0.3 }}>Job Board</div>
        <div style={{ opacity: 0.7, marginTop: 4 }}>
          Admin view of contractor leads (open + purchased).
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10 }}>
        <Tab href={tabHref("open")} active={tab === "open"} label="Open leads" />
        <Tab href={tabHref("purchased")} active={tab === "purchased"} label="Purchased" />
        <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.7, alignSelf: "center" }}>
          {totalCount} total • page {page} / {totalPages}
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          background: "white",
          borderRadius: 16,
          overflow: "visible",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr 120px 120px 160px 52px",
            gap: 12,
            padding: "10px 12px",
            fontSize: 12,
            fontWeight: 900,
            opacity: 0.7,
            borderBottom: "1px solid #eef2f7",
            background: "#fbfbfc",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          <div>Title</div>
          <div>Location</div>
          <div>Status</div>
          <div>Price</div>
          <div>{tab === "open" ? "Posted" : "Purchased"}</div>
          <div />
        </div>

        {leads.length === 0 ? (
          <div style={{ padding: 14, opacity: 0.7, fontSize: 13 }}>No leads in this view.</div>
        ) : (
          leads.map((l) => (
            <div
              key={l.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 1fr 120px 120px 160px 52px",
                gap: 12,
                padding: "12px 12px",
                borderBottom: "1px solid #f1f5f9",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 10 }}>
                <Link
                  href={`/admin/contractor-leads/${l.id}`}
                  style={{ color: "#111827", textDecoration: "none" }}
                >
                  {l.title || "(Untitled lead)"}
                </Link>

                {l.is_assigned_only ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      padding: "3px 8px",
                      borderRadius: 999,
                      border: "1px solid #e5e7eb",
                      background: "#f8fafc",
                      color: "#334155",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Assigned
                  </span>
                ) : null}

                {l.expires_at ? (
                  <span style={{ fontSize: 11, opacity: 0.7, whiteSpace: "nowrap" }}>
                    exp {fmtDate(l.expires_at)}
                  </span>
                ) : null}
              </div>

              <div style={{ fontSize: 13, opacity: 0.85 }}>{l.location || "—"}</div>
              <div>
                <Pill value={l.status || "—"} />
              </div>
              <div style={{ fontSize: 13 }}>
                {typeof l.price_cents === "number" ? `$${(l.price_cents / 100).toFixed(0)}` : "—"}
              </div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>
                {tab === "open" ? fmtDate(l.created_at) : fmtDate(l.sold_at)}
              </div>

              {/* Kebab */}
              <div
                style={{ position: "relative" }}
                ref={(el) => {
                  // IMPORTANT: callback ref must return void (fixes TS2322)
                  menuRefs.current[l.id] = el;
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenMenuId((cur) => (cur === l.id ? null : l.id))}
                  style={{
                    height: 36,
                    width: 36,
                    borderRadius: 999,
                    border: "1px solid #e5e7eb",
                    background: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                  aria-label="Lead actions"
                >
                  ⋯
                </button>

                {openMenuId === l.id ? (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 42,
                      width: 260,
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.98)",
                      boxShadow: "0 28px 70px rgba(0,0,0,0.18)",
                      border: "1px solid rgba(15,23,42,0.10)",
                      overflow: "hidden",
                      zIndex: 999,
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => openDrawer(l)}
                      style={menuItemStyle}
                    >
                      <span style={{ fontSize: 14 }}>✏️</span>
                      <span style={{ fontWeight: 900 }}>Edit Lead…</span>
                    </button>

                    <div style={{ height: 1, background: "rgba(15,23,42,0.06)" }} />

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => removeLead(l)}
                      style={{ ...menuItemStyle, color: "#b91c1c" }}
                    >
                      <span style={{ fontSize: 14 }}>🗑️</span>
                      <span style={{ fontWeight: 900 }}>Remove Lead</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <LinkButton href={pageHref(Math.max(1, page - 1))} disabled={page <= 1}>
          ← Prev
        </LinkButton>

        <div style={{ fontSize: 12, opacity: 0.7 }}>
          {totalCount ? (
            <>
              Showing {showingFrom}-{showingTo} of {totalCount}
            </>
          ) : (
            <>Showing 0</>
          )}
        </div>

        <LinkButton href={pageHref(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
          Next →
        </LinkButton>
      </div>

      {/* Drawer */}
      {drawerOpen && activeLead ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 70 }}>
          <div
            onClick={() => !isPending && setDrawerOpen(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.30)" }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              height: "100%",
              width: "min(520px, 100%)",
              background: "white",
              borderLeft: "1px solid #e5e7eb",
              boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Lead Settings</div>
              <div style={{ fontSize: 18, fontWeight: 950 }}>Edit Lead</div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>
                {activeLead.location || "—"}
              </div>
            </div>

            <div
              style={{
                padding: 16,
                overflow: "auto",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <Field label="Title">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={inputStyle}
                  placeholder="Lead title"
                />
              </Field>

              <Field label="Summary">
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  style={{ ...inputStyle, height: 110, resize: "vertical" }}
                  placeholder="Lead summary"
                />
              </Field>

              <Field label="Price (USD)">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ opacity: 0.7 }}>$</div>
                  <input
                    value={priceDollars}
                    onChange={(e) => setPriceDollars(e.target.value)}
                    style={inputStyle}
                    placeholder="99.00"
                  />
                </div>
              </Field>

              <Field label="Expiration">
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  style={inputStyle}
                />
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                  Blank = no expiration
                </div>
              </Field>

              <Field label="System">
                <select value={systemId} onChange={(e) => setSystemId(e.target.value)} style={inputStyle}>
                  <option value="">— None —</option>
                  {systemOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12 }}>
                <div style={{ fontWeight: 950, fontSize: 13 }}>Assignment</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  If “assigned only” is enabled, only the selected contractor will see it.
                </div>

                <label
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    marginTop: 10,
                    fontWeight: 900,
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={assignedOnly}
                    onChange={(e) => setAssignedOnly(e.target.checked)}
                  />
                  Assigned only
                </label>

                <div style={{ marginTop: 10 }}>
                  <select
                    value={assignedContractorId}
                    onChange={(e) => setAssignedContractorId(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">— No specific contractor —</option>
                    {contractorOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {assignedOnly && !assignedContractorId ? (
                  <div style={{ marginTop: 10, fontSize: 12, color: "#92400e" }}>
                    Assigned-only is ON but no contractor selected — this lead will be hidden.
                  </div>
                ) : null}
              </div>
            </div>

            <div
              style={{
                padding: 16,
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                gap: 10,
                justifyContent: "space-between",
              }}
            >
              <button
                type="button"
                disabled={isPending}
                onClick={() => setDrawerOpen(false)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "#f8fafc",
                  fontWeight: 950,
                  cursor: "pointer",
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                Cancel
              </button>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => removeLead(activeLead)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(185,28,28,0.35)",
                    background: "rgba(185,28,28,0.08)",
                    fontWeight: 950,
                    cursor: "pointer",
                    color: "#b91c1c",
                    opacity: isPending ? 0.6 : 1,
                  }}
                >
                  Remove
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={saveLead}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(67,164,25,0.35)",
                    background: "rgba(67,164,25,0.12)",
                    fontWeight: 950,
                    cursor: "pointer",
                    color: "#2f7a12",
                    opacity: isPending ? 0.6 : 1,
                  }}
                >
                  {isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const menuItemStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 14px",
  fontSize: 14,
  cursor: "pointer",
  border: "none",
  background: "transparent",
  color: "#111827",
} as const;

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.8, marginBottom: 6 }}>
        {props.label}
      </div>
      {props.children}
    </div>
  );
}

function Tab(props: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={props.href}
      style={{
        textDecoration: "none",
        padding: "8px 12px",
        borderRadius: 999,
        border: props.active ? "1px solid rgba(67,164,25,0.35)" : "1px solid #e5e7eb",
        background: props.active ? "rgba(67,164,25,0.10)" : "white",
        color: "#111827",
        fontWeight: 900,
        fontSize: 13,
      }}
    >
      {props.label}
    </Link>
  );
}

function Pill(props: { value: string }) {
  const v = String(props.value || "").toLowerCase();

  const tone =
    v === "open"
      ? { bg: "rgba(67,164,25,0.10)", bd: "rgba(67,164,25,0.30)", tx: "#2f7a12" }
      : v === "sold"
      ? { bg: "rgba(59,130,246,0.10)", bd: "rgba(59,130,246,0.25)", tx: "#1d4ed8" }
      : v === "expired"
      ? { bg: "rgba(148,163,184,0.18)", bd: "rgba(148,163,184,0.40)", tx: "#475569" }
      : v === "refunded"
      ? { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.28)", tx: "#92400e" }
      : { bg: "#f8fafc", bd: "#e5e7eb", tx: "#111827" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        border: `1px solid ${tone.bd}`,
        background: tone.bg,
        color: tone.tx,
        fontSize: 12,
        fontWeight: 900,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {props.value}
    </span>
  );
}

function LinkButton(props: { href: string; disabled?: boolean; children: React.ReactNode }) {
  if (props.disabled) {
    return (
      <span
        style={{
          padding: "8px 12px",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: "#f8fafc",
          opacity: 0.5,
          fontWeight: 900,
          fontSize: 13,
        }}
      >
        {props.children}
      </span>
    );
  }

  return (
    <Link
      href={props.href}
      style={{
        textDecoration: "none",
        padding: "8px 12px",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background: "white",
        fontWeight: 900,
        fontSize: 13,
        color: "#111827",
      }}
    >
      {props.children}
    </Link>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  outline: "none",
  fontSize: 13,
  fontWeight: 800,
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
