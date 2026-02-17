// src/app/admin/_components/AdminHomeShell.tsx
import AdminHomeHeader from "./AdminHomeHeader";
import AdminHomeQuickActions from "./AdminHomeQuickActions";
import AdminDashboardClient from "./AdminDashboardClient";
import { fetchAdminDashboard } from "../_actions/dashboard";

export default async function AdminHomeShell() {
  const data = await fetchAdminDashboard();

  return (
    <div>
      <AdminHomeHeader />

      <div style={{ marginTop: 16 }}>
        <AdminHomeQuickActions />
      </div>

      <div style={{ marginTop: 18 }}>
        <AdminDashboardClient data={data} />
      </div>
    </div>
  );
}
