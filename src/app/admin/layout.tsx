// src/app/admin/layout.tsx
import "./admin.css";
import AdminSidebar from "./_components/AdminSidebar";
import AdminShell from "./_components/AdminShell";
import AdminAuthButton from "./_components/AdminAuthButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const env =
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    (process.env.NODE_ENV === "development" ? "local" : "prod");

  return (
    <div
      className="admin-root"
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f8fafc",
        maxWidth: "100%",
        overflowX: "hidden",
      }}
    >
      <AdminSidebar />

      <main
        style={{
          flex: 1,
          minWidth: 0, // CRITICAL for preventing flex overflow
          maxWidth: "100%",
        }}
      >
        <header
          style={{
            background: "white",
            borderBottom: "1px solid #e5e7eb",
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 800 }}>REI Admin</div>

          {/* ✅ Right side cluster: env + auth */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.65 }}>env: {env}</div>
            <AdminAuthButton />
          </div>
        </header>

        <div
          style={{
            padding: 16,
            maxWidth: "100%",
            minWidth: 0,
            overflowX: "hidden",
          }}
        >
          <AdminShell>{children}</AdminShell>
        </div>

        <style>{`
          @media (min-width: 768px) {
            main > div { padding: 24px !important; }
          }
          @media (min-width: 1280px) {
            main > div { padding: 28px !important; }
          }
        `}</style>
      </main>
    </div>
  );
}
