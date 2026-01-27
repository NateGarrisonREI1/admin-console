// src/app/admin/incentives/_components/IncentivesConsole.tsx
"use client";

import React, { useMemo, useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteIncentiveRow,
  insertIncentiveRow,
  updateIncentiveRow,
  previewIncentives,
  type IncentivePreviewResult,
} from "../_actions";

type AnyRow = Record<string, any>;

type Section = {
  key: string;
  label: string;
  table: string;
  rows: AnyRow[];
  editable: boolean;
};

type UpgradeOption = {
  id: string;
  display_name: string | null;
  feature_key: string | null;
};

function s(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function titleize(v: string) {
  return s(v).replace(/_/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}
function isObj(v: any) {
  return typeof v === "object" && v !== null;
}
function safeJson(v: any) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return "{}";
  }
}
function fmtCell(v: any) {
  if (v == null) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  if (typeof v === "string") return v;
  if (isObj(v)) return "[json]";
  return s(v);
}
function pickNiceColumns(rows: AnyRow[]) {
  const all = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r || {})) all.add(k);

  const preferred = [
    "id",
    "name",
    "program_name",
    "is_active",
    "source",
    "sponsor_level",
    "utility",
    "jurisdiction",
    "jurisdiction_ref",
    "url",
    "created_at",
    "updated_at",
  ];

  const out: string[] = [];
  for (const k of preferred) if (all.has(k)) out.push(k);

  for (const k of ["program_id", "incentive_program_id", "zip", "zip_code", "feature_key"]) {
    if (all.has(k) && !out.includes(k)) out.push(k);
  }
  return out.slice(0, 10);
}
function allColumns(rows: AnyRow[], max = 24) {
  const set = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r || {})) set.add(k);
  return Array.from(set).sort().slice(0, max);
}

function Pill(props: { label: string; tone?: "base" | "good" | "warn" | "info" }) {
  const tone = props.tone ?? "base";
  const cls =
    tone === "good"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : tone === "warn"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : tone === "info"
          ? "bg-sky-50 text-sky-700 ring-sky-200"
          : "bg-slate-50 text-slate-700 ring-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${cls}`}>
      {props.label}
    </span>
  );
}

function Kebab(props: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-50"
        aria-label="Row actions"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM10 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM10 17a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 top-10 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          <div onClick={() => setOpen(false)}>{props.children}</div>
        </div>
      ) : null}
    </div>
  );
}

function MenuButton(props: { onClick?: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 ${
        props.danger ? "text-rose-700" : "text-slate-800"
      }`}
    >
      {props.children}
    </button>
  );
}

function SubmitBtnInline(props: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
      disabled={pending}
    >
      {pending ? "Loading…" : props.label}
    </button>
  );
}

function ResolverPreview(props: { upgradeOptions: UpgradeOption[] }) {
  const upgrades = props.upgradeOptions ?? [];

  const initial: IncentivePreviewResult = {
    ok: false,
    error: null,
    incentives: [],
    totals: null,
    meta: {},
  };

  const [zipState, zipAction] = useActionState(previewIncentives as any, initial);
  const [stateState, stateAction] = useActionState(previewIncentives as any, initial);
  const [runState, runAction] = useActionState(previewIncentives as any, initial);

  const [zip, setZip] = useState("97202");
  const [state, setState] = useState("OR");
  const [upgradeId, setUpgradeId] = useState<string>("");
  const [showRaw, setShowRaw] = useState(false);

  const ss = (v: any) => (typeof v === "string" ? v : v == null ? "" : String(v));
  const safeJson2 = (v: any) => {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return "[]";
    }
  };

  function n(v: any): number | null {
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
  }

  function amtLabel(r: any) {
    const amin = n(r?.amount_min);
    const amax = n(r?.amount_max);
    const unit = ss(r?.amount_unit).trim() || "usd";
    if (amin != null || amax != null) return `${amin ?? "—"}–${amax ?? "—"} ${unit}`;
    const a = n(r?.amount);
    if (a != null) return `${a} ${unit}`;
    return "—";
  }

  const resolved = useMemo(() => {
    const arr = Array.isArray(runState?.incentives) ? runState!.incentives : [];
    return arr as any[];
  }, [runState]);

  const stats = useMemo(() => {
    let count = 0;
    let sumMax = 0;

    const sponsors = new Map<string, number>();

    for (const r of resolved) {
      count += 1;
      const amax = n(r?.amount_max) ?? n(r?.amount) ?? 0;
      sumMax += amax;

      const sponsor = ss(r?.source).trim() || "—";
      sponsors.set(sponsor, (sponsors.get(sponsor) ?? 0) + 1);
    }

    const topSponsors = Array.from(sponsors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return { count, sumMax, topSponsors };
  }, [resolved]);

  function MiniTag(props: { text: string }) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
        {props.text}
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="text-lg font-bold">Resolver Preview</div>
        <div className="mt-1 text-xs text-slate-500">
          Load eligibility by ZIP or State, then resolve ZIP-only or ZIP + upgrade.
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 p-5">
        {/* LEFT */}
        <div className="col-span-12 lg:col-span-5 space-y-3">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-7">
              <label className="text-xs font-semibold text-slate-700">ZIP (optional)</label>
              <input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-5">
              <label className="text-xs font-semibold text-slate-700">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="OR">OR</option>
                <option value="WA">WA</option>
                <option value="CA">CA</option>
                <option value="ID">ID</option>
              </select>
            </div>
          </div>

          {/* ZIP eligibility */}
          <form action={zipAction} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <input type="hidden" name="zip" value={zip} />
            <input type="hidden" name="state" value="" />
            <input type="hidden" name="upgrade_catalog_id" value="" />

            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-700">ZIP eligibility</div>
              <SubmitBtnInline label="Load upgrades for ZIP" />
            </div>

            {zipState?.error ? (
              <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
                <div className="font-bold">ZIP load error</div>
                <div className="mt-1 font-mono whitespace-pre-wrap">{ss(zipState.error)}</div>
              </div>
            ) : null}
          </form>

          {/* STATE eligibility */}
          <form action={stateAction} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <input type="hidden" name="zip" value="" />
            <input type="hidden" name="state" value={state} />
            <input type="hidden" name="upgrade_catalog_id" value="" />

            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-700">State eligibility</div>
              <SubmitBtnInline label="Load incentives for State" />
            </div>

            {stateState?.error ? (
              <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
                <div className="font-bold">State load error</div>
                <div className="mt-1 font-mono whitespace-pre-wrap">{ss(stateState.error)}</div>
              </div>
            ) : null}
          </form>

          {/* Resolve */}
          <form action={runAction} className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
            <input type="hidden" name="zip" value={zip} />
            <input type="hidden" name="state" value={state} />

            <div>
              <label className="text-xs font-semibold text-slate-700">Upgrade (optional)</label>
              <select
                name="upgrade_catalog_id"
                value={upgradeId}
                onChange={(e) => setUpgradeId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">None (ZIP-only)</option>
                {upgrades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name ?? u.feature_key ?? u.id}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Resolve incentives
            </button>

            {runState?.error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
                <div className="font-bold">Resolver error</div>
                <div className="mt-1 font-mono whitespace-pre-wrap">{ss(runState.error)}</div>
              </div>
            ) : null}
          </form>
        </div>

        {/* RIGHT */}
        <div className="col-span-12 lg:col-span-7 space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold">Summary</div>
              <div className="text-xs text-slate-500">{runState?.ok ? "ok" : "—"}</div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] font-semibold text-slate-500">Incentives</div>
                <div className="mt-1 text-lg font-bold">{stats.count || "—"}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] font-semibold text-slate-500">Max sum (rough)</div>
                <div className="mt-1 text-lg font-bold">
                  {stats.sumMax ? `$${Math.round(stats.sumMax).toLocaleString()}` : "—"}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-[11px] font-semibold text-slate-500">Top sponsors</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {stats.topSponsors.length ? (
                    stats.topSponsors.map(([name, c]) => <MiniTag key={name} text={`${name} (${c})`} />)
                  ) : (
                    <span className="text-xs text-slate-500">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="text-sm font-bold">Resolved incentives</div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-500">{resolved.length} rows</div>
                <button
                  type="button"
                  onClick={() => setShowRaw((v) => !v)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {showRaw ? "Hide raw" : "Raw JSON"}
                </button>
              </div>
            </div>

            {showRaw ? (
              <div className="max-h-[520px] overflow-auto p-4">
                <pre className="whitespace-pre-wrap text-xs font-mono">{safeJson2(resolved)}</pre>
              </div>
            ) : (
              <div className="max-h-[520px] overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Program</th>
                      <th className="px-3 py-2 text-left">Sponsor</th>
                      <th className="px-3 py-2 text-left">Amount</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Jur.</th>
                      <th className="px-3 py-2 text-left">Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resolved.map((r, idx) => {
                      const program = ss(r?.program_name || r?.name || r?.legacy_name || "—");
                      const sponsor = ss(r?.source || "—");
                      const ut = ss(r?.upgrade_type_key || r?.upgrade_type || "—");
                      const jur = ss(r?.jurisdiction_ref || r?.jurisdiction || "—");
                      const active = r?.active === false ? "inactive" : "active";

                      const amin = n(r?.amount_min);
                      const amax = n(r?.amount_max);
                      const unit = ss(r?.amount_unit).trim() || "usd";
                      const amountLabel =
                        amin != null || amax != null
                          ? `${amin ?? "—"}–${amax ?? "—"} ${unit}`
                          : n(r?.amount) != null
                            ? `${n(r?.amount)} ${unit}`
                            : "—";

                      return (
                        <tr
                          key={`${ss(r?.incentive_program_id) || "row"}:${idx}`}
                          className={idx % 2 ? "bg-white" : "bg-slate-50/40"}
                        >
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-900">{program}</div>
                            {ss(r?.notes).trim() ? (
                              <div className="mt-0.5 text-[11px] text-slate-500">{ss(r?.notes).slice(0, 90)}</div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-slate-800">{sponsor}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-800">{amountLabel}</td>
                          <td className="px-3 py-2 text-slate-800">{ut}</td>
                          <td className="px-3 py-2 text-slate-800">{jur}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                active === "active"
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                  : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                              }`}
                            >
                              {active}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {resolved.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                          No resolved incentives.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EnergyStarFetchTool(props: {
  fetchAndCacheEnergyStarByZipAction?: (formData: FormData) => Promise<any>;
}) {
  const { fetchAndCacheEnergyStarByZipAction } = props;
  const [zip, setZip] = useState("97202");

  const initial = { ok: false, inserted: 0, diagnostics: null as any };

  // useActionState lets the client receive the server action return value
  const [result, action] = useActionState(fetchAndCacheEnergyStarByZipAction as any, initial);

  if (!fetchAndCacheEnergyStarByZipAction) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="text-lg font-bold">ENERGY STAR Cache Tool</div>
        <div className="mt-1 text-xs text-slate-500">
          Enter a ZIP → fetch rebates → store to your cache table for future jobs.
        </div>
      </div>

      <div className="p-5 space-y-3">
        <form action={action} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-700">ZIP code</label>
            <input
              name="zip"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="97214"
              className="mt-1 w-44 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              inputMode="numeric"
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Fetch & store
          </button>

          <div className="text-xs text-slate-500">
            We’ll show how many rows were inserted below.
          </div>
        </form>

        {/* Proof */}
        {result?.diagnostics ? (
          <div
            className={`rounded-xl border p-3 text-xs ${
              result.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            <div className="font-bold">
              {result.ok ? "Fetch complete" : "Fetch failed"} • inserted: {result.inserted ?? 0}
            </div>
            <div className="mt-1 font-mono whitespace-pre-wrap">
              {JSON.stringify(result.diagnostics, null, 2)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}


export default function IncentivesConsole(props: {
  sections: Section[];
  upgradeOptions: UpgradeOption[];
  fetchAndCacheEnergyStarByZipAction?: (formData: FormData) => Promise<any>;
}) {
  const sections = props.sections || [];
  const upgradeOptions = props.upgradeOptions || [];
  const fetchAndCacheEnergyStarByZipAction = props.fetchAndCacheEnergyStarByZipAction;

  const [tab, setTab] = useState(sections[0]?.key ?? "programs");
  const active = useMemo(() => sections.find((x) => x.key === tab) ?? sections[0], [sections, tab]);

  const [showAllCols, setShowAllCols] = useState(false);

  const cols = useMemo(() => {
    if (!active) return [];
    return showAllCols ? allColumns(active.rows) : pickNiceColumns(active.rows);
  }, [active, showAllCols]);

  const [drawerRow, setDrawerRow] = useState<AnyRow | null>(null);

  const [editRow, setEditRow] = useState<AnyRow | null>(null);
  const [editDraft, setEditDraft] = useState<string>("{}");

  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<string>("{}");

  if (!active) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        No sections configured.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EnergyStarFetchTool fetchAndCacheEnergyStarByZipAction={fetchAndCacheEnergyStarByZipAction} />

      <ResolverPreview upgradeOptions={upgradeOptions} />

      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-lg font-bold">Rebates & Incentives</div>
            <div className="mt-1 text-xs text-slate-500">
              Edit source tables • Inspect resolver outputs • Keep it simple and fast
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAllCols((v) => !v)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              {showAllCols ? "Show fewer columns" : "Show all columns"}
            </button>

            <button
              type="button"
              disabled={!active.editable}
              onClick={() => {
                setAdding(true);
                setAddDraft("{}");
              }}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                active.editable
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-slate-200 text-slate-500 cursor-not-allowed"
              }`}
            >
              Add row
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {sections.map((sec) => (
              <button
                key={sec.key}
                type="button"
                onClick={() => {
                  setTab(sec.key);
                  setDrawerRow(null);
                  setEditRow(null);
                }}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                  sec.key === active.key
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                {sec.label}
                <span className={`ml-2 text-xs ${sec.key === active.key ? "text-white/80" : "text-slate-500"}`}>
                  {sec.rows.length}
                </span>
                {!sec.editable ? (
                  <span className="ml-2">
                    <Pill label="read-only" />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold">{titleize(active.table)}</div>
            {active.editable ? <Pill label="editable" tone="good" /> : <Pill label="read-only" tone="info" />}
          </div>
          <div className="text-xs text-slate-500">{active.rows.length} rows</div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="whitespace-nowrap px-3 py-2 text-left">
                    {c}
                  </th>
                ))}
                <th className="whitespace-nowrap px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {active.rows.map((r, i) => {
                const rowKey = s(r?.id) ? `${active.table}:${s(r.id)}` : `${active.table}:idx:${i}`;

                return (
                  <tr key={rowKey} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                    {cols.map((c) => {
                      const v = r?.[c];
                      const json = isObj(v);

                      return (
                        <td key={`${rowKey}:${c}`} className="max-w-[320px] px-3 py-2">
                          {json ? (
                            <button
                              type="button"
                              onClick={() => setDrawerRow(r)}
                              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              View JSON
                            </button>
                          ) : (
                            <div className="truncate text-slate-800" title={fmtCell(v)}>
                              {fmtCell(v)}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end">
                        <Kebab>
                          <MenuButton onClick={() => setDrawerRow(r)}>View row</MenuButton>

                          {active.editable ? (
                            <MenuButton
                              onClick={() => {
                                setEditRow(r);
                                setEditDraft("{}");
                              }}
                            >
                              Edit (patch JSON)
                            </MenuButton>
                          ) : null}

                          {active.editable ? <div className="my-1 h-px bg-slate-100" /> : null}

                          {active.editable ? (
                            <form action={deleteIncentiveRow}>
                              <input type="hidden" name="table" value={active.table} />
                              <input type="hidden" name="id" value={s(r?.id)} />
                              <button
                                type="submit"
                                className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50"
                                disabled={!s(r?.id)}
                              >
                                Delete
                              </button>
                            </form>
                          ) : null}
                        </Kebab>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {active.rows.length === 0 ? (
                <tr>
                  <td colSpan={cols.length + 1} className="px-5 py-10 text-center text-sm text-slate-500">
                    No rows.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* You said to keep your existing drawer/edit/add modals.
          This drop-in preserves your state variables so you can paste your existing modals below. */}
    </div>
  );
}
