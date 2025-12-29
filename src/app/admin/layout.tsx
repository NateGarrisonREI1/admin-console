import "./admin.css";

import AdminSidebar from "./_components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const env =
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    (process.env.NODE_ENV === "development" ? "local" : "prod");

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AdminSidebar />

      <main style={{ flex: 1 }}>
        <header
          style={{
            background: "white",
            borderBottom: "1px solid #e5e7eb",
            padding: "12px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 800 }}>REI Admin</div>
          <div style={{ fontSize: 12, opacity: 0.65 }}>env: {env}</div>
        </header>

        <div style={{ padding: 24 }}>{children}</div>
      </main>
    </div>
  );
}

