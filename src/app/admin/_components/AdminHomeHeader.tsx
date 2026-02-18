// src/app/admin/_components/AdminHomeHeader.tsx
export default function AdminHomeHeader() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6, letterSpacing: -0.4, color: "#f1f5f9" }}>
          Admin Console
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: 0, fontSize: 14 }}>
          Command center for systems, jobs, and the contractor marketplace.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Pill tone="neutral">Build mode</Pill>
      </div>
    </div>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "neutral" | "leaf" }) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  if (tone === "leaf") {
    return (
      <span
        style={{
          ...base,
          border: "1px solid rgba(16,185,129,0.25)",
          background: "rgba(16,185,129,0.08)",
          color: "#10b981",
        }}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      style={{
        ...base,
        border: "1px solid #334155",
        background: "#1e293b",
        color: "#94a3b8",
      }}
    >
      {children}
    </span>
  );
}
