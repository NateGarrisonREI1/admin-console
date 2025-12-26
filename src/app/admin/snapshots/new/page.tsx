import { Suspense } from "react";

// NOTE: your NewSnapshotClient is currently located here:
// src/app/admin/snapshots/snapshots/new/NewSnapshotClient.tsx
import NewSnapshotClient from "../snapshots/new/NewSnapshotClient";

export default function NewSnapshotPage() {
  return (
    <Suspense fallback={<div className="rei-card">Loading snapshot…</div>}>
      <NewSnapshotClient />
    </Suspense>
  );
}
