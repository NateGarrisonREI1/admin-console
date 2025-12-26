"use client";

import { useMemo, useState } from "react";
import type { ExistingSystem, Job } from "../../../_data/mockJobs";

type Props = {
  job: Job;
  onJobUpdated: (nextJob: Job) => void;
};

const SYSTEM_TYPES = [
  "HVAC",
  "Water Heater",
  "Windows",
  "Doors",
  "Insulation",
  "Lighting",
  "Appliances",
  "Other",
];

const MAINTENANCE_OPTIONS: ExistingSystem["maintenance"][] = ["Good", "Average", "Poor"];
const OP_OPTIONS: ExistingSystem["operational"][] = ["Yes", "No"];
const WEAR_OPTIONS: ExistingSystem["wear"][] = [1, 2, 3, 4, 5];

function makeSystemId(type: string) {
  const n = Math.floor(Math.random() * 900000) + 100000;
  const safe = type.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  return `sys_${safe}_${n}`;
}

export default function Worksheet({ job, onJobUpdated }: Props) {
  const [type, setType] = useState<string>("HVAC");
  const [subtype, setSubtype] = useState<string>("");
  const [ageYears, setAgeYears] = useState<string>("");
  const [operational, setOperational] = useState<ExistingSystem["operational"]>("Yes");
  const [wear, setWear] = useState<ExistingSystem["wear"]>(3);
  const [maintenance, setMaintenance] = useState<ExistingSystem["maintenance"]>("Average");

  const canAdd = useMemo(() => {
    return subtype.trim().length > 0 && ageYears.trim().length > 0 && !Number.isNaN(Number(ageYears));
  }, [subtype, ageYears]);

  function handleAddSystem() {
    if (!canAdd) return;

    const nextSystem: ExistingSystem = {
      id: makeSystemId(type),
      type,
      subtype: subtype.trim(),
      ageYears: Number(ageYears),
      operational,
      wear,
      maintenance,
    };

    const nextJob: Job = {
      ...job,
      systems: [nextSystem, ...job.systems],
      createdAt: job.createdAt || new Date().toISOString(),
    };

    onJobUpdated(nextJob);

    setSubtype("");
    setAgeYears("");
    setWear(3);
    setMaintenance("Average");
    setOperational("Yes");
  }

  return (
    <div className="rei-card">
      <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6 }}>Worksheet / Intake</div>
      <div style={{ color: "var(--muted)", marginBottom: 12 }}>
        REI-only v1: add existing systems here. These become the source for LEAF System Snapshots.
      </div>

      {/* Responsive grid: 3 cols on wide screens, 2 cols on medium, 1 col on small */}
      <div className="rei-formGrid">
        <Field label="System Type">
          <select className="rei-search" value={type} onChange={(e) => setType(e.target.value)}>
            {SYSTEM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Subtype *">
          <input
            className="rei-search"
            value={subtype}
            onChange={(e) => setSubtype(e.target.value)}
            placeholder="e.g., Gas Furnace, Heat Pump, Double-pane..."
          />
        </Field>

        <Field label="Age (yrs) *">
          <input
            className="rei-search"
            value={ageYears}
            onChange={(e) => setAgeYears(e.target.value)}
            placeholder="e.g., 12"
            inputMode="numeric"
          />
        </Field>

        <Field label="Operational">
          <select className="rei-search" value={operational} onChange={(e) => setOperational(e.target.value as any)}>
            {OP_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Wear (1–5)">
          <select className="rei-search" value={wear} onChange={(e) => setWear(Number(e.target.value) as any)}>
            {WEAR_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Maintenance">
          <select className="rei-search" value={maintenance} onChange={(e) => setMaintenance(e.target.value as any)}>
            {MAINTENANCE_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <button
          className="rei-btn rei-btnPrimary"
          type="button"
          onClick={handleAddSystem}
          disabled={!canAdd}
          style={{ opacity: canAdd ? 1 : 0.6 }}
        >
          + Add System
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
        Required: <b>Subtype</b> + <b>Age</b>. Everything else can be refined later.
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
