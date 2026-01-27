import type { ReactNode } from "react";

function AdminGateBlocked() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl w-full rounded-lg border p-6 bg-white">
        <h1 className="text-xl font-semibold">Admin is disabled</h1>
        <p className="mt-2 text-sm text-gray-600">
          Set <code>ADMIN_GATE=open</code> in <code>.env.local</code> and restart
          the dev server.
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

  const env =
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    (process.env.NODE_ENV === "development" ? "local" : "prod");

  return (
    <div className="admin-layout">
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-brand">REI Admin</div>
          <div className="admin-env">env: {env}</div>
        </header>

        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}

/**
 * ✅ Default export so layout can do:
 *   import AdminShell from "./_components/AdminShell"
 */
export default AdminShell;