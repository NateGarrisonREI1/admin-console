"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

type SessionInfo = {
  customer_name: string | null;
  amount_total: number | null;
  service_name: string | null;
};

export default function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [info, setInfo] = useState<SessionInfo | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/stripe/session-details?session_id=${sessionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setInfo(data); })
      .catch(() => {});
  }, [sessionId]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        padding: "48px 24px env(safe-area-inset-bottom, 24px)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 440, width: "100%" }}>
        {/* Logo */}
        <img
          src="/images/rei-logo.png"
          alt="REI Energy Services"
          style={{
            maxWidth: 200,
            height: "auto",
            margin: "0 auto 40px",
            display: "block",
          }}
        />

        {/* Success icon with animation */}
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            background: "rgba(16,185,129,0.15)",
            border: "2px solid #10b981",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 28px",
            animation: "scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <CheckCircleIcon
            style={{ width: 48, height: 48, color: "#10b981" }}
          />
        </div>
        <style>{`
          @keyframes scaleIn {
            0% { transform: scale(0); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#f1f5f9",
            marginBottom: 12,
          }}
        >
          Payment Successful
        </h1>

        {/* Personalized message when session data is available */}
        {info?.customer_name && info?.amount_total ? (
          <p
            style={{
              fontSize: 16,
              color: "#e2e8f0",
              lineHeight: 1.6,
              marginBottom: 8,
            }}
          >
            Hi {info.customer_name}, your{" "}
            <span style={{ color: "#10b981", fontWeight: 700 }}>
              ${info.amount_total.toFixed(2)}
            </span>{" "}
            payment
            {info.service_name ? ` for ${info.service_name}` : ""} was received.
          </p>
        ) : null}

        <p
          style={{
            fontSize: 15,
            color: "#94a3b8",
            lineHeight: 1.6,
            marginBottom: 40,
          }}
        >
          Thank you for your payment. You will receive your receipt and LEAF Home
          Energy Report via email shortly.
        </p>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid rgba(51,65,85,0.5)",
            paddingTop: 24,
          }}
        >
          <div style={{ fontSize: 14, color: "#64748b", marginBottom: 6, fontWeight: 600 }}>
            Renewable Energy Incentives
          </div>
          <div style={{ fontSize: 13, color: "#475569" }}>
            Questions? Contact us at{" "}
            <a
              href="mailto:support@renewableenergyincentives.com"
              style={{ color: "#64748b", textDecoration: "underline" }}
            >
              support@renewableenergyincentives.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
