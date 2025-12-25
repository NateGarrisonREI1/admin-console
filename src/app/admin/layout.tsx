import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 240,
          borderRight: "1px solid #ddd",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>LEAF Admin</div>
          <div style={{ fontSize: 12, color: "#666" }}>Management Console</div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/customers">Customers</Link>
          <Link href="/admin/jobs">Jobs</Link>
          <Link href="/admin/snapshots">Snapshots</Link>
        </nav>

        <div style={{ marginTop: "auto", fontSize: 12, color: "#666" }}>
          <div>v0 (scaffold)</div>
        </div>
      </aside>

      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}
