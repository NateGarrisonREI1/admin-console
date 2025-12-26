"use client";

import { useMemo, useState } from "react";
import {
  INCENTIVE_LIBRARY,
  type IncentiveAmount,
  type IncentiveResource,
} from "@/lib/incentives/incentiveRules";
import {
  loadLocalIncentiveOverrides,
  saveLocalIncentiveOverrides,
  clearLocalIncentiveOverrides,
} from "@/app/admin/_data/localIncentives";

const SYSTEM_TYPES = [
  { key: "hvac", label: "HVAC" },
  { key: "water_heater", label: "Water Heater" },
  { key: "windows", label: "Windows" },
  { key: "doors", label: "Doors" },
  { key: "insulation", label: "Insulation" },
  { key: "lighting", label: "Lighting" },
  { key: "solar", label: "Solar" },
  { key: "ev_charging", label: "EV Charging" },
  { key: "appliances", label: "Appliances" },
];

const LEVELS: IncentiveResource["level"][] = ["federal", "state", "utility", "local", "other"];

function uid() {
  return `custom-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function amountToString(a?: IncentiveAmount): { kind: string; a: string; b: string; unit: string } {
  if (!a) return { kind: "text", a: "", b: "", unit: "one_time" };
  if (a.kind === "text") return { kind: "text", a: a.value ?? "", b: "", unit: "one_time" };
  if (a.kind === "flat") return { kind: "flat", a: String(a.value ?? ""), b: "", unit: a.unit ?? "one_time" };
  return { kind: "range", a: String(a.min ?? ""), b: String(a.max ?? ""), unit: a.unit ?? "one_time" };
}

function buildAmount(kind: string, a: string, b: string, unit: string): IncentiveAmount {
  if (kind === "flat") {
    return { kind: "flat", value: Number(a || 0), unit: unit as any };
  }
  if (kind === "range") {
    return { kind: "range", min: Number(a || 0), max: Number(b || 0), unit: unit as any };
  }
  return { kind: "text", value: a || "" };
}

export default function IncentivesClient() {
  const [selectedSystemKey, setSelectedSystemKey] = useState<string>("hvac");

  const [overrides, setOverrides] = useState<IncentiveResource[]>(() => loadLocalIncentiveOverrides());

  const systemOverrides = useMemo(() => {
    return overrides.filter((r) => r.appliesTo.includes(selectedSystemKey));
  }, [overrides, selectedSystemKey]);

  function save() {
    saveLocalIncentiveOverrides(overrides);
    alert("Saved incentives ✅");
  }

  function resetToDefaults() {
    // Start from defaults for just this system type, but save as overrides so you can edit
    const defaults = INCENTIVE_LIBRARY.filter((r) => r.appliesTo.includes(selectedSystemKey)).map((x) => clone(x));
    // remove existing overrides for this system and replace
    const kept = overrides.filter((r) => !r.appliesTo.includes(selectedSystemKey));
    setOverrides([...kept, ...defaults]);
  }

  function clearAll() {
    clearLocalIncentiveOverrides();
    setOverrides([]);
  }

  function addNew() {
    const next: IncentiveResource = {
      id: uid(),
      programName: "New Incentive",
      level: "state",
      appliesTo: [selectedSystemKey],
      tags: [],
      amount: { kind: "text", value: "" },
      shortBlurb: "",
      details: "",
      links: [],
    };
    setOverrides([next, ...overrides]);
  }

  function update(id: string, patch: Partial<IncentiveResource>) {
    setOverrides((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function remove(id: string) {
    setOverrides((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="rei-card" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>System Type</div>
          <select
            value={selectedSystemKey}
            onChange={(e) => setSelectedSystemKey(e.target.value)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb", background: "white" }}
          >
            {SYSTEM_TYPES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>

          <button className="rei-btn" type="button" onClick={addNew}>
            + Add incentive
          </button>

          <button className="rei-btn" type="button" onClick={resetToDefaults}>
            Load defaults for this system
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="rei-btn" type="button" onClick={save}>
            Save
          </button>
          <button className="rei-btn" type="button" onClick={clearAll} style={{ background: "#fff5f5" }}>
            Clear all overrides
          </button>
        </div>
      </div>

      <div style={{ color: "var(--muted)", fontSize: 12 }}>
        These incentives override the built-in library. Use tags (comma-separated) to target specific catalog cases like{" "}
        <code>heat_pump</code>, <code>tankless</code>, <code>hpwh</code>.
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {systemOverrides.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>
            No incentives set for this system type yet. Click <b>Load defaults</b> or <b>Add incentive</b>.
          </div>
        ) : null}

        {systemOverrides.map((r) => {
          const amt = amountToString(r.amount);
          return (
            <div
              key={r.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 12,
                background: "white",
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between" }}>
                <div style={{ display: "grid", gap: 6, flex: 1, minWidth: 240 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>Program name</div>
                  <input
                    value={r.programName}
                    onChange={(e) => update(r.id, { programName: e.target.value })}
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
                  />
                </div>

                <div style={{ display: "grid", gap: 6, width: 170 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>Level</div>
                  <select
                    value={r.level}
                    onChange={(e) => update(r.id, { level: e.target.value as any })}
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb", background: "white" }}
                  >
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gap: 6, width: 160 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>Enabled</div>
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={!r.disabled}
                      onChange={(e) => update(r.id, { disabled: !e.target.checked })}
                    />
                    <span style={{ color: "var(--muted)", fontSize: 13 }}>{r.disabled ? "Off" : "On"}</span>
                  </label>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr .8fr .8fr", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>Tags (comma-separated)</div>
                  <input
                    value={(r.tags ?? []).join(", ")}
                    onChange={(e) => update(r.id, { tags: parseTags(e.target.value) })}
                    placeholder="heat_pump, ducted"
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
                  />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>Amount type</div>
                  <select
                    value={amt.kind}
                    onChange={(e) => {
                      const nextKind = e.target.value;
                      update(r.id, { amount: buildAmount(nextKind, amt.a, amt.b, amt.unit) });
                    }}
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb", background: "white" }}
                  >
                    <option value="text">Text</option>
                    <option value="flat">Flat</option>
                    <option value="range">Range</option>
                  </select>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{amt.kind === "range" ? "Min" : "Value"}</div>
                  <input
                    value={amt.a}
                    onChange={(e) => update(r.id, { amount: buildAmount(amt.kind, e.target.value, amt.b, amt.unit) })}
                    placeholder={amt.kind === "text" ? "e.g., Up to $2,000" : "e.g., 2000"}
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
                  />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{amt.kind === "range" ? "Max" : "Unit"}</div>
                  {amt.kind === "range" ? (
                    <input
                      value={amt.b}
                      onChange={(e) =>
                        update(r.id, { amount: buildAmount(amt.kind, amt.a, e.target.value, amt.unit) })
                      }
                      placeholder="e.g., 4500"
                      style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
                    />
                  ) : (
                    <select
                      value={amt.unit}
                      onChange={(e) => update(r.id, { amount: buildAmount(amt.kind, amt.a, amt.b, e.target.value) })}
                      style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb", background: "white" }}
                    >
                      <option value="one_time">one_time</option>
                      <option value="per_year">per_year</option>
                      <option value="percent">percent</option>
                    </select>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 800, fontSize: 13 }}>Short blurb</div>
                <input
                  value={r.shortBlurb}
                  onChange={(e) => update(r.id, { shortBlurb: e.target.value })}
                  placeholder="One sentence shown on snapshot page"
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 800, fontSize: 13 }}>Details (optional)</div>
                <textarea
                  value={r.details ?? ""}
                  onChange={(e) => update(r.id, { details: e.target.value })}
                  rows={3}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button className="rei-btn" type="button" onClick={() => remove(r.id)} style={{ background: "#fff5f5" }}>
                  Delete
                </button>
              </div>

              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                ID: <code>{r.id}</code> • AppliesTo: <code>{r.appliesTo.join(", ")}</code>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
