import type { ReactNode } from "react";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 24 }}>REI Admin</h1>
      {children}
    </div>
  );
}
