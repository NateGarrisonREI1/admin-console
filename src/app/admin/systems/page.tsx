"use client";

import { useEffect, useMemo, useState } from "react";
import { MOCK_SYSTEMS } from "../_data/mockSystems";

type LeafTierKey = "good" | "better" | "best";

type CatalogSystem = {
  id: string;
  category: "HVAC" | "Water Heater" | "Windows" | "Doors" | "Lighting" | "Insulation" | "Other";
  name: string;
  highlights: string[];
  tags?: string[];
  defaultAssumptions: {
    estCost?: number;
    estAnnualSavings?: number;
    estPaybackYears?: number;
  };

  // Optional: if you want per-tier ranges later, keep this field around now.
  tiers?: Partial<
    Record<
      LeafTierKey,
      {
        estCostMin?: number;
        estCostMax?: number;
        estSavingsMinAnnual?: number;
        estSavingsMaxAnnual?: number;
      }
    >
  >;
};

const STORAGE_KEY = "REI_LOCAL_CATALOG_V1";

function safeId(prefix = "cat") {
  // no uuid dependency
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function money(n?: number | null) {
  const v = typeof n === "number" && isFinite(n) ? n : null;
  if (v == null) return "—";
  return "$" + Math.round(v).toLocaleString("en-US");
}

function numberOrUndef(v: string): number | undefined {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : undefined;
}

function normalizeTag(t: string): string {
  return String(t || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w_]/g, "");
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => normalizeTag(s))
    .filter(Boolean);
}

function loadLocalCatalog(): CatalogSystem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CatalogSystem[];
  } catch {
    return [];
  }
}

function saveLocalCatalog(items: CatalogSystem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export default function SystemsCatalogPage() {
  const [localItems, setLocalItems] = useState<CatalogSystem[]>([]);
  const [mode, setMode] = useState<"view" | "add" | "edit">("view");
  const [editingId, setEditingId] = useState<string | null>(null);

  // form state
  const [category, setCategory] = useState<CatalogSystem["category"]>("HVAC");
  const [name, setName] = useState("");
  const [highlights, setHighlights] = useState("");
  const [tags, setTags] = useState("");
  const [estCost, setEstCost] = useState("");
  const [estAnnualSavings, setEstAnnualSavings] = useState("");
  const [estPaybackYears, setEstPaybackYears] = useState("");

  useEffect(() => {
    setLocalItems(loadLocalCatalog());
  }, []);

  const combinedCatalog: CatalogSystem[] = useMemo(() => {
    // You can choose whether local overrides mock or just adds. For now:
    // - show local first (your editable list)
    // - show mock as "seed"
    return localItems;
  }, [localItems]);

  function resetForm() {
    setCategory("HVAC");
    setName("");
    setHighlights("");
    setTags("");
    setEstCost("");
    setEstAnnualSavings("");
    setEstPaybackYears("");
    setEditingId(null);
  }

  function startAdd() {
    resetForm();
    setMode("add");
  }

  function startEdit(id: string) {
    const item = localItems.find((x) => x.id === id);
    if (!item) return;

    setCategory(item.category);
    setName(item.name);
    setHighlights((item.highlights || []).join(", "));
    setTags((item.tags || []).join(", "));
    setEstCost(item.defaultAssumptions?.estCost != null ? String(item.defaultAssumptions.estCost) : "");
    setEstAnnualSavings(
      item.defaultAssumptions?.estAnnualSavings != null ? String(item.defaultAssumptions.estAnnualSavings) : ""
    );
    setEstPaybackYears(
      item.defaultAssumptions?.estPaybackYears != null ? String(item.defaultAssumptions.estPaybackYears) : ""
    );

    setEditingId(id);
    setMode("edit");
  }

  function upsert() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert("System name is required.");
      return;
    }

    const next: CatalogSystem = {
      id: editingId || safeId("sys"),
      category,
      name: trimmedName,
      highlights: highlights
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      tags: parseTags(tags),
      defaultAssumptions: {
        estCost: numberOrUndef(estCost),
        estAnnualSavings: numberOrUndef(estAnnualSavings),
        estPaybackYears: numberOrUndef(estPaybackYears),
      },
    };

    const nextItems =
      mode === "edit"
        ? localItems.map((x) => (x.id === next.id ? next : x))
        : [next, ...localItems];

    setLocalItems(nextItems);
    saveLocalCatalog(nextItems);

    setMode("view");
    resetForm();
  }

  function remove(id: string) {
    const ok = confirm("Delete this catalog system? (local only)");
    if (!ok) return;
    const nextItems = localItems.filter((x) => x.id !== id);
    setLocalItems(nextItems);
    saveLocalCatalog(nextItems);
  }

  function seedFromMock() {
    const ok = confirm("Copy MOCK_SYSTEMS into your editable catalog? This will ADD items (won't delete existing).");
    if (!ok) return;

    const already = new Set(localItems.map((x) => x.id));
    const seeded: CatalogSystem[] = (MOCK_SYSTEMS as any[]).map((s) => ({
      id: already.has(s.id) ? safeId("sys") : s.id,
      category: s.category,
      name: s.name,
      highlights: Array.isArray(s.highlights) ? s.highlights : [],
      tags: Array.isArray((s as any).tags) ? (s as any).tags : [],
      defaultAssumptions: s.defaultAssumptions || {},
    }));

    const nextItems = [...seeded, ...localItems];
    setLocalItems(nextItems);
    saveLocalCatalog(nextItems);
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="rei-card" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Systems Catalog</div>
          <div style={{ color: "var(--muted)" }}>
            This is your editable catalog used for “Suggested Upgrade” in snapshots (localStorage for now).
            <br />
            Incentives should come from rules + <b>tags</b> on catalog items (cleaner than embedding incentive data here).
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="rei-btn" type="button" onClick={seedFromMock}>
            Seed from MOCK_SYSTEMS
          </button>
          <button className="rei-btn rei-btnPrimary" type="button" onClick={startAdd}>
            + Add Catalog System
          </button>
        </div>
      </div>

      {(mode === "add" || mode === "edit") && (
        <div className="rei-card">
          <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 10 }}>
            {mode === "add" ? "Add Catalog System" : "Edit Catalog System"}
          </div>

          <div className="rei-formGrid">
            <Field label="Category">
              <select className="rei-search" value={category} onChange={(e) => setCategory(e.target.value as any)}>
                {["HVAC", "Water Heater", "Windows", "Doors", "Lighting", "Insulation", "Other"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="System Name *">
              <input className="rei-search" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Direct HVAC Heat Pump Replacement" />
            </Field>

            <Field label="Highlights (comma separated)">
              <input
                className="rei-search"
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                placeholder="e.g., Lower CO₂, Better comfort, Rebates eligible"
              />
            </Field>

            <Field label="Tags (comma separated)">
              <input
                className="rei-search"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., heat_pump, hpwh, air_sealing"
              />
            </Field>

            <Field label="Default Install Cost (estCost)">
              <input className="rei-search" value={estCost} onChange={(e) => setEstCost(e.target.value)} placeholder="e.g., 14000" inputMode="numeric" />
            </Field>

            <Field label="Default Annual Savings (estAnnualSavings)">
              <input
                className="rei-search"
                value={estAnnualSavings}
                onChange={(e) => setEstAnnualSavings(e.target.value)}
                placeholder="e.g., 900"
                inputMode="numeric"
              />
            </Field>

            <Field label="Default Payback Years (estPaybackYears)">
              <input
                className="rei-search"
                value={estPaybackYears}
                onChange={(e) => setEstPaybackYears(e.target.value)}
                placeholder="e.g., 12"
                inputMode="numeric"
              />
            </Field>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
            <button
              className="rei-btn"
              type="button"
              onClick={() => {
                setMode("view");
                resetForm();
              }}
            >
              Cancel
            </button>
            <button className="rei-btn rei-btnPrimary" type="button" onClick={upsert}>
              {mode === "add" ? "Add System" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      <div className="rei-card">
        <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.6fr 1.2fr 180px",
              gap: 10,
              padding: "12px 14px",
              background: "rgba(16,24,40,.03)",
              fontWeight: 900,
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            <div>Category</div>
            <div>System</div>
            <div>Defaults</div>
            <div />
          </div>

          {combinedCatalog.length === 0 ? (
            <div style={{ padding: 14, color: "var(--muted)" }}>
              No local catalog systems yet. Click <b>Seed from MOCK_SYSTEMS</b> or <b>+ Add Catalog System</b>.
            </div>
          ) : (
            combinedCatalog.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.6fr 1.2fr 180px",
                  gap: 10,
                  padding: "12px 14px",
                  borderTop: "1px solid var(--border)",
                  alignItems: "center",
                  background: "white",
                }}
              >
                <div style={{ fontWeight: 900 }}>{s.category}</div>

                <div>
                  <div style={{ fontWeight: 900 }}>{s.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    {(s.highlights || []).join(" • ") || "—"}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                    Tags: <b style={{ color: "var(--text)" }}>{(s.tags || []).join(", ") || "—"}</b>
                  </div>
                </div>

                <div style={{ color: "var(--muted)", fontSize: 12 }}>
                  Cost: {money(s.defaultAssumptions?.estCost)}
                  <br />
                  Savings: {money(s.defaultAssumptions?.estAnnualSavings)} /yr
                  <br />
                  Payback: {s.defaultAssumptions?.estPaybackYears ?? "—"} yrs
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button className="rei-btn" type="button" onClick={() => startEdit(s.id)}>
                    Edit
                  </button>
                  <button
                    className="rei-btn"
                    type="button"
                    onClick={() => remove(s.id)}
                    style={{ borderColor: "#fecaca", color: "#b91c1c", background: "white", fontWeight: 900 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 12 }}>
          Note: This is localStorage-only. Next step is moving to Supabase so deployments don’t wipe anything.
        </div>
      </div>
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
