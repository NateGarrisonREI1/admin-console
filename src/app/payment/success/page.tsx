import { CheckCircleIcon } from "@heroicons/react/24/outline";

export default function PaymentSuccessPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        padding: 24,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        {/* Logo / Brand */}
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#f1f5f9",
            marginBottom: 32,
          }}
        >
          <span style={{ color: "#10b981" }}>REI</span> Energy Services
        </div>

        {/* Success icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "rgba(16,185,129,0.15)",
            border: "2px solid #10b981",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 24px",
          }}
        >
          <CheckCircleIcon
            style={{ width: 44, height: 44, color: "#10b981" }}
          />
        </div>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "#f1f5f9",
            marginBottom: 12,
          }}
        >
          Payment Successful
        </h1>

        <p
          style={{
            fontSize: 15,
            color: "#94a3b8",
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          Thank you for your payment. You will receive your receipt and LEAF Home
          Energy Report via email shortly.
        </p>

        <div
          style={{
            borderTop: "1px solid rgba(51,65,85,0.5)",
            paddingTop: 24,
          }}
        >
          <div style={{ fontSize: 13, color: "#475569", marginBottom: 4 }}>
            Renewable Energy Incentives
          </div>
          <div style={{ fontSize: 12, color: "#334155" }}>
            Questions? Contact us at support@renewableenergyincentives.com
          </div>
        </div>
      </div>
    </div>
  );
}
