// src/app/(app)/broker/_components/NewRequestModal.tsx
"use client";

import { useState, useEffect } from "react";
import BrokerRequestClient from "../request/BrokerRequestClient";
import type { BrokerProfile } from "../request/actions";
import type { ServiceCategory } from "@/app/request/actions";
import type { ClientLinkInfo } from "../dashboard/actions";

// ─── Design tokens ──────────────────────────────────────────────────

const BG_CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_MUTED = "#94a3b8";
const TEXT_DIM = "#64748b";
const EMERALD = "#10b981";

// ─── Props ──────────────────────────────────────────────────────────

export type NewRequestModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  broker: BrokerProfile | null;
  catalog: ServiceCategory[];
  clientLink: ClientLinkInfo;
  brokerName: string;
};

// ─── Component ──────────────────────────────────────────────────────

export default function NewRequestModal({
  isOpen,
  onClose,
  onSuccess,
  broker,
  catalog,
  clientLink,
  brokerName,
}: NewRequestModalProps) {
  const [step, setStep] = useState<"choice" | "form">("choice");
  const [copied, setCopied] = useState(false);

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("choice");
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const fullLink = clientLink.referralCode
    ? `${baseUrl}/request/${clientLink.referralCode}`
    : "";

  const emailSubject = encodeURIComponent(
    "Schedule Your Home Energy Assessment",
  );
  const emailBody = encodeURIComponent(
    `Hi,\n\nUse this link to schedule your Home Energy Assessment:\n\n${fullLink}\n\nThis will connect you with REI — Renewable Energy Incentives, who will handle everything.\n\nBest,\n${brokerName}`,
  );
  const smsBody = encodeURIComponent(
    `Schedule your Home Energy Assessment here: ${fullLink}`,
  );

  function handleCopy() {
    if (!fullLink) return;
    navigator.clipboard.writeText(fullLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const isForm = step === "form";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: isForm ? "flex-start" : "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        overflowY: "auto",
        padding: isForm ? "24px 16px" : "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0f172a",
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: isForm ? "20px 24px 24px" : "28px 28px 22px",
          width: "100%",
          maxWidth: isForm ? 680 : 460,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          transition: "max-width 0.25s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: isForm ? 12 : 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isForm && (
              <button
                onClick={() => setStep("choice")}
                style={{
                  background: "none",
                  border: "none",
                  color: TEXT_MUTED,
                  fontSize: 18,
                  cursor: "pointer",
                  padding: "4px 8px",
                  lineHeight: 1,
                  borderRadius: 6,
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = TEXT; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_MUTED; }}
              >
                &#8592;
              </button>
            )}
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: TEXT }}>
              {isForm ? "Request a Service" : "New Request"}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: TEXT_DIM,
              fontSize: 20,
              cursor: "pointer",
              padding: "2px 6px",
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* ── Step: Choice ── */}
        {step === "choice" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Option 1: I'll fill it out */}
              <button
                onClick={() => setStep("form")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 18px",
                  borderRadius: 10,
                  background: BG_CARD,
                  border: `1px solid ${BORDER}`,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "border-color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = EMERALD;
                  e.currentTarget.style.background = "rgba(16,185,129,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = BORDER;
                  e.currentTarget.style.background = BG_CARD;
                }}
              >
                <span
                  style={{
                    fontSize: 24,
                    flexShrink: 0,
                    width: 40,
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    background: "rgba(16,185,129,0.1)",
                  }}
                >
                  &#x1F4DD;
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>
                    I&apos;ll fill it out
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                    Fill out the request form on behalf of your client
                  </div>
                </div>
              </button>

              {/* Option 2: Send to my client */}
              <div
                style={{
                  padding: "16px 18px",
                  borderRadius: 10,
                  background: BG_CARD,
                  border: `1px solid ${BORDER}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span
                    style={{
                      fontSize: 24,
                      flexShrink: 0,
                      width: 40,
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 10,
                      background: "rgba(59,130,246,0.1)",
                    }}
                  >
                    &#x1F4E4;
                  </span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>
                      Send to my client
                    </div>
                    <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                      Share a link so your client can fill it out themselves
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                {clientLink.referralCode ? (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: `1px solid ${BORDER}`,
                    }}
                  >
                    <button
                      onClick={handleCopy}
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: `1px solid ${copied ? "rgba(16,185,129,0.4)" : BORDER}`,
                        background: copied ? "rgba(16,185,129,0.12)" : "transparent",
                        color: copied ? EMERALD : TEXT_SEC,
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                    <a
                      href={`sms:?&body=${smsBody}`}
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: `1px solid ${BORDER}`,
                        background: "transparent",
                        color: TEXT_SEC,
                        fontWeight: 600,
                        fontSize: 12,
                        textDecoration: "none",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      Text
                    </a>
                    <a
                      href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: `1px solid ${BORDER}`,
                        background: "transparent",
                        color: TEXT_SEC,
                        fontWeight: 600,
                        fontSize: 12,
                        textDecoration: "none",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      Email
                    </a>
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: `1px solid ${BORDER}`,
                      fontSize: 12,
                      color: TEXT_MUTED,
                    }}
                  >
                    Your client link is being set up...
                  </div>
                )}
              </div>
            </div>

            {/* Stats footer */}
            {clientLink.referralCode && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 16,
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: `1px solid ${BORDER}`,
                  fontSize: 12,
                  color: TEXT_DIM,
                }}
              >
                <span>
                  <strong style={{ color: TEXT_SEC, fontWeight: 700 }}>
                    {clientLink.visits}
                  </strong>{" "}
                  visits
                </span>
                <span>
                  <strong style={{ color: TEXT_SEC, fontWeight: 700 }}>
                    {clientLink.conversions}
                  </strong>{" "}
                  submissions
                </span>
              </div>
            )}
          </>
        )}

        {/* ── Step: Inline Form ── */}
        {step === "form" && broker && (
          <BrokerRequestClient
            broker={broker}
            catalog={catalog}
            embedded
            onSuccess={() => onSuccess()}
          />
        )}

        {step === "form" && !broker && (
          <div style={{ padding: "32px 16px", textAlign: "center", color: TEXT_MUTED, fontSize: 13 }}>
            Unable to load broker profile. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}
