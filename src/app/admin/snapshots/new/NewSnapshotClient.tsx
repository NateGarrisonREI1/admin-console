"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { type Job, findLocalJob } from "../../_data/localJobs";
import { upsertLocalSnapshot, type SnapshotDraft } from "../../_data/localSnapshots";
import { loadLocalCatalog, type CatalogSystem, type LeafTierKey } from "../../_data/localCatalog";

import { calculateLeafPreview } from "../../_data/leafCalculations";

import { loadIncentives, type Incentive } from "../../_data/incentives/incentivesModel";
import {
  getIncentivesForSystemType,
  INCENTIVE_COPY,
  normalizeSystemType,
  type IncentiveResource,
  type IncentiveAmount,
} from "../../_data/incentives/incentiveResolver";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function nowIso() {
  return new Date().toISOString();
}

function parseNum(v: string) {
  const cleaned = (v || "").replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toNumberOr(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function midpoint(min?: number, max?: number): number | null {
  if (typeof min !== "number" || typeof max !== "number") return null;
  return (min + max) / 2;
}

function pickDefaultNumber(val: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "number" && Number.isFinite(val)) return String(val);
  if (typeof val === "string") return val.replace(/[^0-9.]/g, "");
  return "";
}

/* ---------- Incentive formatting ---------- */

function formatAmount(amount?: IncentiveAmount): string {
  if (!amount) return "";
  if (amount.kind === "text") return amount.value;
  if (amount.kind === "flat") return `$${amount.value}`;
  if (amount.kind === "range") return `$${amount.min}–$${amount.max}`;
  return "";
}

function buildIncentivesNotesBlockFromResolver(selected: IncentiveResource[]) {
  if (!selected.length) return "";

  const disclaimer = INCENTIVE_COPY.find((x) => x.key === "general_disclaimer")?.body ?? "";
  const fedBlurb = INCENTIVE_COPY.find((x) => x.key === "federal_tax_credit_blurb")?.body ?? "";
  const utilBlurb = INCENTIVE_COPY.find((x) => x.key === "utility_rebate_blurb")?.body ?? "";

  const lines: string[] = [];
  lines.push("Incentives (auto-added)", "");

  if (disclaimer) lines.push(disclaimer, "");
  if (fedBlurb) lines.push(`• ${fedBlurb}`);
  if (utilBlurb) lines.push(`• ${utilBlurb}`);
  lines.push("");

  for (const r of selected) {
    const amt = formatAmount(r.amount);
    lines.push(`- ${r.programName}${amt ? ` — ${amt}` : ""}`);
    if (r.shortBlurb) lines.push(`  ${r.shortBlurb}`);
    if (r.links?.length) {
      for (const l of r.links) lines.push(`  Link: ${l.label} — ${l.url}`);
    }
  }

  return lines.join("\n").trim();
}

function buildIncentivesNotesBlockFromIds(selected: Incentive[]) {
  if (!selected.length) return "";

  const lines: string[] = [];
  lines.push("Incentives (auto-added)", "");

  for (const i of selected) {
    lines.push(`- ${i.title} (${i.level})`);
    if (i.valueText) lines.push(`  ${i.valueText}`);
    if (i.url) lines.push(`  Link: ${i.url}`);
  }

  return lines.join("\n").trim();
}

function firstEnabledTier(sys: CatalogSystem | null): LeafTierKey {
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
    [catalog, catalogId]
  );

  const [tier, setTier] = useState<LeafTierKey>("good");
  useEffect(() => {
    if (selectedCatalog) setTier(firstEnabledTier(selectedCatalog));
  }, [selectedCatalog]);

  const [annualUtilitySpend, setAnnualUtilitySpend] = useState("2400");
  const [systemShare, setSystemShare] = useState("0.4");
  const [expectedLife, setExpectedLife] = useState("15");
  const [partialFailure, setPartialFailure] = useState(false);

  const tierCfg: any = selectedCatalog ? (selectedCatalog as any).tiers?.[tier] : null;
  const tierCostMin = typeof tierCfg?.installCostMin === "number" ? tierCfg.installCostMin : undefined;
  const tierCostMax = typeof tierCfg?.installCostMax === "number" ? tierCfg.installCostMax : undefined;

  const calc = useMemo(() => {
    return calculateLeafPreview({
      tier,
      annualUtilitySpend: toNumberOr(annualUtilitySpend, 2400),
      systemShare: toNumberOr(systemShare, 0.4),
      expectedLife: toNumberOr(expectedLife, 15),
      ageYears: toNumberOr(existingSystem?.ageYears, 12),
      wear: toNumberOr(existingSystem?.wear, 3),
      partialFailure,
      installCostMin: tierCostMin,
      installCostMax: tierCostMax,
    });
  }, [
    tier,
    annualUtilitySpend,
    systemShare,
    expectedLife,
    existingSystem,
    partialFailure,
    tierCostMin,
    tierCostMax,
  ]);

  /* ─────────────────────────────────────────────
     SAVE
  ────────────────────────────────────────────── */

  function onSave() {
    if (!job || !existingSystem) return;

    const draft: SnapshotDraft = {
      id: `snap_${Math.random().toString(16).slice(2)}_${Date.now()}`,
      jobId: job.id,
      systemId: existingSystem.id,
      createdAt: nowIso(),
      updatedAt: nowIso(),

      tierKey: tier,

      calculationInputs: {
        annualUtilitySpend: toNumberOr(annualUtilitySpend, 2400),
        systemShare: toNumberOr(systemShare, 0.4),
        expectedLife: toNumberOr(expectedLife, 15),
        partialFailure,
      },

      existing: {
        type: String(existingSystem.type ?? ""),
        subtype: String(existingSystem.subtype ?? ""),
        ageYears: typeof existingSystem.ageYears === "number" ? existingSystem.ageYears : null,
        operational: String(existingSystem.operational ?? ""),
        wear: typeof existingSystem.wear === "number" ? existingSystem.wear : null,
        maintenance: String(existingSystem.maintenance ?? ""),
      },

      suggested: {
        name: "Proposed Upgrade",
        catalogSystemId: catalogId || null,
        estCost: null,
        estAnnualSavings: null,
        estPaybackYears: null,
        notes: "",
      },
    };

    upsertLocalSnapshot(draft);
    router.push(`/admin/jobs/${job.id}?snapSaved=1`);
  }

  if (!job || !existingSystem) {
    return <div className="rei-card">Invalid job or system.</div>;
  }

  return (
    <div className="rei-card">
      <button className="rei-btn rei-btnPrimary" onClick={onSave}>
        Save Snapshot
      </button>
    </div>
  );
}
