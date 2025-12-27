"use client";

import { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import {
  type SnapshotDraft,
  upsertLocalSnapshot,
} from "../../../_data/localSnapshots";
import { MOCK_SYSTEMS, type CatalogSystem } from "../../../_data/mockSystems";

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

  /* ─────────────────────────────────────────────
     LOCAL STATE (editable snapshot)
  ────────────────────────────────────────────── */

  const [working, setWorking] = useState<SnapshotDraft>(() => {
    if (snapshot) return snapshot;

    return {
      id: uuidv4(),
      jobId,
      systemId: existingSystem.id,

      existing: {
        type: existingSystem.type,
        subtype: existingSystem.subtype,
        ageYears: existingSystem.ageYears,
        operational: existingSystem.operational,
        wear: existingSystem.wear,
        maintenance: existingSystem.maintenance,
      },

      suggested: {
        catalogSystemId: null,
        name: "",
        estCost: null,
        estAnnualSavings: null,
        estPaybackYears: null,
        notes: "",
        tier: "better",
      },

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  /* ─────────────────────────────────────────────
     DERIVED
  ────────────────────────────────────────────── */

  const catalogSystems = useMemo(() => MOCK_SYSTEMS, []);
  const selectedCatalog: CatalogSystem | null = useMemo(() => {
    if (!working.suggested.catalogSystemId) return null;
    return (
      catalogSystems.find(
        (s) => s.id === working.suggested.catalogSystemId
      ) || null
    );
  }, [working.suggested.catalogSystemId, catalogSystems]);

  /* ─────────────────────────────────────────────
     EFFECTS
  ────────────────────────────────────────────── */

  // Auto-fill suggested name when catalog changes
  useEffect(() => {
    if (!selectedCatalog) return;
    setWorking((w) => ({
      ...w,
      suggested: {
        ...w.suggested,
        name: selectedCatalog.name,
      },
    }));
  }, [selectedCatalog]);

  /* ─────────────────────────────────────────────
     HANDLERS
  ────────────────────────────────────────────── */

  function updateExisting<K extends keyof SnapshotDraft["existing"]>(
    key: K,
    value: SnapshotDraft["existing"][K]
  ) {
    setWorking((w) => ({
      ...w,
      existing: { ...w.existing, [key]: value },
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateSuggested<K extends keyof SnapshotDraft["suggested"]>(
    key: K,
    value: SnapshotDraft["suggested"][K]
  ) {
    setWorking((w) => ({
      ...w,
      suggested: { ...w.suggested, [key]: value },
      updatedAt: new Date().toISOString(),
    }));
  }

  function handleSave() {
    upsertLocalSnapshot(working);
    onSaved();
  }

  /* ─────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────── */

  return (
    <div className="rei-card" style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6 }}>
        {isEdit ? "Edit LEAF Snapshot" : "Create LEAF Snapshot"}
      </div>

      <div style={{ color: "var(--muted)", marginBottom: 16 }}>
        Adjust system condition and select a recommended upgrade. Savings update
        automatically.
      </div>

      {/* ───────────────── Existing System ───────────────── */}
      <div style={{ fontWeight: 800, marginBottom: 8 }}>
        Existing System Condition
      </div>

      <div className="rei-formGrid">
        <Field label="Age (years)">
          <input
            className="rei-search"
            type="number"
            value={working.existing.ageYears}
            onChange={(e) =>
              updateExisting("ageYears", Number(e.target.value))
            }
          />
        </Field>

        <Field label="Wear (1–5)">
          <select
            className="rei-search"
            value={working.existing.wear}
            onChange={(e) =>
              updateExisting("wear", Number(e.target.value) as any)
            }
          >
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
            onChange={(e) =>
              updateExisting("operational", e.target.value as any)
            }
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </Field>

        <Field label="Maintenance">
          <select
            className="rei-search"
            value={working.existing.maintenance}
            onChange={(e) =>
              updateExisting("maintenance", e.target.value as any)
            }
          >
            <option value="Good">Good</option>
            <option value="Average">Average</option>
            <option value="Poor">Poor</option>
          </select>
        </Field>
      </div>

      {/* ───────────────── Suggested Upgrade ───────────────── */}
      <div style={{ fontWeight: 800, margin: "18px 0 8px" }}>
        Suggested Upgrade
      </div>

      <div className="rei-formGrid">
        <Field label="Catalog System">
          <select
            className="rei-search"
            value={working.suggested.catalogSystemId || ""}
            onChange={(e) =>
              updateSuggested(
                "catalogSystemId",
                e.target.value || null
              )
            }
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
            onChange={(e) =>
              updateSuggested("tier", e.target.value as any)
            }
          >
            <option value="good">Good</option>
            <option value="better">Better</option>
            <option value="best">Best</option>
          </select>
        </Field>
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
        <button
          className="rei-btn rei-btnPrimary"
          type="button"
          onClick={handleSave}
        >
          Save Snapshot
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FIELD
───────────────────────────────────────────── */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "var(--muted)" }}>
        {label}
      </div>
      {children}
    </label>
  );
}
