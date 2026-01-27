"use client";

import { useMemo, useState } from "react";
import type { UpgradeCard } from "./UpgradeCardsCard";

function s(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function n(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const num = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(num) ? num : null;
}


function fmtMoneyRange(min: any, max: any) {
  const lo = n(min);
  const hi = n(max);
  if (lo == null && hi == null) return "—";
  const fmt = (x: number) =>
    x.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  if (lo != null && hi != null) return `${fmt(lo)}–${fmt(hi)}`;
  if (lo != null) return `≥ ${fmt(lo)}`;
  return `≤ ${fmt(hi!)}`;
}

function fmtYearsRange(min: any, max: any) {
  const lo = n(min);
  const hi = n(max);
  if (lo == null && hi == null) return "—";
  const fmt = (x: number) => `${Math.round(x * 10) / 10} yrs`;
  if (lo != null && hi != null) return `${fmt(lo)}–${fmt(hi)}`;
  if (lo != null) return `≥ ${fmt(lo)}`;
  return `≤ ${fmt(hi!)}`;
}

function pickTitle(c: UpgradeCard) {
  return c.title || c.display_name || c.feature_key || "Upgrade";
}

function normalizeIncentives(
  raw: any
): Array<{ title: string; subtitle?: string; amountMin?: number | null; amountMax?: number | null }> {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((x) => {
    const title =
      s(x?.program_name) ||
      s(x?.title) ||
      s(x?.name) ||
      s(x?.incentive_name) ||
      "Incentive";

    const subtitle =
      s(x?.program_admin) ||
      s(x?.source) ||
      s(x?.utility) ||
      s(x?.jurisdiction) ||
      "";

    const amountMin = n(x?.amount_min ?? x?.min ?? x?.amount);
    const amountMax = n(x?.amount_max ?? x?.max ?? x?.amount);

    return { title, subtitle: subtitle || undefined, amountMin, amountMax };
  });
}

function mid(min: any, max: any): number | null {
  const lo = n(min);
  const hi = n(max);
  if (lo == null && hi == null) return null;
  if (lo != null && hi != null) return (lo + hi) / 2;
  return lo ?? hi ?? null;
}

type IncentiveRow = {
  title: string;
  subtitle?: string;
  amountMin?: number | null;
  amountMax?: number | null;
};

type Row = {
  title: string;
  installRange: string;
  incentivesTotal: string;
  netCostRange: string;
  savingsRange: string;
  paybackRange: string;

  incentives: IncentiveRow[];
  bullets: string[];
  tags: string[];
  notes: string;

  hasRoi: boolean;
  roiPendingReason: string;

  paybackMid: number | null;
  incentivesMid: number | null;
  netCostMid: number | null;
};

export default function UpgradeCardsList(props: { cards: UpgradeCard[] }) {
  const { cards } = props;

  // string keys because we render top-0 / rest-0 etc.
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const { topPicks, rest } = useMemo((): { topPicks: Row[]; rest: Row[] } => {
    const rows: Row[] = cards.map((c) => {
      const title = pickTitle(c);

      const installRange = fmtMoneyRange(c.install_cost_min, c.install_cost_max);
      const incentivesTotal = fmtMoneyRange(c.incentive_total_min, c.incentive_total_max);
      const netCostRange = fmtMoneyRange(c.net_cost_min, c.net_cost_max);
      const savingsRange = fmtMoneyRange(c.annual_savings_min, c.annual_savings_max);
      const paybackRange = fmtYearsRange(c.payback_years_min, c.payback_years_max);

      const paybackMid = mid(c.payback_years_min, c.payback_years_max);
      const incentivesMid = mid(c.incentive_total_min, c.incentive_total_max);
      const netCostMid = mid(c.net_cost_min, c.net_cost_max);

      const hasPayback = n(c.payback_years_min) != null || n(c.payback_years_max) != null;
      const hasNetCost = n(c.net_cost_min) != null || n(c.net_cost_max) != null;
      const hasSavings = n(c.annual_savings_min) != null || n(c.annual_savings_max) != null;

      const hasRoi = hasPayback || (hasNetCost && hasSavings);

      let roiPendingReason = "";
      if (!hasRoi) {
        if (!hasSavings) roiPendingReason = "Savings assumptions not set yet";
        else if (!hasNetCost) roiPendingReason = "Cost/incentive mapping incomplete";
        else roiPendingReason = "ROI inputs incomplete";
      }

      const incentives = normalizeIncentives(c.incentives);
      const bullets = Array.isArray(c.bullets) ? c.bullets.filter(Boolean).slice(0, 6) : [];
      const tags = Array.isArray(c.tags) ? c.tags.filter(Boolean).slice(0, 6) : [];

      return {
        title,
        installRange,
        incentivesTotal,
        netCostRange,
        savingsRange,
        paybackRange,
        incentives,
        bullets,
        tags,
        notes: s(c.notes || "").trim(),
        hasRoi,
        roiPendingReason,
        paybackMid,
        incentivesMid,
        netCostMid,
      };
    });

    // Sort: ROI ready first, shortest payback, highest incentives, lowest net cost
    const sorted = [...rows].sort((a, b) => {
      if (a.hasRoi !== b.hasRoi) return a.hasRoi ? -1 : 1;

      const ap = a.paybackMid ?? Number.POSITIVE_INFINITY;
      const bp = b.paybackMid ?? Number.POSITIVE_INFINITY;
      if (ap !== bp) return ap - bp;

      const ai = a.incentivesMid ?? 0;
      const bi = b.incentivesMid ?? 0;
      if (ai !== bi) return bi - ai;

      const an = a.netCostMid ?? Number.POSITIVE_INFINITY;
      const bn = b.netCostMid ?? Number.POSITIVE_INFINITY;
      return an - bn;
    });

    // TOP PICKS: only if 2+ ROI-ready cards exist
    const roiReady = sorted.filter((r) => r.hasRoi);
    const picks: Row[] = roiReady.length >= 2 ? roiReady.slice(0, 2) : [];

    const pickSig = new Set(
      picks.map((p) => `${p.title}__${p.paybackRange}__${p.netCostRange}`)
    );

    const remaining =
      picks.length === 0
        ? sorted
        : sorted.filter(
            (r) => !pickSig.has(`${r.title}__${r.paybackRange}__${r.netCostRange}`)
          );

    return { topPicks: picks, rest: remaining };
  }, [cards]);

  return (
    <div className="p-4 space-y-4">
      {topPicks.length >= 2 ? (
        <>
          <SectionHeader
            title="Top Recommendations"
            subtitle="Best ROI candidates based on payback and incentives"
          />
          <div className="grid grid-cols-1 gap-3">
            {topPicks.map((r: Row, idx: number) => (
              <Card
                key={`top-${idx}`}
                row={r}
                isOpen={!!open[`top-${idx}`]}
                onToggle={() =>
                  setOpen((p) => ({ ...p, [`top-${idx}`]: !p[`top-${idx}`] }))
                }
                accent="emerald"
              />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-xl border bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-900">Top Recommendations</div>
          <div className="mt-1 text-xs text-slate-600">
            Waiting for ROI calculations (add assumptions + regenerate snapshot).
          </div>
        </div>
      )}

      <SectionHeader
        title="All Upgrades"
        subtitle="Sorted by ROI readiness, payback, and incentives"
      />
      <div className="grid grid-cols-1 gap-3">
        {rest.map((r: Row, idx: number) => (
          <Card
            key={`rest-${idx}`}
            row={r}
            isOpen={!!open[`rest-${idx}`]}
            onToggle={() =>
              setOpen((p) => ({ ...p, [`rest-${idx}`]: !p[`rest-${idx}`] }))
            }
            accent="slate"
          />
        ))}
      </div>
    </div>
  );
}

function SectionHeader(props: { title: string; subtitle?: string }) {
  return (
    <div>
      <div className="text-sm font-semibold text-slate-900">{props.title}</div>
      {props.subtitle && <div className="mt-0.5 text-xs text-slate-500">{props.subtitle}</div>}
    </div>
  );
}

function Card(props: {
  row: Row;
  isOpen: boolean;
  onToggle: () => void;
  accent: "emerald" | "slate";
}) {
  const { row: r, isOpen, onToggle, accent } = props;

  const border =
    accent === "emerald"
      ? "border-emerald-200 bg-emerald-50/40"
      : "border-slate-200 bg-white";

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-slate-900">{r.title}</div>

            {r.hasRoi ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                ROI ready
              </span>
            ) : (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                ROI pending
              </span>
            )}

            {r.tags.map((t, i) => (
              <span
                key={i}
                className="rounded-full border bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
              >
                {t}
              </span>
            ))}
          </div>

          {!r.hasRoi && r.roiPendingReason && (
            <div className="mt-1 text-[11px] text-amber-800">{r.roiPendingReason}</div>
          )}

          {r.bullets.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {r.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}

          {r.notes && (
            <div className="mt-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-600">Note:</span> {r.notes}
            </div>
          )}
        </div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            {isOpen ? "Hide details" : "Details"}
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Metric label="Install" value={r.installRange} />
        <Metric label="Incentives" value={r.incentivesTotal} />
        <Metric label="Net cost" value={r.netCostRange} />
        <Metric label="Savings/yr" value={r.savingsRange} />
        <Metric label="Payback" value={r.paybackRange} />
      </div>

      {isOpen && (
        <div className="mt-3 rounded-lg border bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-800">Incentive details</div>

          {r.incentives.length === 0 ? (
            <div className="mt-2 text-xs text-slate-600">No incentive line-items found.</div>
          ) : (
            <div className="mt-2 space-y-2">
              {r.incentives.map((inc, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800">{inc.title}</div>
                    {inc.subtitle && (
                      <div className="text-[11px] text-slate-600">{inc.subtitle}</div>
                    )}
                  </div>
                  <div className="shrink-0 text-xs font-semibold text-slate-800">
                    {fmtMoneyRange(inc.amountMin, inc.amountMax)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!r.hasRoi && (
            <div className="mt-3 text-[11px] text-amber-800">
              ROI will appear automatically once this upgrade has assumptions and a complete upgrade type mapping.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metric(props: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-2">
      <div className="text-[11px] font-semibold text-slate-600">{props.label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-900">{props.value}</div>
    </div>
  );
}
