"use client";

function makeSnapshotId(systemId: string) {
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `snap_${systemId}_${rand}`;
}

import { useEffect, useMemo, useState } from "react";
import {
  type SnapshotDraft,
  upsertLocalSnapshot,
} from "../../../_data/localSnapshots";
import { MOCK_SYSTEMS, type CatalogSystem } from "../../../_data/mockSystems";
import { calculateLeafSavings, type LeafTierKey } from "../../../_data/leafSSConfigRuntime";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */

type Props = {
  jobId: string;
  existingSystem: {
    id: string;
    type: string;
    subtype: string;
    ageYears: number;
    operational: "Yes" | "No";
    wear: number;
    maintenance: "Good" | "Average" | "Poor";
  };
  snapshot?: SnapshotDraft | null;
  onClose: () => void;
  onSaved: () => void;
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

function numOrNull(v: string): number | null {
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

type TierOverride = {
  leafPriceRange?: { min?: number; max?: number };
  baseMonthlySavings?: { min?: number; max?: number };
  recommendedName?: string;
  statusPillText?: string;
};

function getTierBlock(s: SnapshotDraft, tier: LeafTierKey): TierOverride {
  const tiers = s.suggested.leafSSOverrides?.tiers || {};
  return (tiers as Partial<Record<LeafTierKey, TierOverride>>)[tier] || {};
}

function setTierBlock(
  s: SnapshotDraft,
  tier: LeafTierKey,
  patch: Partial<TierOverride>
): SnapshotDraft {
  const prev = s.suggested.leafSSOverrides?.tiers || {};
  const prevTyped = prev as Partial<Record<LeafTierKey, TierOverride>>;

  return {
    ...s,
    suggested: {
      ...s.suggested,
      leafSSOverrides: {
        ...(s.suggested.leafSSOverrides || {}),
        tiers: {
          ...prevTyped,
          [tier]: {
            ...(prevTyped[tier] || {}),
            ...patch,
          },
        },
      },
    },
  };
}


/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */

export default function SnapshotEditor({
  jobId,
  existingSystem,
  snapshot,
  onClose,
  onSaved,
}: Props) {
  const isEdit = Boolean(snapshot);

  const [working, setWorking] = useState<SnapshotDraft>(() => {
    if (snapshot) return snapshot;

    return {
      id: makeSnapshotId(existingSystem.id),
      jobId,
      systemId: existingSystem.id,

      existing: {
        type: existingSystem.type,
        subtype: existingSystem.subtype,
        ageYears: existingSystem.ageYears ?? null,
        operational: existingSystem.operational,
        wear: existingSystem.wear ?? null,
        maintenance: existingSystem.maintenance,

        // builder-editable defaults (blank is fine)
        label: "",
        statusPillText: "",
        annualCostRange: { min: 0, max: 0 },
        carbonRange: { min: 0, max: 0 },
        imageUrl: "",
      },

      suggested: {
        catalogSystemId: null,
        name: "",
        estCost: null,
        estAnnualSavings: null,
        estPaybackYears: null,
        notes: "",
        tier: "better",

        recommendedNameByTier: {
          good: "",
          better: "",
          best: "",
        },
        statusPillTextByTier: {
          good: "",
          better: "",
          best: "",
        },
        imageUrl: "",
        leafSSOverrides: {
          tiers: {},
        },
      },

      calculationInputs: {
        annualUtilitySpend: undefined,
        systemShare: undefined,
        expectedLife: undefined,
        partialFailure: false,
      },

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const [calcPreview, setCalcPreview] = useState<SnapshotDraft["calculatedSavings"] | null>(
    working.calculatedSavings || null
  );

  const catalogSystems = useMemo(() => MOCK_SYSTEMS, []);
  const selectedCatalog: CatalogSystem | null = useMemo(() => {
    if (!working.suggested.catalogSystemId) return null;
    return catalogSystems.find((s) => s.id === working.suggested.catalogSystemId) || null;
  }, [working.suggested.catalogSystemId, catalogSystems]);

  /* ─────────────────────────────────────────────
     EFFECTS: seed from catalog system selection
  ────────────────────────────────────────────── */

  useEffect(() => {
    if (!selectedCatalog) return;

    setWorking((w) => {
      const next: SnapshotDraft = {
        ...w,
        suggested: {
          ...w.suggested,
          name: selectedCatalog.name,

          // If the catalog has overrides, treat them as *inputs* copied into the snapshot
          leafSSOverrides: selectedCatalog.leafSSOverrides
            ? JSON.parse(JSON.stringify(selectedCatalog.leafSSOverrides))
            : w.suggested.leafSSOverrides,
        },
        updatedAt: new Date().toISOString(),
      };

      // Seed recommended/status-by-tier if the catalog includes those overrides
      const tiers = selectedCatalog.leafSSOverrides?.tiers || {};
      (["good", "better", "best"] as LeafTierKey[]).forEach((t) => {
        const recName = tiers[t]?.recommendedName;
        const pill = tiers[t]?.statusPillText;

        if (recName && !next.suggested.recommendedNameByTier?.[t]) {
          next.suggested.recommendedNameByTier = {
            ...(next.suggested.recommendedNameByTier || {}),
            [t]: recName,
          };
        }
        if (pill && !next.suggested.statusPillTextByTier?.[t]) {
          next.suggested.statusPillTextByTier = {
            ...(next.suggested.statusPillTextByTier || {}),
            [t]: pill,
          };
        }
      });

      return next;
    });
  }, [selectedCatalog]);

  /* ─────────────────────────────────────────────
     UPDATE HELPERS
  ────────────────────────────────────────────── */

  function touch(next: SnapshotDraft) {
    next.updatedAt = new Date().toISOString();
    return next;
  }

  function updateExisting<K extends keyof SnapshotDraft["existing"]>(
    key: K,
    value: SnapshotDraft["existing"][K]
  ) {
    setWorking((w) =>
      touch({
        ...w,
        existing: { ...w.existing, [key]: value },
      })
    );
  }

  function updateSuggested<K extends keyof SnapshotDraft["suggested"]>(
    key: K,
    value: SnapshotDraft["suggested"][K]
  ) {
    setWorking((w) =>
      touch({
        ...w,
        suggested: { ...w.suggested, [key]: value },
      })
    );
  }

  function updateCalc<K extends keyof NonNullable<SnapshotDraft["calculationInputs"]>>(
    key: K,
    value: NonNullable<SnapshotDraft["calculationInputs"]>[K]
  ) {
    setWorking((w) =>
      touch({
        ...w,
        calculationInputs: { ...(w.calculationInputs || {}), [key]: value },
      })
    );
  }

  /* ─────────────────────────────────────────────
     CALCULATIONS
  ────────────────────────────────────────────── */

  function runCalculations() {
    const tier = working.suggested.tier;
    if (!tier) return;

    const wear = working.existing.wear ?? 3;
    const age = working.existing.ageYears ?? 10;

    const annualUtilitySpend = working.calculationInputs?.annualUtilitySpend ?? 2400;
    const systemShare = clamp01(working.calculationInputs?.systemShare ?? 0.4);
    const expectedLife = working.calculationInputs?.expectedLife ?? 20;
    const partialFailure = Boolean(working.calculationInputs?.partialFailure);

    const res = calculateLeafSavings({
      wear,
      age,
      tier,
      annualUtilitySpend,
      systemShare,
      expectedLife,
      partialFailure,
    });

    setCalcPreview({
      currentWaste: res.currentWaste,
      recoverableWaste: res.recoverableWaste,
      minAnnual: res.minAnnualSavings,
      maxAnnual: res.maxAnnualSavings,
      centerAnnual: res.annualSavingsCenter,
      minMonthly: res.minMonthlySavings,
      maxMonthly: res.maxMonthlySavings,
      centerMonthly: res.centerMonthlySavings,
    });

    // also store it into working (so save persists what you just ran)
    setWorking((w) =>
      touch({
        ...w,
        calculatedSavings: {
          currentWaste: res.currentWaste,
          recoverableWaste: res.recoverableWaste,
          minAnnual: res.minAnnualSavings,
          maxAnnual: res.maxAnnualSavings,
          centerAnnual: res.annualSavingsCenter,
          minMonthly: res.minMonthlySavings,
          maxMonthly: res.maxMonthlySavings,
          centerMonthly: res.centerMonthlySavings,
        },
      })
    );
  }

  function handleSave() {
    // force a calc pass before saving if possible
    runCalculations();
    upsertLocalSnapshot(working);
    onSaved();
  }

  const tier: LeafTierKey = (working.suggested.tier || "better") as LeafTierKey;
  const tierBlock = getTierBlock(working, tier);

  /* ─────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────── */

  return (
    <div className="rei-card" style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6 }}>
        {isEdit ? "Edit LEAF Snapshot (Builder)" : "Create LEAF Snapshot (Builder)"}
      </div>

      <div style={{ color: "var(--muted)", marginBottom: 16 }}>
        Everything the report can show should be editable here. Run calculations from these inputs.
      </div>

      {/* ───────────────── Existing System (Report-facing) ───────────────── */}
      <SectionTitle>Existing System (Report Content)</SectionTitle>

      <div className="rei-formGrid">
        <Field label="Display Label (report)">
          <input
            className="rei-search"
            value={working.existing.label ?? ""}
            onChange={(e) => updateExisting("label", e.target.value)}
            placeholder="e.g. Old gas furnace"
          />
        </Field>

        <Field label="Status Pill Text (report)">
          <input
            className="rei-search"
            value={working.existing.statusPillText ?? ""}
            onChange={(e) => updateExisting("statusPillText", e.target.value)}
            placeholder="e.g. Near end-of-life"
          />
        </Field>

        <Field label="Existing Image URL (optional)">
          <input
            className="rei-search"
            value={working.existing.imageUrl ?? ""}
            onChange={(e) => updateExisting("imageUrl", e.target.value)}
            placeholder="https://..."
          />
        </Field>

        <Field label="Annual Cost Range Min ($/yr)">
          <input
            className="rei-search"
            type="number"
            value={working.existing.annualCostRange?.min ?? ""}
            onChange={(e) => {
              const v = numOrNull(e.target.value);
              updateExisting("annualCostRange", {
                min: v ?? 0,
                max: working.existing.annualCostRange?.max ?? 0,
              });
            }}
          />
        </Field>

        <Field label="Annual Cost Range Max ($/yr)">
          <input
            className="rei-search"
            type="number"
            value={working.existing.annualCostRange?.max ?? ""}
            onChange={(e) => {
              const v = numOrNull(e.target.value);
              updateExisting("annualCostRange", {
                min: working.existing.annualCostRange?.min ?? 0,
                max: v ?? 0,
              });
            }}
          />
        </Field>

        <Field label="Carbon Range Min (lbs/yr)">
          <input
            className="rei-search"
            type="number"
            value={working.existing.carbonRange?.min ?? ""}
            onChange={(e) => {
              const v = numOrNull(e.target.value);
              updateExisting("carbonRange", {
                min: v ?? 0,
                max: working.existing.carbonRange?.max ?? 0,
              });
            }}
          />
        </Field>

        <Field label="Carbon Range Max (lbs/yr)">
          <input
            className="rei-search"
            type="number"
            value={working.existing.carbonRange?.max ?? ""}
            onChange={(e) => {
              const v = numOrNull(e.target.value);
              updateExisting("carbonRange", {
                min: working.existing.carbonRange?.min ?? 0,
                max: v ?? 0,
              });
            }}
          />
        </Field>
      </div>

      {/* ───────────────── Existing Condition (Calc-facing) ───────────────── */}
      <SectionTitle>Existing System Condition (Calculation Inputs)</SectionTitle>

      <div className="rei-formGrid">
        <Field label="Age (years)">
          <input
            className="rei-search"
            type="number"
            value={working.existing.ageYears ?? ""}
            onChange={(e) => updateExisting("ageYears", numOrNull(e.target.value))}
            placeholder="10"
          />
        </Field>

        <Field label="Wear (1–5)">
          <select
            className="rei-search"
            value={working.existing.wear ?? ""}
            onChange={(e) => updateExisting("wear", numOrNull(e.target.value) as any)}
          >
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Operational">
          <select
            className="rei-search"
            value={working.existing.operational}
            onChange={(e) => updateExisting("operational", e.target.value as any)}
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </Field>

        <Field label="Maintenance">
          <select
            className="rei-search"
            value={working.existing.maintenance}
            onChange={(e) => updateExisting("maintenance", e.target.value as any)}
          >
            <option value="Good">Good</option>
            <option value="Average">Average</option>
            <option value="Poor">Poor</option>
          </select>
        </Field>
      </div>

      {/* ───────────────── Suggested Upgrade ───────────────── */}
      <SectionTitle>Proposed Upgrade (Editable Report + Calc Inputs)</SectionTitle>

      <div className="rei-formGrid">
        <Field label="Catalog System">
          <select
            className="rei-search"
            value={working.suggested.catalogSystemId || ""}
            onChange={(e) => updateSuggested("catalogSystemId", e.target.value || null)}
          >
            <option value="">— Select system —</option>
            {catalogSystems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tier">
          <select
            className="rei-search"
            value={working.suggested.tier}
            onChange={(e) => updateSuggested("tier", e.target.value as any)}
          >
            <option value="good">Good</option>
            <option value="better">Better</option>
            <option value="best">Best</option>
          </select>
        </Field>

        <Field label="Proposed Display Name (current tier)">
          <input
            className="rei-search"
            value={(working.suggested.recommendedNameByTier?.[tier] ?? "") as string}
            onChange={(e) =>
              updateSuggested("recommendedNameByTier", {
                ...(working.suggested.recommendedNameByTier || {}),
                [tier]: e.target.value,
              })
            }
            placeholder="e.g. High-efficiency gas furnace"
          />
        </Field>

        <Field label="Status Pill Text (current tier)">
          <input
            className="rei-search"
            value={(working.suggested.statusPillTextByTier?.[tier] ?? "") as string}
            onChange={(e) =>
              updateSuggested("statusPillTextByTier", {
                ...(working.suggested.statusPillTextByTier || {}),
                [tier]: e.target.value,
              })
            }
            placeholder="e.g. Recommended"
          />
        </Field>

        <Field label="Proposed Image URL (optional)">
          <input
            className="rei-search"
            value={working.suggested.imageUrl ?? ""}
            onChange={(e) => updateSuggested("imageUrl", e.target.value)}
            placeholder="https://..."
          />
        </Field>

        <Field label="Install Cost (optional, $)">
          <input
            className="rei-search"
            type="number"
            value={working.suggested.estCost ?? ""}
            onChange={(e) => updateSuggested("estCost", numOrNull(e.target.value))}
            placeholder="Leave blank if using tier ranges"
          />
        </Field>
      </div>

      {/* ───────────────── Tier Ranges (the slider/report should use these) ───────────────── */}
      <SectionTitle>Tier Ranges (Report Slider Inputs)</SectionTitle>

      <div className="rei-formGrid">
        <Field label={`Install Range Min ($) — ${tier}`}>
          <input
            className="rei-search"
            type="number"
            value={tierBlock.leafPriceRange?.min ?? ""}
            onChange={(e) => {
              const v = numOrNull(e.target.value);
              setWorking((w) =>
                touch(
                  setTierBlock(w, tier, {
                    leafPriceRange: {
                      min: v ?? undefined,
                      max: getTierBlock(w, tier).leafPriceRange?.max,
                    },
                  })
                )
              );
            }}
          />
        </Field>

        <Field label={`Install Range Max ($) — ${tier}`}>
          <input
            className="rei-search"
            type="number"
            value={tierBlock.leafPriceRange?.max ?? ""}
            onChange={(e) => {
              const v = numOrNull(e.target.value);
              setWorking((w) =>
                touch(
                  setTierBlock(w, tier, {
                    leafPriceRange: {
                      min: getTierBlock(w, tier).leafPriceRange?.min,
                      max: v ?? undefined,
                    },
                  })
                )
              );
            }}
          />
        </Field>

        <Field label={`Base Monthly Savings Min ($/mo) — ${tier}`}>
          <input
            className="rei-search"
            type="number"
            value={tierBlock.baseMonthlySavings?.min ?? ""}
            onChange={(e) => {
              const v = numOrNull(e.target.value);
              setWorking((w) =>
                touch(
                  setTierBlock(w, tier, {
                    baseMonthlySavings: {
                      min: v ?? undefined,
                      max: getTierBlock(w, tier).baseMonthlySavings?.max,
                    },
                  })
                )
              );
            }}
          />
        </Field>

        <Field label={`Base Monthly Savings Max ($/mo) — ${tier}`}>
          <input
            className="rei-search"
            type="number"
            value={tierBlock.baseMonthlySavings?.max ?? ""}
            onChange={(e) => {
              const v = numOrNull(e.target.value);
              setWorking((w) =>
                touch(
                  setTierBlock(w, tier, {
                    baseMonthlySavings: {
                      min: getTierBlock(w, tier).baseMonthlySavings?.min,
                      max: v ?? undefined,
                    },
                  })
                )
              );
            }}
          />
        </Field>
      </div>

      {/* ───────────────── Calculation Inputs ───────────────── */}
      <SectionTitle>Calculation Inputs (No Fixed Data)</SectionTitle>

      <div className="rei-formGrid">
        <Field label="Annual Utility Spend ($/yr)">
          <input
            className="rei-search"
            type="number"
            value={working.calculationInputs?.annualUtilitySpend ?? ""}
            onChange={(e) => updateCalc("annualUtilitySpend", numOrNull(e.target.value) ?? undefined)}
            placeholder="e.g. 3600"
          />
        </Field>

        <Field label="System Share of Utility (0–1)">
          <input
            className="rei-search"
            type="number"
            step="0.01"
            value={working.calculationInputs?.systemShare ?? ""}
            onChange={(e) => {
              const v = numOrNull(e.target.value);
              updateCalc("systemShare", v === null ? undefined : clamp01(v));
            }}
            placeholder="e.g. 0.40"
          />
        </Field>

        <Field label="Expected Life (years)">
          <input
            className="rei-search"
            type="number"
            value={working.calculationInputs?.expectedLife ?? ""}
            onChange={(e) => updateCalc("expectedLife", numOrNull(e.target.value) ?? undefined)}
            placeholder="e.g. 20"
          />
        </Field>

        <Field label="Partial Failure / Not Fully Running">
          <select
            className="rei-search"
            value={working.calculationInputs?.partialFailure ? "yes" : "no"}
            onChange={(e) => updateCalc("partialFailure", e.target.value === "yes")}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </Field>
      </div>

      {/* ───────────────── Run + Preview ───────────────── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginTop: 14,
          paddingTop: 14,
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button className="rei-btn rei-btnPrimary" type="button" onClick={runCalculations}>
          Run Calculations
        </button>

        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          Uses *only* the inputs on this page (no fixed report numbers).
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <SectionTitle>Calculation Preview</SectionTitle>

        {!calcPreview ? (
          <div style={{ color: "var(--muted)" }}>Run calculations to see results.</div>
        ) : (
          <div className="rei-formGrid">
            <MiniStat label="Current Waste" value={`${Math.round(calcPreview.currentWaste)}%`} />
            <MiniStat label="Recoverable Waste" value={`${Math.round(calcPreview.recoverableWaste)}%`} />
            <MiniStat
              label="Annual Savings Range"
              value={`$${Math.round(calcPreview.minAnnual).toLocaleString()}–$${Math.round(
                calcPreview.maxAnnual
              ).toLocaleString()}`}
            />
            <MiniStat
              label="Monthly Savings Range"
              value={`$${Math.round(calcPreview.minMonthly).toLocaleString()}–$${Math.round(
                calcPreview.maxMonthly
              ).toLocaleString()}`}
            />
          </div>
        )}
      </div>

      {/* ───────────────── Actions ───────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 20,
        }}
      >
        <button className="rei-btn" type="button" onClick={onClose}>
          Cancel
        </button>
        <button className="rei-btn rei-btnPrimary" type="button" onClick={handleSave}>
          Save Snapshot
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   UI HELPERS
───────────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 800, margin: "18px 0 8px" }}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "var(--muted)" }}>{label}</div>
      {children}
    </label>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: 12,
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 900 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 900, marginTop: 6 }}>{value}</div>
    </div>
  );
}
