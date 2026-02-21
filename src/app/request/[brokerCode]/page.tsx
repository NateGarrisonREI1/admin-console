// src/app/request/[brokerCode]/page.tsx
export const dynamic = "force-dynamic";

import { lookupBrokerByCode, incrementReferralVisits, fetchServiceCatalog } from "./actions";
import BrokerClientFormClient from "./BrokerClientFormClient";

export default async function BrokerClientLinkPage({
  params,
}: {
  params: Promise<{ brokerCode: string }>;
}) {
  const { brokerCode } = await params;
  const broker = await lookupBrokerByCode(brokerCode);

  if (!broker) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          padding: 20,
        }}
      >
        <div
          style={{
            maxWidth: 420,
            textAlign: "center",
            background: "#fff",
            borderRadius: 16,
            padding: "48px 32px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 24,
            }}
          >
            !
          </div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#1e293b",
              margin: "0 0 8px",
            }}
          >
            Invalid Referral Link
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#64748b",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            This referral link is not valid. Please check the URL and try again,
            or contact the person who shared this link with you.
          </p>
          <a
            href="/request"
            style={{
              display: "inline-block",
              marginTop: 24,
              padding: "10px 24px",
              borderRadius: 8,
              background: "#10b981",
              color: "#fff",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Go to Request Form
          </a>
        </div>
      </div>
    );
  }

  // Track the visit
  incrementReferralVisits(brokerCode).catch(() => {});

  // Fetch service catalog
  const catalog = await fetchServiceCatalog();

  return (
    <BrokerClientFormClient
      broker={broker}
      brokerCode={brokerCode}
      catalog={catalog}
    />
  );
}
