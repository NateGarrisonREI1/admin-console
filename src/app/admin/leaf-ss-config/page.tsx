"use client";

import { useEffect, useState } from "react";
import {
  loadLeafSSMasterConfig,
  saveLeafSSMasterConfig,
  resetLeafSSMasterConfig,
} from "../_data/leafSSConfigStore";

export default function LeafSSConfigPage() {
  const [config, setConfig] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setConfig(loadLeafSSMasterConfig());
  }, []);

  if (!config) {
    return <div style={{ padding: 24 }}>Loading LEAF config…</div>;
  }

  const g = config.global;

  /* ---------- CONFIG UPDATE HELPER ---------- */
  function update(path: string[], value: any) {
    setConfig((prev: any) => {
      const next = structuredClone(prev);
      let cur = next;
      for (let i = 0; i < path.length - 1; i++) {
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = value;
      return next;
    });
  }

  function save() {
    setSaving(true);
    saveLeafSSMasterConfig(config);
    setTimeout(() => setSaving(false), 600);
  }

  function resetAll() {
    if (!confirm("Reset LEAF SS master config to defaults?")) return;
    resetLeafSSMasterConfig();
    setConfig(loadLeafSSMasterConfig());
  }

  return (
    <div style={{ maxWidth: 960, padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>
        LEAF System Snapshot — Master Config
      </h1>

      <p style={{ color: "#555", marginTop: 6 }}>
        Changes here affect <b>all LEAF System Snapshot reports</b>. Snapshot-level
        overrides will layer on top.
      </p>

      {/* BRAND */}
      <Section title="Brand">
        <Label>LEAF Brand Color</Label>
        <input
          type="color"
          value={g.leafBrandColorHex}
          onChange={(e) =>
            update(["global", "leafBrandColorHex"], e.target.value)
          }
        />
      </Section>

      {/* PRICE SLIDER */}
      <Section title="Price Slider">
        <Row>
          <Field
            label="Minimum price ($)"
            value={g.slider.min}
            onChange={(v) => update(["global", "slider", "min"], v)}
          />
          <Field
            label="Maximum price ($)"
            value={g.slider.max}
            onChange={(v) => update(["global", "slider", "max"], v)}
          />
          <Field
            label="Step ($)"
            value={g.slider.step}
            onChange={(v) => update(["global", "slider", "step"], v)}
          />
        </Row>
      </Section>

      {/* TIERS */}
      <Section title="Tier Configuration">
        <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
          Defines the <b>Good / Better / Best</b> pricing bands and baseline
          savings used in every LEAF System Snapshot.
        </p>

        {(["good", "better", "best"] as const).map((tier) => (
          <div
            key={tier}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              background: "#fafafa",
            }}
          >
            <h3 style={{ marginBottom: 12 }}>
              {tier === "good" && "🟢 Good Tier"}
              {tier === "better" && "🔵 Better Tier"}
              {tier === "best" && "🟣 Best Tier"}
            </h3>

            <Row>
              <Field
                label="Min price ($)"
                value={g.tiers[tier].leafPriceRange.min}
                onChange={(v) =>
                  update(
                    ["global", "tiers", tier, "leafPriceRange", "min"],
                    v
                  )
                }
              />
              <Field
                label="Max price ($)"
                value={g.tiers[tier].leafPriceRange.max}
                onChange={(v) =>
                  update(
                    ["global", "tiers", tier, "leafPriceRange", "max"],
                    v
                  )
                }
              />
            </Row>

            <Row>
              <Field
                label="Base savings min ($/month)"
                value={g.tiers[tier].baseMonthlySavings.min}
                onChange={(v) =>
                  update(
                    ["global", "tiers", tier, "baseMonthlySavings", "min"],
                    v
                  )
                }
              />
              <Field
                label="Base savings max ($/month)"
                value={g.tiers[tier].baseMonthlySavings.max}
                onChange={(v) =>
                  update(
                    ["global", "tiers", tier, "baseMonthlySavings", "max"],
                    v
                  )
                }
              />
            </Row>
          </div>
        ))}
      </Section>

      {/* COST CLASSIFICATION */}
      <Section title="Quote Classification">
        <Row>
          <Field
            label="Unrealistic below range ($)"
            value={g.rangesAndClassifications.costClassThresholds.unrealLowOffsetFromMin}
            onChange={(v) =>
              update(
                [
                  "global",
                  "rangesAndClassifications",
                  "costClassThresholds",
                  "unrealLowOffsetFromMin",
                ],
                v
              )
            }
          />
          <Field
            label="Overpriced above range ($)"
            value={g.rangesAndClassifications.costClassThresholds.overpricedOffsetFromMax}
            onChange={(v) =>
              update(
                [
                  "global",
                  "rangesAndClassifications",
                  "costClassThresholds",
                  "overpricedOffsetFromMax",
                ],
                v
              )
            }
          />
        </Row>
      </Section>

      {/* SAVINGS SENSITIVITY */}
      <Section title="Savings Sensitivity">
        <Row>
          <Field
            label="Every $ above range"
            value={g.rangesAndClassifications.dynamicSavingsRule.stepSizeDollars}
            onChange={(v) =>
              update(
                [
                  "global",
                  "rangesAndClassifications",
                  "dynamicSavingsRule",
                  "stepSizeDollars",
                ],
                v
              )
            }
          />
          <Field
            label="Adds savings ($ / month)"
            value={
              g.rangesAndClassifications.dynamicSavingsRule
                .bumpPerStepMonthlyDollars
            }
            onChange={(v) =>
              update(
                [
                  "global",
                  "rangesAndClassifications",
                  "dynamicSavingsRule",
                  "bumpPerStepMonthlyDollars",
                ],
                v
              )
            }
          />
        </Row>
      </Section>

      {/* UI COPY */}
      <Section title="UI Copy">
        <TextField
          label="Header title"
          value={g.uiText.headerTitle}
          onChange={(v) => update(["global", "uiText", "headerTitle"], v)}
        />
        <TextField
          label="Hero helper text"
          value={g.uiText.heroHelper}
          onChange={(v) => update(["global", "uiText", "heroHelper"], v)}
        />
        <TextField
          label="Hero note"
          value={g.uiText.heroNote}
          onChange={(v) => update(["global", "uiText", "heroNote"], v)}
        />
      </Section>

      {/* ACTIONS */}
      <div style={{ marginTop: 32, display: "flex", gap: 12 }}>
        <button
          onClick={save}
          style={{
            padding: "10px 18px",
            borderRadius: 999,
            background: "#43a419",
            color: "#000",
            fontWeight: 800,
            border: 0,
          }}
        >
          {saving ? "Saving…" : "Save Config"}
        </button>

        <button
          onClick={resetAll}
          style={{
            padding: "10px 18px",
            borderRadius: 999,
            background: "#eee",
            border: "1px solid #ccc",
          }}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

/* ---------- UI HELPERS ---------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>
        {title}
      </h2>
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 14,
          padding: 16,
          background: "#fff",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ flex: 1 }}>
      <Label>{label}</Label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", padding: 8 }}
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <Label>{label}</Label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />
    </div>
  );
}
