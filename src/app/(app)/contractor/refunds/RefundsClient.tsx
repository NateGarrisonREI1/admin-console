// src/app/(app)/contractor/refunds/RefundsClient.tsx
"use client";

import type { RefundsPageData, RefundRequestRow } from "./page";

// ─── Design tokens ──────────────────────────────────────────────────

const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

const REASON_LABELS: Record<string, string> = {
  no_response: "No homeowner response",
  competitor: "Already working with competitor",
  bad_quality: "Invalid / bad lead quality",
  not_interested: "Customer not interested",
  duplicate: "Duplicate lead",
  other: "Other",
};

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  pending: { color: "#eab308", bg: "rgba(234,179,8,0.15)" },
  approved: { color: EMERALD, bg: "rgba(16,185,129,0.15)" },
  denied: { color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  more_info_requested: { color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
};

// ─── Helpers ────────────────────────────────────────────────────────

function money(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Component ──────────────────────────────────────────────────────

export default function RefundsClient({ data }: { data: RefundsPageData }) {
  const { requests } = data;

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const deniedCount = requests.filter((r) => r.status === "denied").length;

  return (
    <div style={{ padding: 28, maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 700, margin: 0 }}>Refund Requests</h1>
        <p style={{ color: TEXT_DIM, fontSize: 13, margin: "4px 0 0" }}>
          Track your refund requests and their status.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Pending", value: pendingCount, color: "#eab308" },
          { label: "Approved", value: approvedCount, color: EMERALD },
          { label: "Denied", value: deniedCount, color: "#ef4444" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {requests.length > 0 ? (
        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Lead Type", "Amount", "Reason", "Status", "Submitted", "Resolution"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 600,
                      color: TEXT_DIM,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const sSt = STATUS_STYLES[req.status] ?? STATUS_STYLES.pending;
                return (
                  <tr
                    key={req.id}
                    style={{ borderBottom: `1px solid ${BORDER}` }}
                  >
                    <td style={{ padding: "12px 16px", fontSize: 13, color: TEXT_SEC }}>
                      {req.payment.system_type
                        ? req.payment.system_type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
                        : "System Lead"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: TEXT, fontWeight: 600 }}>
                      {money(req.payment.amount)}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: TEXT_SEC }}>
                      <div style={{ fontWeight: 600 }}>{REASON_LABELS[req.reason_category] ?? req.reason_category}</div>
                      {req.reason && (
                        <div style={{ color: TEXT_DIM, fontSize: 11, marginTop: 2, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {req.reason}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: sSt.bg,
                          color: sSt.color,
                        }}
                      >
                        {req.status === "more_info_requested" ? "Info Requested" : req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: TEXT_DIM }}>
                      {formatDate(req.requested_date)}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: TEXT_SEC }}>
                      {req.reviewed_date ? (
                        <div>
                          <div>{formatDate(req.reviewed_date)}</div>
                          {req.admin_notes && (
                            <div style={{ color: TEXT_DIM, fontSize: 11, marginTop: 2 }}>{req.admin_notes}</div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: TEXT_MUTED }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{
            background: CARD,
            border: `1px dashed ${BORDER}`,
            borderRadius: 12,
            padding: 48,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 14, color: TEXT_DIM, fontWeight: 600 }}>No refund requests yet.</div>
          <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4 }}>
            You can request refunds from the lead detail page within 48 hours of purchase.
          </div>
        </div>
      )}
    </div>
  );
}
