"use client";

import { useState, useTransition } from "react";
import type { RefundRequestWithDetails } from "@/types/stripe";
import { REFUND_REASON_LABELS } from "@/types/stripe";
import { approveRefundAction, denyRefundAction, requestMoreInfoAction } from "./actions";
import { XMarkIcon } from "@heroicons/react/24/outline";

type Tab = "pending" | "approved" | "denied" | "all";

function fmtDate(iso?: string | null) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function money(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function RiskBadge({ score }: { score: number }) {
  let color = "bg-green-50 text-green-700 border-green-200";
  let label = "Low";
  if (score >= 50) {
    color = "bg-red-50 text-red-700 border-red-200";
    label = "High";
  } else if (score >= 20) {
    color = "bg-amber-50 text-amber-700 border-amber-200";
    label = "Medium";
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${color}`}>
      {label} ({score})
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    approved: "border-green-200 bg-green-50 text-green-700",
    denied: "border-red-200 bg-red-50 text-red-700",
    more_info_requested: "border-blue-200 bg-blue-50 text-blue-700",
  };
  const labels: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    denied: "Denied",
    more_info_requested: "Info Requested",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function AdminRefundsClient({
  initialRequests,
}: {
  initialRequests: RefundRequestWithDetails[];
}) {
  const [tab, setTab] = useState<Tab>("pending");
  const [requests, setRequests] = useState(initialRequests);
  const [reviewing, setReviewing] = useState<RefundRequestWithDetails | null>(null);
  const [actionModal, setActionModal] = useState<"approve" | "deny" | "info" | null>(null);
  const [actionText, setActionText] = useState("");
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = tab === "all"
    ? requests
    : requests.filter((r) => {
        if (tab === "pending") return r.status === "pending" || r.status === "more_info_requested";
        return r.status === tab;
      });

  const pendingCount = requests.filter((r) => r.status === "pending" || r.status === "more_info_requested").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const deniedCount = requests.filter((r) => r.status === "denied").length;

  async function handleApprove() {
    if (!reviewing) return;
    setLoading(true);
    setError(null);
    try {
      await approveRefundAction(reviewing.id, actionText || undefined);
      setRequests((prev) =>
        prev.map((r) => (r.id === reviewing.id ? { ...r, status: "approved" as const } : r))
      );
      setReviewing(null);
      setActionModal(null);
      setActionText("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeny() {
    if (!reviewing || !actionText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await denyRefundAction(reviewing.id, actionText);
      setRequests((prev) =>
        prev.map((r) => (r.id === reviewing.id ? { ...r, status: "denied" as const } : r))
      );
      setReviewing(null);
      setActionModal(null);
      setActionText("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to deny");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestInfo() {
    if (!reviewing || !actionText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await requestMoreInfoAction(reviewing.id, actionText);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === reviewing.id ? { ...r, status: "more_info_requested" as const } : r
        )
      );
      setReviewing(null);
      setActionModal(null);
      setActionText("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to request info");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Refund Requests</h1>
        <p className="mt-1 text-sm text-slate-600">Review and manage contractor refund requests.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
        {([
          { key: "pending" as Tab, label: "Pending", count: pendingCount },
          { key: "approved" as Tab, label: "Approved", count: approvedCount },
          { key: "denied" as Tab, label: "Denied", count: deniedCount },
          { key: "all" as Tab, label: "All", count: requests.length },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center text-slate-500">
          No refund requests in this category.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Contractor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Requested</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Risk</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">{r.contractor_name ?? "\u2014"}</div>
                      <div className="text-xs text-slate-500">{r.contractor_company ?? ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-900">{r.lead_address ?? "\u2014"}</div>
                      <div className="text-xs text-slate-500 capitalize">{r.lead_system_type?.replace("_", " ") ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{money(r.amount)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {REFUND_REASON_LABELS[r.reason_category] ?? r.reason_category}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{fmtDate(r.requested_date)}</td>
                    <td className="px-4 py-3"><RiskBadge score={r.risk_score} /></td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setReviewing(r)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewing && !actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReviewing(null)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Review Refund Request</h3>
              <button onClick={() => setReviewing(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {/* Lead details */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Lead</span>
                  <span className="font-medium text-slate-900">{reviewing.lead_address}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Type</span>
                  <span className="font-medium text-slate-900 capitalize">{reviewing.lead_system_type?.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-bold text-slate-900">{money(reviewing.amount)}</span>
                </div>
              </div>

              {/* Contractor info */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Contractor</div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Name</span>
                  <span className="font-medium text-slate-900">{reviewing.contractor_name}</span>
                </div>
                {reviewing.contractor_company && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Company</span>
                    <span className="text-slate-900">{reviewing.contractor_company}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Purchased</span>
                  <span className="text-slate-900">{reviewing.contractor_stats.total_purchased}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Conversion Rate</span>
                  <span className="text-slate-900">{reviewing.contractor_stats.conversion_rate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Avg. Lead Value</span>
                  <span className="text-slate-900">{money(reviewing.contractor_stats.avg_lead_value)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Previous Refund Requests</span>
                  <span className="text-slate-900">{reviewing.contractor_stats.previous_refund_requests}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Previous Approvals</span>
                  <span className="text-slate-900">{reviewing.contractor_stats.previous_refund_approvals}</span>
                </div>
              </div>

              {/* Refund reason */}
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</div>
                <div className="text-sm font-medium text-slate-900">
                  {REFUND_REASON_LABELS[reviewing.reason_category] ?? reviewing.reason_category}
                </div>
                {reviewing.notes && (
                  <div className="text-sm text-slate-600 mt-1">{reviewing.notes}</div>
                )}
              </div>

              {/* Risk */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Risk Score</span>
                <RiskBadge score={reviewing.risk_score} />
              </div>
            </div>

            {/* Actions */}
            {(reviewing.status === "pending" || reviewing.status === "more_info_requested") && (
              <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
                <button
                  onClick={() => { setActionModal("approve"); setActionText(""); }}
                  className="flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                >
                  Approve Refund
                </button>
                <button
                  onClick={() => { setActionModal("deny"); setActionText(""); }}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Deny
                </button>
                <button
                  onClick={() => { setActionModal("info"); setActionText(""); }}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Request Info
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Confirm Modal */}
      {actionModal && reviewing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setActionModal(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">
                {actionModal === "approve" && `Approve Refund of ${money(reviewing.amount)}?`}
                {actionModal === "deny" && "Deny Refund Request"}
                {actionModal === "info" && "Request More Information"}
              </h3>

              {actionModal === "approve" && (
                <p className="text-sm text-slate-600">
                  The refund will be processed via Stripe. The contractor will receive it in 3-5 business days.
                </p>
              )}

              <textarea
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                rows={3}
                placeholder={
                  actionModal === "approve"
                    ? "Admin notes (optional)..."
                    : actionModal === "deny"
                      ? "Reason for denial (required)..."
                      : "What information do you need? (required)..."
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#43a419] focus:ring-1 focus:ring-[#43a419] resize-none"
              />

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => { setActionModal(null); setError(null); }}
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={
                  actionModal === "approve"
                    ? handleApprove
                    : actionModal === "deny"
                      ? handleDeny
                      : handleRequestInfo
                }
                disabled={loading || ((actionModal === "deny" || actionModal === "info") && !actionText.trim())}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                  actionModal === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : actionModal === "deny"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading
                  ? "Processing..."
                  : actionModal === "approve"
                    ? "Confirm Approval"
                    : actionModal === "deny"
                      ? "Confirm Denial"
                      : "Send Question"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
