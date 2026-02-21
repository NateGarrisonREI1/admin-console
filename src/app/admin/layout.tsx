// src/app/admin/layout.tsx
import "./admin.css";
import AdminSidebar from "./_components/AdminSidebar";
import AdminShell from "./_components/AdminShell";
import ProfileMenu from "@/components/ProfileMenu";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const env =
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    (process.env.NODE_ENV === "development" ? "local" : "prod");

  return (
    <div
      className="admin-root"
      style={{
        display: "flex",
        height: "100vh",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <AdminSidebar />

      <main
        style={{
          flex: 1,
          minWidth: 0,
          maxWidth: "100%",
          height: "100vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Dark gradient header */}
        <header
          className="admin-header"
          style={{
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            borderBottom: "1px solid #334155",
            padding: "12px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 8px rgba(16,185,129,0.4)",
              }}
            />
            <span className="admin-header-title" style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>
              REI Admin
            </span>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span
              style={{
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 9999,
                background: "rgba(148,163,184,0.12)",
                border: "1px solid rgba(148,163,184,0.2)",
                color: "#94a3b8",
                fontWeight: 500,
              }}
            >
              {env}
            </span>
            <ProfileMenu settingsHref="/admin/settings" loginRedirect="/login" />
          </div>
        </header>

        <div
          style={{
            padding: 20,
            maxWidth: "100%",
            minWidth: 0,
            overflowX: "hidden",
            flex: 1,
          }}
        >
          <AdminShell>{children}</AdminShell>
        </div>

        <style>{`
          @media (min-width: 768px) {
            main > div:last-of-type { padding: 24px !important; }
          }
          @media (min-width: 1280px) {
            main > div:last-of-type { padding: 28px !important; }
          }
        `}</style>
      </main>
    </div>
  );
}
