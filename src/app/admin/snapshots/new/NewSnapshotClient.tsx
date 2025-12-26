"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { MOCK_JOBS, type Job } from "../../_data/mockJobs";
import { findLocalJob } from "../../_data/localJobs";
import { upsertLocalSnapshot, type SnapshotDraft } from "../../_data/localSnapshots";

// ✅ Your catalog file:
import * as CatalogModule from "../../_data/mockSystems";

type CatalogItem = {
  id: string;
  name: string;

  // optional descriptive fields
  replaces?: string;
  benefits?: string;

  // normalized defaults used by Apply button
  defaultCost?: number | null;
  defaultSavingsYr?: number | null;
  defaultPaybackYears?: number | null;
  defaultNotes?: string;
};

const FALLBACK_CATALOG: CatalogItem[] = [
  {
    id: "cat_hp_ducted_hi",
    name: "Ducted Heat Pump (High Efficiency)",
    replaces: "gas furnace + AC",
    benefits: "Better comfort • Lower CO₂",
    defaultCost: 14000,
    defaultSavingsYr: 900,
    defaultPaybackYears: 12,
    defaultNotes: "Verify electrical capacity, duct condition, and sizing.",
  },
];

function nowIso() {
  return new Date().toISOString();
}

function pickFirstArrayExport(mod: any): any[] {
  if (!mod) return [];
  const candidates = [
    mod.MOCK_SYSTEMS,
    mod.MOCK_SYSTEM_CATALOG,
    mod.SYSTEMS_CATALOG,
    mod.CATALOG,
    mod.SYSTEMS,
    mod.default,
  ];
  for (const c of candidates) if (Array.isArray(c)) return c;

  for (const k of Object.keys(mod)) {
    const v = mod[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

function toNumberMaybe(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function midpointFromRange(v: any): number | null {
  if (!v || typeof v !== "object") return null;
  const a = toNumberMaybe(v.min ?? v.low ?? v.from);
  const b = toNumberMaybe(v.max ?? v.high ?? v.to);
  if (a === null || b === null) return null;
  return Math.round((a + b) / 2);
}

function firstNumber(...vals: any[]): number | null {
  for (const v of vals) {
    const n = toNumberMaybe(v);
    if (n !== null) return n;
    const mid = midpointFromRange(v);
    if (mid !== null) return mid;
  }
  return null;
}

function normalizeCatalog(raw: any[]): CatalogItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((x: any, idx: number) => {
      const id =
        String(
          x.id ??
            x.systemId ??
            x.catalogId ??
            x.key ??
            x.slug ??
            x.modelNumber ??
            `cat_${idx}`
        ) || `cat_${idx}`;

      const name = String(
        x.name ??
          x.title ??
          x.displayName ??
          x.label ??
          x.systemName ??
          "Catalog System"
      );

      const replaces =
        x.replaces ??
        x.replacesText ??
        x.replaceText ??
        x.replacesSystem ??
        x.replacementFor ??
        undefined;

      const benefits =
        x.benefits ??
        x.benefitText ??
        x.shortBlurb ??
        x.summary ??
        x.oneLiner ??
        undefined;

      // ✅ FIX: support your real schema: defaultAssumptions.estCost / estAnnualSavings / estPaybackYears
      const da = x.defaultAssumptions ?? {};

      const defaultCost = firstNumber(
        da.estCost,
        x.defaultCost,
        x.estCost,
        x.cost,
        x.price,
        x.estimatedCost,
        x.totalCost,
        x.installCost,
        x.unitCost,
        x.costRange,
        x.leafRange,
        x.priceRange,
        x.range
      );

      const defaultSavingsYr = firstNumber(
        da.estAnnualSavings,
        x.defaultSavingsYr,
        x.estSavingsYr,
        x.savingsYr,
        x.savingsPerYear,
        x.savings_per_year,
        x.estAnnualSavings,
        x.annualSavings,
        x.yearlySavings,
        x.savingsAnnual,
        x.savingsRange
      );

      const defaultPaybackYears = firstNumber(
        da.estPaybackYears,
        x.defaultPaybackYears,
        x.paybackYears,
        x.payback,
        x.estPaybackYears,
        x.simplePaybackYears,
        x.simplePayback
      );

      const defaultNotes = String(
        x.defaultNotes ??
          da.notes ??
          x.notes ??
          x.longNotes ??
          x.details ??
          x.description ??
          ""
      )
        .trim()
        .slice(0, 5000);

      return {
        id,
        name,
        replaces: replaces ? String(replaces) : undefined,
        benefits: benefits ? String(benefits) : undefined,
        defaultCost,
        defaultSavingsYr,
        defaultPaybackYears,
        defaultNotes: defaultNotes || undefined,
      } as CatalogItem;
    })
    .filter((c: CatalogItem) => !!c?.id && !!c?.name);
}

export default function NewSnapshotClient({
  jobId,
  systemId,
}: {
  jobId: string;
  systemId: string;
}) {
  const router = useRouter();

  const job: Job | null = useMemo(() => {
    if (!jobId) return null;
    return findLocalJob(jobId) ?? MOCK_JOBS.find((j) => j.id === jobId) ?? null;
  }, [jobId]);

  const existingSystem = useMemo(() => {
    if (!job) return null;
    const sys = (job.systems || []).find((s: any) => s.id === systemId);
    return sys ?? null;
  }, [job, systemId]);

  const catalog: CatalogItem[] = useMemo(() => {
    const raw = pickFirstArrayExport(CatalogModule as any);
    const normalized = normalizeCatalog(raw);
    return normalized.length ? normalized : FALLBACK_CATALOG;
  }, []);

  const [catalogId, setCatalogId] = useState<string>("");

  const selectedCatalog = useMemo(() => {
    if (!catalogId) return null;
    return catalog.find((c) => c.id === catalogId) ?? null;
  }, [catalogId, catalog]);

  // Form state
  const [suggestedName, setSuggestedName] = useState("");
  const [estCost, setEstCost] = useState<string>("");
  const [estAnnualSavings, setEstAnnualSavings] = useState<string>("");
  const [estPaybackYears, setEstPaybackYears] = useState<string>("");
  const [notes, setNotes] = useState("");

  const backHref = job ? `/admin/jobs/${job.id}` : "/admin/jobs";

  function parseNum(v: string) {
    const cleaned = (v || "").replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function applyCatalogDefaults() {
    if (!selectedCatalog) return;

    // name: only fill if blank (so user can type custom)
    setSuggestedName((prev) => (prev.trim() ? prev : selectedCatalog.name));

    // ✅ numeric fields: OVERWRITE so it’s obvious it worked
    setEstCost(
      selectedCatalog.defaultCost !== null && selectedCatalog.defaultCost !== undefined
        ? String(selectedCatalog.defaultCost)
        : ""
    );
    setEstAnnualSavings(
      selectedCatalog.defaultSavingsYr !== null && selectedCatalog.defaultSavingsYr !== undefined
        ? String(selectedCatalog.defaultSavingsYr)
        : ""
    );
    setEstPaybackYears(
      selectedCatalog.defaultPaybackYears !== null && selectedCatalog.defaultPaybackYears !== undefined
        ? String(selectedCatalog.defaultPaybackYears)
        : ""
    );

    // notes: append catalog notes if present
    setNotes((prev) => {
      const base = prev.trim();
      const catNotes = selectedCatalog.defaultNotes?.trim() ?? "";
      if (!catNotes) return base;
      if (!base) return catNotes;
      if (base.includes(catNotes)) return base;
      return `${base}\n\nCatalog notes: ${catNotes}`;
    });
  }

  function onSave() {
    if (!job || !existingSystem) return;

    if (!suggestedName.trim()) {
      alert("Suggested system name is required.");
      return;
    }

    const draft: SnapshotDraft = {
      id: `snap_${Math.random().toString(16).slice(2)}_${Date.now()}`,
      jobId: job.id,
      systemId: existingSystem.id,
      createdAt: nowIso(),
      updatedAt: nowIso(),

      existing: {
        type: existingSystem.type ?? "",
        subtype: existingSystem.subtype ?? "",
        ageYears: existingSystem.ageYears ?? null,
        operational: existingSystem.operational ?? "",
        wear: existingSystem.wear ?? null,
        maintenance: existingSystem.maintenance ?? "",
      },

      suggested: {
        name: suggestedName.trim(),
        catalogSystemId: catalogId || null,
        estCost: parseNum(estCost),
        estAnnualSavings: parseNum(estAnnualSavings),
        estPaybackYears: parseNum(estPaybackYears),
        notes: notes.trim(),
      },
    };

    upsertLocalSnapshot(draft);
    router.push(`/admin/jobs/${job.id}?snapSaved=1`);
  }

  if (!jobId || !systemId) {
    return (
      <div className="rei-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Missing URL parameters</div>
        <div style={{ color: "var(--muted)" }}>
          Expected <code>?jobId=...</code> and <code>&amp;systemId=...</code>.
        </div>
        <Link className="rei-btn" href="/admin/jobs" style={{ width: "fit-content" }}>
          ← Back to Jobs
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="rei-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Job not found</div>
        <div style={{ color: "var(--muted)" }}>
          No job exists with id: <code>{jobId}</code>
        </div>
        <Link className="rei-btn" href="/admin/jobs" style={{ width: "fit-content" }}>
          ← Back to Jobs
        </Link>
      </div>
    );
  }

  if (!existingSystem) {
    return (
      <div className="rei-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Existing system not found</div>
        <div style={{ color: "var(--muted)" }}>
          No system exists with id: <code>{systemId}</code> for this job.
        </div>
        <Link className="rei-btn" href={backHref} style={{ width: "fit-content" }}>
          ← Back to Job
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="rei-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>New LEAF System Snapshot</div>
            <div style={{ color: "var(--muted)", marginTop: 6 }}>
              Job: <b>{job.customerName}</b> — <span style={{ opacity: 0.75 }}>{job.reportId}</span>
            </div>
          </div>

          <Link className="rei-btn" href={backHref} style={{ width: "fit-content" }}>
            ← Back to Job
          </Link>
        </div>
      </div>

      <div className="rei-card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Existing System (from worksheet)</div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, background: "white" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <span style={{ fontWeight: 800 }}>Type:</span> {existingSystem.type}
            </div>
            <div>
              <span style={{ fontWeight: 800 }}>Subtype:</span> {existingSystem.subtype}
            </div>
            <div>
              <span style={{ fontWeight: 800 }}>Age:</span> {existingSystem.ageYears ?? "—"} yrs
            </div>
            <div>
              <span style={{ fontWeight: 800 }}>Operational:</span> {existingSystem.operational ?? "—"}
            </div>
            <div>
              <span style={{ fontWeight: 800 }}>Wear:</span> {existingSystem.wear ?? "—"}/5
            </div>
            <div>
              <span style={{ fontWeight: 800 }}>Maintenance:</span> {existingSystem.maintenance ?? "—"}
            </div>
          </div>

          <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 12 }}>
            This data was captured from the worksheet so your snapshot has context.
          </div>
        </div>
      </div>

      <div className="rei-card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Suggested Upgrade (Proposed)</div>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 700 }}>Choose from Systems Catalog (optional)</div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={catalogId}
                onChange={(e) => setCatalogId(e.target.value)}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  minWidth: 320,
                  background: "white",
                }}
              >
                <option value="">— Select a catalog system —</option>
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="rei-btn"
                onClick={applyCatalogDefaults}
                disabled={!selectedCatalog}
                style={{
                  opacity: selectedCatalog ? 1 : 0.6,
                  cursor: selectedCatalog ? "pointer" : "not-allowed",
                }}
              >
                Apply catalog defaults
              </button>
            </div>

            {selectedCatalog ? (
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                {selectedCatalog.replaces ? <>From catalog • Replaces {selectedCatalog.replaces}</> : "From catalog"}
                {selectedCatalog.benefits ? <> • {selectedCatalog.benefits}</> : null}
              </div>
            ) : (
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                Catalog numbers are starting assumptions. You can override everything below.
              </div>
            )}
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 700 }}>
              Suggested system name <span style={{ color: "#ef4444" }}>(required)</span>
            </div>
            <input
              value={suggestedName}
              onChange={(e) => setSuggestedName(e.target.value)}
              placeholder="e.g., Heat Pump Upgrade"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
            />
            <div style={{ color: "var(--muted)", fontSize: 12 }}>
              Tip: use catalog + tweak later. Or type a custom upgrade name.
            </div>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 700 }}>Est. Cost ($)</div>
              <input
                value={estCost}
                onChange={(e) => setEstCost(e.target.value)}
                placeholder="e.g., 12000"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 700 }}>Est. Savings / yr ($)</div>
              <input
                value={estAnnualSavings}
                onChange={(e) => setEstAnnualSavings(e.target.value)}
                placeholder="e.g., 350"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 700 }}>Est. Payback (yrs)</div>
              <input
                value={estPaybackYears}
                onChange={(e) => setEstPaybackYears(e.target.value)}
                placeholder="e.g., 12"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 700 }}>Notes / highlights</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Short notes to appear on snapshot/report"
              rows={4}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="rei-btn rei-btnPrimary" type="button" onClick={onSave}>
              Save Snapshot
            </button>
          </div>

          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            Saved snapshots are stored in your browser (localStorage) for now.
          </div>
        </div>
      </div>
    </div>
  );
}
