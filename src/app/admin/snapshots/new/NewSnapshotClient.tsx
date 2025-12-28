"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { type Job, findLocalJob } from "../../_data/localJobs";
import { upsertLocalSnapshot, type SnapshotDraft } from "../../_data/localSnapshots";
import { loadLocalCatalog, type CatalogSystem, type LeafTierKey } from "../../_data/localCatalog";

import { calculateLeafPreview } from "../../_data/leafCalculations";

// Incentives (two ways: explicit IDs OR rule-matcher fallback)
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

/* ---------- Incentive formatting (resolver style) ---------- */

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
  lines.push("Incentives (auto-added)");
  lines.push("");

  if (disclaimer) {
    lines.push(disclaimer);
    lines.push("");
  }
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

/* ---------- Incentive formatting (incentivesModel style) ---------- */

function buildIncentivesNotesBlockFromIds(selected: Incentive[]) {
  if (!selected.length) return "";

  const lines: string[] = [];
  lines.push("Incentives (auto-added)");
  lines.push("");

  for (const i of selected) {
    lines.push(`- ${i.title} (${i.level})`);
    if (i.valueText) lines.push(`  ${i.valueText}`);
    if (i.url) lines.push(`  Link: ${i.url}`);
  }

  return lines.join("\n").trim();
}

function firstEnabledTier(sys: CatalogSystem | null): LeafTierKey {
  const tiers = (sys as any)?.tiers as Partial<Record<LeafTierKey, any>> | undefined;
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

  const job: Job | null = useMemo(() => {
    return jobId ? findLocalJob(jobId) ?? null : null;
  }, [jobId]);

  const existingSystem = useMemo(() => {
    if (!job) return null;
    return (job.systems ?? []).find((s: any) => s.id === systemId) ?? null;
  }, [job, systemId]);

  // ✅ Load catalog as STATE so it refreshes after edits
  const [catalog, setCatalog] = useState<CatalogSystem[]>([]);
  useEffect(() => {
    setCatalog(loadLocalCatalog());

    // keep it fresh if another tab modifies storage
    const onStorage = () => setCatalog(loadLocalCatalog());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const [catalogId, setCatalogId] = useState<string>("");
  const selectedCatalog = useMemo(() => {
    if (!catalogId) return null;
    return catalog.find((c: any) => c.id === catalogId) ?? null;
  }, [catalogId, catalog]);

  // Tier selection
  const [tier, setTier] = useState<LeafTierKey>("good");
  useEffect(() => {
    if (!selectedCatalog) return;
    setTier(firstEnabledTier(selectedCatalog));
  }, [catalogId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calc inputs (eventually these get pulled from job/home profile)
  const [annualUtilitySpend, setAnnualUtilitySpend] = useState<string>("2400");
  const [systemShare, setSystemShare] = useState<string>("0.4");
  const [expectedLife, setExpectedLife] = useState<string>("15");
  const [partialFailure, setPartialFailure] = useState<boolean>(false);

  // Pull tier cost range from catalog
  const tierCfg: any = selectedCatalog ? (selectedCatalog as any).tiers?.[tier] : null;
  const tierCostMin = typeof tierCfg?.installCostMin === "number" ? tierCfg.installCostMin : undefined;
  const tierCostMax = typeof tierCfg?.installCostMax === "number" ? tierCfg.installCostMax : undefined;

  const calc = useMemo(() => {
    const annual = toNumberOr(annualUtilitySpend, 2400);
    const share = toNumberOr(systemShare, 0.4);
    const life = toNumberOr(expectedLife, 15);

    const ageYears = toNumberOr((existingSystem as any)?.ageYears, 12);
    const wear = toNumberOr((existingSystem as any)?.wear, 3);

return calculateLeafPreview({
  tier,
  annualUtilitySpend: annual,
  systemShare: share,
  expectedLife: life,
  ageYears,
  wear,
  partialFailure,
  installCostMin: tierCostMin,
  installCostMax: tierCostMax,
});


  }, [
    annualUtilitySpend,
    systemShare,
    expectedLife,
    tier,
    partialFailure,
    existingSystem,
    tierCostMin,
    tierCostMax,
  ]);

  const computedAnnualMin = Math.round(calc.annualSavings.min);
  const computedAnnualMax = Math.round(calc.annualSavings.max);

  const computedPayMin = calc.paybackYears ? calc.paybackYears.min : null;
  const computedPayMax = calc.paybackYears ? calc.paybackYears.max : null;

  // --- Incentives ---
  const [includeIncentivesInNotes, setIncludeIncentivesInNotes] = useState<boolean>(true);

  // A) Preferred: incentives attached by IDs in the catalog system
  const allIncentives = useMemo(() => loadIncentives(), []);
  const attachedIncentives: Incentive[] = useMemo(() => {
    const ids = (selectedCatalog as any)?.incentiveIds as string[] | undefined;
    if (!selectedCatalog || !ids?.length) return [];
    const set = new Set(ids);
    return allIncentives.filter((i) => set.has(i.id));
  }, [selectedCatalog, allIncentives]);

  // B) Fallback: incentives matched by resolver rules/tags
  const resolverMatched: IncentiveResource[] = useMemo(() => {
    if (!selectedCatalog) return [];
    if ((selectedCatalog as any)?.incentiveIds?.length) return [];

    const categoryKey = normalizeSystemType(String((selectedCatalog as any).category ?? ""));
    const tags = Array.isArray((selectedCatalog as any).tags)
      ? (selectedCatalog as any).tags.map((t: any) => String(t || "").toLowerCase().trim()).filter(Boolean)
      : [];

    const ctxTags = [
      ...tags,
      String((existingSystem as any)?.type ?? "").toLowerCase().trim(),
      String((existingSystem as any)?.subtype ?? "").toLowerCase().trim(),
    ].filter(Boolean);

    return getIncentivesForSystemType(categoryKey, { tags: ctxTags });
  }, [selectedCatalog, existingSystem]);

  const [selectedIncentiveIds, setSelectedIncentiveIds] = useState<string[]>([]);
  useEffect(() => {
    if (attachedIncentives.length) setSelectedIncentiveIds(attachedIncentives.map((x) => x.id));
    else setSelectedIncentiveIds(resolverMatched.map((x) => x.id));
  }, [catalogId, attachedIncentives.length, resolverMatched.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedAttached = useMemo(() => {
    const set = new Set(selectedIncentiveIds);
    return attachedIncentives.filter((x) => set.has(x.id));
  }, [attachedIncentives, selectedIncentiveIds]);

  const selectedResolver = useMemo(() => {
    const set = new Set(selectedIncentiveIds);
    return resolverMatched.filter((x) => set.has(x.id));
  }, [resolverMatched, selectedIncentiveIds]);

  // --- Form state ---
  const [suggestedName, setSuggestedName] = useState<string>("");
  const [estCost, setEstCost] = useState<string>("");
  const [estAnnualSavings, setEstAnnualSavings] = useState<string>("");
  const [estPaybackYears, setEstPaybackYears] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [touched, setTouched] = useState<{ cost: boolean; savings: boolean; payback: boolean }>({
    cost: false,
    savings: false,
    payback: false,
  });

  const backHref = job ? `/admin/jobs/${job.id}` : "/admin/jobs";

  function applyCatalogDefaults() {
    if (!selectedCatalog) return;

    setSuggestedName((prev) => (prev.trim() ? prev : String((selectedCatalog as any).name ?? "")));

    const highlights = Array.isArray((selectedCatalog as any).highlights) ? (selectedCatalog as any).highlights : [];
    const hlLine = highlights.length ? highlights.join(" • ") : "";

    setNotes((prev) => {
      const base = prev.trim();
      if (!hlLine) return base;
      if (!base) return hlLine;
      if (base.includes(hlLine)) return base;
      return `${base}\n\n${hlLine}`;
    });

    // Cost midpoint from tier range, fallback to legacy
    const mid = midpoint(tierCostMin, tierCostMax);
    if (!touched.cost) {
      if (mid !== null) setEstCost(String(Math.round(mid)));
      else {
        const da = (selectedCatalog as any).defaultAssumptions ?? {};
        setEstCost((prev) => (prev.trim() ? prev : pickDefaultNumber(da.estCost)));
      }
    }

    // Savings/payback from calc preview
    if (!touched.savings) setEstAnnualSavings(String(Math.round(calc.annualSavings.center)));
    if (!touched.payback && calc.paybackYears) setEstPaybackYears(String(calc.paybackYears.center.toFixed(1)));
  }

  // Auto-fill until user edits
  useEffect(() => {
    if (!selectedCatalog) return;

    if (!touched.savings && !estAnnualSavings.trim()) setEstAnnualSavings(String(Math.round(calc.annualSavings.center)));
    if (!touched.payback && !estPaybackYears.trim() && calc.paybackYears)
      setEstPaybackYears(String(calc.paybackYears.center.toFixed(1)));

    const mid = midpoint(tierCostMin, tierCostMax);
    if (!touched.cost && !estCost.trim() && mid !== null) setEstCost(String(Math.round(mid)));
  }, [
    selectedCatalog,
    tier,
    calc,
    touched.cost,
    touched.savings,
    touched.payback,
    estCost,
    estAnnualSavings,
    estPaybackYears,
    tierCostMin,
    tierCostMax,
  ]);

  function onSave() {
    if (!job || !existingSystem) return;

    if (!suggestedName.trim()) {
      alert("Suggested system name is required.");
      return;
    }

    const userNotes = notes.trim();

    const incentivesBlock =
      includeIncentivesInNotes && (selectedAttached.length || selectedResolver.length)
        ? selectedAttached.length
          ? buildIncentivesNotesBlockFromIds(selectedAttached)
          : buildIncentivesNotesBlockFromResolver(selectedResolver)
        : "";

    const finalNotes =
      incentivesBlock && userNotes ? `${userNotes}\n\n---\n\n${incentivesBlock}` : incentivesBlock || userNotes;

    const draft: SnapshotDraft = {
      id: `snap_${Math.random().toString(16).slice(2)}_${Date.now()}`,
      jobId: job.id,
      systemId: existingSystem.id,
      createdAt: nowIso(),
      updatedAt: nowIso(),

      // ✅ store calc inputs + tier (future: re-run calc via button)
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
        notes: finalNotes,
      },
    };

    upsertLocalSnapshot(draft);
    router.push(`/admin/jobs/${job.id}?snapSaved=1`);
  }

  /* ─────────────────────────────────────────────
     Guards
  ────────────────────────────────────────────── */

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
          No local job exists with id: <code>{jobId}</code>
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

  const tierCostLabel =
    tierCostMin != null && tierCostMax != null
      ? `$${tierCostMin.toLocaleString()}–$${tierCostMax.toLocaleString()}`
      : "—";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="rei-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>New LEAF System Snapshot</div>
            <div style={{ color: "var(--muted)", marginTop: 6 }}>
              Job: <b>{(job as any).customerName ?? "—"}</b> —{" "}
              <span style={{ opacity: 0.75 }}>{(job as any).reportId ?? job.id}</span>
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
          {/* Catalog picker */}
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 700 }}>Choose from Systems Catalog (optional)</div>

            {catalog.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                No systems in your catalog yet. Add systems in <b>Systems Catalog</b> to enable suggestions.
              </div>
            ) : (
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
                  {catalog.map((c: any) => (
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
            )}

            {selectedCatalog ? (
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                From catalog • Type: <b>{normalizeSystemType(String((selectedCatalog as any).category ?? ""))}</b>
                {Array.isArray((selectedCatalog as any).tags) && (selectedCatalog as any).tags.length ? (
                  <>
                    {" "}
                    • tags: <b>{(selectedCatalog as any).tags.join(", ")}</b>
                  </>
                ) : null}
              </div>
            ) : (
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                Select a suggested upgrade to see tier + incentives.
              </div>
            )}
          </div>

          {/* Tier + calc inputs */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, background: "white" }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Snapshot Calculation Inputs</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 700 }}>Tier</div>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as LeafTierKey)}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb", background: "white" }}
                >
                  <option value="good">Good</option>
                  <option value="better">Better</option>
                  <option value="best">Best</option>
                </select>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>
                  Catalog tier cost range: <b>{tierCostLabel}</b>
                </div>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 700 }}>Annual utility spend ($/yr)</div>
                <input
                  value={annualUtilitySpend}
                  onChange={(e) => setAnnualUtilitySpend(e.target.value)}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 700 }}>System share of bill (0–1)</div>
                <input
                  value={systemShare}
                  onChange={(e) => setSystemShare(e.target.value)}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
                />
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 700 }}>Expected life (yrs)</div>
                <input
                  value={expectedLife}
                  onChange={(e) => setExpectedLife(e.target.value)}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
                />
              </label>

              <label style={{ display: "flex", gap: 10, alignItems: "center", paddingTop: 28 }}>
                <input type="checkbox" checked={partialFailure} onChange={(e) => setPartialFailure(e.target.checked)} />
                <div style={{ fontWeight: 700 }}>Partial failure / broken system</div>
              </label>

              <div style={{ color: "var(--muted)", fontSize: 12, paddingTop: 8 }}>
                Computed savings range:{" "}
                <b>
                  ${computedAnnualMin.toLocaleString()}–${computedAnnualMax.toLocaleString()}/yr
                </b>
                <br />
                Computed payback range:{" "}
                <b>
                  {computedPayMin != null && computedPayMax != null
                    ? `${computedPayMin.toFixed(1)}–${computedPayMax.toFixed(1)} yrs`
                    : "—"}
                </b>
              </div>
            </div>
          </div>

          {/* Incentives */}
          {selectedCatalog && (attachedIncentives.length || resolverMatched.length) ? (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, background: "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>
                  Incentives{" "}
                  <span style={{ color: "var(--muted)", fontWeight: 700 }}>
                    {attachedIncentives.length ? "(from catalog)" : "(auto-matched)"}
                  </span>
                </div>

                <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={includeIncentivesInNotes}
                    onChange={(e) => setIncludeIncentivesInNotes(e.target.checked)}
                  />
                  Include incentives in snapshot notes on save
                </label>
              </div>

              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {(attachedIncentives.length ? attachedIncentives : resolverMatched).map((r: any) => {
                  const id = r.id;
                  const checked = selectedIncentiveIds.includes(id);

                  const title = attachedIncentives.length ? r.title : r.programName;
                  const subtitle = attachedIncentives.length ? (r.valueText || "") : (r.shortBlurb || "");
                  const extra = attachedIncentives.length ? "" : formatAmount(r.amount);

                  return (
                    <label
                      key={id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "20px 1fr",
                        gap: 10,
                        alignItems: "start",
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid #eef2f7",
                        background: "#fafafa",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = new Set(selectedIncentiveIds);
                          if (e.target.checked) next.add(id);
                          else next.delete(id);
                          setSelectedIncentiveIds(Array.from(next));
                        }}
                        style={{ marginTop: 2 }}
                      />
                      <div>
                        <div style={{ fontWeight: 900 }}>
                          {title}
                          {extra ? <span style={{ fontWeight: 700, color: "#374151" }}> — {extra}</span> : null}
                        </div>
                        {subtitle ? (
                          <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>{subtitle}</div>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Snapshot fields */}
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 700 }}>
              Suggested system name <span style={{ color: "#ef4444" }}>(required)</span>
            </div>
            <input
              value={suggestedName}
              onChange={(e) => setSuggestedName(e.target.value)}
              placeholder="e.g., High-efficiency gas furnace"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 700 }}>Est. Cost ($)</div>
              <input
                value={estCost}
                onChange={(e) => {
                  setTouched((t) => ({ ...t, cost: true }));
                  setEstCost(e.target.value);
                }}
                placeholder="e.g., 12000"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 700 }}>Est. Savings / yr ($)</div>
              <input
                value={estAnnualSavings}
                onChange={(e) => {
                  setTouched((t) => ({ ...t, savings: true }));
                  setEstAnnualSavings(e.target.value);
                }}
                placeholder="e.g., 350"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 700 }}>Est. Payback (yrs)</div>
              <input
                value={estPaybackYears}
                onChange={(e) => {
                  setTouched((t) => ({ ...t, payback: true }));
                  setEstPaybackYears(e.target.value);
                }}
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
