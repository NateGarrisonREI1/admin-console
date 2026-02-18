// src/app/admin/settings/users/page.tsx
import { Suspense } from "react";
import { adminListUsers } from "../_actions/users";
import AdminUsersTable from "../_components/AdminUsersTable";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSettingsUsersPage({ searchParams }: Props) {
  const params = await searchParams;

  const page = Number(params.page) || 1;
  const roleFilter = typeof params.role === "string" ? params.role : undefined;
  const statusFilter = typeof params.status === "string" ? params.status : undefined;
  const sourceFilter = typeof params.source === "string" ? params.source : undefined;
  const search = typeof params.q === "string" ? params.q : undefined;

  const data = await adminListUsers({
    page,
    pageSize: 50,
    roleFilter,
    statusFilter,
    sourceFilter,
    search,
  });

  return (
    <Suspense fallback={<div style={{ padding: 24, color: "#94a3b8" }}>Loading users...</div>}>
      <AdminUsersTable
        data={data}
        revalidatePath="/admin/settings/users"
      />
    </Suspense>
  );
}
