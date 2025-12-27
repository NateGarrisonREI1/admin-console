"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Job } from "../../_data/mockJobs";
import { upsertLocalJob } from "../../_data/localJobs";

function makeMockJobId() {
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `job_${n}`;
}

function normalizeZip(raw: string) {
  const v = String(raw || "").trim();
  // allow 12345 or 12345-6789
  if (/^\d{5}$/.test(v)) return v;
  if (/^\d{5}-\d{4}$/.test(v)) return v;
  // tolerate users typing spaces
  const compact = v.replace(/\s+/g, "");
  if (/^\d{5}$/.test(compact)) return compact;
  if (/^\d{5}-\d{4}$/.test(compact)) return compact;
  return v; // return as-is (so UI shows what they typed)
}

function isValidZip(raw: string) {
  const v = String(raw || "").trim().replace(/\s+/g, "");
  if (!v) return true; // optional
  return /^\d{5}$/.test(v) || /^\d{5}-\d{4}$/.test(v);
}

export default function NewJobPage() {
  const router = useRouter();

  const defaultReportId = useMemo(() => {
    const n = Math.floor(Math.random() * 9000) + 1000;
    return `LEAF-${n}`;
  }, []);

  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [sqft, setSqft] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [reportId, setReportId] = useState(defaultReportId);

  const canSubmit = customerName.trim().length > 1 && isValidZip(zip);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const jobId = makeMockJobId();
    const now = new Date().toISOString();

    const zipNorm = normalizeZip(zip);
    const job: Job = {
      id: jobId,
      reportId: reportId.trim() || jobId,
      customerName: customerName.trim(),
      address: address.trim() || undefined,
      // ✅ NEW: zip stored on job (non-breaking extra field)
      zip: zipNorm.trim() ? zipNorm.trim() : undefined,
      sqft: sqft.trim() ? Number(sqft) : undefined,
      yearBuilt: yearBuilt.trim() ? Number(yearBuilt) : undefined,
      createdAt: now,
      systems: [], // worksheet will populate this later
    } as any;

    upsertLocalJob(job);
    router.push(`/admin/jobs/${jobId}`);
  }

  const zipOk = isValidZip(zip);

  return (
    <div className="rei-card" style={{ maxWidth: 860, margin: "0 auto" }}>
      <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Create Job</div>
      <div style={{ color: "var(--muted)", marginBottom: 16 }}>
        REI-only v1: create a job → upload inspection → fill worksheet → generate snapshot/report.
      </div>

      <form onSubmit={handleCreate} style={{ display: "grid", gap: 12 }}>
        <Field label="Customer Name *">
          <input
            className="rei-search"
            style={{ minWidth: "100%" }}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="e.g., John & Jane Doe"
          />
        </Field>

        {/* Address + ZIP on the same row (clean + matches your ask) */}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.8fr", gap: 12 }}>
          <Field label="Property Address">
            <input
              className="rei-search"
              style={{ minWidth: "100%" }}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 123 Main St, Hillsboro, OR"
            />
          </Field>

          <Field label="ZIP Code">
            <input
              className="rei-search"
              style={{
                minWidth: "100%",
                borderColor: zipOk ? undefined : "#fecaca",
              }}
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="e.g., 97123"
              inputMode="numeric"
            />
            {!zipOk && (
              <div style={{ marginTop: 6, color: "#b91c1c", fontSize: 12, fontWeight: 700 }}>
                Enter 5-digit ZIP (or ZIP+4).
              </div>
            )}
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Sq Ft">
            <input
              className="rei-search"
              style={{ minWidth: "100%" }}
              value={sqft}
              onChange={(e) => setSqft(e.target.value)}
              placeholder="e.g., 1450"
              inputMode="numeric"
            />
          </Field>

          <Field label="Year Built">
            <input
              className="rei-search"
              style={{ minWidth: "100%" }}
              value={yearBuilt}
              onChange={(e) => setYearBuilt(e.target.value)}
              placeholder="e.g., 1925"
              inputMode="numeric"
            />
          </Field>
        </div>

        <Field label="Report ID">
          <input
            className="rei-search"
            style={{ minWidth: "100%" }}
            value={reportId}
            onChange={(e) => setReportId(e.target.value)}
          />
        </Field>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
          <button
            className="rei-btn"
            type="button"
            onClick={() => router.push("/admin/jobs")}
            style={{ background: "transparent", border: "1px solid var(--border)" }}
          >
            Cancel
          </button>

          <button
            className="rei-btn rei-btnPrimary"
            type="submit"
            disabled={!canSubmit}
            style={{ opacity: canSubmit ? 1 : 0.6 }}
          >
            Create Job
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "var(--muted)" }}>{label}</div>
      {children}
    </label>
  );
}
