// src/app/admin/_components/AdminHomeHeader.tsx
export default function AdminHomeHeader() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 34, fontWeight: 950, marginBottom: 6, letterSpacing: -0.4 }}>
          Admin Console
        </h1>
        <p style={{ opacity: 0.75, marginBottom: 0 }}>
          Command center for systems, jobs, and the contractor marketplace.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Pill tone="neutral">env: local</Pill>
        <Pill tone="leaf">Build mode</Pill>
      </div>
    </div>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "neutral" | "leaf" }) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#111827",
    whiteSpace: "nowrap",
  };

  if (tone === "leaf") {
    return (
      <span
        style={{
          ...base,
          border: "1px solid rgba(67,164,25,0.28)",
          background: "rgba(67,164,25,0.08)",
          color: "#2f7a12",
        }}
      >
        {children}
      </span>
    );
  }

  return <span style={base}>{children}</span>;
}
