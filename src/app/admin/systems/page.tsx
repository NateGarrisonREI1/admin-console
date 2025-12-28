"use client";

import { useEffect, useMemo, useState } from "react";
import { MOCK_SYSTEMS } from "../_data/mockSystems";
import { Incentive, loadIncentives } from "../_data/incentives/incentivesModel";

/* ============================
   Types
============================ */

export type LeafTierKey = "good" | "better" | "best";

export type CatalogTierConfig = {
  enabled: boolean;
  installCostMin?: number;
  installCostMax?: number;
  efficiencyScore?: number; // normalized 0–100 (relative improvement strength)
};

export type CatalogSystem = {
  id: string;
  category:
    | "HVAC"
    | "Water Heater"
    | "Windows"
    | "Doors"
    | "Lighting"
    | "Insulation"
    | "Other";
  name: string;
  highlights: string[];
  tags?: string[];

  /** Incentives attached by ID */
  incentiveIds?: string[];

  /** Tier-based configuration (NO hard savings here) */
  tiers: Record<LeafTierKey, CatalogTierConfig>;
};

/* ============================
   Storage helpers
============================ */

const STORAGE_KEY = "LEAF_LOCAL_CATALOG";

function safeId(prefix = "sys") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function loadLocalCatalog(): CatalogSystem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCatalog(list: CatalogSystem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function num(v: string): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseList(raw: string) {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ============================
   Page
============================ */

export default function SystemsCatalogPage() {
  const [systems, setSystems] = useState<CatalogSystem[]>([]);
  const [incentives, setIncentives] = useState<Incentive[]>([]);

  const [mode, setMode] = useState<"view" | "add" | "edit">("view");
  const [editingId, setEditingId] = useState<string | null>(null);

  /* ---------- form state ---------- */
  const [category, setCategory] = useState<CatalogSystem["category"]>("HVAC");
  const [name, setName] = useState("");
  const [highlights, setHighlights] = useState("");
  const [tags, setTags] = useState("");
  const [incentiveIds, setIncentiveIds] = useState<string[]>([]);

  const emptyTier = (): CatalogTierConfig => ({
    enabled: false,
    installCostMin: undefined,
    installCostMax: undefined,
    efficiencyScore: undefined,
  });

  const [tiers, setTiers] = useState<Record<LeafTierKey, CatalogTierConfig>>({
    good: emptyTier(),
    better: emptyTier(),
    best: emptyTier(),
  });

  /* ---------- load ---------- */
  useEffect(() => {
    setSystems(loadLocalCatalog());
    setIncentives(loadIncentives());
  }, []);

  /* ---------- helpers ---------- */
  function resetForm() {
    setCategory("HVAC");
    setName("");
    setHighlights("");
    setTags("");
    setIncentiveIds([]);
    setTiers({
      good: emptyTier(),
      better: emptyTier(),
      best: emptyTier(),
    });
    setEditingId(null);
  }

  function startAdd() {
    resetForm();
    setMode("add");
  }

  function startEdit(sys: CatalogSystem) {
    setCategory(sys.category);
    setName(sys.name);
    setHighlights(sys.highlights.join(", "));
    setTags((sys.tags || []).join(", "));
    setIncentiveIds(sys.incentiveIds || []);
    setTiers(sys.tiers);
    setEditingId(sys.id);
    setMode("edit");
  }

  function toggleIncentive(id: string) {
    setIncentiveIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function updateTier(key: LeafTierKey, patch: Partial<CatalogTierConfig>) {
    setTiers((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  }

  function saveSystem() {
    if (!name.trim()) {
      alert("System name is required.");
      return;
    }

    const hasAnyTier = Object.values(tiers).some((t) => t.enabled);
    if (!hasAnyTier) {
      alert("Enable at least one tier (Good / Better / Best).");
      return;
    }

    const next: CatalogSystem = {
      id: editingId || safeId(),
      category,
      name: name.trim(),
      highlights: parseList(highlights),
      tags: parseList(tags),
      incentiveIds,
      tiers,
    };

    const nextList =
      mode === "edit"
        ? systems.map((s) => (s.id === next.id ? next : s))
        : [next, ...systems];

    setSystems(nextList);
    saveLocalCatalog(nextList);
    setMode("view");
    resetForm();
  }

  function remove(id: string) {
    if (!confirm("Delete this catalog system?")) return;
    const next = systems.filter((s) => s.id !== id);
    setSystems(next);
    saveLocalCatalog(next);
  }

  function seedFromMock() {
    if (!confirm("Seed catalog from MOCK_SYSTEMS?")) return;

    const seeded: CatalogSystem[] = MOCK_SYSTEMS.map((s: any) => ({
      id: safeId(),
      category: s.category,
      name: s.name,
      highlights: s.highlights || [],
      tags: s.tags || [],
      incentiveIds: [],
      tiers: {
        good: { enabled: true },
        better: { enabled: false },
        best: { enabled: false },
      },
    }));

    const next = [...seeded, ...systems];
    setSystems(next);
    saveLocalCatalog(next);
  }

  /* ============================
     Render
============================ */

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="rei-card" style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Systems Catalog</div>
          <div style={{ color: "var(--muted)" }}>
            Defines upgrade options. Savings are calculated per-home during snapshots.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="rei-btn" onClick={seedFromMock}>
            Seed from MOCK_SYSTEMS
          </button>
          <button className="rei-btn rei-btnPrimary" onClick={startAdd}>
            + Add Catalog System
          </button>
        </div>
      </div>

      {(mode === "add" || mode === "edit") && (
        <div className="rei-card">
          <div className="rei-formGrid">
            <Field label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value as any)}>
                {["HVAC","Water Heater","Windows","Doors","Lighting","Insulation","Other"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>

            <Field label="System Name *">
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>

            <Field label="Highlights (comma separated)">
              <input value={highlights} onChange={(e) => setHighlights(e.target.value)} />
            </Field>

            <Field label="Tags">
              <input value={tags} onChange={(e) => setTags(e.target.value)} />
            </Field>
          </div>

          {/* Tiers */}
          <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
            {(["good", "better", "best"] as LeafTierKey[]).map((tier) => (
              <div key={tier} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12 }}>
                <label style={{ fontWeight: 900 }}>
                  <input
                    type="checkbox"
                    checked={tiers[tier].enabled}
                    onChange={(e) => updateTier(tier, { enabled: e.target.checked })}
                  />{" "}
                  {tier.toUpperCase()}
                </label>

                {tiers[tier].enabled && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
                    <input
                      placeholder="Install Cost Min ($)"
                      onChange={(e) => updateTier(tier, { installCostMin: num(e.target.value) })}
                    />
                    <input
                      placeholder="Install Cost Max ($)"
                      onChange={(e) => updateTier(tier, { installCostMax: num(e.target.value) })}
                    />
                    <input
                      placeholder="Efficiency Score (0–100)"
                      onChange={(e) => updateTier(tier, { efficiencyScore: num(e.target.value) })}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Incentives */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 6 }}>Attached Incentives</div>
            {incentives.length === 0 ? (
              <div style={{ color: "var(--muted)" }}>No incentives defined.</div>
            ) : (
              incentives.map((i) => (
                <label key={i.id} style={{ display: "flex", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={incentiveIds.includes(i.id)}
                    onChange={() => toggleIncentive(i.id)}
                  />
                  {i.title} ({i.level})
                </label>
              ))
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <button className="rei-btn" onClick={() => setMode("view")}>
              Cancel
            </button>
            <button className="rei-btn rei-btnPrimary" onClick={saveSystem}>
              {mode === "add" ? "Add System" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {systems.length === 0 ? (
        <div className="rei-card" style={{ color: "var(--muted)" }}>
          No catalog systems yet.
        </div>
      ) : (
        systems.map((s) => (
          <div key={s.id} className="rei-card" style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 900 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {s.category} • Tiers:{" "}
                {Object.entries(s.tiers)
                  .filter(([, t]) => t.enabled)
                  .map(([k]) => k)
                  .join(", ")}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="rei-btn" onClick={() => startEdit(s)}>Edit</button>
              <button className="rei-btn" onClick={() => remove(s.id)}>Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ============================
   Field helper
============================ */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "var(--muted)" }}>{label}</div>
      {children}
    </label>
  );
}
