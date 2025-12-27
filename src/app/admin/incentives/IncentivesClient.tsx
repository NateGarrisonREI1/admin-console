"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Incentive,
  IncentiveLevel,
  loadIncentives,
  upsertIncentive,
  deleteIncentive,
} from "../_data/incentives/incentivesModel"
;

/* ---------------------------------- */
/* helpers                            */
/* ---------------------------------- */

const STATE_CODES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  "DC","PR","GU","VI","AS","MP"
];

function safeId(prefix = "inc") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function parseCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function clampStates(input: string[]): string[] {
  const allowed = new Set(STATE_CODES);
  return Array.from(
    new Set(input.map((s) => s.toUpperCase()).filter((s) => allowed.has(s)))
  );
}

function money(n?: number) {
  if (typeof n !== "number" || !isFinite(n)) return "—";
  return "$" + Math.round(n).toLocaleString("en-US");
}

/* ---------------------------------- */
/* component                          */
/* ---------------------------------- */

export default function IncentivesClient() {
  const [items, setItems] = useState<Incentive[]>([]);
  const [mode, setMode] = useState<"view" | "add" | "edit">("view");
  const [editingId, setEditingId] = useState<string | null>(null);

  // form fields
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<IncentiveLevel>("state");
  const [amount, setAmount] = useState("");
  const [valueText, setValueText] = useState("");
  const [statesCsv, setStatesCsv] = useState("");
  const [zipsCsv, setZipsCsv] = useState("");

  useEffect(() => {
    setItems(loadIncentives());
  }, []);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) =>
      a.level === b.level
        ? a.title.localeCompare(b.title)
        : a.level.localeCompare(b.level)
    );
  }, [items]);

  function resetForm() {
    setTitle("");
    setLevel("state");
    setAmount("");
    setValueText("");
    setStatesCsv("");
    setZipsCsv("");
    setEditingId(null);
  }

  function startAdd() {
    resetForm();
    setMode("add");
  }

  function startEdit(id: string) {
    const inc = items.find((i) => i.id === id);
    if (!inc) return;

    setTitle(inc.title);
    setLevel(inc.level);
    setAmount(inc.amount != null ? String(inc.amount) : "");
    setValueText(inc.valueText || "");
    setStatesCsv((inc.appliesTo?.states || []).join(","));
    setZipsCsv((inc.appliesTo?.zips || []).join(","));
    setEditingId(id);
    setMode("edit");
  }

  function save() {
    if (!title.trim()) {
      alert("Title is required.");
      return;
    }

    const states = clampStates(parseCsv(statesCsv));
    const zips = parseCsv(zipsCsv);

    const now = nowIso();
    const existing = items.find((i) => i.id === editingId);

    const incentive: Incentive = {
      id: editingId || safeId(),
      title: title.trim(),
      level,
      amount: amount ? Number(amount) : undefined,
      valueText: valueText || undefined,
      appliesTo:
        states.length || zips.length
          ? { states: states.length ? states : undefined, zips: zips.length ? zips : undefined }
          : undefined,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    upsertIncentive(incentive);
    setItems(loadIncentives());
    setMode("view");
    resetForm();
  }

  function remove(id: string) {
    if (!confirm("Delete this incentive?")) return;
    deleteIncentive(id);
    setItems(loadIncentives());
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="rei-card" style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Incentives Library</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            Global incentive definitions. Catalog systems reference these by ID.
          </div>
        </div>
        <button className="rei-btn rei-btnPrimary" onClick={startAdd}>
          + Add Incentive
        </button>
      </div>

      {(mode === "add" || mode === "edit") && (
        <div className="rei-card">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>
            {mode === "add" ? "Add Incentive" : "Edit Incentive"}
          </div>

          <div className="rei-formGrid">
            <Field label="Title *">
              <input className="rei-search" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>

            <Field label="Level">
              <select className="rei-search" value={level} onChange={(e) => setLevel(e.target.value as IncentiveLevel)}>
                <option value="federal">Federal</option>
                <option value="state">State</option>
                <option value="local">Local</option>
              </select>
            </Field>

            <Field label="Amount ($)">
              <input className="rei-search" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>

            <Field label="Value Text (optional)">
              <input className="rei-search" value={valueText} onChange={(e) => setValueText(e.target.value)} />
            </Field>

            <Field label="States (OR, WA)">
              <input className="rei-search" value={statesCsv} onChange={(e) => setStatesCsv(e.target.value)} />
            </Field>

            <Field label="ZIPs (97123, 97006)">
              <input className="rei-search" value={zipsCsv} onChange={(e) => setZipsCsv(e.target.value)} />
            </Field>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
            <button className="rei-btn" onClick={() => setMode("view")}>Cancel</button>
            <button className="rei-btn rei-btnPrimary" onClick={save}>
              {mode === "add" ? "Add" : "Save"}
            </button>
          </div>
        </div>
      )}

      <div className="rei-card">
        {sorted.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>No incentives yet.</div>
        ) : (
          sorted.map((i) => (
            <div
              key={i.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr .8fr 1fr 1.6fr 140px",
                gap: 10,
                padding: "10px 0",
                borderTop: "1px solid var(--border)",
              }}
            >
              <div>
                <div style={{ fontWeight: 900 }}>{i.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  Updated {new Date(i.updatedAt).toLocaleDateString()}
                </div>
              </div>

              <div>{i.level}</div>
              <div>{i.amount != null ? money(i.amount) : i.valueText || "—"}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {i.appliesTo?.states?.length && <>States: {i.appliesTo.states.join(", ")}<br /></>}
                {i.appliesTo?.zips?.length && <>ZIPs: {i.appliesTo.zips.join(", ")}</>}
                {!i.appliesTo && "All locations"}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="rei-btn" onClick={() => startEdit(i.id)}>Edit</button>
                <button className="rei-btn" onClick={() => remove(i.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
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
