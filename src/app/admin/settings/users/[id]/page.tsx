// src/app/admin/settings/users/[id]/page.tsx
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  adminGetUserDetail,
  adminGetUserAuditTrail,
  adminGetUserRelationships,
} from "../../_actions/users";
import UserDetailClient from "../../_components/UserDetailClient";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params;

  const [user, auditEvents, relationships] = await Promise.all([
    adminGetUserDetail(id),
    adminGetUserAuditTrail(id),
    adminGetUserRelationships(id),
  ]);

  if (!user) notFound();

  return (
    <Suspense
      fallback={
        <div style={{ padding: 24, color: "#94a3b8" }}>Loading user...</div>
      }
    >
      <UserDetailClient
        user={user}
        auditEvents={auditEvents}
        relationships={relationships}
      />
    </Suspense>
  );
}
