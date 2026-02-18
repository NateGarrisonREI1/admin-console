import type { ReactNode } from "react";

function AdminGateBlocked() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      background: "#0f172a",
    }}>
      <div style={{
        maxWidth: 480,
        width: "100%",
        borderRadius: 12,
        border: "1px solid #334155",
        padding: 24,
        background: "#1e293b",
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>Admin is disabled</h1>
        <p style={{ marginTop: 8, fontSize: 13, color: "#94a3b8" }}>
          Set <code style={{ background: "#0f172a", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>ADMIN_GATE=open</code> in{" "}
          <code style={{ background: "#0f172a", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>.env.local</code> and restart the dev server.
        </p>
      </div>
    </div>
  );
}

/**
 * Keep named export for any existing imports:
 *   import { AdminShell } from "./_components/AdminShell"
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const isOpen = process.env.ADMIN_GATE === "open";

  if (!isOpen) return <AdminGateBlocked />;

  return <>{children}</>;
}

/**
 * Default export so layout can do:
 *   import AdminShell from "./_components/AdminShell"
 */
export default AdminShell;
