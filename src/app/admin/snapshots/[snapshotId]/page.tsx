// src/app/admin/snapshots/[snapshotId]/page.tsx

import SnapshotEditorClient from "./SnapshotEditorClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    snapshotId: string;
  };
};

export default function Page({ params }: PageProps) {
  return <SnapshotEditorClient snapshotId={params.snapshotId} />;
}
