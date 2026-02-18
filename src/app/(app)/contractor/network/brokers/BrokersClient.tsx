"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BrokersPageData, BrokerConnection, AvailableBroker } from "./actions";
import { requestBrokerConnection } from "./actions";

// ─── Design Tokens ──────────────────────────────────────────────────
const CARD = "#1e293b";
const BORDER = "#334155";
const TEXT = "#f1f5f9";
const TEXT_SEC = "#cbd5e1";
const TEXT_DIM = "#64748b";
const TEXT_MUTED = "#94a3b8";
const EMERALD = "#10b981";

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Component ──────────────────────────────────────────────────────
export default function BrokersClient({ data }: { data: BrokersPageData }) {
  const router = useRouter();
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const handleRequest = async (brokerId: string) => {
    setRequestingId(brokerId);
    try {
      await requestBrokerConnection(brokerId);
      setSentIds((prev) => new Set(prev).add(brokerId));
      router.refresh();
    } catch {
      // silently handle – the server action throws on duplicate
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <div style={{ padding: 28 }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>
        My Brokers
      </h1>
      <p style={{ fontSize: 13, color: TEXT_DIM, margin: "4px 0 24px" }}>
        Broker networks you belong to
      </p>

      {/* ── Connected Brokers ───────────────────────────────────── */}
      {data.connections.length === 0 ? (
        <p style={{ fontSize: 14, color: TEXT_MUTED }}>
          You&apos;re not connected to any brokers yet.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {data.connections.map((c: BrokerConnection) => (
            <div
              key={c.id}
              style={{
                backgroundColor: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>
                {c.broker_name || c.broker_email || "Unknown Broker"}
              </div>

              {/* Contact info */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 6 }}>
                {c.broker_email && (
                  <a
                    href={`mailto:${c.broker_email}`}
                    style={{ fontSize: 12, color: "#3b82f6", textDecoration: "none" }}
                  >
                    {c.broker_email}
                  </a>
                )}
                {c.broker_phone && (
                  <a
                    href={`tel:${c.broker_phone}`}
                    style={{ fontSize: 12, color: "#3b82f6", textDecoration: "none" }}
                  >
                    {c.broker_phone}
                  </a>
                )}
              </div>

              {/* Stats badges */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 12,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: TEXT_SEC,
                    backgroundColor: BORDER,
                    padding: "3px 8px",
                    borderRadius: 6,
                  }}
                >
                  {c.leads_count} lead{c.leads_count !== 1 ? "s" : ""}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: TEXT_SEC,
                    backgroundColor: BORDER,
                    padding: "3px 8px",
                    borderRadius: 6,
                  }}
                >
                  {c.jobs_completed} completed
                </span>
              </div>

              {/* Connected since */}
              <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 12 }}>
                Connected since {formatDate(c.connected_since)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Browse Brokers ──────────────────────────────────────── */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: 0 }}>
          Find More Brokers
        </h2>
        <p style={{ fontSize: 13, color: TEXT_DIM, margin: "4px 0 16px" }}>
          Connect with brokers in your area to access network-exclusive leads.
        </p>

        {data.available.length === 0 ? (
          <p style={{ fontSize: 14, color: TEXT_MUTED }}>
            No additional brokers found.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 16,
            }}
          >
            {data.available.map((b: AvailableBroker) => {
              const isSent = sentIds.has(b.id);
              const isLoading = requestingId === b.id;

              return (
                <div
                  key={b.id}
                  style={{
                    backgroundColor: CARD,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 12,
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>
                      {b.name || b.email || "Unknown Broker"}
                    </div>
                    {b.email && (
                      <a
                        href={`mailto:${b.email}`}
                        style={{
                          fontSize: 12,
                          color: "#3b82f6",
                          textDecoration: "none",
                          display: "inline-block",
                          marginTop: 6,
                        }}
                      >
                        {b.email}
                      </a>
                    )}
                  </div>

                  <div style={{ marginTop: 14 }}>
                    {isSent ? (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: EMERALD,
                        }}
                      >
                        Request sent!
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleRequest(b.id)}
                        style={{
                          backgroundColor: EMERALD,
                          color: "#ffffff",
                          fontSize: 12,
                          fontWeight: 700,
                          border: "none",
                          borderRadius: 6,
                          padding: "7px 14px",
                          cursor: isLoading ? "not-allowed" : "pointer",
                          opacity: isLoading ? 0.6 : 1,
                        }}
                      >
                        {isLoading ? "Sending..." : "Request to Join"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
