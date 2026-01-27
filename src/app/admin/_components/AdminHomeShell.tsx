// src/app/admin/_components/AdminHomeShell.tsx
import AdminHomeHeader from "./AdminHomeHeader";
import AdminHomeQuickActions from "./AdminHomeQuickActions";
import AdminHomeKpis from "./AdminHomeKpis";
import AdminHomeModules from "./AdminHomeModules";
import AdminHomeAttention from "./AdminHomeAttention";

export default function AdminHomeShell() {
  return (
    <div>
      <AdminHomeHeader />

      <div style={{ marginTop: 16 }}>
        <AdminHomeQuickActions />
      </div>

      <div style={{ marginTop: 18 }}>
        <AdminHomeKpis />
      </div>

      <div style={{ marginTop: 18 }}>
        <AdminHomeModules />
      </div>

      <div style={{ marginTop: 18 }}>
        <AdminHomeAttention />
      </div>
    </div>
  );
}
