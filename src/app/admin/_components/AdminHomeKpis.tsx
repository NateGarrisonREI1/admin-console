// src/app/admin/_components/AdminHomeKpis.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

const GREEN = "#43a419";
const KPI_MOCK_STORAGE = "rei_admin_home_kpi_mock_v1";

type Kpi = {
  label: string;
  value: string;
  hint: string;
  tone?: "leaf" | "neutral" | "warn";
};

export default function AdminHomeKpis() {
  const [useMock, setUseMock] = useState(true);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KPI_MOCK_STORAGE);
      if (raw === "0") setUseMock(false);
      if (raw === "1") setUseMock(true);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(KPI_MOCK_STORAGE, useMock ? "1" : "0");
    } catch {}
  }, [useMock]);

  const kpis = useMemo<Kpi[]>(() => {
    if (useMock) {
      return [
        { label: "Open leads", value: "18", hint: "Not expired • available", tone: "leaf" },
        { label: "Sold (7d)", value: "34", hint: "Avg 1.1/day", tone: "neutral" },
        { label: "Refund requests", value: "2", hint: "Pending review", tone: "warn" },
        { label: "Active projects", value: "11", hint: "In progress right now", tone: "neutral" },
        { label: "Snapshots delivered (7d)", value: "9", hint: "Broker + homeowner", tone: "leaf" },
        { label: "Leads expiring soon", value: "4", hint: "Next 48 hours", tone: "warn" },
      ];
    }

    // Real KPIs later: wire to server component / fetch + pass in.
    return [
      { label: "Open leads", value: "—", hint: "Wire to contractor_leads", tone: "neutral" },
      { label: "Sold (7d)", value: "—", hint: "Wire to sold_at", tone: "neutral" },
      { label: "Refund requests", value: "—", hint: "Wire to contractor_refund_requests", tone: "neutral" },
      { label: "Active projects", value: "—", hint: "Wire to admin_jobs", tone: "neutral" },
      { label: "Snapshots delivered (7d)", value: "—", hint: "Wire to snapshots", tone: "neutral" },
      { label: "Leads expiring soon", value: "—", hint: "expires_at < 48h", tone: "neutral" },
    ];
  }, [useMock]);

  return (
    <div style={{ border: "1px solid #e5e7eb", background: "white", borderRadius: 16, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 950 }}>KPIs</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
            {useMock ? "Mock data enabled (build stage)" : "Ready for wiring real metrics"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Mock</span>
          <Toggle checked={useMock} onChange={setUseMock} />
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        {kpis.map((k) => (
          <KpiCard key={k.label} kpi={k} />
        ))}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, opacity: 0.6 }}>
        Later: move KPI loading to a server component and pass values into this component.
      </div>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const border =
    kpi.tone === "leaf"
      ? "1px solid rgba(67,164,25,0.25)"
      : kpi.tone === "warn"
      ? "1px solid rgba(245,158,11,0.30)"
      : "1px solid #eef2f7";

  const bg =
    kpi.tone === "leaf"
      ? "rgba(67,164,25,0.06)"
      : kpi.tone === "warn"
      ? "rgba(245,158,11,0.08)"
      : "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)";

  const valueColor =
    kpi.tone === "leaf" ? "#2f7a12" : kpi.tone === "warn" ? "#92400e" : "#111827";

  return (
    <div style={{ border, background: bg, borderRadius: 14, padding: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>{kpi.label}</div>
      <div style={{ fontSize: 26, fontWeight: 950, marginTop: 6, letterSpacing: -0.4, color: valueColor }}>
        {kpi.value}
      </div>
      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{kpi.hint}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
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
