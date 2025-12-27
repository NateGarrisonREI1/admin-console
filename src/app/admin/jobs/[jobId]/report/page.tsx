// src/app/admin/jobs/[jobId]/report/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

// If you want real job/snapshot data later, keep these imports.
// For now, this UI matches the HTML mock exactly.
import { loadLocalJobs, findLocalJob } from "../../../_data/localJobs";
import { loadLocalSnapshots, snapshotsForJob } from "../../../_data/localSnapshots";

type TierKey = "good" | "better" | "best";
type CostClass = "unreal_low" | "low" | "in" | "likely_over" | "over";

type SnapshotUIModel = {
  systemTitle: string;
  systemSubtitle: string;

  // Tier-dependent “recommended name”
  recommendedNameByTier: Record<TierKey, string>;

  tiers: Record<
    TierKey,
    { priceMin: number; priceMax: number; baseSavMin: number; baseSavMax: number }
  >;

  existingCarbon: { min: number; max: number };
};

const LEAF = "#43a419";
const INCENTIVES_LOW = 750;
const INCENTIVES_HIGH = 3000;

const TIER_CARBON_REDUCTION: Record<TierKey, { min: number; max: number }> = {
  good: { min: 0.30, max: 0.40 },
  better: { min: 0.35, max: 0.45 },
  best: { min: 0.45, max: 0.55 },
};

function money(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function moneyRange(a: number, b: number) {
  return `${money(a)}–${money(b)}`;
}

function dynamicSavingsRange(
  price: number,
  tier: { priceMax: number; baseSavMin: number; baseSavMax: number }
) {
  const over = Math.max(0, price - tier.priceMax);
  const steps = Math.floor(over / 1000);
  const bump = steps * 2; // +$2/mo per $1k above tier max
  return { min: tier.baseSavMin + bump, max: tier.baseSavMax + bump };
}

function classifyCost(
  price: number,
  tier: { priceMin: number; priceMax: number }
): CostClass {
  const LEAF_PRICE_MIN = tier.priceMin;
  const LEAF_PRICE_MAX = tier.priceMax;
  const COST_UNREALISTIC_BELOW = LEAF_PRICE_MIN - 500;
  const COST_OVERPRICED_ABOVE = LEAF_PRICE_MAX + 3000;

  if (price < COST_UNREALISTIC_BELOW) return "unreal_low";
  if (price < LEAF_PRICE_MIN) return "low";
  if (price > COST_OVERPRICED_ABOVE) return "over";
  if (price > LEAF_PRICE_MAX) return "likely_over";
  return "in";
}

function computeNetCostRange(installCost: number) {
  const netLow = Math.max(0, installCost - INCENTIVES_HIGH);
  const netHigh = Math.max(0, installCost - INCENTIVES_LOW);
  return { netLow, netHigh };
}

function computeProposedCarbon(existing: { min: number; max: number }, tierKey: TierKey) {
  const red = TIER_CARBON_REDUCTION[tierKey] || TIER_CARBON_REDUCTION.better;
  // proposed = existing * (1 - reduction)
  const pMin = Math.round(existing.min * (1 - red.max)); // best case => lowest carbon
  const pMax = Math.round(existing.max * (1 - red.min)); // worst case => highest carbon
  return { min: Math.min(pMin, pMax), max: Math.max(pMin, pMax), red };
}

function badgeClass(tone: "good" | "warn" | "bad" | "neutral", square?: boolean) {
  const base = `text-[11px] px-3 py-1 ${square ? "rounded-md" : "rounded-full"}`;
  const tones: Record<string, string> = {
    good: "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30",
    warn: "bg-yellow-500/15 text-yellow-200 border border-yellow-500/30",
    bad: "bg-red-500/15 text-red-200 border border-red-500/25",
    neutral: "bg-neutral-800/60 text-neutral-200 border border-neutral-700",
  };
  return `${base} ${tones[tone] || tones.neutral}`;
}

function quickReadMessage(costClass: CostClass) {
  const premiumWhy = [
    "More expensive systems can provide slightly higher savings (better efficiency/controls/commissioning) — usually incremental.",
    "ROI can drop when cost climbs faster than savings. A premium quote should come with clear, measurable value.",
  ];

  if (costClass === "unreal_low") {
    return {
      tone: "warn" as const,
      headline: "This price is extremely low — verify scope before scheduling.",
      why: [
        "Very low pricing often means partial scope or missing line items.",
        "Confirming scope protects you from surprise add-ons later.",
      ],
      qVisible: [
        "Is this a full replacement quote (equipment, labor, permits, startup/commissioning)?",
        "What’s excluded that could be added later (venting, thermostat, disposal, permits)?",
      ],
      qMore: [
        "Can you itemize model numbers + warranty terms in writing?",
        "Is there any scenario where price changes after work begins?",
      ],
    };
  }

  if (costClass === "low") {
    return {
      tone: "good" as const,
      headline: "Competitive quote — great sign if scope is complete.",
      why: [
        "Competitive bids happen and can be a win for the homeowner.",
        "A quick scope check ensures it’s apples-to-apples.",
      ],
      qVisible: [
        "Can you walk me through exactly what’s included in this price?",
        "Are permits/inspections and commissioning included?",
      ],
      qMore: [
        "Is the thermostat included? What about haul-away/disposal?",
        "Can you confirm final scope and model numbers in writing?",
      ],
    };
  }

  if (costClass === "in") {
    return {
      tone: "good" as const,
      headline: "This looks like a fair, in-range quote.",
      why: [
        "Pricing aligns with what LEAF typically sees for this tier.",
        "In-range quotes usually indicate predictable scope and fewer surprises.",
      ],
      qVisible: [
        "What’s the install timeline and what prep do you need from me?",
        "What warranty coverage comes with the equipment and labor?",
      ],
      qMore: [
        "Do you handle permits and inspection sign-off?",
        "What maintenance keeps performance strong long-term?",
      ],
    };
  }

  if (costClass === "likely_over") {
    return {
      tone: "warn" as const,
      headline: "Higher than LEAF tier range — confirm what’s driving the price.",
      why: [
        "Higher quotes can be justified by site conditions (access, venting, ductwork, electrical).",
        "It can also reflect premium add-ons you may not need.",
        ...premiumWhy,
      ],
      qVisible: [
        "What specifically is driving the price above typical range?",
        "Is there a simpler option that still meets the goals?",
      ],
      qMore: [
        "Can you provide an itemized quote so I can compare bids accurately?",
        "Which add-ons are optional vs required?",
      ],
    };
  }

  return {
    tone: "warn" as const,
    headline: "Major caution — this looks overpriced for the tier.",
    why: [
      "This is significantly above typical pricing.",
      "Before committing, compare at least one more itemized bid.",
      ...premiumWhy,
    ],
    qVisible: [
      "Can you itemize the quote (equipment, labor, permits, extras) line-by-line?",
      "What would the ‘standard replacement’ option cost and what changes?",
    ],
    qMore: [
      "Are there scope items here that belong in a separate project (duct redesign, electrical upgrades)?",
      "Can you confirm model numbers and efficiency details to justify pricing?",
    ],
  };
}

/**
 * For now, this returns the 3 demo pages from your HTML.
 * Later, we’ll generate these from the job’s actual snapshots + catalog system selection.
 */
function getMockPages(): SnapshotUIModel[] {
  return [
    {
      systemTitle: "🔥 HVAC • Gas Furnace",
      systemSubtitle: "Direct-replacement gas furnace upgrade",
      recommendedNameByTier: {
        good: "Standard high-efficiency gas furnace",
        better: "High-efficiency gas furnace",
        best: "Ultra high-efficiency gas furnace",
      },
      tiers: {
        good: { priceMin: 4000, priceMax: 5500, baseSavMin: 14, baseSavMax: 26 },
        better: { priceMin: 5000, priceMax: 7000, baseSavMin: 19, baseSavMax: 35 },
        best: { priceMin: 6500, priceMax: 9500, baseSavMin: 22, baseSavMax: 40 },
      },
      existingCarbon: { min: 3400, max: 4000 },
    },
    {
      systemTitle: "💧 Water Heater • Gas Tank",
      systemSubtitle: "High-efficiency replacement water heater",
      recommendedNameByTier: {
        good: "High-efficiency gas water heater",
        better: "High-efficiency gas water heater (premium)",
        best: "Heat pump water heater (best)",
      },
      tiers: {
        good: { priceMin: 1800, priceMax: 3000, baseSavMin: 6, baseSavMax: 12 },
        better: { priceMin: 2500, priceMax: 4200, baseSavMin: 8, baseSavMax: 16 },
        best: { priceMin: 3800, priceMax: 6500, baseSavMin: 10, baseSavMax: 20 },
      },
      existingCarbon: { min: 1200, max: 1800 },
    },
    {
      systemTitle: "🪟 Windows • Mixed",
      systemSubtitle: "Upgrade to high-performance windows",
      recommendedNameByTier: {
        good: "Double-pane upgrade package",
        better: "High-performance window package",
        best: "Premium high-performance window package",
      },
      tiers: {
        good: { priceMin: 6000, priceMax: 12000, baseSavMin: 8, baseSavMax: 18 },
        better: { priceMin: 11000, priceMax: 20000, baseSavMin: 10, baseSavMax: 22 },
        best: { priceMin: 18000, priceMax: 32000, baseSavMin: 12, baseSavMax: 26 },
      },
      existingCarbon: { min: 800, max: 1500 },
    },
  ];
}

function LeafPage({
  page,
  tier,
  setTier,
  price,
  setPrice,
}: {
  page: SnapshotUIModel;
  tier: TierKey;
  setTier: (t: TierKey) => void;
  price: number;
  setPrice: (n: number) => void;
}) {
  const t = page.tiers[tier];
  const priceMin = 3000;
  const priceMax = 15000;

  const leafRangeText = `${money(t.priceMin)}–${money(t.priceMax)}`;

  const dynSav = dynamicSavingsRange(price, t);
  const dynSavText = `$${dynSav.min}–$${dynSav.max}/mo`;

  const proposedYMin = t.baseSavMin * 12;
  const proposedYMax = t.baseSavMax * 12;

  const pc = computeProposedCarbon(page.existingCarbon, tier);
  const pctMin = Math.round(pc.red.min * 100);
  const pctMax = Math.round(pc.red.max * 100);

  const costClass = classifyCost(price, t);
  const msg = quickReadMessage(costClass);

  const net = computeNetCostRange(price);
  const netMin = Math.min(net.netLow, net.netHigh);
  const netMax = Math.max(net.netLow, net.netHigh);

  const okLeftPct = ((t.priceMin - priceMin) / (priceMax - priceMin)) * 100;
  const okWidthPct = ((t.priceMax - t.priceMin) / (priceMax - priceMin)) * 100;
  const fillPct = ((price - priceMin) / (priceMax - priceMin)) * 100;

  let costBadgeTone: "good" | "warn" | "bad" = "good";
  let costBadgeText = "Within range";
  if (costClass === "unreal_low") {
    costBadgeTone = "bad";
    costBadgeText = "Unrealistic";
  } else if (costClass === "low") {
    costBadgeTone = "warn";
    costBadgeText = "Low (verify scope)";
  } else if (costClass === "likely_over") {
    costBadgeTone = "warn";
    costBadgeText = "Likely overpriced";
  } else if (costClass === "over") {
    costBadgeTone = "bad";
    costBadgeText = "Overpriced";
  }

  let decisionTone: "good" | "warn" | "bad" = "good";
  let decisionText = "Likely yes ✅";
  if (costClass === "over") {
    decisionTone = "bad";
    decisionText = "Unclear 🚩";
  } else if (costClass !== "in") {
    decisionTone = "warn";
    decisionText = "Likely yes (with clarity) ⚠️";
  }

  return (
    <main className="leaf-page max-w-md mx-auto px-4 pt-5 pb-28 space-y-4">
      {/* HERO */}
      <section className="glass rounded-3xl p-4 border border-neutral-800 soft-shadow pop">
        <div className="text-lg font-extrabold tracking-tight mb-1">{page.systemTitle}</div>
        <div className="text-sm font-semibold text-neutral-200">{page.systemSubtitle}</div>

        <div className="text-xs text-neutral-300 mt-1">
          LEAF provides ranges so you can evaluate contractor quotes with confidence.
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <span
            className="px-3 py-1 rounded-full bg-[var(--leaf)] text-black text-xs font-semibold"
          >
            Save ~${t.baseSavMin}–${t.baseSavMax}/mo
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-200 text-xs border border-emerald-500/30">
            ~{pctMin}–{pctMax}% less CO₂
          </span>
        </div>

        <div className="text-[11px] text-neutral-400 mt-2">
          Tip: “Best” has the highest estimated savings + lowest estimated carbon — but ROI can drop if
          install price climbs faster than savings.
        </div>
      </section>

      {/* CURRENT */}
      <section className="glass rounded-3xl p-4 border border-red-500/30 soft-shadow pop">
        <div className="flex justify-between mb-3">
          <div className="text-sm font-semibold">📷 Current system</div>
          <span className="text-[11px] px-3 py-1 rounded-full bg-red-500/15 text-red-200 border border-red-500/25">
            Near end of life
          </span>
        </div>

        <div className="flex gap-3">
          <div className="w-24 h-24 rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900" />
          <div className="flex-1 text-xs space-y-1">
            <div className="font-semibold">Existing system</div>
            <div>
              Annual cost: <b>$350–$450</b>
            </div>
            <div>
              Carbon:{" "}
              <b>
                {page.existingCarbon.min.toLocaleString("en-US")}–
                {page.existingCarbon.max.toLocaleString("en-US")} lbs/yr
              </b>
            </div>
          </div>
        </div>
      </section>

      {/* RECOMMENDED */}
      <section className="glass rounded-3xl p-4 border border-[var(--leaf)]/35 soft-shadow pop">
        <div className="flex justify-between mb-3">
          <div className="text-sm font-semibold">✨ Recommended upgrade</div>
          <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">
            {tier === "good" ? "Good" : tier === "best" ? "Best" : "Better"}
          </span>
        </div>

        <div className="flex gap-3">
          <div className="w-24 h-24 rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900" />
          <div className="flex-1 text-xs space-y-1">
            <div className="font-semibold">{page.recommendedNameByTier[tier]}</div>
            <div>
              Estimated yearly savings:{" "}
              <b>
                {money(proposedYMin)}–{money(proposedYMax)}
              </b>
            </div>
            <div>
              Carbon:{" "}
              <b>
                {pc.min.toLocaleString("en-US")}–{pc.max.toLocaleString("en-US")} lbs/yr
              </b>
            </div>
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
              <div className="text-neutral-400">Install cost</div>
              <div className="text-lg font-bold">{leafRangeText}</div>
            </div>
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
              <div className="text-neutral-400">Monthly savings</div>
              <div className="text-lg font-bold">
                ${t.baseSavMin}–${t.baseSavMax}
              </div>
            </div>
          </div>
        </summary>

        <div className="mt-4 text-xs space-y-3">
          <div className="font-semibold">Cost bar (non-interactive)</div>

          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-neutral-400">Your selected price</div>
              <div className="text-sm font-bold">{money(price)}</div>
            </div>

            <div className="mt-3 slider-wrap" style={{ paddingTop: 14, paddingBottom: 10 }}>
              <div className="range-band" aria-hidden="true">
                <div className="fill" style={{ width: `${clamp(fillPct, 0, 100)}%` }} />
                <div
                  className="ok"
                  style={{
                    left: `${clamp(okLeftPct, 0, 100)}%`,
                    width: `${clamp(okWidthPct, 0, 100)}%`,
                  }}
                />
                <div
                  className="marker"
                  style={{ left: `${clamp(fillPct, 0, 100)}%` }}
                />
              </div>
              <div className="band-label">
                <span>{money(t.priceMin)}</span>
                <span>{money(t.priceMax)}</span>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-neutral-400">
              LEAF tier range is highlighted. The marker shows your selected quote.
            </div>
          </div>

          <div className="font-semibold">Why it’s a range</div>
          <ul className="list-disc list-inside text-neutral-300 space-y-1">
            <li>Based on similar installs in comparable homes</li>
            <li>Accounts for typical labor, permits, and equipment size</li>
            <li>
              “Best” can save more and cut more CO₂, but ROI can drop if cost rises faster than savings
            </li>
            <li>Final scope can change due to ductwork/access/electrical needs</li>
          </ul>
        </div>
      </details>

      {/* INTERACTIVE COST SLIDER + QUICK READ */}
      <section className="glass rounded-3xl p-4 border border-neutral-800 soft-shadow pop">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold">🎚️ Test your quote</div>

              <div className="flex items-center gap-1 ml-1" aria-label="Choose upgrade tier">
                <button
                  type="button"
                  className={`tierPill ${tier === "good" ? "on" : ""}`}
                  onClick={() => {
                    setTier("good");
                    setPrice(Math.round((page.tiers.good.priceMin + page.tiers.good.priceMax) / 2));
                  }}
                >
                  Good
                </button>
                <button
                  type="button"
                  className={`tierPill ${tier === "better" ? "on" : ""}`}
                  onClick={() => {
                    setTier("better");
                    setPrice(
                      Math.round((page.tiers.better.priceMin + page.tiers.better.priceMax) / 2)
                    );
                  }}
                >
                  Better
                </button>
                <button
                  type="button"
                  className={`tierPill ${tier === "best" ? "on" : ""}`}
                  onClick={() => {
                    setTier("best");
                    setPrice(Math.round((page.tiers.best.priceMin + page.tiers.best.priceMax) / 2));
                  }}
                >
                  Best
                </button>
              </div>
            </div>

            <div className="text-[11px] text-neutral-400 mt-1">
              Selecting Good/Better/Best updates the install cost range, estimated savings range, and the
              green “in-range” band.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="text-[11px] px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 pop"
              onClick={() => setPrice(Math.round((t.priceMin + t.priceMax) / 2))}
            >
              Reset
            </button>

            <span className={badgeClass(costClass === "in" ? "good" : msg.tone, true)}>
              {costClass === "in"
                ? "Looks good ✅"
                : costClass === "over"
                ? "Major caution 🚩"
                : "Proceed smart ⚠️"}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-neutral-400">Contractor price</div>
            <div className="flex items-center gap-2">
              <span className={badgeClass(costBadgeTone, false)}>{costBadgeText}</span>
              <div className="text-sm font-bold">{money(price)}</div>
            </div>
          </div>

          <div className="mt-3 slider-wrap">
            <div className="range-band" aria-hidden="true">
              <div className="fill" style={{ width: `${clamp(fillPct, 0, 100)}%` }} />
              <div
                className="ok"
                style={{
                  left: `${clamp(okLeftPct, 0, 100)}%`,
                  width: `${clamp(okWidthPct, 0, 100)}%`,
                }}
              />
            </div>

            <input
              type="range"
              min={priceMin}
              max={priceMax}
              step={100}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />

            <div className="band-label">
              <span>{money(t.priceMin)}</span>
              <span>{money(t.priceMax)}</span>
            </div>
          </div>

          <div className="mt-2 text-[11px] text-neutral-400">
            LEAF tier range: <b>{leafRangeText}</b>
          </div>
          <div className="mt-2 text-[11px] text-neutral-400">
            Estimated savings at this price: <b>{dynSavText}</b>
          </div>
        </div>

        <div className="mt-3 rounded-2xl bg-black/30 border border-neutral-800 p-3">
          <div className="text-xs text-neutral-400">Quick read</div>
          <div className="text-sm font-semibold mt-1">{msg.headline}</div>

          <div className="mt-2 text-[11px] text-neutral-300">
            <div className="font-semibold text-neutral-200">Good questions to ask the contractor</div>
            <ul className="list-disc list-inside mt-1 space-y-1">
              {msg.qVisible.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>

          <details className="mt-2">
            <summary className="cursor-pointer text-[11px] text-emerald-300">
              Why this message + more questions
            </summary>

            <div className="mt-2 text-[11px] text-neutral-300 space-y-3">
              <div>
                <div className="font-semibold text-neutral-200">Why LEAF is saying this</div>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {msg.why.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="font-semibold text-neutral-200">More questions (optional)</div>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {msg.qMore.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        </div>
      </section>

      {/* INCENTIVES */}
      <details className="glass rounded-3xl p-4 border border-neutral-800 soft-shadow pop">
        <summary className="cursor-pointer">
          <div className="flex justify-between items-center">
            <div className="text-sm font-semibold">🏷️ Incentives & rebates</div>
            <span className="text-[11px] text-neutral-400">Tap for details</span>
          </div>
          <div className="mt-2 text-xs font-bold">$750–$3,000+ typical</div>
          <div className="text-[11px] text-neutral-400 mt-1">Federal • State • Utility</div>
        </summary>

        <div className="mt-4 space-y-3 text-xs">
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
            <div className="font-semibold">🇺🇸 Federal</div>
            <div>
              Tax credit example: <b>20–30%</b> up to <b>$600–$2,000</b>
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              Claimed by homeowner when filing taxes.
            </div>
          </div>

          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
            <div className="font-semibold">🏛️ State</div>
            <div>
              Program rebates often <b>$500–$1,500</b> (varies by state & funding)
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              Eligibility can depend on equipment + participating contractors.
            </div>
          </div>

          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
            <div className="font-semibold">⚡ Local / Utility</div>
            <div>
              Flat rebates typically <b>$250–$750</b>
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">
              Often applied at install or submitted after completion.
            </div>
          </div>

          <div className="text-[11px] text-neutral-400">
            LEAF identifies likely incentives based on system type and location. Contractors confirm
            eligibility, pricing, and paperwork requirements.
          </div>
        </div>
      </details>

      {/* DOES THIS MAKE SENSE */}
      <section className="glass rounded-3xl p-4 border border-neutral-800 soft-shadow pop">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">🧠 Does this decision make sense?</div>
          <span className={badgeClass(decisionTone, false)}>{decisionText}</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
            <div className="text-neutral-400">Install cost (slider)</div>
            <div className="text-base font-bold">{money(price)}</div>
          </div>

          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
            <div className="text-neutral-400">Estimated savings (at this price)</div>
            <div className="text-base font-bold">{dynSavText}</div>
            <div className="text-[11px] text-neutral-400 mt-1">
              Best saves more + cuts more CO₂, but ROI may drop if price rises too fast.
            </div>
          </div>

          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3 col-span-2">
            <div className="text-neutral-400">Estimated net cost (after incentives)</div>
            <div className="text-base font-bold">{moneyRange(netMin, netMax)}</div>
            <div className="text-[11px] text-neutral-400 mt-1">
              Based on incentive estimates shown above (contractor confirms final eligibility).
            </div>
          </div>

          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
            <div className="text-neutral-400">Quote value check</div>
            <div className="text-base font-bold">
              {costClass === "in"
                ? "Within range ✅"
                : costClass === "low"
                ? "Below range ⚠️"
                : costClass === "unreal_low"
                ? "Very low 🚩"
                : costClass === "likely_over"
                ? "Above range ⚠️"
                : "Far above range 🚩"}
            </div>
          </div>

          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
            <div className="text-neutral-400">What this means</div>
            <div className="text-[11px] text-neutral-300 mt-1">
              {costClass === "in"
                ? "Quotes in-range usually indicate predictable scope + fair pricing."
                : costClass === "low"
                ? "Could be a great deal — confirm it’s a full scope replacement quote."
                : costClass === "unreal_low"
                ? "High chance something is missing. Get scope in writing before scheduling."
                : costClass === "likely_over"
                ? "Premium cost can bump savings slightly, but ROI may drop. Ask what justifies the cost."
                : "Likely overpriced. Compare another itemized bid before committing."}
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl bg-black/30 border border-neutral-800 p-3">
          <div className="text-xs text-neutral-400">Decision summary</div>
          <div className="text-sm font-semibold mt-1">
            {costClass === "over" ? "This needs a closer look." : "This looks financially reasonable."}
          </div>
          <div className="text-[11px] text-neutral-300 mt-1">
            {costClass === "over"
              ? "The quote is well above typical pricing. Request an itemized scope and compare at least one more bid."
              : "If the contractor quote lands within the LEAF tier range, this is typically a strong replacement decision."}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ReportPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = String(params?.jobId || "");

  // Load any local data (not required for the mock UI, but doesn’t hurt)
  useEffect(() => {
    loadLocalJobs();
    loadLocalSnapshots();
  }, []);

  // For now, render the 3 demo pages from your HTML.
  // Later: map snapshotsForJob(jobId) into SnapshotUIModel[].
  const pages = useMemo(() => getMockPages(), []);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activePage, setActivePage] = useState(0);

  // Page-scoped tier/price state
  const [tierByPage, setTierByPage] = useState<TierKey[]>(() =>
    pages.map(() => "better")
  );
  const [priceByPage, setPriceByPage] = useState<number[]>(() =>
    pages.map((p) => Math.round((p.tiers.better.priceMin + p.tiers.better.priceMax) / 2))
  );

  function scrollToPage(i: number) {
    const el = scrollRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    el.scrollTo({ left: i * w, behavior: "smooth" });
    setActivePage(i);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const w = el.clientWidth || 1;
      const i = Math.round(el.scrollLeft / w);
      setActivePage(clamp(i, 0, pages.length - 1));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll as any);
  }, [pages.length]);

  // (Optional) touch up: keep snaps aligned on resize
  useEffect(() => {
    const onResize = () => scrollToPage(activePage);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage]);

  const job = useMemo(() => {
    // Doesn’t affect UI right now—just here so you can use it later.
    return findLocalJob(jobId) || null;
  }, [jobId]);

  return (
    <div className="bg-black text-white min-h-screen">
      {/* Global CSS (ported from your HTML mock) */}
      <style jsx global>{`
        :root {
          --leaf: ${LEAF};
        }
        body {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .glass {
          background: rgba(24, 24, 27, 0.78);
          backdrop-filter: blur(12px);
        }
        .soft-shadow {
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.42);
        }
        .pop {
          transition: transform 0.18s ease;
        }
        .pop:hover {
          transform: translateY(-1px) scale(1.01);
        }
        summary::-webkit-details-marker {
          display: none;
        }

        /* --- SLIDERS (single-track look) --- */
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 32px;
          background: transparent;
          outline: none;
          position: relative;
          z-index: 3;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          height: 12px;
          background: transparent;
          border-radius: 999px;
        }
        input[type="range"]::-moz-range-track {
          height: 12px;
          background: transparent;
          border-radius: 999px;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: var(--leaf);
          border: 2px solid rgba(0, 0, 0, 0.55);
          box-shadow: 0 12px 22px rgba(0, 0, 0, 0.45), 0 0 0 6px rgba(67, 164, 25, 0.12);
          cursor: pointer;
          margin-top: 1px;
          transform: translateZ(0);
        }
        input[type="range"]::-moz-range-thumb {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: var(--leaf);
          border: 2px solid rgba(0, 0, 0, 0.55);
          box-shadow: 0 12px 22px rgba(0, 0, 0, 0.45), 0 0 0 6px rgba(67, 164, 25, 0.12);
          cursor: pointer;
          transform: translateZ(0);
        }

        .slider-wrap {
          position: relative;
          padding-top: 6px;
          padding-bottom: 6px;
        }

        .range-band {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          height: 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.10);
          overflow: hidden;
          z-index: 1;
        }
        .range-band .fill {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: 0%;
          border-radius: 999px;
          background: rgba(67, 164, 25, 0.18);
          z-index: 0;
          transition: width 0.06s linear;
        }
        .range-band .ok {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0%;
          width: 0%;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            rgba(67, 164, 25, 0.18),
            rgba(67, 164, 25, 0.55),
            rgba(67, 164, 25, 0.18)
          );
          border: 1px solid rgba(67, 164, 25, 0.55);
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25) inset, 0 0 16px rgba(67, 164, 25, 0.22);
          z-index: 2;
          pointer-events: none;
          transition: left 0.18s ease, width 0.18s ease;
        }

        /* Non-interactive marker (static bar) */
        .range-band .marker {
          position: absolute;
          top: -6px;
          width: 0;
          height: 26px;
          border-left: 2px solid rgba(255, 255, 255, 0.75);
          filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.55));
          z-index: 3;
          pointer-events: none;
        }
        .range-band .marker::after {
          content: "";
          position: absolute;
          left: -6px;
          top: -2px;
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: var(--leaf);
          border: 2px solid rgba(0, 0, 0, 0.55);
          box-shadow: 0 10px 18px rgba(0, 0, 0, 0.40), 0 0 0 6px rgba(67, 164, 25, 0.10);
        }

        .band-label {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.45);
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
        }

        /* --- Swipe pages --- */
        .snap-scroll {
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .snap-scroll::-webkit-scrollbar {
          display: none;
        }
        .snap-page {
          scroll-snap-align: center;
          width: 100%;
          flex: 0 0 100%;
        }

        /* Pager dots */
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.18);
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .dot.active {
          background: rgba(67, 164, 25, 0.95);
          border-color: rgba(67, 164, 25, 0.75);
          transform: scale(1.12);
        }

        /* Tier pill group */
        .tierPill {
          font-size: 11px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.22);
          color: rgba(255, 255, 255, 0.80);
          line-height: 1;
          transition: transform 0.12s ease, background 0.12s ease, border-color 0.12s ease;
          white-space: nowrap;
        }
        .tierPill:hover {
          transform: translateY(-1px);
        }
        .tierPill.on {
          background: rgba(67, 164, 25, 0.18);
          border-color: rgba(67, 164, 25, 0.55);
          color: rgba(217, 255, 198, 0.95);
        }
      `}</style>

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-black/70 border-b border-neutral-800 backdrop-blur">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">LEAF System Snapshot</div>
            <div className="text-[11px] text-neutral-400">
              Snapshot {activePage + 1} of {pages.length}
            </div>
          </div>

          {/* Pager dots */}
          <div className="flex items-center gap-2">
            {pages.map((_, i) => (
              <button
                key={i}
                className={`dot ${i === activePage ? "active" : ""}`}
                aria-label={`Go to snapshot ${i + 1}`}
                onClick={() => scrollToPage(i)}
              />
            ))}
          </div>
        </div>
      </header>

      {/* SWIPE CONTAINER */}
      <div ref={scrollRef} className="snap-scroll overflow-x-auto flex">
        {pages.map((p, i) => (
          <div key={i} className="snap-page">
            <LeafPage
              page={p}
              tier={tierByPage[i]}
              setTier={(t) =>
                setTierByPage((prev) => prev.map((x, idx) => (idx === i ? t : x)))
              }
              price={priceByPage[i]}
              setPrice={(n) =>
                setPriceByPage((prev) => prev.map((x, idx) => (idx === i ? n : x)))
              }
            />
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-black/80 border-t border-neutral-800 backdrop-blur">
        <div className="max-w-md mx-auto px-4 py-3">
          <button className="w-full bg-[var(--leaf)] text-black font-semibold py-3 rounded-full text-sm pop">
            🔎 Get an exact bid from a contractor
          </button>
          <div className="text-[11px] text-neutral-400 text-center mt-1">
            Compare the quote against your LEAF tier range
          </div>
        </div>
      </div>
    </div>
  );
}
