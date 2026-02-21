// src/components/ui/ReportDeliveryModal.tsx
"use client";

import React, { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────

export type DeliveryVariant = "admin" | "tech" | "broker";

export type DeliveryJob = {
  id: string;
  type: "hes" | "inspector";
  customer_name: string;
  customer_email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  payment_status: string | null;
  invoice_amount: number | null;
  hes_report_url: string | null;
  leaf_report_url: string | null;
  reports_sent_at: string | null;
  invoice_sent_at: string | null;
  service_name: string | null;
  tier_name: string | null;
  requested_by: string | null;
  payer_name: string | null;
  payer_email: string | null;
  broker_id: string | null;
};

export type SendReportDeliveryParams = {
  jobId: string;
  jobType: "hes" | "inspector";
  leafTier: "none" | "basic";
  leafReportUrl: string | null;
  includeInvoice: boolean;
  invoiceAmount: number | null;
  includeReceipt: boolean;
  recipientEmails: string[];
  senderVariant: DeliveryVariant;
};

// ─── Theme tokens ───────────────────────────────────────────────────

const CARD = "#1e293b";
const BORDER = "#334155";
const BG_DARK = "#0f172a";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const EMERALD = "#10b981";
const BLUE = "#60a5fa";

// ─── Component ──────────────────────────────────────────────────────

export default function ReportDeliveryModal({
  job,
  variant = "admin",
  onClose,
  onSend,
}: {
  job: DeliveryJob;
  variant?: DeliveryVariant;
  onClose: () => void;
  onSend: (params: SendReportDeliveryParams) => Promise<{ error?: string }>;
}) {
  // LEAF tier
  const [leafTier, setLeafTier] = useState<"none" | "basic">(job.leaf_report_url ? "basic" : "none");
  const [leafUrl, setLeafUrl] = useState(job.leaf_report_url ?? "");

  // Payment options (unpaid only)
  const [paymentOption, setPaymentOption] = useState<"invoice" | "free">("invoice");
  const [invoiceAmount, setInvoiceAmount] = useState(
    job.invoice_amount ? String(job.invoice_amount) : ""
  );
  const [includeReceipt, setIncludeReceipt] = useState(false);

  // Recipients
  const hasCustomerEmail = !!job.customer_email;
  const hasBroker = !!(job.broker_id || job.requested_by === "broker");
  const brokerEmail = job.payer_email && job.requested_by === "broker" ? job.payer_email : null;
  const [sendToCustomer, setSendToCustomer] = useState(hasCustomerEmail);
  const [sendToBroker, setSendToBroker] = useState(hasBroker && !!brokerEmail);

  // Preview
  const [showPreview, setShowPreview] = useState(false);

  // Sending state
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPaid = job.payment_status === "paid";
  const isInvoiced = job.payment_status === "invoiced";
  const isUnpaid = !isPaid && !isInvoiced;
  const hasHes = !!job.hes_report_url;

  const recipientEmails: string[] = [];
  if (sendToCustomer && job.customer_email) recipientEmails.push(job.customer_email);
  if (sendToBroker && brokerEmail) recipientEmails.push(brokerEmail);

  const canSend = hasHes && recipientEmails.length > 0 && !sending;

  const fullAddress = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");
  const serviceName = [job.service_name, job.tier_name].filter(Boolean).join(" — ") || "Home Energy Assessment";

  // Template selection hint
  function getTemplateName(): string {
    if (isPaid) return "report_delivery (with receipt)";
    if (isUnpaid && paymentOption === "invoice") return "report_delivery_invoice";
    if (isUnpaid && paymentOption === "free") return "report_delivery_free";
    if (isInvoiced) return "report_delivery";
    return "report_delivery";
  }

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const result = await onSend({
        jobId: job.id,
        jobType: job.type,
        leafTier,
        leafReportUrl: leafTier === "basic" ? (leafUrl || null) : null,
        includeInvoice: isUnpaid && paymentOption === "invoice",
        invoiceAmount: isUnpaid && paymentOption === "invoice" ? (invoiceAmount ? parseFloat(invoiceAmount) : null) : null,
        includeReceipt: isPaid && includeReceipt,
        recipientEmails,
        senderVariant: variant,
      });
      if (result.error) {
        setError(result.error);
        setSending(false);
      }
      // onSend handles closing on success
    } catch (err: any) {
      setError(err?.message ?? "Failed to send reports");
      setSending(false);
    }
  }

  const sectionStyle: React.CSSProperties = {
    marginBottom: 20,
  };
  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: 10, color: TEXT_DIM, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.05em", marginBottom: 10,
  };
  const radioRow: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8, padding: "8px 0",
    cursor: "pointer", fontSize: 13, color: TEXT_SEC,
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.60)",
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 50, padding: 20,
      }}
    >
      <div
        className="admin-modal-content"
        style={{
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16,
          padding: 0, width: 520, maxHeight: "85vh", overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "20px 24px", borderBottom: `1px solid ${BORDER}`,
        }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: TEXT, margin: 0 }}>Prepare Report Delivery</h2>
            <p style={{ fontSize: 12, color: TEXT_DIM, margin: "4px 0 0" }}>{job.customer_name} — {fullAddress || "No address"}</p>
          </div>
          <button
            type="button" onClick={onClose}
            style={{ background: "none", border: "none", color: TEXT_DIM, cursor: "pointer", padding: 4, fontSize: 18, lineHeight: 1 }}
          >✕</button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {/* ─── DOCUMENTS ──────────────────────────────────────── */}
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>Documents</div>

            {/* HES Report */}
            <div style={{
              padding: "10px 14px", borderRadius: 8,
              background: hasHes ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)",
              border: `1px solid ${hasHes ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
              marginBottom: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>📄</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>HES Report</div>
                  {hasHes ? (
                    <a
                      href={job.hes_report_url!}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 11, color: BLUE, textDecoration: "none" }}
                    >Preview attached report</a>
                  ) : (
                    <span style={{ fontSize: 11, color: "#f59e0b" }}>Not uploaded — upload before sending</span>
                  )}
                </div>
                {hasHes && <span style={{ color: EMERALD, fontSize: 14 }}>✓</span>}
              </div>
            </div>

            {/* LEAF tier selection */}
            <div style={{
              padding: "10px 14px", borderRadius: 8,
              background: `rgba(15,23,42,0.4)`, border: `1px solid ${BORDER}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 14 }}>🌿</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>LEAF Energy Report</span>
              </div>

              <label style={radioRow} onClick={() => setLeafTier("none")}>
                <input type="radio" name="leaf" checked={leafTier === "none"} onChange={() => setLeafTier("none")}
                  style={{ accentColor: EMERALD }} />
                Don&apos;t include LEAF
              </label>

              <label style={radioRow} onClick={() => setLeafTier("basic")}>
                <input type="radio" name="leaf" checked={leafTier === "basic"} onChange={() => setLeafTier("basic")}
                  style={{ accentColor: EMERALD }} />
                Include Basic LEAF <span style={{ color: TEXT_DIM, fontSize: 11 }}>(free)</span>
              </label>

              {leafTier === "basic" && (
                <div style={{ marginLeft: 24, marginTop: 4 }}>
                  {job.leaf_report_url ? (
                    <div style={{ fontSize: 11, color: EMERALD }}>
                      <a href={job.leaf_report_url} target="_blank" rel="noreferrer" style={{ color: BLUE, textDecoration: "none" }}>
                        {job.leaf_report_url.length > 50 ? job.leaf_report_url.slice(0, 50) + "…" : job.leaf_report_url}
                      </a>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={leafUrl}
                        onChange={(e) => setLeafUrl(e.target.value)}
                        placeholder="Paste LEAF report URL…"
                        className="admin-input"
                        style={{ fontSize: 12, padding: "6px 10px", width: "100%", marginBottom: 4 }}
                      />
                      <div style={{ fontSize: 10, color: TEXT_DIM }}>Auto-generated when intake session exists</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ─── PAYMENT ────────────────────────────────────────── */}
          {variant !== "broker" && (
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>Payment</div>
              <div style={{
                padding: "12px 14px", borderRadius: 8,
                background: isPaid ? "rgba(16,185,129,0.06)" : "rgba(15,23,42,0.4)",
                border: `1px solid ${isPaid ? "rgba(16,185,129,0.2)" : BORDER}`,
              }}>
                {isPaid && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: variant === "admin" ? 8 : 0 }}>
                      <span style={{ color: EMERALD, fontSize: 14 }}>✓</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: EMERALD }}>
                        Paid {job.invoice_amount ? `($${job.invoice_amount})` : ""}
                      </span>
                    </div>
                    {variant === "admin" && (
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: TEXT_SEC, cursor: "pointer" }}>
                        <input type="checkbox" checked={includeReceipt} onChange={(e) => setIncludeReceipt(e.target.checked)}
                          style={{ accentColor: EMERALD }} />
                        Attach payment receipt
                      </label>
                    )}
                  </>
                )}

                {isInvoiced && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ color: "#f59e0b", fontSize: 14 }}>⏳</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24" }}>
                        Invoice sent{job.invoice_sent_at ? ` on ${new Date(job.invoice_sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}. Awaiting payment.
                      </span>
                    </div>
                  </div>
                )}

                {isUnpaid && variant === "admin" && (
                  <>
                    <label style={radioRow} onClick={() => setPaymentOption("invoice")}>
                      <input type="radio" name="payment" checked={paymentOption === "invoice"} onChange={() => setPaymentOption("invoice")}
                        style={{ accentColor: EMERALD }} />
                      Send with invoice (payment required)
                    </label>
                    {paymentOption === "invoice" && (
                      <div style={{ marginLeft: 24, marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 13, color: TEXT_DIM }}>$</span>
                          <input
                            type="number"
                            value={invoiceAmount}
                            onChange={(e) => setInvoiceAmount(e.target.value)}
                            placeholder="0.00"
                            className="admin-input"
                            style={{ fontSize: 12, padding: "6px 10px", width: 120 }}
                          />
                        </div>
                      </div>
                    )}
                    <label style={radioRow} onClick={() => setPaymentOption("free")}>
                      <input type="radio" name="payment" checked={paymentOption === "free"} onChange={() => setPaymentOption("free")}
                        style={{ accentColor: EMERALD }} />
                      Send without invoice <span style={{ color: TEXT_DIM, fontSize: 11 }}>(complimentary)</span>
                    </label>
                  </>
                )}

                {isUnpaid && variant === "tech" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#f59e0b", fontSize: 14 }}>⏳</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24" }}>Unpaid</span>
                    <span style={{ fontSize: 11, color: TEXT_DIM }}>— contact admin for invoicing</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── RECIPIENTS ─────────────────────────────────────── */}
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>Recipients</div>
            <div style={{
              padding: "10px 14px", borderRadius: 8,
              background: `rgba(15,23,42,0.4)`, border: `1px solid ${BORDER}`,
            }}>
              {hasCustomerEmail && (
                <label style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", cursor: "pointer" }}>
                  <input type="checkbox" checked={sendToCustomer} onChange={(e) => setSendToCustomer(e.target.checked)}
                    style={{ accentColor: EMERALD, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{job.customer_name}</div>
                    <div style={{ fontSize: 11, color: TEXT_DIM }}>{job.customer_email}</div>
                  </div>
                </label>
              )}
              {!hasCustomerEmail && (
                <div style={{ fontSize: 12, color: "#f59e0b", padding: "6px 0" }}>No customer email on file</div>
              )}

              {variant !== "broker" && hasBroker && brokerEmail && (
                <label style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", cursor: "pointer", borderTop: hasCustomerEmail ? `1px solid ${BORDER}` : "none", marginTop: hasCustomerEmail ? 6 : 0, paddingTop: hasCustomerEmail ? 10 : 6 }}>
                  <input type="checkbox" checked={sendToBroker} onChange={(e) => setSendToBroker(e.target.checked)}
                    style={{ accentColor: EMERALD, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{job.payer_name || "Broker"}</div>
                    <div style={{ fontSize: 11, color: TEXT_DIM }}>{brokerEmail}</div>
                    <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 2, fontStyle: "italic" }}>
                      Receives HES report only (LEAF controlled by sender)
                    </div>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* ─── PREVIEW ────────────────────────────────────────── */}
          <div style={sectionStyle}>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 12, fontWeight: 600, color: TEXT_DIM, padding: 0,
              }}
            >
              <span style={{ transform: showPreview ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.15s", display: "inline-block" }}>▶</span>
              Preview Email
            </button>

            {showPreview && (
              <div style={{
                marginTop: 10, padding: "14px 16px", borderRadius: 8,
                background: BG_DARK, border: `1px solid ${BORDER}`,
              }}>
                <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Template</div>
                <div style={{ fontSize: 12, color: BLUE, marginBottom: 12 }}>{getTemplateName()}</div>

                <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Subject</div>
                <div style={{ fontSize: 13, color: TEXT, marginBottom: 12 }}>
                  {isPaid ? `Payment Received — Your ${serviceName} Reports`
                    : isUnpaid && paymentOption === "invoice" ? `Your ${serviceName} Report & Invoice`
                    : `Your ${serviceName} Report`}
                </div>

                <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>To</div>
                <div style={{ fontSize: 12, color: TEXT_SEC }}>
                  {recipientEmails.length > 0 ? recipientEmails.join(", ") : "No recipients selected"}
                </div>

                {leafTier === "basic" && (
                  <div style={{ marginTop: 10, fontSize: 11, color: EMERALD }}>
                    Includes LEAF Energy Report link
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── ERROR ──────────────────────────────────────────── */}
          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 16,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              fontSize: 12, color: "#f87171",
            }}>
              {error}
            </div>
          )}

          {/* ─── ACTIONS ────────────────────────────────────────── */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
            <button
              type="button" onClick={onClose} disabled={sending}
              style={{
                padding: "9px 20px", borderRadius: 8, border: "none",
                background: "#334155", color: TEXT_SEC, fontSize: 13, fontWeight: 600,
                cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.5 : 1,
              }}
            >Cancel</button>
            <button
              type="button" onClick={handleSend} disabled={!canSend}
              title={!hasHes ? "Upload HES report first" : recipientEmails.length === 0 ? "Select at least one recipient" : ""}
              style={{
                padding: "9px 24px", borderRadius: 8, border: "none",
                background: canSend ? EMERALD : "#334155",
                color: canSend ? "#fff" : TEXT_DIM,
                fontSize: 13, fontWeight: 700,
                cursor: canSend ? "pointer" : "not-allowed",
                opacity: sending ? 0.7 : 1,
                transition: "all 0.15s",
              }}
            >
              {sending ? "Sending…" : `Send to ${recipientEmails.length} recipient${recipientEmails.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
