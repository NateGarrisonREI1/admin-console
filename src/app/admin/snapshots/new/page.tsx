import { Suspense } from "react";
import NewSnapshotClient from "./NewSnapshotClient";

export default function NewSnapshotPage() {
  return (
    <Suspense fallback={<div className="rei-card">Loading snapshot…</div>}>
      <NewSnapshotClient />
    </Suspense>
  );
}
