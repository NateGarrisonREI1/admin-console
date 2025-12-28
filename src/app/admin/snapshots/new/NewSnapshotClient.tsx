"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { type Job, findLocalJob } from "../../_data/localJobs";
import { upsertLocalSnapshot, type SnapshotDraft } from "../../_data/localSnapshots";
import { loadLocalCatalog, type CatalogSystem, type LeafTierKey } from "../../_data/localCatalog";

import { calculateLeafPreview } from "../../_data/leafCalculations";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function nowIso() {
  return new Date().toISOString();
}

function toNumberOr(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function midpoint(min?: number, max?: number): number | null {
  if (typeof min !== "number" || typeof max !== "number") return null;
  return (min + max) / 2;
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

  /* ---------- Job / System ---------- */

  const job: Job | null = useMemo(() => {
    return jobId ? findLocalJob(jobId) ?? null : null;
  }, [jobId]);

  const existingSystem = useMemo(() => {
    if (!job) return null;
    return (job.systems ?? []).find((s: any) => s.id === systemId) ?? null;
  }, [job, systemId]);

  /* ---------- Catalog ---------- */

  const [catalog, setCatalog] = useState<CatalogSystem[]>([]);
  useEffect(() => {
    setCatalog(loadLocalCatalog());
    const onStorage = () => setCatalog(loadLocalCatalog());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const [catalogId, setCatalogId] = useState("");
  const selectedCatalog = useMemo(
    () => catalog.find((c) => c.id === catalogId) ?? null,
    [catalogId, catalog]
  );

  /* ---------- Tier ---------- */

  const [tier, setTier] = useState<LeafTierKey>("good");

  const tierCfg: any = selectedCatalog ? (selectedCatalog as any).tiers?.[tier] : null;
  const tierCostMin = typeof tierCfg?.installCostMin === "number" ? tierCfg.installCostMin : undefined;
  const tierCostMax = typeof tierCfg?.installCostMax === "number" ? tierCfg.installCostMax : undefined;

  /* ---------- Calc Inputs ---------- */

  const [annualUtilitySpend, setAnnualUtilitySpend] = useState("2400");
  const [systemShare, setSystemShare] = useState("0.4");
  const [expectedLife, setExpectedLife] = useState("15");
  const [partialFailure, setPartialFailure] = useState(false);

  /* ---------- Calculation ---------- */

  const calc = useMemo(() => {
    if (!existingSystem) {
      return calculateLeafPreview({
        tier,
        annualUtilitySpend: 2400,
        systemShare: 0.4,
        expectedLife: 15,
        ageYears: 10,
        wear: 3,
        partialFailure: false,
      });
    }

    return calculateLeafPreview({
      tier,
      annualUtilitySpend: toNumberOr(annualUtilitySpend, 2400),
      systemShare: toNumberOr(systemShare, 0.4),
      expectedLife: toNumberOr(expectedLife, 15),
      ageYears: toNumberOr((existingSystem as any).ageYears, 10),
      wear: toNumberOr((existingSystem as any).wear, 3),
      partialFailure,
      installCostMin: tierCostMin,
      installCostMax: tierCostMax,
    });
  }, [
    tier,
    annualUtilitySpend,
    systemShare,
    expectedLife,
    partialFailure,
    existingSystem,
    tierCostMin,
    tierCostMax,
  ]);

  const computedAnnualMin = Math.round(calc.annualSavingsRange.min);
  const computedAnnualMax = Math.round(calc.annualSavingsRange.max);
  const computedPayMin = calc.paybackYearsRange.min;
  const computedPayMax = calc.paybackYearsRange.max;

  /* ---------- Snapshot Form ---------- */

  const [suggestedName, setSuggestedName] = useState("");
  const [estCost, setEstCost] = useState("");
  const [estAnnualSavings, setEstAnnualSavings] = useState("");
  const [estPaybackYears, setEstPaybackYears] = useState("");

  /* ---------- Autofill ---------- */

  useEffect(() => {
    if (!estAnnualSavings)
      setEstAnnualSavings(String(Math.round(calc.annualSavingsRange.center)));

    if (!estPaybackYears)
      setEstPaybackYears(calc.paybackYearsRange.center.toFixed(1));

    if (!estCost) {
      const mid = midpoint(tierCostMin, tierCostMax);
      if (mid !== null) setEstCost(String(Math.round(mid)));
    }
  }, [calc, tierCostMin, tierCostMax]);

  /* ---------- Save ---------- */

  function onSave() {
    if (!job || !existingSystem) return;

    const draft: SnapshotDraft = {
      id: `snap_${Math.random().toString(16).slice(2)}`,
      jobId: job.id,
      systemId: existingSystem.id,
      createdAt: nowIso(),
      updatedAt: nowIso(),

      tierKey: tier,
      calculationInputs: {
        annualUtilitySpend: toNumberOr(annualUtilitySpend, 2400),
        systemShare: toNumberOr(systemShare, 0.4),
        expectedUsefulLifeYears: toNumberOr(expectedLife, 15),
        partialFailure,
      },

      existing: {
        type: existingSystem.type ?? "",
        subtype: existingSystem.subtype ?? "",
        ageYears: existingSystem.ageYears ?? null,
        wear: existingSystem.wear ?? null,
      },

      suggested: {
        name: suggestedName || "Proposed System",
        catalogSystemId: catalogId || null,
        estCost: toNumberOr(estCost, 0),
        estAnnualSavings: toNumberOr(estAnnualSavings, 0),
        estPaybackYears: toNumberOr(estPaybackYears, 0),
        notes: "",
      },
    };

    upsertLocalSnapshot(draft);
    router.push(`/admin/jobs/${job.id}`);
  }

  /* ---------- Guards ---------- */

  if (!job || !existingSystem) {
    return (
      <div className="rei-card">
        <Link href="/admin/jobs">← Back to Jobs</Link>
      </div>
    );
  }

  /* ---------- Render ---------- */

  return (
    <div className="rei-card" style={{ display: "grid", gap: 14 }}>
      <h2>New LEAF Snapshot</h2>

      <div>
        <b>Computed Savings:</b>{" "}
        ${computedAnnualMin.toLocaleString()}–${computedAnnualMax.toLocaleString()}/yr
        <br />
        <b>Payback:</b>{" "}
        {computedPayMin.toFixed(1)}–{computedPayMax.toFixed(1)} yrs
      </div>

      <input
        placeholder="Suggested system name"
        value={suggestedName}
        onChange={(e) => setSuggestedName(e.target.value)}
      />

      <input
        placeholder="Estimated cost"
        value={estCost}
        onChange={(e) => setEstCost(e.target.value)}
      />

      <input
        placeholder="Estimated annual savings"
        value={estAnnualSavings}
        onChange={(e) => setEstAnnualSavings(e.target.value)}
      />

      <input
        placeholder="Estimated payback years"
        value={estPaybackYears}
        onChange={(e) => setEstPaybackYears(e.target.value)}
      />

      <button className="rei-btn rei-btnPrimary" onClick={onSave}>
        Save Snapshot
      </button>
    </div>
  );
}
