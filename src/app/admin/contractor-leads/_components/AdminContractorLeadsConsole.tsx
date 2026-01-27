// src/app/admin/contractor-leads/_components/AdminContractorLeadsConsole.tsx
"use client";

import Link from "next/link";

type LeadRow = {
  id: string;
  title: string | null;
  location: string | null;
  status: string | null;
  price_cents: number | null;
  created_at: string | null;
  expires_at: string | null;
  sold_at: string | null;
  sold_to_user_id: string | null;
  assigned_to_user_id: string | null;
  removed_at: string | null;
  removed_reason: string | null;
};

export default function AdminContractorLeadsConsole(props: {
  tab: "open" | "purchased";
  page: number;
  pageSize: number;
  totalCount: number;
  leads: LeadRow[];
}) {
  const { tab, page, pageSize, totalCount, leads } = props;

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: -0.3 }}>
          Job Board
        </div>
        <div style={{ opacity: 0.7, marginTop: 4 }}>
          Admin view of contractor leads (open + purchased).
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10 }}>
        <Tab href={tabHref("open")} active={tab === "open"} label="Open leads" />
        <Tab
          href={tabHref("purchased")}
          active={tab === "purchased"}
          label="Purchased"
        />
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
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr 120px 120px 160px",
            gap: 12,
            padding: "10px 12px",
            fontSize: 12,
            fontWeight: 900,
            opacity: 0.7,
            borderBottom: "1px solid #eef2f7",
            background: "#fbfbfc",
          }}
        >
          <div>Title</div>
          <div>Location</div>
          <div>Status</div>
          <div>Price</div>
          <div>{tab === "open" ? "Posted" : "Purchased"}</div>
        </div>

        {leads.length === 0 ? (
          <div style={{ padding: 14, opacity: 0.7, fontSize: 13 }}>
            No leads in this view.
          </div>
        ) : (
          leads.map((l) => (
            <div
              key={l.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 1fr 120px 120px 160px",
                gap: 12,
                padding: "12px 12px",
                borderBottom: "1px solid #f1f5f9",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 900 }}>
                <Link
                  href={`/admin/contractor-leads/${l.id}`}
                  style={{ color: "#111827", textDecoration: "none" }}
                >
                  {l.title || "(Untitled lead)"}
                </Link>
              </div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>{l.location || "—"}</div>
              <div><Pill value={l.status || "—"} /></div>
              <div style={{ fontSize: 13 }}>
                {typeof l.price_cents === "number" ? `$${(l.price_cents / 100).toFixed(0)}` : "—"}
              </div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>
                {tab === "open" ? fmtDate(l.created_at) : fmtDate(l.sold_at)}
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
          Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount}
        </div>

        <LinkButton
          href={pageHref(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Next →
        </LinkButton>
      </div>
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

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
