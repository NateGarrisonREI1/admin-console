import NewSnapshotClient from "./NewSnapshotClient";

export default function Page({
  searchParams,
}: {
  searchParams?: { jobId?: string; systemId?: string };
}) {
  const jobId = searchParams?.jobId ?? "";
  const systemId = searchParams?.systemId ?? "";

  return <NewSnapshotClient jobId={jobId} systemId={systemId} />;
}
