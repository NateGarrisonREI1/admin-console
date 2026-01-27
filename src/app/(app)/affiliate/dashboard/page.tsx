import Link from "next/link";

export default function AffiliateDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Affiliate (HES Provider) Dashboard</h1>
      <p className="text-slate-600">Run jobs through LEAF, generate snapshots, and manage your settings.</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link className="rounded-xl border bg-white p-4 hover:bg-slate-50" href="/affiliate/jobs">Jobs</Link>
        <Link className="rounded-xl border bg-white p-4 hover:bg-slate-50" href="/affiliate/snapshots">Snapshots</Link>
        <Link className="rounded-xl border bg-white p-4 hover:bg-slate-50" href="/affiliate/settings">Settings</Link>
      </div>
    </div>
  );
}
