// src/app/admin/settings/users/page.tsx
import { adminListUsers } from "../_actions/users";
import AdminUsersTable from "../_components/AdminUsersTable";

export const dynamic = "force-dynamic";

export default async function AdminSettingsUsersPage() {
  const res = await adminListUsers();

  // Defensive: if something upstream changes, never crash the page
  const rows = Array.isArray((res as any)?.rows) ? (res as any).rows : [];

  return (
    <div className="space-y-4">
      <AdminUsersTable
        rows={rows}
        title="Users (All)"
        subtitle="Invite users, assign roles, and filter by account type."
        revalidatePath="/admin/settings/users"
      />
    </div>
  );
}
