import Link from "next/link";

export default function ContractorDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Contractor Dashboard</h1>
      <p className="text-slate-600">Browse the job board, buy leads, and manage active work.</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link className="rounded-xl border bg-white p-4 hover:bg-slate-50" href="/contractor/job-board">Live Job Board</Link>
        <Link className="rounded-xl border bg-white p-4 hover:bg-slate-50" href="/contractor/active">Active Jobs</Link>
        <Link className="rounded-xl border bg-white p-4 hover:bg-slate-50" href="/contractor/billing">Billing</Link>
      </div>
    </div>
  );
}
