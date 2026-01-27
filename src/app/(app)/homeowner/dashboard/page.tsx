import Link from "next/link";

export default function HomeownerDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Homeowner Dashboard</h1>
      <p className="text-slate-600">View your ticket status and your LEAF Snapshot.</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link className="rounded-xl border bg-white p-4 hover:bg-slate-50" href="/homeowner/ticket">Ticket Status</Link>
        <Link className="rounded-xl border bg-white p-4 hover:bg-slate-50" href="/homeowner/snapshot">Your Snapshot</Link>
        <Link className="rounded-xl border bg-white p-4 hover:bg-slate-50" href="/homeowner/recommendations">Recommendations</Link>
      </div>
    </div>
  );
}
