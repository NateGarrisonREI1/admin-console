"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { BillingPageData, TransactionRow } from "./actions";
import { createUpdatePaymentSetupIntent } from "./actions";

// ─── Stripe ─────────────────────────────────────────────────────────

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// ─── Design tokens ──────────────────────────────────────────────────

const BG = "#0f172a";
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

// ─── Helpers ────────────────────────────────────────────────────────

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSystemType(systemType: string | null): string {
  if (!systemType) return "Lead Purchase";
  const labels: Record<string, string> = {
    hvac: "HVAC",
    water_heater: "Water Heater",
    solar: "Solar",
    electrical: "Electrical",
    plumbing: "Plumbing",
  };
  const label = labels[systemType] ?? systemType;
  return `${label} Lead Purchase`;
}

function formatCardBrand(brand: string): string {
  const brands: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "Amex",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
  };
  return brands[brand.toLowerCase()] ?? brand;
}

// ─── Setup Inner Form (Stripe Elements) ─────────────────────────────

function SetupInnerForm({
  clientSecret,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) {
      onError("Stripe has not loaded yet.");
      return;
    }
    setLoading(true);
    onError("");

    const card = elements.getElement(CardElement);
    if (!card) {
      onError("Card element not found");
      setLoading(false);
      return;
    }

    const result = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card },
    });

    if (result.error) {
      onError(result.error.message ?? "Failed to save card");
      setLoading(false);
    } else if (result.setupIntent?.status === "succeeded") {
      onSuccess();
    } else {
      onError("Unexpected status. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          background: BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          padding: "12px 14px",
          marginBottom: 16,
        }}
      >
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "15px",
                color: TEXT,
                fontFamily: "system-ui, -apple-system, sans-serif",
                "::placeholder": { color: TEXT_DIM },
              },
              invalid: { color: "#ef4444" },
            },
            hidePostalCode: true,
          }}
        />
      </div>
      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          width: "100%",
          padding: "12px 24px",
          borderRadius: 10,
          border: "none",
          background: loading ? TEXT_DIM : EMERALD,
          color: "#fff",
          fontSize: 14,
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          transition: "background 0.15s",
        }}
      >
        {loading ? "Saving..." : "Save Payment Method"}
      </button>
    </form>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────

function StatusBadge({ status, refundStatus }: { status: string; refundStatus: string | null }) {
  const effectiveStatus = refundStatus === "completed" ? "refunded" : status;

  const config: Record<string, { bg: string; text: string; label: string }> = {
    completed: {
      bg: "rgba(16,185,129,0.15)",
      text: EMERALD,
      label: "Paid",
    },
    refunded: {
      bg: "rgba(59,130,246,0.15)",
      text: "#3b82f6",
      label: "Refunded",
    },
    pending: {
      bg: "rgba(234,179,8,0.15)",
      text: "#eab308",
      label: "Pending",
    },
    failed: {
      bg: "rgba(239,68,68,0.15)",
      text: "#ef4444",
      label: "Failed",
    },
  };

  const cfg = config[effectiveStatus] ?? config.pending;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 700,
        background: cfg.bg,
        color: cfg.text,
        letterSpacing: "0.02em",
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function BillingClient({ data }: { data: BillingPageData }) {
  const router = useRouter();

  // Card modal state
  const [showCardModal, setShowCardModal] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [cardError, setCardError] = useState("");
  const [cardSaving, setCardSaving] = useState(false);

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function openCardModal() {
    setShowCardModal(true);
    setCardError("");
    setCardSaving(true);
    try {
      const { clientSecret: secret } = await createUpdatePaymentSetupIntent();
      setClientSecret(secret);
    } catch (e) {
      setCardError(
        e instanceof Error ? e.message : "Failed to initialize payment setup"
      );
    } finally {
      setCardSaving(false);
    }
  }

  function handleCardSuccess() {
    setShowCardModal(false);
    setClientSecret("");
    setCardError("");
    router.refresh();
  }

  function handlePromoApply() {
    if (!promoCode.trim()) return;
    setPromoApplying(true);
    setPromoMessage(null);
    // MVP: no backend, simulate
    setTimeout(() => {
      setPromoApplying(false);
      setPromoMessage({ type: "success", text: "Promo code applied!" });
    }, 800);
  }

  const pm = data.paymentMethod;

  return (
    <div style={{ padding: 28 }}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <h1
        style={{
          color: TEXT,
          fontSize: 22,
          fontWeight: 700,
          margin: "0 0 24px",
        }}
      >
        Billing &amp; Payments
      </h1>

      {/* ── Payment Method Card ──────────────────────────────────── */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        {pm ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              {/* Card brand icon text */}
              <div
                style={{
                  background: BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: TEXT,
                  letterSpacing: "0.02em",
                }}
              >
                {formatCardBrand(pm.brand)}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: TEXT,
                  }}
                >
                  &bull;&bull;&bull;&bull; {pm.last4}
                </div>
                <div style={{ fontSize: 12, color: TEXT_DIM }}>
                  Expires{" "}
                  {String(pm.exp_month).padStart(2, "0")}/
                  {String(pm.exp_year).slice(-2)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={openCardModal}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: `1px solid ${BORDER}`,
                background: "transparent",
                color: TEXT_SEC,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = TEXT_MUTED;
                e.currentTarget.style.color = TEXT;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = BORDER;
                e.currentTarget.style.color = TEXT_SEC;
              }}
            >
              Update Payment Method
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 14, color: TEXT_DIM }}>
              No payment method on file
            </div>
            <button
              type="button"
              onClick={openCardModal}
              style={{
                padding: "10px 22px",
                borderRadius: 8,
                border: "none",
                background: EMERALD,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#059669";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = EMERALD;
              }}
            >
              Add Payment Method
            </button>
          </div>
        )}
      </div>

      {/* ── Spend Summary ────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {/* This Month */}
        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: TEXT_DIM,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 8,
            }}
          >
            This Month
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: TEXT,
              marginBottom: 4,
            }}
          >
            {money(data.spend.thisMonth.total)}
          </div>
          <div style={{ fontSize: 12, color: TEXT_MUTED }}>
            {data.spend.thisMonth.count} lead
            {data.spend.thisMonth.count !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Last Month */}
        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: TEXT_DIM,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 8,
            }}
          >
            Last Month
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: TEXT,
              marginBottom: 4,
            }}
          >
            {money(data.spend.lastMonth.total)}
          </div>
          <div style={{ fontSize: 12, color: TEXT_MUTED }}>
            {data.spend.lastMonth.count} lead
            {data.spend.lastMonth.count !== 1 ? "s" : ""}
          </div>
        </div>

        {/* All Time */}
        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: TEXT_DIM,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 8,
            }}
          >
            All Time
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: TEXT,
              marginBottom: 4,
            }}
          >
            {money(data.spend.allTime.total)}
          </div>
          <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 6 }}>
            {data.spend.allTime.count} lead
            {data.spend.allTime.count !== 1 ? "s" : ""}
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              fontSize: 11,
              color: TEXT_DIM,
            }}
          >
            <span>
              Close rate:{" "}
              <span style={{ color: EMERALD, fontWeight: 600 }}>
                {data.spend.allTime.closeRate}%
              </span>
            </span>
            <span>
              Avg cost:{" "}
              <span style={{ color: TEXT_SEC, fontWeight: 600 }}>
                {money(data.spend.allTime.avgCost)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Transaction History ───────────────────────────────────── */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          marginBottom: 20,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <h2
            style={{
              color: TEXT,
              fontSize: 16,
              fontWeight: 700,
              margin: 0,
            }}
          >
            Transaction History
          </h2>
        </div>

        {data.transactions.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  {["Date", "Description", "Amount", "Status", "Receipt"].map(
                    (header) => (
                      <th
                        key={header}
                        style={{
                          padding: "10px 20px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: TEXT_DIM,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          textAlign: "left",
                          borderBottom: `1px solid ${BORDER}`,
                        }}
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((txn: TransactionRow) => {
                  const isRefunded = txn.refund_status === "completed";
                  return (
                    <tr
                      key={txn.id}
                      style={{ borderBottom: `1px solid ${BORDER}` }}
                    >
                      <td
                        style={{
                          padding: "12px 20px",
                          fontSize: 13,
                          color: TEXT_SEC,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(txn.created_at)}
                      </td>
                      <td
                        style={{
                          padding: "12px 20px",
                          fontSize: 13,
                          color: TEXT,
                        }}
                      >
                        {formatSystemType(txn.system_type)}
                      </td>
                      <td
                        style={{
                          padding: "12px 20px",
                          fontSize: 13,
                          fontWeight: 600,
                          color: isRefunded ? EMERALD : TEXT,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isRefunded ? `-${money(txn.amount)}` : money(txn.amount)}
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <StatusBadge
                          status={txn.status}
                          refundStatus={txn.refund_status}
                        />
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        {txn.stripe_transaction_id ? (
                          <a
                            href={`https://dashboard.stripe.com/payments/${txn.stripe_transaction_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: TEXT_DIM,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              transition: "color 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = TEXT_SEC;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = TEXT_DIM;
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                        ) : (
                          <span style={{ color: TEXT_DIM, fontSize: 12 }}>
                            &mdash;
                          </span>
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
              padding: 40,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 14, color: TEXT_DIM, fontWeight: 600 }}>
              No transactions yet
            </div>
            <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4 }}>
              Transactions will appear here after your first lead purchase.
            </div>
          </div>
        )}
      </div>

      {/* ── Promo Codes Card ─────────────────────────────────────── */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h3
          style={{
            color: TEXT,
            fontSize: 15,
            fontWeight: 700,
            margin: "0 0 12px",
          }}
        >
          Promo Code
        </h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Enter promo code"
            value={promoCode}
            onChange={(e) => {
              setPromoCode(e.target.value);
              setPromoMessage(null);
            }}
            style={{
              flex: 1,
              background: BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              color: TEXT,
              padding: "10px 14px",
              fontSize: 13,
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={handlePromoApply}
            disabled={promoApplying || !promoCode.trim()}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background:
                promoApplying || !promoCode.trim() ? TEXT_DIM : EMERALD,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor:
                promoApplying || !promoCode.trim()
                  ? "not-allowed"
                  : "pointer",
              transition: "background 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {promoApplying ? "Applying..." : "Apply"}
          </button>
        </div>
        {promoMessage && (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              fontWeight: 600,
              color:
                promoMessage.type === "success" ? EMERALD : "#ef4444",
            }}
          >
            {promoMessage.text}
          </div>
        )}
      </div>

      {/* ── Update Card Modal ────────────────────────────────────── */}
      {showCardModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCardModal(false);
              setClientSecret("");
              setCardError("");
            }
          }}
        >
          <div
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              width: "100%",
              maxWidth: 460,
              padding: 0,
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: `1px solid ${BORDER}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2
                style={{
                  color: TEXT,
                  fontSize: 18,
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                Update Payment Method
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowCardModal(false);
                  setClientSecret("");
                  setCardError("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: TEXT_DIM,
                  cursor: "pointer",
                  fontSize: 20,
                  padding: 4,
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24 }}>
              {cardError && (
                <div
                  style={{
                    color: "#ef4444",
                    fontSize: 12,
                    marginBottom: 16,
                    padding: "8px 12px",
                    borderRadius: 6,
                    background: "rgba(239,68,68,0.1)",
                  }}
                >
                  {cardError}
                </div>
              )}

              {cardSaving && !clientSecret && (
                <div
                  style={{
                    textAlign: "center",
                    color: TEXT_DIM,
                    padding: 24,
                  }}
                >
                  Setting up secure form...
                </div>
              )}

              {clientSecret && (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <SetupInnerForm
                    clientSecret={clientSecret}
                    onSuccess={handleCardSuccess}
                    onError={setCardError}
                  />
                </Elements>
              )}

              <div
                style={{
                  fontSize: 11,
                  color: TEXT_DIM,
                  marginTop: 16,
                  textAlign: "center",
                }}
              >
                Your card details are securely handled by Stripe.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
