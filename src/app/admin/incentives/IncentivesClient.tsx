"use client";

import { useEffect, useMemo, useState } from "react";

type IncentiveLevel = "federal" | "state" | "local" | "utility" | "other";
type AmountType = "flat" | "range" | "text";

type ZipTargeting =
  | { mode: "all" }
  | { mode: "states"; states: string[] } // ["OR","WA"]
  | { mode: "zips"; zips: string[] } // ["97123","97006"]
  | { mode: "prefixes"; prefixes: string[] }; // ["971","972"]

export type Incentive = {
  id: string;
  name: string;
  level: IncentiveLevel;
  amountType: AmountType;

  // amount payload
  flat?: number;
  min?: number;
  max?: number;
  text?: string;

  active: boolean;

  // ✅ NEW
  targeting: ZipTargeting;

  updatedAt: string;
  createdAt: string;
};

const STORAGE_KEY = "REI_LOCAL_INCENTIVES_V2";

// US state / territory codes (you can trim if you want)
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

function numberOrUndef(v: string): number | undefined {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : undefined;
}

function clampStateCodes(input: string[]): string[] {
  const cleaned = input
    .map((s) => String(s || "").trim().toUpperCase())
    .filter(Boolean);
  const allowed = new Set(STATE_CODES);
  return Array.from(new Set(cleaned.filter((c) => allowed.has(c))));
}

function parseCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => String(s || "").trim())
    .filter(Boolean);
}

function loadLocalIncentives(): Incentive[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Incentive[];
  } catch {
    return [];
  }
}

function saveLocalIncentives(items: Incentive[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * ✅ This is the matching function you’ll use later in SnapshotEditor:
 * It supports ALL + STATES + ZIPS + PREFIXES.
 */
export function incentiveMatchesLocation(
  incentive: Incentive,
  location: { zip?: string; state?: string }
) {
  const zip = String(location.zip || "").trim();
  const state = String(location.state || "").trim().toUpperCase();

  const t = incentive.targeting;
  if (t.mode === "all") return true;

  if (t.mode === "states") {
    if (!state) return false;
    return (t.states || []).map((s) => s.toUpperCase()).includes(state);
  }

  if (t.mode === "zips") {
    if (!zip) return false;
    return (t.zips || []).includes(zip);
  }

  if (t.mode === "prefixes") {
    if (!zip) return false;
    return (t.prefixes || []).some((p) => zip.startsWith(String(p || "").trim()));
  }

  return false;
}

function money(n?: number) {
  if (typeof n !== "number" || !isFinite(n)) return "—";
  return "$" + Math.round(n).toLocaleString("en-US");
}

function formatAmount(i: Incentive) {
  if (i.amountType === "text") return i.text?.trim() || "—";
  if (i.amountType === "flat") return money(i.flat);
  if (i.amountType === "range") return `${money(i.min)}–${money(i.max)}`;
  return "—";
}

export default function IncentivesClient() {
  const [items, setItems] = useState<Incentive[]>([]);
  const [mode, setMode] = useState<"view" | "add" | "edit">("view");
  const [editingId, setEditingId] = useState<string | null>(null);

  // form
  const [name, setName] = useState("");
  const [level, setLevel] = useState<IncentiveLevel>("state");
  const [amountType, setAmountType] = useState<AmountType>("flat");
  const [flat, setFlat] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [text, setText] = useState("");
  const [active, setActive] = useState(true);

  // targeting form
  const [targetMode, setTargetMode] = useState<ZipTargeting["mode"]>("all");
  const [statesCsv, setStatesCsv] = useState("OR");
  const [zipsCsv, setZipsCsv] = useState("");
  const [prefixesCsv, setPrefixesCsv] = useState("");

  useEffect(() => {
    setItems(loadLocalIncentives());
  }, []);

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => (a.level === b.level ? a.name.localeCompare(b.name) : a.level.localeCompare(b.level)));
    return copy;
  }, [items]);

  function resetForm() {
    setName("");
    setLevel("state");
    setAmountType("flat");
    setFlat("");
    setMin("");
    setMax("");
    setText("");
    setActive(true);

    setTargetMode("all");
    setStatesCsv("OR");
    setZipsCsv("");
    setPrefixesCsv("");
    setEditingId(null);
  }

  function startAdd() {
    resetForm();
    setMode("add");
  }

  function startEdit(id: string) {
    const inc = items.find((x) => x.id === id);
    if (!inc) return;

    setName(inc.name || "");
    setLevel(inc.level);
    setAmountType(inc.amountType);

    setFlat(inc.flat != null ? String(inc.flat) : "");
    setMin(inc.min != null ? String(inc.min) : "");
    setMax(inc.max != null ? String(inc.max) : "");
    setText(inc.text ?? "");
    setActive(Boolean(inc.active));

    // targeting
    setTargetMode(inc.targeting.mode);

    if (inc.targeting.mode === "states") setStatesCsv((inc.targeting.states || []).join(","));
    if (inc.targeting.mode === "zips") setZipsCsv((inc.targeting.zips || []).join(","));
    if (inc.targeting.mode === "prefixes") setPrefixesCsv((inc.targeting.prefixes || []).join(","));

    setEditingId(id);
    setMode("edit");
  }

  function buildTargeting(): ZipTargeting {
    if (targetMode === "all") return { mode: "all" };
    if (targetMode === "states") return { mode: "states", states: clampStateCodes(parseCsv(statesCsv)) };
    if (targetMode === "zips") return { mode: "zips", zips: parseCsv(zipsCsv) };
    if (targetMode === "prefixes") return { mode: "prefixes", prefixes: parseCsv(prefixesCsv) };
    return { mode: "all" };
  }

  function upsert() {
    const trimmed = name.trim();
    if (!trimmed) {
      alert("Incentive name is required.");
      return;
    }

    const targeting = buildTargeting();
    if (targeting.mode === "states" && targeting.states.length === 0) {
      alert("State targeting selected, but no valid state codes were provided (e.g. OR, WA).");
      return;
    }

    const createdAt = mode === "edit" ? (items.find((x) => x.id === editingId)?.createdAt || nowIso()) : nowIso();
    const next: Incentive = {
      id: editingId || safeId("inc"),
      name: trimmed,
      level,
      amountType,
      flat: amountType === "flat" ? numberOrUndef(flat) : undefined,
      min: amountType === "range" ? numberOrUndef(min) : undefined,
      max: amountType === "range" ? numberOrUndef(max) : undefined,
      text: amountType === "text" ? text.trim() : undefined,
      active,
      targeting,
      createdAt,
      updatedAt: nowIso(),
    };

    const nextItems =
      mode === "edit"
        ? items.map((x) => (x.id === next.id ? next : x))
        : [next, ...items];

    setItems(nextItems);
    saveLocalIncentives(nextItems);

    setMode("view");
    resetForm();
  }

  function remove(id: string) {
    const ok = confirm("Delete this incentive? (local only)");
    if (!ok) return;
    const nextItems = items.filter((x) => x.id !== id);
    setItems(nextItems);
    saveLocalIncentives(nextItems);
  }

  function targetingLabel(t: ZipTargeting) {
    if (t.mode === "all") return "All locations";
    if (t.mode === "states") return `States: ${(t.states || []).join(", ") || "—"}`;
    if (t.mode === "zips") return `ZIPs: ${(t.zips || []).join(", ") || "—"}`;
    if (t.mode === "prefixes") return `ZIP prefixes: ${(t.prefixes || []).join(", ") || "—"}`;
    return "—";
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="rei-card" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Incentives Library</div>
          <div style={{ color: "var(--muted)" }}>
            Create/edit incentives here. Later, catalog systems will attach these by ID.
            <br />
            <b>Targeting</b> supports: All, Statewide (OR/WA), Zip lists, Zip prefixes.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="rei-btn rei-btnPrimary" type="button" onClick={startAdd}>
            + Add Incentive
          </button>
        </div>
      </div>

      {(mode === "add" || mode === "edit") && (
        <div className="rei-card">
          <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 10 }}>
            {mode === "add" ? "Add Incentive" : "Edit Incentive"}
          </div>

          <div className="rei-formGrid">
            <Field label="Name *">
              <input
                className="rei-search"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., OR Heat Pump Rebate"
              />
            </Field>

            <Field label="Level">
              <select className="rei-search" value={level} onChange={(e) => setLevel(e.target.value as any)}>
                {["federal", "state", "local", "utility", "other"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Amount Type">
              <select className="rei-search" value={amountType} onChange={(e) => setAmountType(e.target.value as any)}>
                <option value="flat">Flat ($)</option>
                <option value="range">Range ($)</option>
                <option value="text">Text</option>
              </select>
            </Field>

            {amountType === "flat" && (
              <Field label="Flat Amount ($)">
                <input className="rei-search" value={flat} onChange={(e) => setFlat(e.target.value)} inputMode="numeric" placeholder="e.g., 2000" />
              </Field>
            )}

            {amountType === "range" && (
              <>
                <Field label="Min ($)">
                  <input className="rei-search" value={min} onChange={(e) => setMin(e.target.value)} inputMode="numeric" placeholder="e.g., 1000" />
                </Field>
                <Field label="Max ($)">
                  <input className="rei-search" value={max} onChange={(e) => setMax(e.target.value)} inputMode="numeric" placeholder="e.g., 4000" />
                </Field>
              </>
            )}

            {amountType === "text" && (
              <Field label="Text Amount">
                <input className="rei-search" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g., 30% tax credit up to $2,000" />
              </Field>
            )}

            <Field label="Active">
              <select className="rei-search" value={active ? "yes" : "no"} onChange={(e) => setActive(e.target.value === "yes")}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </Field>

            {/* Targeting */}
            <Field label="Targeting Mode">
              <select className="rei-search" value={targetMode} onChange={(e) => setTargetMode(e.target.value as any)}>
                <option value="all">All locations</option>
                <option value="states">States (OR, WA…)</option>
                <option value="zips">ZIP list (97123, 97006…)</option>
                <option value="prefixes">ZIP prefixes (971, 972…)</option>
              </select>
            </Field>

            {targetMode === "states" && (
              <Field label="States (comma separated: OR, WA)">
                <input className="rei-search" value={statesCsv} onChange={(e) => setStatesCsv(e.target.value)} placeholder="OR, WA" />
              </Field>
            )}

            {targetMode === "zips" && (
              <Field label="ZIPs (comma separated)">
                <input className="rei-search" value={zipsCsv} onChange={(e) => setZipsCsv(e.target.value)} placeholder="97123, 97006" />
              </Field>
            )}

            {targetMode === "prefixes" && (
              <Field label="ZIP prefixes (comma separated)">
                <input className="rei-search" value={prefixesCsv} onChange={(e) => setPrefixesCsv(e.target.value)} placeholder="971, 972" />
              </Field>
            )}

            {targetMode === "states" && (
              <div style={{ gridColumn: "1 / -1", color: "var(--muted)", fontSize: 12 }}>
                Tip: valid codes are standard two-letter US state/territory codes. (OR, WA, CA…)
              </div>
            )}
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
              {mode === "add" ? "Add Incentive" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      <div className="rei-card">
        <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr 1fr 1.6fr 180px",
              gap: 10,
              padding: "12px 14px",
              background: "rgba(16,24,40,.03)",
              fontWeight: 900,
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            <div>Name</div>
            <div>Level</div>
            <div>Amount</div>
            <div>Targeting</div>
            <div />
          </div>

          {sorted.length === 0 ? (
            <div style={{ padding: 14, color: "var(--muted)" }}>
              No incentives yet. Click <b>+ Add Incentive</b>.
            </div>
          ) : (
            sorted.map((i) => (
              <div
                key={i.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 1fr 1.6fr 180px",
                  gap: 10,
                  padding: "12px 14px",
                  borderTop: "1px solid var(--border)",
                  alignItems: "center",
                  background: "white",
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>{i.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
                    {i.active ? "Active" : "Inactive"} • Updated {new Date(i.updatedAt).toLocaleString()}
                  </div>
                </div>

                <div style={{ fontWeight: 900 }}>{i.level}</div>
                <div style={{ color: "var(--muted)" }}>{formatAmount(i)}</div>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>{targetingLabel(i.targeting)}</div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button className="rei-btn" type="button" onClick={() => startEdit(i.id)}>
                    Edit
                  </button>
                  <button
                    className="rei-btn"
                    type="button"
                    onClick={() => remove(i.id)}
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
          Note: this is localStorage-only (deployments shouldn’t wipe it, but different devices/browsers will).
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
