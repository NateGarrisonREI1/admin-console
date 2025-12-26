"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { MOCK_JOBS, type Job } from "../../../_data/mockJobs";
import { findLocalJob } from "../../../_data/localJobs";
import {
  loadLocalSnapshots,
  snapshotsForJob,
  type SnapshotDraft,
} from "../../../_data/localSnapshots";

const LEAF_COLOR = "#43a419";

// Mock “LEAF range” defaults (per snapshot you can evolve later)
const DEFAULT_PRICE_MIN = 5000;
const DEFAULT_PRICE_MAX = 7000;

// Incentives placeholder (static for now)
const INCENTIVES_LOW = 750;
const INCENTIVES_HIGH = 3000;

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function formatMoney(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function toNumberOrNull(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.trim();
    if (!cleaned) return null;
    const num = Number(cleaned.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function monthlySavingsRangeFromAnnual(annual: number) {
  // Simple range: ±25% around value (mock)
  const mo = annual / 12;
  const lo = Math.max(0, mo * 0.75);
  const hi = mo * 1.25;
  return { lo, hi };
}

function netCostRange(installCost: number) {
  const netLow = Math.max(0, installCost - INCENTIVES_HIGH);
  const netHigh = Math.max(0, installCost - INCENTIVES_LOW);
  return { netLow: Math.min(netLow, netHigh), netHigh: Math.max(netLow, netHigh) };
}

function costClass(price: number, min: number, max: number) {
  const unrealLow = min - 500;
  const overPriced = max + 3000;

  if (price < unrealLow) return "unreal_low";
  if (price < min) return "low";
  if (price > overPriced) return "over";
  if (price > max) return "likely_over";
  return "in";
}

function Badge({
  tone,
  text,
  square,
}: {
  tone: "good" | "warn" | "bad" | "neutral";
  text: string;
  square?: boolean;
}) {
  const tones: Record<string, string> = {
    good: "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30",
    warn: "bg-yellow-500/15 text-yellow-200 border border-yellow-500/30",
    bad: "bg-red-500/15 text-red-200 border border-red-500/25",
    neutral: "bg-neutral-800/60 text-neutral-200 border border-neutral-700",
  };

  return (
    <span
      className={[
        "text-[11px] px-3 py-1 border",
        square ? "rounded-md" : "rounded-full",
        tones[tone],
      ].join(" ")}
    >
      {text}
    </span>
  );
}

function Dot({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "dot inline-block",
        active ? "dotActive" : "",
      ].join(" ")}
      aria-hidden="true"
    />
  );
}

function SnapshotPage({
  snap,
  index,
  total,
  job,
}: {
  snap: SnapshotDraft;
  index: number;
  total: number;
  job: Job;
}) {
  // Derive “hero” labels from existing system
  const systemTitle = `${snap.existing.type} • ${snap.existing.subtype}`;
  const systemSubtitle = `Direct-replacement ${snap.existing.type.toLowerCase()} upgrade`;

  // Suggested info
  const suggestedName = snap.suggested.name || "Recommended upgrade";

  // Cost / savings from snapshot draft
  const estCost = toNumberOrNull(snap.suggested.estCost) ?? Math.round((DEFAULT_PRICE_MIN + DEFAULT_PRICE_MAX) / 2);
  const annualSavings = toNumberOrNull(snap.suggested.estAnnualSavings) ?? 0;

  const moRange = monthlySavingsRangeFromAnnual(annualSavings);
  const moText =
    annualSavings > 0
      ? `Save ~${formatMoney(moRange.lo)}–${formatMoney(moRange.hi)}/mo`
      : "Savings estimate pending";

  const minLabel = formatMoney(DEFAULT_PRICE_MIN);
  const maxLabel = formatMoney(DEFAULT_PRICE_MAX);

  const cls = costClass(estCost, DEFAULT_PRICE_MIN, DEFAULT_PRICE_MAX);

  const quick =
    cls === "in"
      ? { tone: "good" as const, badge: "Looks good ✅", headline: "This looks like a solid deal." }
      : cls === "low"
        ? { tone: "warn" as const, badge: "Proceed smart ⚠️", headline: "Competitive price — verify full scope." }
        : cls === "unreal_low"
          ? { tone: "warn" as const, badge: "Proceed smart ⚠️", headline: "Extremely low — confirm scope before scheduling." }
          : cls === "likely_over"
            ? { tone: "warn" as const, badge: "Proceed smart ⚠️", headline: "Higher than LEAF range — ask what’s driving price." }
            : { tone: "bad" as const, badge: "Major caution 🚩", headline: "This looks overpriced for the category." };

  const costBadge =
    cls === "in"
      ? { tone: "good" as const, text: "Within range" }
      : cls === "low"
        ? { tone: "warn" as const, text: "Low (verify scope)" }
        : cls === "unreal_low"
          ? { tone: "bad" as const, text: "Unrealistic" }
          : cls === "likely_over"
            ? { tone: "warn" as const, text: "Likely overpriced" }
            : { tone: "bad" as const, text: "Overpriced" };

  const net = netCostRange(estCost);

  return (
    <div className="snap-page w-full flex-none" style={{ scrollSnapAlign: "center" }}>
      <main className="max-w-md mx-auto px-4 pt-5 pb-28 space-y-4">
        {/* HERO */}
        <section className="glass rounded-3xl p-4 border border-neutral-800 soft-shadow pop">
          <div className="text-lg font-extrabold tracking-tight mb-1">
            {systemTitle}
          </div>
          <div className="text-sm font-semibold text-neutral-200">
            {systemSubtitle}
          </div>

          <div className="text-xs text-neutral-300 mt-1">
            LEAF provides ranges so you can evaluate contractor quotes with confidence.
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <span
              className="px-3 py-1 rounded-full text-black text-xs font-semibold"
              style={{ background: LEAF_COLOR }}
            >
              {annualSavings > 0 ? moText : "Savings estimate pending"}
            </span>

            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-200 text-xs border border-emerald-500/30">
              ~30–45% less CO₂
            </span>
          </div>

          <div className="text-[11px] text-neutral-400 mt-2">
            Note: higher-priced systems can increase savings slightly — but ROI can drop if the added cost doesn’t pay back over time.
          </div>
        </section>

        {/* CURRENT */}
        <section className="glass rounded-3xl p-4 border border-red-500/30 soft-shadow pop">
          <div className="flex justify-between mb-3">
            <div className="text-sm font-semibold">📷 Current system</div>
            <span className="text-[11px] px-3 py-1 rounded-full bg-red-500/15 text-red-200 border border-red-500/25">
              Existing
            </span>
          </div>

          <div className="flex gap-3">
            <div className="w-24 h-24 rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900 flex items-center justify-center text-[11px] text-neutral-400">
              photo
            </div>

            <div className="flex-1 text-xs space-y-1">
              <div className="font-semibold">
                {snap.existing.type} — {snap.existing.subtype}
              </div>
              <div>
                Operational: <b>{snap.existing.operational}</b>
              </div>
              <div>
                Age: <b>{snap.existing.ageYears} yrs</b> • Wear: <b>{snap.existing.wear}/5</b>
              </div>
              <div>
                Maintenance: <b>{snap.existing.maintenance}</b>
              </div>
            </div>
          </div>
        </section>

        {/* RECOMMENDED */}
        <section className="glass rounded-3xl p-4 border border-[var(--leaf)]/35 soft-shadow pop">
          <div className="flex justify-between mb-3">
            <div className="text-sm font-semibold">✨ Recommended upgrade</div>
            <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">
              Suggested
            </span>
          </div>

          <div className="flex gap-3">
            <div className="w-24 h-24 rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900 flex items-center justify-center text-[11px] text-neutral-400">
              photo
            </div>

            <div className="flex-1 text-xs space-y-1">
              <div className="font-semibold">{suggestedName}</div>
              <div>
                Estimated install cost: <b>{formatMoney(estCost)}</b>
              </div>
              <div>
                Estimated yearly savings:{" "}
                <b>{annualSavings > 0 ? formatMoney(annualSavings) : "—"}</b>
              </div>
              {snap.suggested.notes ? (
                <div className="text-[11px] text-neutral-300 mt-1">
                  Notes: <span className="text-neutral-200">{snap.suggested.notes}</span>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* COST & SAVINGS RANGE */}
        <details className="glass rounded-3xl p-4 border border-neutral-800 soft-shadow pop">
          <summary className="cursor-pointer">
            <div className="flex justify-between items-center">
              <div className="text-sm font-semibold">💰 Cost & savings range</div>
              <span className="text-[11px] text-neutral-400">Tap for details</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mt-3">
              <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
                <div className="text-neutral-400">Install cost range</div>
                <div className="text-lg font-bold">
                  {minLabel}–{maxLabel}
                </div>
              </div>

              <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
                <div className="text-neutral-400">Monthly savings</div>
                <div className="text-lg font-bold">
                  {annualSavings > 0 ? `${formatMoney(moRange.lo)}–${formatMoney(moRange.hi)}` : "—"}
                </div>
              </div>
            </div>
          </summary>

          <div className="mt-4 text-xs space-y-3">
            <div className="font-semibold">Your selected price (static for now)</div>

            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-neutral-400">Selected price</div>
                <div className="text-sm font-bold">{formatMoney(estCost)}</div>
              </div>

              <div className="mt-3">
                <div className="range-band">
                  <div
                    className="ok"
                    style={{
                      left: `${clamp(((DEFAULT_PRICE_MIN - 3000) / (15000 - 3000)) * 100, 0, 100)}%`,
                      width: `${clamp(((DEFAULT_PRICE_MAX - DEFAULT_PRICE_MIN) / (15000 - 3000)) * 100, 0, 100)}%`,
                    }}
                  />
                  <div
                    className="fill"
                    style={{
                      width: `${clamp(((estCost - 3000) / (15000 - 3000)) * 100, 0, 100)}%`,
                    }}
                  />
                  <div
                    className="marker"
                    style={{
                      left: `${clamp(((estCost - 3000) / (15000 - 3000)) * 100, 0, 100)}%`,
                    }}
                  />
                </div>

                <div className="band-label">
                  <span>{minLabel}</span>
                  <span>{maxLabel}</span>
                </div>

                <div className="mt-2 text-[11px] text-neutral-400">
                  LEAF range is highlighted. Marker shows current estimate/quote.
                </div>
              </div>
            </div>

            <div className="font-semibold">Why it’s a range</div>
            <ul className="list-disc list-inside text-neutral-300 space-y-1">
              <li>Based on similar installs in comparable homes</li>
              <li>Accounts for typical labor, permits, and equipment size</li>
              <li>Premium options can slightly increase savings, but ROI may drop if cost climbs faster than savings</li>
              <li>Final scope can change due to access/electrical/ductwork needs</li>
            </ul>
          </div>
        </details>

        {/* QUICK READ */}
        <section className="glass rounded-3xl p-4 border border-neutral-800 soft-shadow pop">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">✅ Quick read</div>
              <div className="text-[11px] text-neutral-400 mt-1">
                A fast gut-check based on the LEAF range.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge tone={costBadge.tone} text={costBadge.text} />
              <Badge tone={quick.tone} text={quick.badge} square />
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-black/30 border border-neutral-800 p-3">
            <div className="text-xs text-neutral-400">Headline</div>
            <div className="text-sm font-semibold mt-1">{quick.headline}</div>

            <div className="mt-2 text-[11px] text-neutral-300">
              <div className="font-semibold text-neutral-200">Good questions to ask</div>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Is this quote a full scope replacement (labor, permits, commissioning)?</li>
                <li>What’s excluded that could be added later (electrical/venting/ductwork)?</li>
                <li>Can you itemize equipment model numbers + warranty terms?</li>
              </ul>
            </div>
          </div>
        </section>

        {/* INCENTIVES */}
        <details className="glass rounded-3xl p-4 border border-neutral-800 soft-shadow pop">
          <summary className="cursor-pointer">
            <div className="flex justify-between items-center">
              <div className="text-sm font-semibold">🏷️ Incentives & rebates</div>
              <span className="text-[11px] text-neutral-400">Tap for details</span>
            </div>
            <div className="mt-2 text-xs font-bold">{formatMoney(INCENTIVES_LOW)}–{formatMoney(INCENTIVES_HIGH)}+ typical</div>
            <div className="text-[11px] text-neutral-400 mt-1">Federal • State • Utility</div>
          </summary>

          <div className="mt-4 space-y-3 text-xs">
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
              <div className="font-semibold">Estimated net cost (after incentives)</div>
              <div className="mt-1 text-sm font-bold">
                {formatMoney(net.netLow)}–{formatMoney(net.netHigh)}
              </div>
              <div className="text-[11px] text-neutral-400 mt-1">
                Placeholder range — later this will be driven by real incentive logic.
              </div>
            </div>

            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
              <div className="font-semibold">🔗 Helpful links</div>
              <div className="mt-2 flex flex-col gap-2">
                <a
                  href="https://www.irs.gov/pub/irs-pdf/f5695.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-300 underline text-[11px]"
                >
                  IRS Form 5695 (PDF)
                </a>
                <a
                  href="https://www.energystar.gov/rebate-finder"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-300 underline text-[11px]"
                >
                  ENERGY STAR Rebate Finder
                </a>
              </div>
            </div>

            <div className="text-[11px] text-neutral-400">
              LEAF identifies likely incentives based on system type and location. Contractors confirm eligibility,
              pricing, and paperwork requirements.
            </div>
          </div>
        </details>

        {/* DOES THIS MAKE SENSE */}
        <section className="glass rounded-3xl p-4 border border-neutral-800 soft-shadow pop">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">🧠 Does this decision make sense?</div>
            <Badge
              tone={cls === "in" ? "good" : cls === "over" ? "bad" : "warn"}
              text={cls === "in" ? "Likely yes ✅" : cls === "over" ? "Unclear 🚩" : "Likely yes (with clarity) ⚠️"}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
              <div className="text-neutral-400">Install cost</div>
              <div className="text-base font-bold">{formatMoney(estCost)}</div>
            </div>

            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
              <div className="text-neutral-400">Estimated savings</div>
              <div className="text-base font-bold">
                {annualSavings > 0 ? `${formatMoney(moRange.lo)}–${formatMoney(moRange.hi)}/mo` : "—"}
              </div>
              <div className="text-[11px] text-neutral-400 mt-1">Placeholder; later this will be system-calculated.</div>
            </div>

            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3 col-span-2">
              <div className="text-neutral-400">Estimated net cost (after incentives)</div>
              <div className="text-base font-bold">
                {formatMoney(net.netLow)}–{formatMoney(net.netHigh)}
              </div>
              <div className="text-[11px] text-neutral-400 mt-1">
                Based on incentive estimates shown above (contractor confirms final eligibility).
              </div>
            </div>

            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
              <div className="text-neutral-400">Quote value check</div>
              <div className="text-base font-bold">
                {cls === "in"
                  ? "Within range ✅"
                  : cls === "low"
                    ? "Below range ⚠️"
                    : cls === "unreal_low"
                      ? "Very low 🚩"
                      : cls === "likely_over"
                        ? "Above range ⚠️"
                        : "Far above range 🚩"}
              </div>
            </div>

            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
              <div className="text-neutral-400">What this means</div>
              <div className="text-[11px] text-neutral-300 mt-1">
                {cls === "in"
                  ? "Quotes in-range usually indicate predictable scope + fair pricing."
                  : cls === "over"
                    ? "This looks overpriced — compare another itemized bid before committing."
                    : "Confirm scope and what’s driving cost. Premium cost can bump savings slightly, but ROI often drops if price rises too fast."}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl bg-black/30 border border-neutral-800 p-3">
            <div className="text-xs text-neutral-400">Decision summary</div>
            <div className="text-sm font-semibold mt-1">
              {cls === "in" ? "This looks financially reasonable." : cls === "over" ? "This needs a closer look." : "This can still make sense — confirm a few details."}
            </div>
            <div className="text-[11px] text-neutral-300 mt-1">
              {cls === "in"
                ? "If the contractor quote lands within the LEAF range, this is typically a strong replacement decision."
                : cls === "over"
                  ? "Request an itemized scope and compare at least one more bid."
                  : "Use the questions above to confirm scope and what’s driving price."}
            </div>
          </div>
        </section>

        {/* Footer per snapshot */}
        <div className="text-[11px] text-neutral-500 text-center pt-2">
          Snapshot {index + 1} of {total} • Updated {formatDate(snap.updatedAt)}
        </div>
      </main>
    </div>
  );
}

export default function JobReportPreviewPage() {
  const params = useParams();
  const jobId = (params?.jobId as string) || "";

  const job: Job | null = useMemo(() => {
    if (!jobId) return null;
    return findLocalJob(jobId) ?? MOCK_JOBS.find((j) => j.id === jobId) ?? null;
  }, [jobId]);

  const [bump, setBump] = useState(0);

  const snapshots: SnapshotDraft[] = useMemo(() => {
    loadLocalSnapshots();
    return jobId ? snapshotsForJob(jobId) : [];
  }, [jobId, bump]);

  // pager
  const pagesRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = pagesRef.current;
    if (!el) return;

    const onScroll = () => {
      const w = el.clientWidth || 1;
      const i = Math.round(el.scrollLeft / w);
      setActive(clamp(i, 0, Math.max(0, snapshots.length - 1)));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll as any);
  }, [snapshots.length]);

  function scrollToPage(i: number) {
    const el = pagesRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    el.scrollTo({ left: i * w, behavior: "smooth" });
    setActive(i);
  }

  if (!job) {
    return (
      <div className="rei-card">
        <div style={{ fontWeight: 900, fontSize: 16 }}>Job not found</div>
        <div style={{ color: "var(--muted)", marginTop: 8 }}>
          No job exists with id: <code>{jobId}</code>
        </div>
        <div style={{ marginTop: 12 }}>
          <Link href="/admin/jobs">← Back to Jobs</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="leafRoot">
      {/* Global styles matching your HTML vibe */}
      <style jsx global>{`
        :root { --leaf: ${LEAF_COLOR}; }

        .leafRoot {
          background: #000;
          color: #fff;
          min-height: 100vh;
        }

        .glass {
          background: rgba(24,24,27,.78);
          backdrop-filter: blur(12px);
        }

        .soft-shadow { box-shadow: 0 18px 45px rgba(0,0,0,.42); }
        .pop { transition: transform .18s ease; }
        .pop:hover { transform: translateY(-1px) scale(1.01); }

        /* Snap scroll container */
        .snap-scroll {
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .snap-scroll::-webkit-scrollbar { display: none; }

        /* Dots */
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(255,255,255,.22);
          border: 1px solid rgba(255,255,255,.18);
          transition: transform .15s ease, background .15s ease;
        }
        .dotActive {
          background: rgba(67,164,25,.95);
          border-color: rgba(67,164,25,.75);
          transform: scale(1.12);
        }

        /* Range band (static) */
        .range-band {
          position: relative;
          height: 14px;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.10);
          overflow: hidden;
        }
        .range-band .fill {
          position: absolute;
          top: 0; bottom: 0; left: 0;
          width: 0%;
          border-radius: 999px;
          background: rgba(67,164,25,.18);
          z-index: 0;
        }
        .range-band .ok {
          position: absolute;
          top: 0; bottom: 0;
          border-radius: 999px;
          background: linear-gradient(90deg,
            rgba(67,164,25,.18),
            rgba(67,164,25,.55),
            rgba(67,164,25,.18)
          );
          border: 1px solid rgba(67,164,25,.55);
          box-shadow:
            0 0 0 1px rgba(0,0,0,.25) inset,
            0 0 16px rgba(67,164,25,.22);
          z-index: 1;
          pointer-events: none;
        }
        .range-band .marker {
          position: absolute;
          top: -6px;
          width: 0;
          height: 26px;
          border-left: 2px solid rgba(255,255,255,.75);
          filter: drop-shadow(0 4px 10px rgba(0,0,0,.55));
          z-index: 2;
          pointer-events: none;
        }
        .range-band .marker::after {
          content:"";
          position:absolute;
          left:-6px;
          top:-2px;
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: var(--leaf);
          border: 2px solid rgba(0,0,0,.55);
          box-shadow: 0 10px 18px rgba(0,0,0,.40), 0 0 0 6px rgba(67,164,25,.10);
        }

        .band-label {
          font-size: 10px;
          color: rgba(255,255,255,.45);
          display:flex;
          justify-content: space-between;
          margin-top: 6px;
        }
      `}</style>

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-black/70 border-b border-neutral-800 backdrop-blur">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Mock LEAF Report Preview</div>
            <div className="text-[11px] text-neutral-400">
              <span>
                {snapshots.length ? `Snapshot ${active + 1} of ${snapshots.length}` : "No snapshots yet"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/admin/jobs/${jobId}`}
              className="text-[11px] text-neutral-300 underline"
              style={{ textDecorationThickness: "1px" }}
            >
              Back
            </Link>

            <button
              onClick={() => alert("Send Report (placeholder). Next step: PDF/email + persistence.")}
              className="text-[11px] px-3 py-1 rounded-full border border-neutral-700 bg-neutral-900 pop"
              type="button"
            >
              Send Report
            </button>
          </div>
        </div>

        {/* pager dots */}
        {snapshots.length > 1 ? (
          <div className="max-w-md mx-auto px-4 pb-3 flex items-center justify-between">
            <div className="text-[11px] text-neutral-500">
              {job.customerName} • {job.reportId}
            </div>

            <div className="flex items-center gap-2">
              {snapshots.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => scrollToPage(i)}
                  aria-label={`Go to snapshot ${i + 1}`}
                  className="p-1"
                >
                  <Dot active={i === active} />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </header>

      {/* PAGES */}
      <div
        ref={pagesRef}
        className="snap-scroll overflow-x-auto flex"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {snapshots.length ? (
          snapshots.map((snap, i) => (
            <SnapshotPage key={snap.id} snap={snap} index={i} total={snapshots.length} job={job} />
          ))
        ) : (
          <div className="w-full flex-none" style={{ scrollSnapAlign: "center" }}>
            <main className="max-w-md mx-auto px-4 pt-5 pb-28 space-y-4">
              <section className="glass rounded-3xl p-4 border border-neutral-800 soft-shadow">
                <div className="text-lg font-extrabold tracking-tight mb-1">No snapshots yet</div>
                <div className="text-sm text-neutral-300">
                  Create snapshots from the Job page, then come back here to preview the mock LEAF report.
                </div>

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/admin/jobs/${jobId}`}
                    className="text-[11px] px-3 py-2 rounded-full border border-neutral-700 bg-neutral-900 pop"
                  >
                    Back to Job
                  </Link>

                  <Link
                    href={`/admin/snapshots/new?jobId=${jobId}`}
                    className="text-[11px] px-3 py-2 rounded-full border border-neutral-700 bg-neutral-900 pop"
                  >
                    Create Snapshot
                  </Link>
                </div>
              </section>
            </main>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-black/80 border-t border-neutral-800 backdrop-blur">
        <div className="max-w-md mx-auto px-4 py-3">
          <button
            className="w-full text-black font-semibold py-3 rounded-full text-sm pop"
            style={{ background: LEAF_COLOR }}
            type="button"
            onClick={() => alert("Contractor workflow (placeholder). Next step after report preview.")}
          >
            🔎 Get an exact bid from a contractor
          </button>
          <div className="text-[11px] text-neutral-400 text-center mt-1">
            Compare the quote against your LEAF range
          </div>
        </div>
      </div>
    </div>
  );
}

