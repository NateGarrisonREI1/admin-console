// src/app/admin/upgrade-catalog/_components/UpgradeCatalogConsole.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUpgradeItem,
  deleteUpgradeItem,
  duplicateUpgradeItem,
  promoteUpgradeItem,
  seedPresetForFeature,
  toggleUpgradeItemActive,
  updateUpgradeItem,
  setUpgradeItemPosition,
  setUpgradeCatalogTypeMapping,
  bulkUpsertMappingsAndAssumptions,
  setFeaturePriority,
} from "../_actions";

import UpgradeCatalogImagePicker from "./UpgradeCatalogImagePicker";

type Row = {
  id: string;
  display_name: string;
  description: string | null;
  feature_key: string;
  lead_class: "equipment" | "service";
  intent_keys: string[] | null;
  sort_rank: number | null;
  is_active: boolean | null;

  used_count: number | null;
  chosen_count: number | null;
  error_count: number | null;
  last_used_at: string | null;

  image_kind?: "storage" | "external" | null;
  image_storage_bucket?: string | null;
  image_storage_path?: string | null;
  image_external_url?: string | null;
};

type HealthRow = {
  upgrade_catalog_id: string;
  upgrade_type_id?: string | null;
  upgrade_type_name?: string | null;

  install_cost_min?: number | null;
  install_cost_max?: number | null;
  annual_savings_min?: number | null;
  annual_savings_max?: number | null;
  expected_life_years?: number | null;

  shared_type_count?: number | null;

  has_type_mapping: boolean;
  has_costs: boolean;
  has_savings: boolean;
  is_roi_ready: boolean;
};


type UpgradeTypeLite = { id: string; name: string };



function titleizeKey(key: string) {
  const t = String(key || "").replace(/_/g, " ").trim();
  return t ? t.replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
}

function isPriorityKey(feature_key: string, settings?: Record<string, { is_priority?: boolean | null }>) {
  const k = String(feature_key || "").trim();
  if (!k) return false;
  return settings?.[k]?.is_priority === true;
}

function priorityRank(feature_key: string, settings?: Record<string, { priority_rank?: number | null }>) {
  const k = String(feature_key || "").trim();
  const r = settings?.[k]?.priority_rank;
  return typeof r === "number" && Number.isFinite(r) ? r : 9999;
}

function prettyIntent(k: string) {
  const s = String(k || "").trim();
  if (!s) return "";
  // quick mappings (tune to your vocab)
  if (s.includes("when_replacing")) return "When replacing";
  if (s.includes("comfort")) return "Comfort";
  if (s.includes("air_sealing")) return "Air sealing";
  if (s.includes("reduce_leakage")) return "Reduce leakage";
  if (s.includes("energy_star")) return "Energy Star";
  return s.replace(/_/g, " ");
}

function shortId(id: string) {
  const s = String(id || "");
  return s.length > 10 ? `${s.slice(0, 8)}…${s.slice(-4)}` : s;
}

function CopyButton(props: { value: string; label?: string; className?: string }) {
  const { value, label = "Copy", className = "" } = props;
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(String(value || ""));
        } catch {
          // ignore (clipboard may be blocked)
        }
      }}
      className={`inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 ${className}`}
      title={value}
    >
      {label}
    </button>
  );
}

function rankOf(r: Row) {
  return typeof r.sort_rank === "number" ? r.sort_rank : 100;
}

function activeSiblingsForFeature(allRows: Row[], feature_key: string) {
  return allRows
    .filter((r) => r.feature_key === feature_key && r.is_active)
    .slice()
    .sort((a, b) => rankOf(a) - rankOf(b) || a.display_name.localeCompare(b.display_name));
}

function supabasePublicUrl(bucket: string, path: string) {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  if (!base || !bucket || !path) return "";
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

function imagePreviewUrl(r: Row) {
  if (r.image_kind === "external" && r.image_external_url) return r.image_external_url;
  if (r.image_kind === "storage" && r.image_storage_bucket && r.image_storage_path) {
    return supabasePublicUrl(r.image_storage_bucket, r.image_storage_path);
  }
  return "";
}

function Pill(props: { label: string; tone?: "neutral" | "good" | "warn" | "info" | "danger" }) {
  const { label, tone = "neutral" } = props;
  const cls =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : tone === "info"
      ? "border-blue-200 bg-blue-50 text-blue-800"
      : "border-slate-200 bg-slate-50 text-slate-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function Btn(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: "neutral" | "good" | "warn" | "danger";
    size?: "sm" | "md";
  }
) {
  const { tone = "neutral", size = "md", className = "", ...rest } = props;
  const cls =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100"
      : tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100"
      : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50";

  const pad = size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-xs";

  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center rounded-lg border font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${pad} ${cls} ${className}`}
    />
  );
}

/** Small, dependency-free kebab menu */
function KebabMenu(props: {
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const { align = "right", children } = props;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div
      className={`relative ${open ? "z-[100]" : "z-10"}`} // ✅ lift above neighboring cards
      ref={ref}
      data-open={open ? "true" : "false"}
    >
      <button
        type="button"
        aria-label="More"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      >
        <span className="text-lg leading-none">⋯</span>
      </button>

      {open ? (
        <div
          className={`absolute z-[200] mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </div>
      ) : null}

    </div>
  );
}


function MenuItem(props: {
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  as?: "button";
}) {
  const { children, danger, disabled, onClick } = props;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
        danger
          ? "text-rose-700 hover:bg-rose-50"
          : "text-slate-800 hover:bg-slate-50"
      } ${disabled ? "cursor-not-allowed opacity-50 hover:bg-transparent" : ""}`}
    >
      {children}
    </button>
  );
}

export default function UpgradeCatalogConsole(props: {
  rows: Row[];
  health?: HealthRow[];
  upgradeTypes?: UpgradeTypeLite[];
  featureSettings?: Record<string, { is_priority?: boolean | null; priority_rank?: number | null }>;
}) {
  const { rows, health, featureSettings } = props;

  const healthById = useMemo(() => {
    const m = new Map<string, HealthRow>();
    for (const h of health || []) {
      if (h?.upgrade_catalog_id) m.set(String(h.upgrade_catalog_id), h as any);
    }
    return m;
  }, [health]);

  const [q, setQ] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"catalog" | "bulk">("catalog");

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const k = String(r.feature_key || "unknown").trim() || "unknown";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => rankOf(a) - rankOf(b) || a.display_name.localeCompare(b.display_name));
      map.set(k, list);
    }
    return map;
  }, [rows]);

  const featureKeys = useMemo(() => {
    const keys = Array.from(grouped.keys());

    const pri = keys
      .filter((k) => isPriorityKey(k, featureSettings))
      .sort((a, b) => priorityRank(a, featureSettings) - priorityRank(b, featureSettings) || a.localeCompare(b));

    const rest = keys
      .filter((k) => !isPriorityKey(k, featureSettings))
      .sort((a, b) => a.localeCompare(b));

    return [...pri, ...rest];
  }, [grouped, featureSettings]);

  const filteredKeys = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return featureKeys;

    return featureKeys.filter((k) => {
      if (k.toLowerCase().includes(query)) return true;
      const list = grouped.get(k) || [];
      return list.some((r) => r.display_name.toLowerCase().includes(query));
    });
  }, [q, featureKeys, grouped]);

  const effectiveSelectedKey = useMemo(() => {
    if (selectedKey && grouped.has(selectedKey)) return selectedKey;
    return filteredKeys[0] ?? null;
  }, [selectedKey, grouped, filteredKeys]);

  const selectedRows = effectiveSelectedKey ? grouped.get(effectiveSelectedKey) || [] : [];
  const active = selectedRows.filter((r) => r.is_active);
  const inactive = selectedRows.filter((r) => !r.is_active);

  const defaultPick = active.length ? active[0] : null;
  const alternates = active.length > 1 ? active.slice(1) : [];

  const coverage = useMemo(() => {
    let ok = 0;
    let warn = 0;
    for (const k of featureKeys) {
      const list = grouped.get(k) || [];
      const a = list.filter((x) => x.is_active);
      if (a.length === 0) warn++;
      else ok++;
    }
    return { ok, warn, total: featureKeys.length };
  }, [featureKeys, grouped]);

  return (
    <div className="w-full">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upgrade Catalog</h1>
          <p className="mt-1 text-sm text-slate-600">
            Backend decision table for HES → suggestions. Lowest <span className="font-mono">sort_rank</span> wins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode((v) => (v === "catalog" ? "bulk" : "catalog"))}
            className="rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            {viewMode === "bulk" ? "Back to catalog" : "Bulk map / assumptions"}
          </button>

          <Pill label={`${rows.length} items`} />
          <Pill label={`${coverage.ok}/${coverage.total} covered`} tone={coverage.warn ? "warn" : "good"} />
          {coverage.warn ? <Pill label={`${coverage.warn} missing`} tone="warn" /> : <Pill label="All good" tone="good" />}
        </div>
      </div>

      {viewMode === "bulk" ? (
        <BulkMappingTable rows={rows} healthById={healthById} upgradeTypes={props.upgradeTypes || []} />
      ) : (
      <div className="grid grid-cols-12 gap-4">
        {/* LEFT */}
        <div className="col-span-12 lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search feature or item…"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
              />
              <div className="mt-2 text-xs text-slate-500">
                Priority pinned: <span className="font-mono">Feature Settings</span>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-auto">
              {filteredKeys.length === 0 ? (
                <div className="p-4 text-sm text-slate-600">No matches.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredKeys.map((k) => {
                    const list = grouped.get(k) || [];
                    const a = list.filter((x) => x.is_active);
                    const covered = a.length > 0;
                    const isSel = k === effectiveSelectedKey;

                    return (
	                      <li key={k}>
	                        <div className={`flex items-stretch gap-2 px-2 py-2 ${isSel ? "bg-slate-50" : "bg-white"}`}>
	                          <button
	                            type="button"
	                            onClick={() => {
	                              setSelectedKey(k);
	                              setEditingId(null);
	                            }}
	                            className="flex-1 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
	                          >
	                            <div className="flex items-start justify-between gap-3">
	                              <div className="min-w-0">
	                                <div className="text-sm font-semibold">{titleizeKey(k)}</div>
</div>

	                              <div className="flex flex-wrap items-center justify-end gap-2">
	                                {isPriorityKey(k, featureSettings) ? <Pill label="Priority" tone="info" /> : null}
	                                {covered ? (
	                                  <Pill label={`${a.length} active`} tone="good" />
	                                ) : (
	                                  <Pill label="Missing" tone="warn" />
	                                )}
	                              </div>
	                            </div>
	                          </button>

	                          <KebabMenu>
                              <div className="px-3 py-2 text-[11px] text-slate-500">
                                Internal key: <span className="font-mono text-slate-700">{k}</span>
                              </div>
                              <div className="my-1 h-px bg-slate-100" />
                              <form action={setFeaturePriority}>
                                <input type="hidden" name="feature_key" value={k} />
                                <input type="hidden" name="is_priority" value={isPriorityKey(k, featureSettings) ? "false" : "true"} />
                                <button
                                  type="submit"
                                  className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50"
                                >
                                  {isPriorityKey(k, featureSettings) ? "Remove priority" : "Mark as priority"}
                                </button>
                              </form>
                              <MenuItem
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(String(k || ""));
                                  } catch {}
                                }}
                              >
                                Copy key
                              </MenuItem>
                            </KebabMenu>
	                        </div>
	                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="col-span-12 lg:col-span-8">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-bold">
                      {effectiveSelectedKey ? titleizeKey(effectiveSelectedKey) : "Select a feature"}
                    </div>
                    {effectiveSelectedKey ? (
                      <KebabMenu>
                        <div className="px-3 py-2 text-[11px] text-slate-500">
                          Internal key:{" "}
                          <span className="font-mono text-slate-700">{effectiveSelectedKey}</span>
                        </div>
                        <div className="my-1 h-px bg-slate-100" />
                        <form action={setFeaturePriority}>
                          <input type="hidden" name="feature_key" value={effectiveSelectedKey} />
                          <input
                            type="hidden"
                            name="is_priority"
                            value={isPriorityKey(effectiveSelectedKey, featureSettings) ? "false" : "true"}
                          />
                          <button
                            type="submit"
                            className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50"
                          >
                            {isPriorityKey(effectiveSelectedKey, featureSettings) ? "Remove priority" : "Mark as priority"}
                          </button>
                        </form>
                        <MenuItem
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(String(effectiveSelectedKey || ""));
                            } catch {}
                          }}
                        >
                          Copy key
                        </MenuItem>
                      </KebabMenu>
                    ) : null}
                  </div>
	                  </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Pill label={`${active.length} active`} tone={active.length ? "good" : "warn"} />
                  {inactive.length ? <Pill label={`${inactive.length} inactive`} tone="neutral" /> : null}
                </div>
              </div>

              {effectiveSelectedKey ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <form action={seedPresetForFeature}>
                    <input type="hidden" name="feature_key" value={effectiveSelectedKey} />
                    <Btn type="submit" tone="good">Seed preset</Btn>
                  </form>

                  <details className="relative">
                    <summary className="list-none">
                      <Btn type="button">Add option</Btn>
                    </summary>

                    <div className="absolute right-0 z-20 mt-2 w-[520px] max-w-[90vw] rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                      <div className="text-sm font-semibold">Add new option</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Creates a new catalog option for <span className="font-mono">{effectiveSelectedKey}</span>.
                      </div>

                      <form action={createUpgradeItem} className="mt-3 space-y-3">
                        <input type="hidden" name="feature_key" value={effectiveSelectedKey} />

                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-12">
                            <label className="text-xs font-semibold text-slate-600">Display name</label>
                            <input
                              name="display_name"
                              required
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="e.g. ENERGY STAR Heat Pump Upgrade"
                            />
                          </div>

                          <div className="col-span-12">
                            <label className="text-xs font-semibold text-slate-600">Description (optional)</label>
                            <input
                              name="description"
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="Short customer-facing description"
                            />
                          </div>

                          <div className="col-span-6">
                            <label className="text-xs font-semibold text-slate-600">Lead class</label>
                            <select name="lead_class" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                              <option value="service">service</option>
                              <option value="equipment">equipment</option>
                            </select>
                          </div>

                          <div className="col-span-6">
                            <label className="text-xs font-semibold text-slate-600">Sort rank</label>
                            <input
                              name="sort_rank"
                              defaultValue="10"
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            />
                          </div>

                          <div className="col-span-12">
                            <label className="text-xs font-semibold text-slate-600">Intent keys (comma-separated)</label>
                            <input
                              name="intent_keys"
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
                              placeholder="e.g. upgrade_when_replacing_energy_star, reduce_leakage"
                            />
                          </div>

                          <div className="col-span-12 flex items-center gap-2">
                            <input id="is_active" name="is_active" type="checkbox" defaultChecked value="true" />
                            <label htmlFor="is_active" className="text-sm text-slate-700">Active</label>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <Btn type="submit" tone="good">Create</Btn>
                        </div>
                      </form>
                    </div>
                  </details>
                </div>
              ) : null}
            </div>

            <div className="px-5 py-4">
              {/* DEFAULT */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Default auto-suggest</div>
                    <div className="mt-1 text-sm text-slate-600">
                      Snapshot generator will pick this first for this feature.
                    </div>
                  </div>
                  <Pill label="Auto" tone="info" />
                </div>

                {defaultPick ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                    <ItemRow
                      row={defaultPick}
                      health={healthById.get(defaultPick.id) ?? null}
                      feature_key={effectiveSelectedKey || ""}
                      allRows={rows}
                      isDefault
                      isEditing={editingId === defaultPick.id}
                      onEdit={() => setEditingId(editingId === defaultPick.id ? null : defaultPick.id)}
                      onDone={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
                    <div className="text-sm font-semibold">No active catalog items</div>
                    <div className="mt-1 text-sm">
                      Hit <span className="font-semibold">Seed preset</span> or add an option to enable automation.
                    </div>
                  </div>
                )}
              </div>

              {/* ALTERNATES */}
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Alternates</div>
                  <div className="text-xs text-slate-500">Ranked order</div>
                </div>

                {alternates.length === 0 ? (
                  <div className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    No alternates yet.
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {alternates.map((r) => (
                      <div key={r.id} className="relative overflow-visible rounded-lg border border-slate-200 bg-white p-4">
                        <ItemRow
                          row={r}
                        health={healthById.get(r.id) ?? null}
                          feature_key={effectiveSelectedKey || ""}
                          allRows={rows}
                          isDefault={false}
                          isEditing={editingId === r.id}
                          onEdit={() => setEditingId(editingId === r.id ? null : r.id)}
                          onDone={() => setEditingId(null)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* INACTIVE */}
              {inactive.length > 0 ? (
                <div className="mt-5">
                  <div className="text-sm font-semibold">Inactive</div>
                  <div className="mt-2 space-y-2">
                    {inactive.map((r) => (
                      <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4 opacity-70">
                        <ItemRow
                          row={r}
	                          health={healthById.get(r.id) ?? null}
                          feature_key={effectiveSelectedKey || ""}
                          allRows={rows}
                          isDefault={false}
                          isEditing={editingId === r.id}
                          onEdit={() => setEditingId(editingId === r.id ? null : r.id)}
                          onDone={() => setEditingId(null)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
	      </div>
	    )}

	    </div>
  );
}

function ItemRow(props: {
  row: Row;
  feature_key: string;
  allRows: Row[];
  isDefault: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onDone: () => void;
  health?: HealthRow | null;
}) {
  const { row: r, feature_key, allRows, isDefault, isEditing, onEdit, onDone, health } = props;

  const [showId, setShowId] = useState(false);

  const isActive = Boolean(r.is_active);
  const leadTone = r.lead_class === "equipment" ? "info" : "good";

  const used = Number(r.used_count ?? 0);
  const chosen = Number(r.chosen_count ?? 0);
  const err = Number(r.error_count ?? 0);
  const safeToDelete = used === 0;

  const siblings = useMemo(() => activeSiblingsForFeature(allRows, feature_key), [allRows, feature_key]);
  const pos = useMemo(() => {
    const idx = siblings.findIndex((x) => x.id === r.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [siblings, r.id]);

  const preview = imagePreviewUrl(r);

  const healthPill = (() => {
    const h = health || null;
    if (!h) return null;

    if (!h.has_type_mapping) return <Pill label="Missing mapping" tone="danger" />;
    if (h.is_roi_ready) return <Pill label="ROI ready" tone="good" />;
    if (!h.has_costs) return <Pill label="Missing costs" tone="warn" />;
    if (!h.has_savings) return <Pill label="Missing savings" tone="warn" />;
    return <Pill label="Incomplete" tone="neutral" />;
  })();

  return (
    <div className="flex items-start justify-between gap-4">
      {/* Left: thumbnail + content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-400">
                No photo
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{r.display_name}</div>
	                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
	                  <span className="font-semibold">ID:</span>
	                  <span className="font-mono">{showId ? r.id : shortId(r.id)}</span>
	                  <CopyButton value={r.id} label="Copy" />
	                  <button
	                    type="button"
	                    onClick={() => setShowId((v) => !v)}
	                    className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-700 hover:bg-slate-50"
	                  >
	                    {showId ? "Hide" : "Show"}
	                  </button>
	                </div>
                {r.description ? (
                  <div className="mt-1 text-sm text-slate-600">{r.description}</div>
                ) : null}

	                {(r.intent_keys || []).length ? (
	                  <div className="mt-2 flex flex-wrap items-center gap-2">
	                    <span className="text-[11px] font-semibold text-slate-500">Triggers:</span>
	                    {(r.intent_keys || []).slice(0, 6).map((ik) => (
	                      <span
	                        key={ik}
	                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700"
	                        title={ik}
	                      >
	                        {prettyIntent(ik)}
	                      </span>
	                    ))}
	                  </div>
	                ) : (
	                  <div className="mt-2 text-[11px] text-slate-500">
	                    Triggers: <span className="font-semibold">not set</span>
	                  </div>
	                )}
              </div>

              {/* Compact actions */}
              <div className="flex items-center gap-2">
                {/* Rank control only when active */}
                {isActive ? (
                  <form action={setUpgradeItemPosition} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="feature_key" value={feature_key} />
                    <select
                      name="position"
                      defaultValue={String(pos)}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold"
                      title="Rank"
                    >
                      {siblings.map((sib, i) => (
                        <option key={sib.id} value={String(i + 1)}>
                          Rank #{i + 1} {sib.id === r.id ? "(this)" : ""}
                        </option>
                      ))}
                    </select>
                    <Btn type="submit" size="sm">Set</Btn>
                  </form>
                ) : null}

                <KebabMenu>
                  {/* Promote */}
                  <form action={promoteUpgradeItem}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="feature_key" value={feature_key} />
                    <button
                      type="submit"
                      disabled={isDefault || !isActive}
                      className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                        isDefault || !isActive
                          ? "cursor-not-allowed opacity-50"
                          : "text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      Promote to default
                    </button>
                  </form>

                  {/* Edit */}
                  <MenuItem onClick={onEdit}>{isEditing ? "Close editor" : "Edit"}</MenuItem>

                  {/* Duplicate */}
                  <form action={duplicateUpgradeItem}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      Duplicate
                    </button>
                  </form>

                  <div className="my-1 h-px bg-slate-100" />

                  {/* Activate / Deactivate */}
                  <form action={toggleUpgradeItemActive}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="is_active" value={isActive ? "false" : "true"} />
                    <button
                      type="submit"
                      className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold ${
                        isActive ? "text-amber-900 hover:bg-amber-50" : "text-emerald-900 hover:bg-emerald-50"
                      }`}
                    >
                      {isActive ? "Deactivate" : "Activate"}
                    </button>
                  </form>

                  {/* Delete */}
                  <form action={deleteUpgradeItem}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      disabled={!safeToDelete}
                      className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold ${
                        safeToDelete
                          ? "text-rose-700 hover:bg-rose-50"
                          : "cursor-not-allowed opacity-50"
                      }`}
                      title={safeToDelete ? "Delete item" : "Cannot delete (used > 0)"}
                    >
                      Delete
                    </button>
                  </form>
                </KebabMenu>
              </div>
            </div>

            {/* Pills row */}
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill label={r.lead_class === "equipment" ? "Equipment lead" : "Service lead"} tone={leadTone as any} />
              <Pill label={`rank ${rankOf(r)}`} />
              {healthPill}
              {isDefault ? <Pill label="Default" tone="info" /> : null}
              <Pill label={`used ${used}`} tone={used ? "info" : "neutral"} />
              <Pill label={`chosen ${chosen}`} tone={chosen ? "good" : "neutral"} />
              {err ? <Pill label={`errors ${err}`} tone="warn" /> : <Pill label="errors 0" tone="neutral" />}
            </div>

            {/* Photo picker only when editing */}
            {isEditing ? (
              <UpgradeCatalogImagePicker
                upgradeCatalogId={r.id}
                media={{
                  image_kind: r.image_kind ?? null,
                  image_storage_bucket: r.image_storage_bucket ?? null,
                  image_storage_path: r.image_storage_path ?? null,
                  image_external_url: r.image_external_url ?? null,
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Right mini badge area (optional, keeps layout stable) */}
      <div className="hidden lg:flex flex-col items-end gap-2">
        {isDefault ? <Pill label="Auto" tone="info" /> : null}
      </div>

    </div>
  );
}



function BulkMappingTable(props: {
  rows: Row[];
  healthById: Map<string, HealthRow>;
  upgradeTypes: UpgradeTypeLite[];
}) {
  const { rows, healthById, upgradeTypes } = props;

  const router = useRouter();

  const [filter, setFilter] = useState<"all" | "missing_mapping" | "missing_costs" | "missing_savings" | "roi_ready">("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkTypeId, setBulkTypeId] = useState<string>("");

  const [dirty, setDirty] = useState<Record<
    string,
    Partial<{
      upgrade_type_id: string | null;
      install_cost_min: number | null;
      install_cost_max: number | null;
      annual_savings_min: number | null;
      annual_savings_max: number | null;
      expected_life_years: number | null;
    }>
  >>({});

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const viewRows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const h = healthById.get(String(r.id));
      const matches =
        !needle ||
        String(r.display_name || "").toLowerCase().includes(needle) ||
        String(r.feature_key || "").toLowerCase().includes(needle);

      if (!matches) return false;

      if (!h) return filter === "all" || filter === "missing_mapping";

      if (filter === "all") return true;
      if (filter === "missing_mapping") return !h.has_type_mapping;
      if (filter === "missing_costs") return h.has_type_mapping && !h.has_costs;
      if (filter === "missing_savings") return h.has_type_mapping && !h.has_savings;
      if (filter === "roi_ready") return h.is_roi_ready;
      return true;
    });
  }, [rows, healthById, filter, q]);

  function numOrNull(v: any): number | null {
    if (v == null) return null;
    const raw = typeof v === "string" ? v.trim() : v;
    if (raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function getEffective(id: string) {
    const h = healthById.get(id);
    const d = dirty[id] || {};
    return {
      upgrade_type_id: (d.upgrade_type_id ?? h?.upgrade_type_id ?? null) as any,
      install_cost_min: (d.install_cost_min ?? h?.install_cost_min ?? null) as any,
      install_cost_max: (d.install_cost_max ?? h?.install_cost_max ?? null) as any,
      annual_savings_min: (d.annual_savings_min ?? h?.annual_savings_min ?? null) as any,
      annual_savings_max: (d.annual_savings_max ?? h?.annual_savings_max ?? null) as any,
      expected_life_years: (d.expected_life_years ?? h?.expected_life_years ?? null) as any,
    };
  }
  // Count how many rows share the same effective upgrade_type_id
  const sharedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const id = String(r.id);
      const eff = getEffective(id);
      const t = eff.upgrade_type_id ? String(eff.upgrade_type_id) : "";
      if (!t) continue;
      counts.set(t, (counts.get(t) || 0) + 1);
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, dirty, healthById]);

  function markDirty(id: string, patch: any) {
    setDirty((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  }

  function toggleSelect(id: string) {
    setSelected((p) => ({ ...p, [id]: !p[id] }));
  }
  function SharedPill(props: { count: number }) {
    const { count } = props;
    if (!count || count <= 1) return null;

    return (
      <span
        title={`Shared assumptions: ${count} catalog options use this same upgrade type. Editing costs/savings here affects ALL of them.`}
        className="ml-2 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900"
      >
        Shared ({count})
      </span>
    );
  }

  function selectAllVisible(on: boolean) {
    const next: Record<string, boolean> = { ...selected };
    for (const r of viewRows) next[String(r.id)] = on;
    setSelected(next);
  }

  function applyBulkType() {
    if (!bulkTypeId) return;
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (ids.length === 0) return;
    setDirty((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        next[id] = { ...(next[id] || {}), upgrade_type_id: bulkTypeId };
      }
      return next;
    });
    setMsg(`Applied mapping to ${ids.length} row(s).`);
  }

async function saveAll() {
  const dirtyIds = Object.keys(dirty);
  if (dirtyIds.length === 0) return;

  setBusy(true);
  setMsg("");

  try {
    // 1) Build mapping upserts (catalog -> type) ONLY when mapping changed
    const mappings = dirtyIds
      .map((catalogId) => {
        const patch = dirty[catalogId] || {};
        if (!("upgrade_type_id" in patch)) return null; // only if user edited mapping
        const upgrade_type_id = (patch as any).upgrade_type_id || null;
        if (!upgrade_type_id) return null;
        return { upgrade_catalog_id: catalogId, upgrade_type_id };
      })
      .filter(Boolean) as Array<{ upgrade_catalog_id: string; upgrade_type_id: string }>;

    // 2) Build assumption patches grouped by upgrade_type_id
    // Only include rows where user edited assumption fields (not just mapping)
    const byType = new Map<
      string,
      Partial<{
        install_cost_min: number | null;
        install_cost_max: number | null;
        annual_savings_min: number | null;
        annual_savings_max: number | null;
        expected_life_years: number | null;
      }>
    >();

    for (const catalogId of dirtyIds) {
      const patch = dirty[catalogId] || {};

      const touchedAssumptions =
        "install_cost_min" in patch ||
        "install_cost_max" in patch ||
        "annual_savings_min" in patch ||
        "annual_savings_max" in patch ||
        "expected_life_years" in patch;

      if (!touchedAssumptions) continue;

      // We need an upgrade_type_id to write assumptions
      const eff = getEffective(catalogId);
      const upgrade_type_id = eff.upgrade_type_id;
      if (!upgrade_type_id) {
        setMsg(`Cannot save assumptions: "${catalogId}" is missing an upgrade type mapping.`);
        setBusy(false);
        return;
      }

      // Merge patches by type (last edit wins per field)
      const cur = byType.get(upgrade_type_id) || {};
      const next = { ...cur } as any;

      if ("install_cost_min" in patch) next.install_cost_min = (patch as any).install_cost_min ?? null;
      if ("install_cost_max" in patch) next.install_cost_max = (patch as any).install_cost_max ?? null;
      if ("annual_savings_min" in patch) next.annual_savings_min = (patch as any).annual_savings_min ?? null;
      if ("annual_savings_max" in patch) next.annual_savings_max = (patch as any).annual_savings_max ?? null;
      if ("expected_life_years" in patch) next.expected_life_years = (patch as any).expected_life_years ?? null;

      byType.set(upgrade_type_id, next);
    }

    const assumptions = Array.from(byType.entries()).map(([upgrade_type_id, fields]) => ({
      upgrade_type_id,
      ...fields,
    }));

    // 3) Shared warning: assumptions live on upgrade_type_assumptions (shared across catalog options)
    const sharedTouched = assumptions.filter((a) => {
      const c = sharedCounts.get(String(a.upgrade_type_id || "")) || 0;
      return c > 1;
    });
    if (sharedTouched.length > 0) {
      const msg = `Heads up: you edited assumptions for ${sharedTouched.length} upgrade type(s) that are shared by multiple catalog options.

Because assumptions are stored on upgrade_type_assumptions, this will affect every catalog option mapped to those upgrade types.

Continue?`;
      // eslint-disable-next-line no-alert
      const ok = window.confirm(msg);
      if (!ok) { setBusy(false); return; }
    }

    await bulkUpsertMappingsAndAssumptions({
      mappings,
      assumptions,
    } as any);

    setDirty({});
    setSelected({});
    setMsg(
      `Saved. ${mappings.length} mapping(s), ${assumptions.length} assumption row(s).`
    );
    router.refresh();
  } catch (e: any) {
    const err =
      e?.message ||
      e?.toString?.() ||
      (typeof e === "string" ? e : "") ||
      JSON.stringify(e, null, 2);
    setMsg(`Save failed: ${err}`);
  } finally {
    setBusy(false);
  }
}



  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3">
        <div className="min-w-[260px]">
          <div className="text-sm font-semibold text-slate-900">Bulk map + assumptions</div>
          <div className="mt-0.5 text-xs text-slate-500">
            Spreadsheet view for mapping catalog → upgrade type and setting baseline assumptions.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-56 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-300"
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="all">All</option>
            <option value="missing_mapping">Missing mapping</option>
            <option value="missing_costs">Missing costs</option>
            <option value="missing_savings">Missing savings</option>
            <option value="roi_ready">ROI ready</option>
          </select>

          <button
            type="button"
            onClick={() => selectAllVisible(true)}
            className="rounded-lg border bg-white px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
          >
            Select visible
          </button>
          <button
            type="button"
            onClick={() => selectAllVisible(false)}
            className="rounded-lg border bg-white px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
          >
            Clear
          </button>

          <div className="h-6 w-px bg-slate-200" />

          <select
            value={bulkTypeId}
            onChange={(e) => setBulkTypeId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Bulk map selected…</option>
            {upgradeTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyBulkType}
            disabled={!bulkTypeId}
            className="rounded-lg border bg-white px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            Apply
          </button>

          <div className="h-6 w-px bg-slate-200" />

          <button
            type="button"
            onClick={saveAll}
            disabled={busy || Object.keys(dirty).length === 0}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? "Saving…" : `Save changes (${Object.keys(dirty).length})`}
          </button>
        </div>
      </div>

      {msg ? (
        <div className="border-b border-slate-200 px-3 py-2 text-xs text-slate-700">
          {msg}
        </div>
      ) : null}

      <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
        <span className="font-semibold">Important:</span> Costs/savings are saved on <span className="font-mono">upgrade_type_assumptions</span> (shared by every catalog option mapped to that type). If you need per-option pricing later, we’ll add a catalog-level override table.
      </div>

      <div className="max-h-[75vh] overflow-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 w-10"></th>
              <th className="px-3 py-2">Feature</th>
              <th className="px-3 py-2">Option</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Install min</th>
              <th className="px-3 py-2">Install max</th>
              <th className="px-3 py-2">Savings min</th>
              <th className="px-3 py-2">Savings max</th>
              <th className="px-3 py-2">Life</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {viewRows.map((r) => {
              const id = String(r.id);
              const h = healthById.get(id);
              const eff = getEffective(id);

              const status = !h
                ? "—"
                : !h.has_type_mapping
                ? "Missing mapping"
                : h.is_roi_ready
                ? "ROI ready"
                : !h.has_costs
                ? "Missing costs"
                : !h.has_savings
                ? "Missing savings"
                : "Incomplete";

              const statusTone =
                status === "ROI ready"
                  ? "text-emerald-700"
                  : status === "Missing mapping"
                  ? "text-red-700"
                  : status.startsWith("Missing")
                  ? "text-amber-700"
                  : "text-slate-600";

              return (
                <tr key={id} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={!!selected[id]}
                      onChange={() => toggleSelect(id)}
                    />
                  </td>

                  <td className="px-3 py-2 font-mono text-[11px] text-slate-600">
                    {String(r.feature_key || "")}
                  </td>

                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-900">{r.display_name}</div>
                    <div className="text-[11px] text-slate-500">{id.slice(0, 8)}</div>
                  </td>

                  <td className="px-3 py-2">
                    <select
                      value={eff.upgrade_type_id || ""}
                      onChange={(e) => markDirty(id, { upgrade_type_id: e.target.value || null })}
                      className="w-56 rounded-lg border border-slate-200 bg-white px-2 py-1"
                    >
                      <option value="">—</option>
                      {upgradeTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <div className="mt-1">
                      <SharedPill count={sharedCounts.get(String(eff.upgrade_type_id || "")) || 0} />
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {eff.upgrade_type_id ? (upgradeTypes.find((t) => t.id === eff.upgrade_type_id)?.name || "") : ""}
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <input
                      value={eff.install_cost_min == null ? "" : String(eff.install_cost_min)}
                      onChange={(e) => markDirty(id, { install_cost_min: numOrNull(e.target.value) })}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1"
                      inputMode="numeric"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={eff.install_cost_max == null ? "" : String(eff.install_cost_max)}
                      onChange={(e) => markDirty(id, { install_cost_max: numOrNull(e.target.value) })}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1"
                      inputMode="numeric"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      value={eff.annual_savings_min == null ? "" : String(eff.annual_savings_min)}
                      onChange={(e) => markDirty(id, { annual_savings_min: numOrNull(e.target.value) })}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1"
                      inputMode="numeric"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={eff.annual_savings_max == null ? "" : String(eff.annual_savings_max)}
                      onChange={(e) => markDirty(id, { annual_savings_max: numOrNull(e.target.value) })}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1"
                      inputMode="numeric"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <input
                      value={eff.expected_life_years == null ? "" : String(eff.expected_life_years)}
                      onChange={(e) => markDirty(id, { expected_life_years: numOrNull(e.target.value) })}
                      className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1"
                      inputMode="numeric"
                    />
                  </td>

                  <td className={`px-3 py-2 font-semibold ${statusTone}`}>{status}</td>
                </tr>
              );
            })}

            {viewRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-sm text-slate-500">
                  No rows match your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
