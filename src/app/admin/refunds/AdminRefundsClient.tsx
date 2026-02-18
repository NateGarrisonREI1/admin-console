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
  let bg = "rgba(16,185,129,0.12)";
  let border = "rgba(16,185,129,0.30)";
  let color = "#10b981";
  let label = "Low";
  if (score >= 50) {
    bg = "rgba(239,68,68,0.12)";
    border = "rgba(239,68,68,0.30)";
    color = "#f87171";
    label = "High";
  } else if (score >= 20) {
    bg = "rgba(245,158,11,0.12)";
    border = "rgba(245,158,11,0.30)";
    color = "#fbbf24";
    label = "Medium";
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 9999,
        border: `1px solid ${border}`,
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {label} ({score})
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tones: Record<string, { bg: string; bd: string; tx: string }> = {
    pending: { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.30)", tx: "#fbbf24" },
    approved: { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.30)", tx: "#10b981" },
    denied: { bg: "rgba(239,68,68,0.12)", bd: "rgba(239,68,68,0.30)", tx: "#f87171" },
    more_info_requested: { bg: "rgba(59,130,246,0.12)", bd: "rgba(59,130,246,0.30)", tx: "#60a5fa" },
  };
  const labels: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    denied: "Denied",
    more_info_requested: "Info Requested",
  };
  const t = tones[status] ?? { bg: "rgba(51,65,85,0.5)", bd: "#475569", tx: "#cbd5e1" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 9999,
        border: `1px solid ${t.bd}`,
        background: t.bg,
        color: t.tx,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
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

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "pending", label: "Pending", count: pendingCount },
    { key: "approved", label: "Approved", count: approvedCount },
    { key: "denied", label: "Denied", count: deniedCount },
    { key: "all", label: "All", count: requests.length },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", letterSpacing: -0.3 }}>
          Refund Requests
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "#94a3b8" }}>
          Review and manage contractor refund requests.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              border: tab === t.key ? "1px solid rgba(16,185,129,0.25)" : "1px solid #334155",
              background: tab === t.key ? "rgba(16,185,129,0.10)" : "#1e293b",
              color: tab === t.key ? "#10b981" : "#94a3b8",
              transition: "all 0.15s ease",
            }}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div
          style={{
            borderRadius: 12,
            border: "1px dashed #334155",
            background: "rgba(30,41,59,0.5)",
            padding: "40px 16px",
            textAlign: "center",
            color: "#64748b",
          }}
        >
          No refund requests in this category.
        </div>
      ) : (
        <div
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Contractor</th>
                  <th>Lead</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Requested</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>
                        {r.contractor_name ?? "\u2014"}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {r.contractor_company ?? ""}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, color: "#f1f5f9" }}>
                        {r.lead_address ?? "\u2014"}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", textTransform: "capitalize" }}>
                        {r.lead_system_type?.replace("_", " ") ?? ""}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: "#f1f5f9" }}>{money(r.amount)}</td>
                    <td style={{ color: "#cbd5e1" }}>
                      {REFUND_REASON_LABELS[r.reason_category] ?? r.reason_category}
                    </td>
                    <td style={{ color: "#94a3b8" }}>{fmtDate(r.requested_date)}</td>
                    <td><RiskBadge score={r.risk_score} /></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        onClick={() => setReviewing(r)}
                        className="admin-btn-secondary"
                        style={{
                          padding: "6px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 8,
                        }}
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
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div
            onClick={() => setReviewing(null)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.50)", backdropFilter: "blur(4px)" }}
          />
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 520,
              borderRadius: 16,
              background: "#0f172a",
              border: "1px solid #334155",
              boxShadow: "0 30px 80px rgba(0,0,0,0.50)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #334155", padding: "16px 20px" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>Review Refund Request</h3>
              <button
                onClick={() => setReviewing(null)}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4, borderRadius: 8 }}
              >
                <XMarkIcon style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Lead details */}
              <div style={{ borderRadius: 12, border: "1px solid #334155", background: "#1e293b", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                <DetailRow label="Lead" value={reviewing.lead_address ?? "\u2014"} />
                <DetailRow label="Type" value={reviewing.lead_system_type?.replace("_", " ") ?? "\u2014"} capitalize />
                <DetailRow label="Amount" value={money(reviewing.amount)} bold />
              </div>

              {/* Contractor info */}
              <div style={{ borderRadius: 12, border: "1px solid #334155", background: "#1e293b", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                  Contractor
                </div>
                <DetailRow label="Name" value={reviewing.contractor_name ?? "\u2014"} />
                {reviewing.contractor_company && (
                  <DetailRow label="Company" value={reviewing.contractor_company} />
                )}
                <DetailRow label="Total Purchased" value={String(reviewing.contractor_stats.total_purchased)} />
                <DetailRow label="Conversion Rate" value={`${reviewing.contractor_stats.conversion_rate}%`} />
                <DetailRow label="Avg. Lead Value" value={money(reviewing.contractor_stats.avg_lead_value)} />
                <DetailRow label="Previous Requests" value={String(reviewing.contractor_stats.previous_refund_requests)} />
                <DetailRow label="Previous Approvals" value={String(reviewing.contractor_stats.previous_refund_approvals)} />
              </div>

              {/* Refund reason */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Reason
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", marginTop: 4 }}>
                  {REFUND_REASON_LABELS[reviewing.reason_category] ?? reviewing.reason_category}
                </div>
                {reviewing.notes && (
                  <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{reviewing.notes}</div>
                )}
              </div>

              {/* Risk */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Risk Score
                </span>
                <RiskBadge score={reviewing.risk_score} />
              </div>
            </div>

            {/* Actions */}
            {(reviewing.status === "pending" || reviewing.status === "more_info_requested") && (
              <div style={{ display: "flex", gap: 10, borderTop: "1px solid #334155", padding: "16px 20px" }}>
                <button
                  onClick={() => { setActionModal("approve"); setActionText(""); }}
                  className="admin-btn-primary"
                  style={{ flex: 1, padding: "10px 16px", borderRadius: 10, fontSize: 13 }}
                >
                  Approve Refund
                </button>
                <button
                  onClick={() => { setActionModal("deny"); setActionText(""); }}
                  className="admin-btn-danger"
                  style={{ flex: 1, padding: "10px 16px", borderRadius: 10, fontSize: 13 }}
                >
                  Deny
                </button>
                <button
                  onClick={() => { setActionModal("info"); setActionText(""); }}
                  className="admin-btn-secondary"
                  style={{ flex: 1, padding: "10px 16px", borderRadius: 10, fontSize: 13 }}
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
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div
            onClick={() => setActionModal(null)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.50)", backdropFilter: "blur(4px)" }}
          />
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 400,
              borderRadius: 16,
              background: "#0f172a",
              border: "1px solid #334155",
              boxShadow: "0 30px 80px rgba(0,0,0,0.50)",
            }}
          >
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>
                {actionModal === "approve" && `Approve Refund of ${money(reviewing.amount)}?`}
                {actionModal === "deny" && "Deny Refund Request"}
                {actionModal === "info" && "Request More Information"}
              </h3>

              {actionModal === "approve" && (
                <p style={{ fontSize: 13, color: "#94a3b8" }}>
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
                className="admin-input"
                style={{ resize: "vertical", minHeight: 80 }}
              />

              {error && (
                <div
                  style={{
                    borderRadius: 8,
                    border: "1px solid rgba(239,68,68,0.30)",
                    background: "rgba(239,68,68,0.10)",
                    padding: 12,
                    fontSize: 13,
                    color: "#f87171",
                  }}
                >
                  {error}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, borderTop: "1px solid #334155", padding: "16px 24px" }}>
              <button
                onClick={() => { setActionModal(null); setError(null); }}
                disabled={loading}
                className="admin-btn-secondary"
                style={{ flex: 1, padding: "10px 16px", borderRadius: 10, fontSize: 13, opacity: loading ? 0.5 : 1 }}
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
                className={actionModal === "deny" ? "admin-btn-danger" : "admin-btn-primary"}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 10,
                  fontSize: 13,
                  opacity: (loading || ((actionModal === "deny" || actionModal === "info") && !actionText.trim())) ? 0.5 : 1,
                }}
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

function DetailRow({ label, value, bold, capitalize }: { label: string; value: string; bold?: boolean; capitalize?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "#64748b" }}>{label}</span>
      <span style={{ color: "#f1f5f9", fontWeight: bold ? 700 : 500, textTransform: capitalize ? "capitalize" : undefined }}>
        {value}
      </span>
    </div>
  );
}
