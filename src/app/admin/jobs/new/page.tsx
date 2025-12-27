"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Job } from "../../_data/mockJobs";
import { upsertLocalJob } from "../../_data/localJobs";

declare global {
  interface Window {
    google?: any;
  }
}

function makeMockJobId() {
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `job_${n}`;
}

function loadGoogleMapsPlaces(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();

  // Already loading?
  const existing = document.querySelector<HTMLScriptElement>('script[data-rei="gmaps"]');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps script")));
    });
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    s.async = true;
    s.defer = true;
    s.dataset.rei = "gmaps";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(s);
  });
}

function getComponent(components: any[], type: string): string | "" {
  const c = (components || []).find((x) => (x.types || []).includes(type));
  return c?.short_name || c?.long_name || "";
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
  const [stateCode, setStateCode] = useState("");
  const [sqft, setSqft] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [reportId, setReportId] = useState(defaultReportId);

  const [gmapsReady, setGmapsReady] = useState(false);
  const addressRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);

  const canSubmit = customerName.trim().length > 1;

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      // No key => page still works, just no autocomplete
      return;
    }

    let cancelled = false;

    loadGoogleMapsPlaces(key)
      .then(() => {
        if (cancelled) return;
        setGmapsReady(true);

        // Initialize autocomplete once
        if (!addressRef.current) return;
        if (autocompleteRef.current) return;
        if (!window.google?.maps?.places?.Autocomplete) return;

        const ac = new window.google.maps.places.Autocomplete(addressRef.current, {
          types: ["address"],
          componentRestrictions: { country: "us" },
          fields: ["address_components", "formatted_address"],
        });

        ac.addListener("place_changed", () => {
          const place = ac.getPlace?.();
          const formatted = place?.formatted_address || "";
          const comps = place?.address_components || [];

          const postal = getComponent(comps, "postal_code");
          const admin1 = getComponent(comps, "administrative_area_level_1"); // OR, WA, etc.

          if (formatted) setAddress(formatted);
          if (postal) setZip(postal);
          if (admin1) setStateCode(admin1);
        });

        autocompleteRef.current = ac;
      })
      .catch((err) => {
        console.warn("[GMAPS] Autocomplete failed to load:", err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const jobId = makeMockJobId();
    const now = new Date().toISOString();

    const job: Job = {
      id: jobId,
      reportId: reportId.trim() || jobId,
      customerName: customerName.trim(),
      address: address.trim() || undefined,
      zip: zip.trim() || undefined,
      state: stateCode.trim() || undefined,
      sqft: sqft.trim() ? Number(sqft) : undefined,
      yearBuilt: yearBuilt.trim() ? Number(yearBuilt) : undefined,
      createdAt: now,
      systems: [],
    };

    upsertLocalJob(job);
    router.push(`/admin/jobs/${jobId}`);
  }

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

        <Field label={`Property Address${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (gmapsReady ? " (autocomplete on)" : " (loading autocomplete…)") : ""}`}>
          <input
            ref={addressRef}
            className="rei-search"
            style={{ minWidth: "100%" }}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Start typing… (e.g., 995 SE 21st Ave)"
            autoComplete="off"
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Zip Code (used for incentive matching)">
            <input
              className="rei-search"
              style={{ minWidth: "100%" }}
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="e.g., 97123"
              inputMode="numeric"
            />
          </Field>

          <Field label="State">
            <input
              className="rei-search"
              style={{ minWidth: "100%" }}
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
              placeholder="e.g., OR"
            />
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

        {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            Tip: Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable address autocomplete.
          </div>
        )}
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
