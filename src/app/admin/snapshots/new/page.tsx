// src/app/admin/snapshots/new/page.tsx
import NewSnapshotClient from "./NewSnapshotClient";

export default function NewSnapshotPage({
  searchParams,
}: {
  searchParams: { jobId?: string; systemId?: string };
}) {
  const jobId = searchParams?.jobId ?? "";
  const systemId = searchParams?.systemId ?? "";

  return (
    <div style={{ padding: 20, maxWidth: 1100 }}>
      <NewSnapshotClient jobId={jobId} systemId={systemId} />
    </div>
  );
}
