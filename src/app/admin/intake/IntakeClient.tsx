"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function IntakeClient() {
  const sp = useSearchParams();
  const tab = sp.get("tab") ?? "broker";
  const jobId = sp.get("jobId") ?? "";

  return (
    <div style={{ padding: 20, display: "grid", gap: 12 }}>
      <div style={{ fontWeight: 900, fontSize: 18 }}>Admin Intake</div>

      <div style={{ color: "#6b7280", fontSize: 13 }}>
        tab: <b>{tab}</b> {jobId ? <>• jobId: <b>{jobId}</b></> : null}
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 14,
          background: "white",
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 800 }}>Next</div>
        <div style={{ color: "#6b7280", fontSize: 13 }}>
          Wire this page to your real intake UI/components. For now this fixes the
          Suspense/useSearchParams build error cleanly.
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/admin/schedule"
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "white",
              fontWeight: 800,
              textDecoration: "none",
              color: "#111827",
            }}
          >
            Go to Schedule
          </Link>

          <Link
            href="/admin"
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "white",
              fontWeight: 800,
              textDecoration: "none",
              color: "#111827",
            }}
          >
            Admin Home
          </Link>
        </div>
      </div>
    </div>
  );
}
