"use client";

import { useEffect, useMemo, useState } from "react";
import { MOCK_SYSTEMS } from "../_data/mockSystems";
import { Incentive, loadIncentives } from "../_data/incentivesModel";

type LeafTierKey = "good" | "better" | "best";

type CatalogSystem = {
  id: string;
  category: "HVAC" | "Water Heater" | "Windows" | "Doors" | "Lighting" | "Insulation" | "Other";
  name: string;
  highlights: string[];
  tags?: string[];

  /** ✅ Phase 3 */
  incentiveIds?: string[];

  defaultAssumptions: {
    estCost?: number;
    estAnnualSavings?: number;
    estPaybackYears?: number;
  };

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
  const [incentives, setIncentives] = useState<Incentive[]>([]);
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
  const [incentiveIds, setIncentiveIds] = useState<string[]>([]);

  useEffect(() => {
    setLocalItems(loadLocalCatalog());
    setIncentives(loadIncentives());
  }, []);

  const combinedCatalog: CatalogSystem[] = useMemo(() => {
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
    setIncentiveIds([]);
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
    setIncentiveIds(item.incentiveIds || []);

    setEditingId(id);
    setMode("edit");
  }

  function toggleIncentive(id: string) {
    setIncentiveIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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
      highlights: highlights.split(",").map((s) => s.trim()).filter(Boolean),
      tags: parseTags(tags),
      incentiveIds,
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
    const ok = confirm("Copy MOCK_SYSTEMS into your editable catalog?");
    if (!ok) return;

    const already = new Set(localItems.map((x) => x.id));
    const seeded: CatalogSystem[] = (MOCK_SYSTEMS as any[]).map((s) => ({
      id: already.has(s.id) ? safeId("sys") : s.id,
      category: s.category,
      name: s.name,
      highlights: Array.isArray(s.highlights) ? s.highlights : [],
      tags: Array.isArray((s as any).tags) ? (s as any).tags : [],
      incentiveIds: [],
      defaultAssumptions: s.defaultAssumptions || {},
    }));

    const nextItems = [...seeded, ...localItems];
    setLocalItems(nextItems);
    saveLocalCatalog(nextItems);
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="rei-card" style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Systems Catalog</div>
          <div style={{ color: "var(--muted)" }}>
            Editable catalog for Suggested Upgrades. Incentives are attached by ID.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="rei-btn" onClick={seedFromMock}>Seed from MOCK_SYSTEMS</button>
          <button className="rei-btn rei-btnPrimary" onClick={startAdd}>+ Add Catalog System</button>
        </div>
      </div>

      {(mode === "add" || mode === "edit") && (
        <div className="rei-card">
          <div className="rei-formGrid">
            {/* existing fields unchanged */}

            <Field label="Attached Incentives">
              {incentives.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: 12 }}>No incentives defined yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {incentives.map((inc) => (
                    <label key={inc.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={incentiveIds.includes(inc.id)}
                        onChange={() => toggleIncentive(inc.id)}
                      />
                      <span>
                        <b>{inc.title}</b>{" "}
                        <span style={{ color: "var(--muted)" }}>({inc.level})</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </Field>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
            <button className="rei-btn" onClick={() => setMode("view")}>Cancel</button>
            <button className="rei-btn rei-btnPrimary" onClick={upsert}>
              {mode === "add" ? "Add System" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* list view unchanged */}
      {/* … existing list rendering stays exactly the same … */}
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
