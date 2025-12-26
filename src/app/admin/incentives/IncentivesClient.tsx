"use client";

import { useMemo, useState } from "react";

// ✅ relative imports (no @ alias)
import {
  INCENTIVE_LIBRARY,
  type IncentiveAmount,
  type IncentiveResource,
} from "../../../lib/incentives/incentiveRules";

import {
  loadLocalIncentiveOverrides,
  saveLocalIncentiveOverrides,
  clearLocalIncentiveOverrides,
} from "../_data/localIncentives";

// ✅ Catalog import for match preview
import { MOCK_SYSTEMS } from "../_data/mockSystems";

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

// ✅ Common tags per system type (chips)
const TAG_SUGGESTIONS: Record<string, string[]> = {
  hvac: [
    "heat_pump",
    "ducted",
    "ductless",
    "mini_split",
    "gas_furnace",
    "high_efficiency",
    "thermostat",
    "variable_speed",
  ],
  water_heater: [
    "hpwh",
    "heat_pump",
    "tank",
    "tankless",
    "electric",
    "gas",
    "high_efficiency",
    "recirc",
  ],
  windows: ["double_pane", "triple_pane", "low_e", "retrofit", "new_construction"],
  doors: ["weatherstripping", "insulated_door", "air_sealing"],
  insulation: ["attic", "wall", "crawlspace", "basement", "air_sealing"],
  lighting: ["led", "controls", "occupancy_sensor"],
  solar: ["pv", "battery", "inverter"],
  ev_charging: ["level_2", "panel_upgrade"],
  appliances: ["energy_star", "heat_pump_dryer", "induction"],
};

function uid() {
  return `custom-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function normalizeTag(t: string): string {
  return String(t || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w_]/g, "");
}

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((t) => normalizeTag(t))
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

// ✅ convert catalog category to system key
function categoryToKey(cat: string): string {
  const s = String(cat || "").toLowerCase().trim();
  if (s.includes("hvac")) return "hvac";
  if (s.includes("water")) return "water_heater";
  if (s.includes("window")) return "windows";
  if (s.includes("door")) return "doors";
  if (s.includes("insulation")) return "insulation";
  if (s.includes("lighting")) return "lighting";
  if (s.includes("solar")) return "solar";
  if (s.includes("ev")) return "ev_charging";
  if (s.includes("appliance")) return "appliances";
  return s.replace(/\s+/g, "_");
}

// ✅ matching logic mirrors the incentives matcher:
// - must match system type
// - if rule.tags empty => matches all in that system type
// - else matches if ANY rule tag overlaps ANY catalog tag
function matchesCatalog(rule: IncentiveResource, systemKey: string) {
  const wantKey = systemKey;
  const ruleTags = (rule.tags ?? []).map(normalizeTag).filter(Boolean);

  const candidates = MOCK_SYSTEMS.filter((c: any) => categoryToKey(c.category) === wantKey);

  return candidates.filter((c: any) => {
    const catTags = (c.tags ?? []).map(normalizeTag).filter(Boolean);
    if (!ruleTags.length) return true;
    if (!catTags.length) return false;
    return ruleTags.some((t) => catTags.includes(t));
  });
}

export default function IncentivesClient() {
  const [selectedSystemKey, setSelectedSystemKey] = useState<string>("hvac");

  const [overrides, setOverrides] = useState<IncentiveResource[]>(() => loadLocalIncentiveOverrides());

  const systemOverrides = useMemo(() => {
    return overrides.filter((r) => r.appliesTo.includes(selectedSystemKey));
  }, [overrides, selectedSystemKey]);

  const suggestions = TAG_SUGGESTIONS[selectedSystemKey] ?? [];

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

  function addTagToRule(ruleId: string, tag: string) {
    const t = normalizeTag(tag);
    if (!t) return;
    setOverrides((prev) =>
      prev.map((r) => {
        if (r.id !== ruleId) return r;
        const current = (r.tags ?? []).map(normalizeTag).filter(Boolean);
        if (current.includes(t)) return r;
        return { ...r, tags: [...current, t] };
      })
    );
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
        These incentives override the built-in library. Use tags to target specific suggested upgrades (from the catalog).
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {systemOverrides.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>
            No incentives set for this system type yet. Click <b>Load defaults</b> or <b>Add incentive</b>.
          </div>
        ) : null}

        {systemOverrides.map((r) => {
          const amt = amountToString(r.amount);

          // ✅ live match preview against catalog
          const matches = matchesCatalog(r, selectedSystemKey);
          const top3 = matches.slice(0, 3).map((x: any) => x.name);
          const extra = matches.length - top3.length;

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
                    placeholder={suggestions.length ? suggestions.slice(0, 3).join(", ") : "heat_pump, ducted"}
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
                  />

                  {/* ✅ Tag suggestion chips */}
                  {suggestions.length ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {suggestions.map((t) => {
                        const active = (r.tags ?? []).map(normalizeTag).includes(normalizeTag(t));
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => addTagToRule(r.id, t)}
                            title="Click to add tag"
                            style={{
                              padding: "6px 10px",
                              borderRadius: 999,
                              border: "1px solid #e5e7eb",
                              background: active ? "#eaffea" : "#f9fafb",
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {/* ✅ Match preview */}
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    <b>Matches catalog:</b>{" "}
                    {matches.length === 0 ? (
                      <span style={{ color: "#b91c1c", fontWeight: 800 }}>None</span>
                    ) : (
                      <span style={{ fontWeight: 700 }}>
                        {top3.join(" • ")}
                        {extra > 0 ? ` • +${extra} more` : ""}
                      </span>
                    )}
                  </div>

                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    Tip: tags should match the catalog system tags (e.g. <code>heat_pump</code>, <code>hpwh</code>).
                  </div>
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
