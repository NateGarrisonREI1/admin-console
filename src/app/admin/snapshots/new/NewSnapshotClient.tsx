"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { findLocalJob } from "../../_data/localJobs";
import { createSnapshotDraft, upsertLocalSnapshot } from "../../_data/localSnapshots";

// Catalog (localStorage-backed)
import { loadLocalCatalog, type CatalogSystem } from "../../_data/localCatalog";

import { calculateLeafPreview } from "../../_data/leafCalculations";

/* ─────────────────────────────────────────────
   Local tier keys for UI only (v0)
───────────────────────────────────────────── */
type UITierKey = "good" | "better" | "best";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function toNumberOr(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function firstEnabledTier(sys: CatalogSystem | null): UITierKey {
  const tiers = (sys as any)?.tiers;
  if (tiers?.good?.enabled) return "good";
  if (tiers?.better?.enabled) return "better";
  if (tiers?.best?.enabled) return "best";
  return "good";
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function NewSnapshotClient({
  jobId,
  systemId,
}: {
  jobId: string;
  systemId: string;
}) {
  const router = useRouter();

  const job = useMemo(() => (jobId ? findLocalJob(jobId) ?? null : null), [jobId]);

  const existingSystem = useMemo(() => {
    if (!job) return null;
    return (job.systems ?? []).find((s: any) => s.id === systemId) ?? null;
  }, [job, systemId]);

  // Load catalog
  const [catalog, setCatalog] = useState<CatalogSystem[]>([]);
  useEffect(() => {
    const refresh = () => setCatalog(loadLocalCatalog());
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  const [catalogId, setCatalogId] = useState("");
  const selectedCatalog = useMemo(
    () => catalog.find((c) => c.id === catalogId) ?? null,
    [catalog, catalogId]
  );

  // Tier (UI only)
  const [tier, setTier] = useState<UITierKey>("good");
  useEffect(() => {
    if (selectedCatalog) setTier(firstEnabledTier(selectedCatalog));
  }, [selectedCatalog]);

  // Inputs (temporary v0 assumptions)
  const [annualUtilitySpend, setAnnualUtilitySpend] = useState("2400");
  const [systemShare, setSystemShare] = useState("0.4");
  const [expectedLife, setExpectedLife] = useState("15");
  const [partialFailure, setPartialFailure] = useState(false);

  // Optional install cost range from catalog tier config
  const tierCfg: any = selectedCatalog ? (selectedCatalog as any).tiers?.[tier] : null;
  const tierCostMin =
    typeof tierCfg?.installCostMin === "number" ? tierCfg.installCostMin : undefined;
  const tierCostMax =
    typeof tierCfg?.installCostMax === "number" ? tierCfg.installCostMax : undefined;

  // Preview calc (IMPORTANT: do NOT pass tier until runtime type exports are stabilized)
  // ALSO: LeafPreviewInput no longer supports 'wear' — do not pass it here.
  const calc = useMemo(() => {
    return calculateLeafPreview({
      annualUtilitySpend: toNumberOr(annualUtilitySpend, 2400),
      systemShare: toNumberOr(systemShare, 0.4),
      expectedLife: toNumberOr(expectedLife, 15),
      ageYears: toNumberOr(existingSystem?.ageYears, 12),
      partialFailure,
      installCostMin: tierCostMin,
      installCostMax: tierCostMax,
    });
  }, [
    annualUtilitySpend,
    systemShare,
    expectedLife,
    existingSystem?.ageYears,
    partialFailure,
    tierCostMin,
    tierCostMax,
  ]);

  function onSave() {
    if (!job || !existingSystem) return;

    const draft = createSnapshotDraft({
      jobId: job.id,
      systemId: existingSystem.id,
      title: existingSystem?.name ? String(existingSystem.name) : "",

      existing: {
        type: String(existingSystem.type ?? ""),
        subtype: String(existingSystem.subtype ?? ""),
        ageYears: typeof existingSystem.ageYears === "number" ? existingSystem.ageYears : null,
        wear: typeof existingSystem.wear === "number" ? existingSystem.wear : null,
        maintenance:
          existingSystem.maintenance === "Good" ||
          existingSystem.maintenance === "Average" ||
          existingSystem.maintenance === "Poor"
            ? existingSystem.maintenance
            : "Average",
        operational: existingSystem.operational === "No" ? "No" : "Yes",
      },

      suggested: {
        catalogSystemId: catalogId || null,
        // store tier as a plain string in v0; runtime will interpret later
        tier: tier as any,
        name: selectedCatalog?.name ? String(selectedCatalog.name) : "Proposed Upgrade",
        notes: "",
      },

      calculationInputs: {
        annualUtilitySpend: toNumberOr(annualUtilitySpend, 2400),
        systemShare: toNumberOr(systemShare, 0.4),
        expectedLife: toNumberOr(expectedLife, 15),
        partialFailure,
      },
    });

    upsertLocalSnapshot(draft);
    router.push(`/admin/jobs/${job.id}?snapSaved=1`);
  }

  if (!job || !existingSystem) {
    return <div className="rei-card">Invalid job or system.</div>;
  }

  return (
    <div className="rei-card" style={{ display: "grid", gap: 14 }}>
      <div style={{ fontWeight: 900, fontSize: 16 }}>Create Snapshot</div>

      <div style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            Choose proposed system (catalog)
          </div>
          <select
            className="rei-input"
            value={catalogId}
            onChange={(e) => setCatalogId(e.target.value)}
          >
            <option value="">— Select —</option>
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.category} — {c.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Tier (UI only)</div>
          <select
            className="rei-input"
            value={tier}
            onChange={(e) => setTier(e.target.value as UITierKey)}
          >
            <option value="good">Good</option>
            <option value="better">Better</option>
            <option value="best">Best</option>
          </select>
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Annual utility spend ($/yr)</div>
            <input
              className="rei-input"
              value={annualUtilitySpend}
              onChange={(e) => setAnnualUtilitySpend(e.target.value)}
              inputMode="decimal"
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>System share (0–1)</div>
            <input
              className="rei-input"
              value={systemShare}
              onChange={(e) => setSystemShare(e.target.value)}
              inputMode="decimal"
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Expected life (years)</div>
            <input
              className="rei-input"
              value={expectedLife}
              onChange={(e) => setExpectedLife(e.target.value)}
              inputMode="decimal"
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 22 }}>
            <input
              type="checkbox"
              checked={partialFailure}
              onChange={(e) => setPartialFailure(e.target.checked)}
            />
            <span style={{ fontSize: 13 }}>Partial failure</span>
          </label>
        </div>

        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12, display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 800 }}>Preview</div>
          <div style={{ fontSize: 13, color: "#374151" }}>
            Annual savings: ${Math.round(calc.annualSavingsRange.center).toLocaleString()}{" "}
            (range ${Math.round(calc.annualSavingsRange.min).toLocaleString()}–$
            {Math.round(calc.annualSavingsRange.max).toLocaleString()})
          </div>
          <div style={{ fontSize: 13, color: "#374151" }}>
            Monthly savings: ${Math.round(calc.monthlySavingsRange.center).toLocaleString()}
          </div>
          <div style={{ fontSize: 13, color: "#374151" }}>
            Payback:{" "}
            {Number.isFinite(calc.paybackYearsRange.center)
              ? calc.paybackYearsRange.center.toFixed(1)
              : "—"}{" "}
            yrs
          </div>
        </div>
      </div>

      <button className="rei-btn rei-btnPrimary" onClick={onSave}>
        Save Snapshot
      </button>
    </div>
  );
}
