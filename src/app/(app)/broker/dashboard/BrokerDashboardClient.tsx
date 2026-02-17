"use client";

import { useState, useTransition } from "react";
import type { BrokerHesRequest } from "./actions";
import { submitHesRequest } from "./actions";
import { StatusBadge } from "@/components/dashboard";

const GREEN = "#43a419";

const STATUS_LABELS: Record<string, { icon: string; label: string }> = {
  pending: { icon: "\u23F3", label: "Pending (REI reviewing)" },
  assigned_internal: { icon: "\uD83C\uDFD7\uFE0F", label: "Assigned to REI" },
  assigned_affiliate: { icon: "\uD83D\uDC64", label: "Assigned to Affiliate" },
  completed: { icon: "\u2705", label: "Completed" },
  cancelled: { icon: "\u274C", label: "Cancelled" },
};

function fmtDate(iso?: string | null) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function BrokerDashboardClient({ requests }: { requests: BrokerHesRequest[] }) {
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form state
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [propType, setPropType] = useState("single_family");
  const [completionDate, setCompletionDate] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit() {
    if (!address.trim() || !city.trim() || !state.trim() || !zip.trim()) {
      setError("Address, city, state, and zip are required");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await submitHesRequest({
          property_address: address,
          city,
          state,
          zip,
          property_type: propType,
          requested_completion_date: completionDate || null,
          notes,
        });
        setSuccess(true);
        setAddress(""); setCity(""); setState(""); setZip(""); setNotes(""); setCompletionDate("");
        setTimeout(() => {
          setSuccess(false);
          window.location.reload();
        }, 1500);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Submission failed");
      }
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Broker Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Submit HES requests and track their progress.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          style={{ background: GREEN }}
        >
          {showForm ? "Close Form" : "+ New HES Request"}
        </button>
      </div>

      {/* Request Form */}
      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Submit New HES Request</h2>
          <p className="text-sm text-slate-500 mb-5">
            REI will complete this HES or assign to a certified Home Energy Assessor.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Property Address</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  maxLength={2}
                  placeholder="OR"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ZIP</label>
                <input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  maxLength={10}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Property Type</label>
              <select
                value={propType}
                onChange={(e) => setPropType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="single_family">Single Family</option>
                <option value="multi_family">Multi Family</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Requested Completion Date</label>
              <input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
          {success && <div className="mt-3 text-sm text-green-700 font-medium">Request submitted successfully!</div>}

          <button
            onClick={handleSubmit}
            disabled={pending}
            className="mt-4 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
            style={{ background: GREEN }}
          >
            {pending ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      )}

      {/* Status Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_LABELS).map(([key, { icon, label }]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>{icon}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Requests Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">My Requests ({requests.length})</h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Requested</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Completed</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Report</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No HES requests yet. Click &quot;+ New HES Request&quot; to submit your first one.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.property_address}</td>
                    <td className="px-4 py-3 text-slate-600">{r.city}, {r.state} {r.zip}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-sm text-slate-500">{fmtDate(r.completion_date)}</td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "completed" && r.hes_report_url ? (
                        <a
                          href={r.hes_report_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                        >
                          Download
                        </a>
                      ) : r.status === "completed" ? (
                        <span className="text-xs text-slate-400">Report pending</span>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
