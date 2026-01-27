import Link from "next/link";

export default function BrokerDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Broker Dashboard</h1>
      <p className="text-slate-600">Track listings, request HES/Snapshots, and view completed work.</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link className="rounded-xl border bg-white p-4 hover:bg-slate-50" href="/broker/jobs">Jobs</Link>
        <Link className="rounded-xl border bg-white p-4 hover:bg-slate-50" href="/broker/requests">Request Service</Link>
        <Link className="rounded-xl border bg-white p-4 hover:bg-slate-50" href="/broker/snapshots">Snapshots</Link>
      </div>
    </div>
  );
}
