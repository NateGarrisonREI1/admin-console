// src/app/(app)/contractor/job-board/JobBoardClient.tsx
"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import type { JobBoardData, JobBoardLead, LeadDetail, PurchaseResult } from "./actions";
import { fetchLeadDetail, createLeadPaymentIntent, confirmLeadPurchase, acceptFreeLead } from "./actions";

// ─── Stripe ─────────────────────────────────────────────────────────

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ─── Design tokens ──────────────────────────────────────────────────

const BG = "#0f172a";
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

const SYSTEM_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  hvac: { bg: "rgba(249,115,22,0.15)", text: "#f97316", label: "HVAC" },
  water_heater: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6", label: "Water Heater" },
  solar: { bg: "rgba(234,179,8,0.15)", text: "#eab308", label: "Solar" },
  electrical: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b", label: "Electrical" },
  plumbing: { bg: "rgba(6,182,212,0.15)", text: "#06b6d4", label: "Plumbing" },
  general_handyman: { bg: "rgba(148,163,184,0.15)", text: "#94a3b8", label: "General Handyman" },
  hes_assessment: { bg: "rgba(16,185,129,0.15)", text: "#10b981", label: "HES Assessment" },
  home_inspection: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b", label: "Home Inspection" },
  leaf_followup: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6", label: "LEAF Follow-up" },
};

const SERVICE_TYPES = [
  { value: "all", label: "All Types" },
  { value: "hvac", label: "HVAC" },
  { value: "water_heater", label: "Water Heater" },
  { value: "solar", label: "Solar" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "general_handyman", label: "General Handyman" },
  { value: "hes_assessment", label: "HES Assessment" },
  { value: "home_inspection", label: "Home Inspection" },
  { value: "leaf_followup", label: "LEAF Follow-up" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
];

// ─── Routing badge config ───────────────────────────────────────────

const ROUTING_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  internal_network: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6", label: "Network" },
  exclusive: { bg: "rgba(168,85,247,0.15)", text: "#a855f7", label: "Reserved for You" },
};

// ─── Helpers ────────────────────────────────────────────────────────

function money(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "Unknown";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString();
}

function typeBadge(systemType: string) {
  const cfg = SYSTEM_TYPE_COLORS[systemType] ?? { bg: "rgba(148,163,184,0.15)", text: TEXT_MUTED, label: systemType };
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

function routingBadge(lead: JobBoardLead) {
  const channel = lead.routing_channel || "open_market";
  const cfg = ROUTING_BADGES[channel];
  if (!cfg) return null;

  // For network leads that have been released, don't show badge
  if (channel === "internal_network" && lead.network_release_at) {
    if (new Date(lead.network_release_at) < new Date()) return null;
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: 12,
        fontSize: 10,
        fontWeight: 700,
        background: cfg.bg,
        color: cfg.text,
        letterSpacing: "0.03em",
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Lead Card ──────────────────────────────────────────────────────

function LeadCard({
  lead,
  onClick,
}: {
  lead: JobBoardLead;
  onClick: () => void;
}) {
  const location = [lead.city, lead.state].filter(Boolean).join(", ");
  const homeDetails: string[] = [];
  if (lead.home_sqft) homeDetails.push(`${lead.home_sqft.toLocaleString()} sqft`);
  if (lead.home_year_built) homeDetails.push(`Built ${lead.home_year_built}`);
  if (lead.beds || lead.baths) {
    const parts: string[] = [];
    if (lead.beds) parts.push(`${lead.beds} bed`);
    if (lead.baths) parts.push(`${lead.baths} bath`);
    homeDetails.push(parts.join(" / "));
  }

  const isFree = lead.is_free_assignment && lead.routing_channel === "exclusive";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: 20,
        textAlign: "left",
        cursor: "pointer",
        transition: "all 0.15s ease",
        width: "100%",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = EMERALD;
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = BORDER;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Top: badge row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {typeBadge(lead.system_type)}
        {routingBadge(lead)}
        {lead.has_leaf && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "3px 8px",
              borderRadius: 12,
              fontSize: 10,
              fontWeight: 700,
              background: "rgba(16,185,129,0.15)",
              color: EMERALD,
              letterSpacing: "0.03em",
            }}
          >
            LEAF Report
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: TEXT_DIM }}>
          {timeAgo(lead.posted_date)}
        </span>
      </div>

      {/* Title */}
      <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 6, lineHeight: 1.3 }}>
        {lead.title || location || "Oregon"}
      </div>

      {/* Location */}
      <div style={{ fontSize: 12, color: TEXT_SEC, marginBottom: 4 }}>
        {lead.area || location || "Oregon"} &middot; {lead.zip}
      </div>

      {/* Home details */}
      {homeDetails.length > 0 && (
        <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 16 }}>
          {homeDetails.join(" · ")}
        </div>
      )}
      {homeDetails.length === 0 && <div style={{ marginBottom: 16 }} />}

      {/* Price + CTA */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600 }}>
            {isFree ? "Assignment" : "Lead Price"}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: isFree ? EMERALD : TEXT }}>
            {isFree ? "Free" : money(lead.price)}
          </div>
        </div>
        <div
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            background: isFree ? "rgba(168,85,247,0.12)" : "rgba(16,185,129,0.12)",
            color: isFree ? "#a78bfa" : EMERALD,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {isFree ? "Accept Lead" : "View Details"}
        </div>
      </div>
    </button>
  );
}

// ─── Stripe Payment Inner Form ──────────────────────────────────────

function PaymentInnerForm({
  clientSecret,
  amount,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  amount: number;
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

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });

    if (result.error) {
      onError(result.error.message ?? "Payment failed");
      setLoading(false);
    } else if (result.paymentIntent?.status === "succeeded") {
      onSuccess();
    } else {
      onError("Unexpected payment status. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          background: "#0f172a",
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
      <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 12, textAlign: "center" }}>
        Test mode — use card <span style={{ fontFamily: "monospace", color: TEXT_MUTED }}>4242 4242 4242 4242</span>, any future expiry, any CVC
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
        {loading ? "Processing..." : `Purchase Lead — ${money(amount)}`}
      </button>
    </form>
  );
}

// ─── Lead Detail Modal ──────────────────────────────────────────────

function LeadDetailModal({
  leadId,
  leadSummary,
  onClose,
  onPurchased,
}: {
  leadId: string;
  leadSummary?: JobBoardLead;
  onClose: () => void;
  onPurchased: () => void;
}) {
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Purchase flow states
  const [purchaseStep, setPurchaseStep] = useState<"idle" | "paying" | "confirming" | "accepting" | "success">("idle");
  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLeadDetail(leadId).then((data) => {
      if (cancelled) return;
      setDetail(data);
      setLoading(false);
      if (!data) setError("Lead not found");
    }).catch((e) => {
      if (cancelled) return;
      setError(e instanceof Error ? e.message : "Failed to load");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [leadId]);

  const isFreeExclusive = detail?.routing_channel === "exclusive" && detail?.is_free_assignment;

  async function handleStartPurchase() {
    setPaymentError("");
    setPurchaseStep("paying");
    try {
      const result = await createLeadPaymentIntent(leadId);
      setClientSecret(result.clientSecret);
      setPaymentIntentId(result.paymentIntentId);
    } catch (e) {
      setPaymentError(e instanceof Error ? e.message : "Failed to create payment");
      setPurchaseStep("idle");
    }
  }

  async function handlePaymentSuccess() {
    setPurchaseStep("confirming");
    try {
      const result = await confirmLeadPurchase(leadId, paymentIntentId);
      setPurchaseResult(result);
      setPurchaseStep("success");
    } catch (e) {
      setPaymentError(e instanceof Error ? e.message : "Purchase confirmation failed");
      setPurchaseStep("idle");
    }
  }

  async function handleAcceptFree() {
    setPaymentError("");
    setPurchaseStep("accepting");
    try {
      const result = await acceptFreeLead(leadId);
      setPurchaseResult(result);
      setPurchaseStep("success");
    } catch (e) {
      setPaymentError(e instanceof Error ? e.message : "Failed to accept lead");
      setPurchaseStep("idle");
    }
  }

  const leaf = detail?.leaf_report_data;
  const hasLeaf = leaf && Object.keys(leaf).length > 0;
  const location = detail ? [detail.city, detail.state].filter(Boolean).join(", ") : "";
  const typeCfg = detail ? SYSTEM_TYPE_COLORS[detail.system_type] : null;

  return (
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflow: "auto",
          padding: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ color: TEXT, fontSize: 18, fontWeight: 700, margin: 0 }}>Lead Details</h2>
          <button
            type="button"
            onClick={onClose}
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

        {/* Body */}
        <div style={{ padding: 24 }}>
          {loading && (
            <div style={{ textAlign: "center", color: TEXT_DIM, padding: 32 }}>Loading...</div>
          )}

          {error && (
            <div style={{ color: "#ef4444", fontSize: 13, padding: 16, textAlign: "center" }}>{error}</div>
          )}

          {detail && !loading && purchaseStep !== "success" && (
            <>
              {/* Type + routing + LEAF badges */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {typeBadge(detail.system_type)}
                {detail.routing_channel && ROUTING_BADGES[detail.routing_channel] && (
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: 12,
                      fontSize: 10,
                      fontWeight: 700,
                      background: ROUTING_BADGES[detail.routing_channel].bg,
                      color: ROUTING_BADGES[detail.routing_channel].text,
                    }}
                  >
                    {ROUTING_BADGES[detail.routing_channel].label}
                  </span>
                )}
                {hasLeaf && (
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: 12,
                      fontSize: 10,
                      fontWeight: 700,
                      background: "rgba(16,185,129,0.15)",
                      color: EMERALD,
                    }}
                  >
                    LEAF Report Included
                  </span>
                )}
              </div>

              {/* Title */}
              <div style={{ fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 6, lineHeight: 1.3 }}>
                {detail.title || location || "Oregon"}
              </div>

              {/* Location + Posted */}
              <div style={{ fontSize: 13, color: TEXT_SEC, marginBottom: 4 }}>
                {detail.area || location || "Oregon"} &middot; {detail.zip}
              </div>
              <div style={{ fontSize: 12, color: TEXT_DIM, marginBottom: 16 }}>
                Posted {timeAgo(detail.posted_date)}
              </div>

              {/* Description */}
              {detail.description && (
                <div style={{ fontSize: 13, color: TEXT_SEC, lineHeight: 1.6, marginBottom: 20 }}>
                  {detail.description}
                </div>
              )}

              {/* Home Details Card */}
              {(detail.home_sqft || detail.home_year_built || detail.home_type || detail.beds || detail.baths) && (
                <div
                  style={{
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 20,
                  }}
                >
                  <h4 style={{ color: TEXT_SEC, fontSize: 12, fontWeight: 700, margin: "0 0 12px", letterSpacing: "0.04em" }}>
                    PROPERTY DETAILS
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {detail.home_type && (
                      <div>
                        <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600 }}>Type</div>
                        <div style={{ fontSize: 13, color: TEXT_SEC }}>{detail.home_type}</div>
                      </div>
                    )}
                    {detail.home_sqft && (
                      <div>
                        <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600 }}>Size</div>
                        <div style={{ fontSize: 13, color: TEXT_SEC }}>{detail.home_sqft.toLocaleString()} sqft</div>
                      </div>
                    )}
                    {detail.home_year_built && (
                      <div>
                        <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600 }}>Year Built</div>
                        <div style={{ fontSize: 13, color: TEXT_SEC }}>{detail.home_year_built}</div>
                      </div>
                    )}
                    {(detail.beds || detail.baths) && (
                      <div>
                        <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600 }}>Beds / Baths</div>
                        <div style={{ fontSize: 13, color: TEXT_SEC }}>
                          {[detail.beds && `${detail.beds} bed`, detail.baths && `${detail.baths} bath`].filter(Boolean).join(" / ")}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* LEAF Report Summary */}
              {hasLeaf && (
                <div
                  style={{
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 20,
                  }}
                >
                  <h4 style={{ color: EMERALD, fontSize: 13, fontWeight: 700, margin: "0 0 12px" }}>
                    LEAF Energy Assessment
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {(leaf as Record<string, unknown>).current_system != null && (
                      <div>
                        <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600 }}>Current System</div>
                        <div style={{ fontSize: 13, color: TEXT_SEC }}>{String((leaf as Record<string, unknown>).current_system)}</div>
                      </div>
                    )}
                    {(leaf as Record<string, unknown>).system_age != null && (
                      <div>
                        <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600 }}>System Age</div>
                        <div style={{ fontSize: 13, color: TEXT_SEC }}>{String((leaf as Record<string, unknown>).system_age)} years</div>
                      </div>
                    )}
                    {(leaf as Record<string, unknown>).efficiency != null && (
                      <div>
                        <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600 }}>Efficiency</div>
                        <div style={{ fontSize: 13, color: TEXT_SEC }}>{String((leaf as Record<string, unknown>).efficiency)}</div>
                      </div>
                    )}
                    {(leaf as Record<string, unknown>).recommendation != null && (
                      <div>
                        <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600 }}>Recommendation</div>
                        <div style={{ fontSize: 13, color: EMERALD, fontWeight: 600 }}>{String((leaf as Record<string, unknown>).recommendation)}</div>
                      </div>
                    )}
                    {(leaf as Record<string, unknown>).estimated_cost != null && (
                      <div>
                        <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600 }}>Est. Cost</div>
                        <div style={{ fontSize: 13, color: TEXT_SEC }}>{String((leaf as Record<string, unknown>).estimated_cost)}</div>
                      </div>
                    )}
                    {(leaf as Record<string, unknown>).annual_savings != null && (
                      <div>
                        <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600 }}>Annual Savings</div>
                        <div style={{ fontSize: 13, color: EMERALD }}>{String((leaf as Record<string, unknown>).annual_savings)}</div>
                      </div>
                    )}
                    {(leaf as Record<string, unknown>).payback_years != null && (
                      <div>
                        <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600 }}>Payback Period</div>
                        <div style={{ fontSize: 13, color: TEXT_SEC }}>{String((leaf as Record<string, unknown>).payback_years)} years</div>
                      </div>
                    )}
                    {(leaf as Record<string, unknown>).priority != null && (
                      <div>
                        <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600 }}>Priority</div>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: String((leaf as Record<string, unknown>).priority) === "Urgent" ? "#ef4444"
                            : String((leaf as Record<string, unknown>).priority) === "High" ? "#f59e0b"
                            : EMERALD,
                        }}>
                          {String((leaf as Record<string, unknown>).priority)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 12, fontStyle: "italic" }}>
                    Full LEAF report data unlocks after {isFreeExclusive ? "accepting" : "purchase"}.
                  </div>
                </div>
              )}

              {/* Locked / revealed info notice */}
              {isFreeExclusive && detail.homeowner_name ? (
                <div
                  style={{
                    background: "rgba(168,85,247,0.08)",
                    border: "1px solid rgba(168,85,247,0.2)",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 20,
                  }}
                >
                  <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600, marginBottom: 6 }}>
                    Assigned to You (Free)
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {detail.homeowner_name && (
                      <div>
                        <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600 }}>Name</div>
                        <div style={{ fontSize: 13, color: TEXT_SEC }}>{detail.homeowner_name}</div>
                      </div>
                    )}
                    {detail.homeowner_phone && (
                      <div>
                        <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600 }}>Phone</div>
                        <div style={{ fontSize: 13, color: TEXT_SEC }}>{detail.homeowner_phone}</div>
                      </div>
                    )}
                    {detail.homeowner_email && (
                      <div>
                        <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600 }}>Email</div>
                        <div style={{ fontSize: 13, color: TEXT_SEC }}>{detail.homeowner_email}</div>
                      </div>
                    )}
                    {detail.address && (
                      <div>
                        <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600 }}>Address</div>
                        <div style={{ fontSize: 13, color: TEXT_SEC }}>{detail.address}</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: "rgba(234,179,8,0.08)",
                    border: "1px solid rgba(234,179,8,0.2)",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 20,
                  }}
                >
                  <div style={{ fontSize: 12, color: "#eab308", fontWeight: 600, marginBottom: 2 }}>
                    Homeowner info locked
                  </div>
                  <div style={{ fontSize: 11, color: TEXT_DIM }}>
                    Name, phone, email, and exact address will be revealed after {isFreeExclusive ? "accepting this lead" : "purchase"}.
                    This is an exclusive lead — only one contractor per homeowner.
                  </div>
                </div>
              )}

              {/* Price + Purchase / Accept */}
              <div
                style={{
                  background: BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: 20,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600 }}>
                      {isFreeExclusive ? "Assignment" : "Lead Price"}
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: isFreeExclusive ? EMERALD : TEXT }}>
                      {isFreeExclusive ? "Free" : money(detail.price)}
                    </div>
                  </div>
                  {typeCfg && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: TEXT_DIM }}>Service Type</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: typeCfg.text }}>{typeCfg.label}</div>
                    </div>
                  )}
                </div>

                {paymentError && (
                  <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12, padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)" }}>
                    {paymentError}
                  </div>
                )}

                {/* Free exclusive: Accept button */}
                {isFreeExclusive && purchaseStep === "idle" && detail.status === "available" && (
                  <button
                    type="button"
                    onClick={handleAcceptFree}
                    style={{
                      width: "100%",
                      padding: "14px 24px",
                      borderRadius: 10,
                      border: "none",
                      background: "#a78bfa",
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#8b5cf6"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#a78bfa"; }}
                  >
                    Accept Free Lead
                  </button>
                )}

                {purchaseStep === "accepting" && (
                  <div style={{ textAlign: "center", color: TEXT_DIM, padding: 16 }}>
                    Accepting lead...
                  </div>
                )}

                {/* Paid lead: Purchase button */}
                {!isFreeExclusive && purchaseStep === "idle" && detail.status === "available" && (
                  <button
                    type="button"
                    onClick={handleStartPurchase}
                    style={{
                      width: "100%",
                      padding: "14px 24px",
                      borderRadius: 10,
                      border: "none",
                      background: EMERALD,
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#059669"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = EMERALD; }}
                  >
                    Purchase Lead — {money(detail.price)}
                  </button>
                )}

                {purchaseStep === "paying" && !clientSecret && (
                  <div style={{ textAlign: "center", color: TEXT_DIM, padding: 16 }}>
                    Setting up payment...
                  </div>
                )}

                {purchaseStep === "paying" && clientSecret && (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <PaymentInnerForm
                      clientSecret={clientSecret}
                      amount={detail.price}
                      onSuccess={handlePaymentSuccess}
                      onError={setPaymentError}
                    />
                  </Elements>
                )}

                {purchaseStep === "confirming" && (
                  <div style={{ textAlign: "center", color: TEXT_DIM, padding: 16 }}>
                    Confirming purchase...
                  </div>
                )}

                <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 12, textAlign: "center" }}>
                  {isFreeExclusive
                    ? "Free assignment. Contact info will be revealed after accepting."
                    : "Exclusive lead. Homeowner contact info and LEAF report unlock after purchase."}
                </div>
              </div>
            </>
          )}

          {/* Purchase / Accept Success */}
          {purchaseStep === "success" && purchaseResult && (
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "rgba(16,185,129,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={EMERALD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 style={{ color: TEXT, fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>
                {isFreeExclusive ? "Lead Accepted!" : "Lead Purchased!"}
              </h3>
              <p style={{ color: TEXT_DIM, fontSize: 13, margin: "0 0 24px" }}>
                Here is the homeowner&apos;s contact information.
              </p>

              <div
                style={{
                  background: BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: 20,
                  textAlign: "left",
                }}
              >
                {[
                  ["Name", purchaseResult.homeowner_name],
                  ["Phone", purchaseResult.homeowner_phone],
                  ["Email", purchaseResult.homeowner_email],
                  ["Address", purchaseResult.address],
                ].map(([label, val]) => (
                  <div key={label as string} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: TEXT_DIM, fontWeight: 600, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 14, color: val ? TEXT : TEXT_DIM, fontWeight: val ? 600 : 400 }}>
                      {(val as string) || "Not provided"}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  onPurchased();
                  onClose();
                }}
                style={{
                  marginTop: 20,
                  width: "100%",
                  padding: "12px 24px",
                  borderRadius: 10,
                  border: "none",
                  background: EMERALD,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Go to My Leads
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

type TabKey = "open" | "network" | "reserved";

export default function JobBoardClient({ data }: { data: JobBoardData }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>(data.stats.reservedLeads > 0 ? "reserved" : "open");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);

  const now = useMemo(() => new Date().toISOString(), []);

  // Filter leads based on tab + filters
  const filteredLeads = useMemo(() => {
    let leads = data.leads;

    // Tab filter
    if (tab === "reserved") {
      leads = leads.filter(
        (l) => l.routing_channel === "exclusive"
      );
    } else if (tab === "network") {
      leads = leads.filter((l) => {
        const channel = l.routing_channel || "open_market";
        if (channel !== "internal_network") return false;
        // Only show if still within network window
        if (l.network_release_at && l.network_release_at < now) return false;
        return true;
      });
    } else {
      // Open Market tab: open_market leads + released network leads
      leads = leads.filter((l) => {
        const channel = l.routing_channel || "open_market";
        if (channel === "exclusive") return false;
        if (channel === "internal_network") {
          // Only show here if released to open market
          return l.network_release_at != null && l.network_release_at < now;
        }
        return true; // open_market or legacy (null routing_channel)
      });
    }

    // Service type filter
    if (serviceFilter !== "all") {
      leads = leads.filter((l) => l.system_type === serviceFilter);
    }

    // Price filter
    const min = priceMin ? Number(priceMin) : 0;
    const max = priceMax ? Number(priceMax) : Infinity;
    if (min > 0 || max < Infinity) {
      leads = leads.filter((l) => l.price >= min && l.price <= max);
    }

    // Sort
    if (sortBy === "price_asc") {
      leads = [...leads].sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      leads = [...leads].sort((a, b) => b.price - a.price);
    }
    // newest is default from server

    return leads;
  }, [data.leads, now, tab, serviceFilter, sortBy, priceMin, priceMax]);

  const selectedLeadData = useMemo(
    () => (selectedLead ? data.leads.find((l) => l.id === selectedLead) : undefined),
    [selectedLead, data.leads]
  );

  const handlePurchased = useCallback(() => {
    router.push("/contractor/leads");
  }, [router]);

  const inputStyle: React.CSSProperties = {
    background: BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    color: TEXT,
    padding: "8px 12px",
    fontSize: 13,
    outline: "none",
    width: 100,
  };

  const tabs: { key: TabKey; label: string; count: number; color: string }[] = [
    { key: "open", label: "Open Market", count: data.stats.openMarketLeads, color: "#f59e0b" },
    { key: "network", label: "My Network", count: data.stats.networkLeads, color: "#3b82f6" },
    { key: "reserved", label: "Reserved for You", count: data.stats.reservedLeads, color: "#a78bfa" },
  ];

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 700, margin: 0 }}>Job Board</h1>
        <p style={{ color: TEXT_DIM, fontSize: 13, margin: "4px 0 0" }}>
          Browse and purchase exclusive leads in your service area.
        </p>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Available Leads", value: data.stats.totalAvailable, color: EMERALD },
          { label: "Open Market", value: data.stats.openMarketLeads, color: "#f59e0b" },
          { label: "Network Leads", value: data.stats.networkLeads, color: "#3b82f6" },
          { label: "Reserved for You", value: data.stats.reservedLeads, color: "#a78bfa" },
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

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: `1px solid ${active ? t.color : BORDER}`,
                background: active ? `${t.color}1f` : "transparent",
                color: active ? t.color : TEXT_MUTED,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {t.label}
              {t.count > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    background: active ? t.color : BORDER,
                    color: active ? "#fff" : TEXT_MUTED,
                    padding: "2px 7px",
                    borderRadius: 10,
                    lineHeight: "14px",
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 20,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
        }}
      >
        {/* Service type pills */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {SERVICE_TYPES.map((st) => {
            const active = serviceFilter === st.value;
            return (
              <button
                key={st.value}
                type="button"
                onClick={() => setServiceFilter(st.value)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 16,
                  border: `1px solid ${active ? EMERALD : BORDER}`,
                  background: active ? "rgba(16,185,129,0.12)" : "transparent",
                  color: active ? EMERALD : TEXT_MUTED,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {st.label}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: BORDER }} />

        {/* Price range */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600 }}>Price:</span>
          <input
            type="number"
            placeholder="Min"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            style={inputStyle}
          />
          <span style={{ color: TEXT_DIM }}>—</span>
          <input
            type="number"
            placeholder="Max"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Sort */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: TEXT_DIM, fontWeight: 600 }}>Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              background: BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              color: TEXT,
              padding: "8px 12px",
              fontSize: 13,
              outline: "none",
              cursor: "pointer",
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lead Cards Grid */}
      {filteredLeads.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {filteredLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead.id)} />
          ))}
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
          <div style={{ fontSize: 14, color: TEXT_DIM, fontWeight: 600 }}>
            {tab === "reserved"
              ? "No leads reserved for you right now."
              : tab === "network"
              ? "No leads from your network yet."
              : "No leads match your filters."}
          </div>
          <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4 }}>
            {tab === "reserved"
              ? "When an admin assigns a lead to you, it will appear here."
              : tab === "network"
              ? "Network-exclusive leads will appear here when available."
              : "Try adjusting your filters or check back later."}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          leadId={selectedLead}
          leadSummary={selectedLeadData}
          onClose={() => setSelectedLead(null)}
          onPurchased={handlePurchased}
        />
      )}
    </div>
  );
}
