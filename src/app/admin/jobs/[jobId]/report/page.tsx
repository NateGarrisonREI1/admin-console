// src/app/admin/jobs/[jobId]/report/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { loadLocalJobs, findLocalJob } from "../../../_data/localJobs";
import { MOCK_JOBS, type Job } from "../../../_data/mockJobs";
import { loadLocalSnapshots, snapshotsForJob } from "../../../_data/localSnapshots";
import { MOCK_SYSTEMS } from "../../../_data/mockSystems";

import {
  getIncentivesForSystemType,
  type IncentiveResource,
} from "../../../_data/incentives/incentiveResolver";

import { LEAF_SS_CONFIG } from "../../../_data/leafSSConfig";
import {
  getSnapshotByIndex,
  getTier,
  classifyCostFromThresholds,
  type LeafTierKey,
} from "../../../_data/leafSSConfigRuntime";

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

function normalizeTag(t: string): string {
  return String(t || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w_]/g, "");
}

function money(n?: number | null) {
  const v = typeof n === "number" && isFinite(n) ? n : null;
  if (v == null) return "—";
  return "$" + Math.round(v).toLocaleString("en-US");
}

function incentiveAmountText(r: IncentiveResource): string {
  const a: any = (r as any).amount;
  if (!a) return "";
  if (a.kind === "text") return String(a.value || "").trim();
  if (a.kind === "flat") {
    const unit = a.unit ? ` (${a.unit})` : "";
    return `${money(Number(a.value || 0))}${unit}`;
  }
  if (a.kind === "range") {
    const unit = a.unit ? ` (${a.unit})` : "";
    return `${money(Number(a.min || 0))}–${money(Number(a.max || 0))}${unit}`;
  }
  return "";
}

function getEffectiveLeafConfig() {
  if (typeof window === "undefined") return LEAF_SS_CONFIG;
  try {
    const raw = window.localStorage.getItem("LEAF_SS_CONFIG_OVERRIDE");
    if (!raw) return LEAF_SS_CONFIG;
    const override = JSON.parse(raw);
    return {
      ...LEAF_SS_CONFIG,
      ...override,
      global: { ...LEAF_SS_CONFIG.global, ...(override.global || {}) },
      messageLibrary: {
        ...LEAF_SS_CONFIG.messageLibrary,
        ...(override.messageLibrary || {}),
      },
    };
  } catch {
    return LEAF_SS_CONFIG;
  }
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */

export default function JobReportPage() {
  const params = useParams();

  const jobId = useMemo(() => {
    const raw = (params as any)?.jobId;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  // Load caches once (NOT inside useMemo)
  useEffect(() => {
    try {
      loadLocalJobs();
      loadLocalSnapshots();
    } catch {}
  }, []);

  // force a rerender after mount so localStorage-loaded data is visible
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const job: Job | null = useMemo(() => {
    if (!jobId) return null;

    // local job first
    const local = findLocalJob(jobId);
    if (local) return local;

    // fallback mock
    return (
      MOCK_JOBS.find((j) => j.id === jobId) ||
      MOCK_JOBS.find((j) => j.id === `job_${jobId}`) ||
      null
    );
  }, [jobId, ready]);

  const snaps = useMemo(() => {
    if (!jobId) return [];
    return snapshotsForJob(jobId);
  }, [jobId, ready]);



  const pages = useMemo(() => {
    // show up to 3 pages (like your original)
    return (snaps || []).slice(0, 3).map((s, idx) => {
      const existingType = String(s?.existing?.type || "").trim();
      const existingSubtype = String(s?.existing?.subtype || "").trim();

      const catalogId = s?.suggested?.catalogSystemId || null;
      const catalog = catalogId
        ? (MOCK_SYSTEMS as any[]).find((x) => x.id === catalogId)
        : null;

      const tags: string[] = (catalog?.tags || [])
        .map((t: any) => normalizeTag(String(t || "")))
        .filter(Boolean);

      const incentives = getIncentivesForSystemType(existingType, { tags }).filter(
        (r: any) => !(r as any).disabled
      );

      return {
        id: s?.id || `page_${idx}`,
        catalogSystemId: catalogId,
        snapshot: s,
        existingType,
        existingSubtype,
        incentives,
      };
    });
  }, [snaps]);

  useEffect(() => {
    const pagesEl = document.getElementById("pages");
    const pagerEl = document.getElementById("pager");
    const dots = pagerEl
      ? Array.from(pagerEl.querySelectorAll<HTMLButtonElement>(".dot"))
      : [];
    const pageLabel = document.getElementById("pageLabel");

    const effectiveConfig = getEffectiveLeafConfig();
    const global = effectiveConfig.global;
    const msgLib = effectiveConfig.messageLibrary;
    const globalSlider = global.slider;

    const clamp = (v: number, min: number, max: number) =>
      Math.min(max, Math.max(min, v));

    const formatMoney = (n: number) =>
      "$" + Math.round(n).toLocaleString(global.format.currencyLocale || "en-US");

    function setActiveDot(i: number) {
      dots.forEach((d, idx) => d.classList.toggle("active", idx === i));
      const tpl =
        global.uiText.headerPageLabelTemplate || "Snapshot {current} of {total}";
      if (pageLabel)
        pageLabel.textContent = tpl
          .replace("{current}", String(i + 1))
          .replace("{total}", String(dots.length || 0));
    }

    function scrollToPage(i: number) {
      if (!pagesEl) return;
      const w = pagesEl.clientWidth || 1;
      pagesEl.scrollTo({ left: i * w, behavior: "smooth" });
      setActiveDot(i);
    }

    pagerEl?.addEventListener("click", (e: any) => {
      const btn = e.target?.closest?.("[data-page]") as HTMLElement | null;
      if (!btn) return;
      const i = Number(btn.getAttribute("data-page") || "0");
      scrollToPage(i);
    });

    pagesEl?.addEventListener("scroll", () => {
      if (!pagesEl) return;
      const w = pagesEl.clientWidth || 1;
      const i = Math.round(pagesEl.scrollLeft / w);
      setActiveDot(clamp(i, 0, dots.length - 1));
    });

    function setBand(okEl: HTMLElement, sliderMin: number, sliderMax: number, okMin: number, okMax: number) {
      const span = sliderMax - sliderMin;
      const L = ((okMin - sliderMin) / span) * 100;
      const R = ((okMax - sliderMin) / span) * 100;
      okEl.style.left = `${clamp(L, 0, 100)}%`;
      okEl.style.width = `${Math.max(0, clamp(R, 0, 100) - clamp(L, 0, 100))}%`;
    }

    function setFill(fillEl: HTMLElement, sliderMin: number, sliderMax: number, value: number) {
      const span = sliderMax - sliderMin;
      const pct = ((value - sliderMin) / span) * 100;
      fillEl.style.width = `${clamp(pct, 0, 100)}%`;
    }

    function initLeafPage(root: Element) {
      const $ = (sel: string) => root.querySelector(sel) as HTMLElement | null;

      const pageIndex = Number(root.getAttribute("data-page-index") || "0");
      const catalogId = root.getAttribute("data-catalog-id") || null;

      const snapshot = getSnapshotByIndex(pageIndex, catalogId);
      const calculated = snapshot?.calculatedSavings || null;

      const priceSlider = root.querySelector<HTMLInputElement>('[data-el="priceSlider"]');
      if (!priceSlider) return () => {};

      const slider = priceSlider;
      slider.min = String(globalSlider.min);
      slider.max = String(globalSlider.max);
      slider.step = String(globalSlider.step);

      let tierKey: LeafTierKey = snapshot?.suggested?.tier || "better";

      const tierGroup = root.querySelector('[data-el="tierGroup"]');
      const tierBtns = tierGroup
        ? Array.from(tierGroup.querySelectorAll<HTMLElement>("[data-tier]"))
        : [];

      const heroSystemTitle = $('[data-el="heroSystemTitle"]');
      const heroSystemSubtitle = $('[data-el="heroSystemSubtitle"]');
      const recommendedName = $('[data-el="recommendedName"]');
      const tierTag = $('[data-el="tierTag"]');

      if (heroSystemTitle) heroSystemTitle.textContent = snapshot?.ui?.heroTitle || snapshot?.existing?.type || "LEAF System Snapshot";
      if (heroSystemSubtitle) heroSystemSubtitle.textContent = snapshot?.ui?.heroSubtitle || snapshot?.existing?.subtype || "Upgrade recommendation";

      const dynSavings = $('[data-el="dynamicSavingsRange"]');
      const msSavingsRange = $('[data-el="msSavingsRange"]');
      const heroSavingsPill = $('[data-el="heroSavingsPill"]');

      const priceValue = $('[data-el="priceValue"]');
      const staticPriceValue = $('[data-el="staticPriceValue"]');

      const costBadge = $('[data-el="costBadge"]');
      const overallBadge = $('[data-el="overallBadge"]');

      const priceBandOK = $('[data-el="priceBandOK"]');
      const priceBandFill = $('[data-el="priceBandFill"]');

      const staticCostOK = $('[data-el="staticCostOK"]');
      const staticCostFill = $('[data-el="staticCostFill"]');
      const staticCostMarker = $('[data-el="staticCostMarker"]');

      const priceBandMinLabel = $('[data-el="priceBandMinLabel"]');
      const priceBandMaxLabel = $('[data-el="priceBandMaxLabel"]');
      const staticCostMinLabel = $('[data-el="staticCostMinLabel"]');
      const staticCostMaxLabel = $('[data-el="staticCostMaxLabel"]');

      const leafRangeInline = $('[data-el="leafRangeInline"]');
      const summaryInstallRange = $('[data-el="summaryInstallRange"]');
      const summarySavingsRange = $('[data-el="summarySavingsRange"]');

      function setActiveTierUI() {
        tierBtns.forEach((btn) => btn.classList.toggle("on", btn.getAttribute("data-tier") === tierKey));
        if (tierTag) tierTag.textContent = tierKey === "good" ? "Good" : tierKey === "best" ? "Best" : "Better";
        if (recommendedName) {
          recommendedName.textContent =
            snapshot?.ui?.recommendedNameByTier?.[tierKey] ||
            snapshot?.suggested?.name ||
            "Recommended upgrade";
        }
      }

      function renderSavings() {
        if (!calculated) return;
        const text = `${formatMoney(calculated.minMonthly)}–${formatMoney(calculated.maxMonthly)}/mo`;
        if (dynSavings) dynSavings.textContent = text;
        if (msSavingsRange) msSavingsRange.textContent = text;
        if (heroSavingsPill) heroSavingsPill.textContent = `Save ~${text}`;
      }

      function updateUI() {
        const price = Number(slider.value);

        if (priceValue) priceValue.textContent = formatMoney(price);
        if (staticPriceValue) staticPriceValue.textContent = formatMoney(price);

        const t = getTier(snapshot, tierKey);
        const tierMin = Number(t?.leafPriceRange?.min || 0);
        const tierMax = Number(t?.leafPriceRange?.max || 0);

        const sliderMin = Number(slider.min);
        const sliderMax = Number(slider.max);

        const leafRangeText = `${formatMoney(tierMin)}–${formatMoney(tierMax)}`;
        if (leafRangeInline) leafRangeInline.textContent = leafRangeText;
        if (summaryInstallRange) summaryInstallRange.textContent = leafRangeText;

        if (priceBandMinLabel) priceBandMinLabel.textContent = formatMoney(tierMin);
        if (priceBandMaxLabel) priceBandMaxLabel.textContent = formatMoney(tierMax);
        if (staticCostMinLabel) staticCostMinLabel.textContent = formatMoney(tierMin);
        if (staticCostMaxLabel) staticCostMaxLabel.textContent = formatMoney(tierMax);

        if (priceBandOK) setBand(priceBandOK, sliderMin, sliderMax, tierMin, tierMax);
        if (priceBandFill) setFill(priceBandFill, sliderMin, sliderMax, price);

        if (staticCostOK) setBand(staticCostOK, sliderMin, sliderMax, tierMin, tierMax);
        if (staticCostFill) setFill(staticCostFill, sliderMin, sliderMax, price);
        if (staticCostMarker) {
          const pct = ((price - sliderMin) / (sliderMax - sliderMin)) * 100;
          staticCostMarker.style.left = `${clamp(pct, 0, 100)}%`;
        }

        const costClass = classifyCostFromThresholds({
          price,
          tierMin,
          tierMax,
          unrealLowOffsetFromMin:
            global.rangesAndClassifications.costClassThresholds?.unrealLowOffsetFromMin ?? -500,
          overpricedOffsetFromMax:
            global.rangesAndClassifications.costClassThresholds?.overpricedOffsetFromMax ?? 3000,
        });

        const badgeText = (msgLib as any).costBadgeTextByClass?.[costClass] || "—";
        if (costBadge) costBadge.textContent = badgeText;
        if (overallBadge) overallBadge.textContent = badgeText;

        // Optional: show tier savings range if you have it in config
        const tierSavMin = Number(t?.baseMonthlySavings?.min ?? NaN);
        const tierSavMax = Number(t?.baseMonthlySavings?.max ?? NaN);
        if (summarySavingsRange && isFinite(tierSavMin) && isFinite(tierSavMax)) {
          summarySavingsRange.textContent = `${formatMoney(tierSavMin)}–${formatMoney(tierSavMax)}`.replace("/mo", "");
        }

        renderSavings();
        setActiveTierUI();
      }

      tierGroup?.addEventListener("click", (e: any) => {
        const btn = e.target?.closest?.("[data-tier]") as HTMLElement | null;
        if (!btn) return;
        tierKey = (btn.getAttribute("data-tier") as LeafTierKey) || "better";

        // move slider to tier midpoint so it’s obvious the band changed
        const t = getTier(snapshot, tierKey);
        const tierMin = Number(t?.leafPriceRange?.min || 0);
        const tierMax = Number(t?.leafPriceRange?.max || 0);
        const mid = Math.round((tierMin + tierMax) / 2);
        slider.value = String(mid);

        updateUI();
      });

      slider.addEventListener("input", updateUI);
      renderSavings();
      updateUI();

      return () => {
        slider.removeEventListener("input", updateUI);
      };
    }

    const cleanups: Array<() => void> = [];
    document.querySelectorAll(".leaf-page").forEach((el) => {
      const c = initLeafPage(el);
      if (typeof c === "function") cleanups.push(c);
    });

    setActiveDot(0);

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [pages.length]);

  if (!jobId) return <div style={{ padding: 24 }}>Missing jobId</div>;
  if (!job) return <div style={{ padding: 24 }}>Job not found</div>;
  if (!pages.length) return <div style={{ padding: 24 }}>No snapshots yet</div>;

  const pageCount = pages.length;

  return (
    <>
      {/* GLOBAL CSS from your HTML (kept inline so it doesn’t “disappear” again) */}
      <style jsx global>{`
        :root { --leaf:#43a419; }
        body{
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          background: #000;
          color: #fff;
        }
        .glass{
          background: rgba(24,24,27,.78);
          backdrop-filter: blur(12px);
        }
        .soft-shadow{ box-shadow: 0 18px 45px rgba(0,0,0,.42); }
        .pop{ transition: transform .18s ease; }
        .pop:hover{ transform: translateY(-1px) scale(1.01); }
        summary::-webkit-details-marker{ display:none; }

        input[type="range"]{
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 32px;
          background: transparent;
          outline: none;
          position: relative;
          z-index: 3;
        }
        input[type="range"]::-webkit-slider-runnable-track{
          height: 12px;
          background: transparent;
          border-radius: 999px;
        }
        input[type="range"]::-moz-range-track{
          height: 12px;
          background: transparent;
          border-radius: 999px;
        }
        input[type="range"]::-webkit-slider-thumb{
          -webkit-appearance: none;
          appearance: none;
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: var(--leaf);
          border: 2px solid rgba(0,0,0,.55);
          box-shadow: 0 12px 22px rgba(0,0,0,.45), 0 0 0 6px rgba(67,164,25,.12);
          cursor: pointer;
          margin-top: 1px;
          transform: translateZ(0);
        }
        input[type="range"]::-moz-range-thumb{
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: var(--leaf);
          border: 2px solid rgba(0,0,0,.55);
          box-shadow: 0 12px 22px rgba(0,0,0,.45), 0 0 0 6px rgba(67,164,25,.12);
          cursor: pointer;
          transform: translateZ(0);
        }

        .slider-wrap{ position: relative; padding-top: 6px; padding-bottom: 6px; }

        .range-band{
          position: absolute;
          left: 0; right: 0;
          top: 50%;
          transform: translateY(-50%);
          height: 14px;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.10);
          overflow: hidden;
          z-index: 1;
        }
        .range-band .fill{
          position: absolute;
          top: 0; bottom: 0; left: 0;
          width: 0%;
          border-radius: 999px;
          background: rgba(67,164,25,.18);
          z-index: 0;
          transition: width .06s linear;
        }
        .range-band .ok{
          position: absolute;
          top: 0; bottom: 0;
          left: 0%;
          width: 0%;
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
          z-index: 2;
          pointer-events: none;
          transition: left .18s ease, width .18s ease;
        }

        .range-band .marker{
          position: absolute;
          top: -6px;
          width: 0;
          height: 26px;
          border-left: 2px solid rgba(255,255,255,.75);
          filter: drop-shadow(0 4px 10px rgba(0,0,0,.55));
          z-index: 3;
          pointer-events: none;
        }
        .range-band .marker::after{
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

        .band-label{
          font-size: 10px;
          color: rgba(255,255,255,.45);
          display:flex;
          justify-content: space-between;
          margin-top: 6px;
        }

        .snap-scroll{
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .snap-scroll::-webkit-scrollbar{ display:none; }
        .snap-page{ scroll-snap-align: center; width: 100%; flex: 0 0 100%; }

        .dot{
          width: 8px; height: 8px;
          border-radius: 999px;
          background: rgba(255,255,255,.22);
          border: 1px solid rgba(255,255,255,.18);
          transition: transform .15s ease, background .15s ease;
        }
        .dot.active{
          background: rgba(67,164,25,.95);
          border-color: rgba(67,164,25,.75);
          transform: scale(1.12);
        }

        .tierPill{
          font-size: 11px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.22);
          color: rgba(255,255,255,.80);
          line-height: 1;
          transition: transform .12s ease, background .12s ease, border-color .12s ease;
          white-space: nowrap;
        }
        .tierPill:hover{ transform: translateY(-1px); }
        .tierPill.on{
          background: rgba(67,164,25,.18);
          border-color: rgba(67,164,25,.55);
          color: rgba(217,255,198,.95);
        }
      `}</style>

      <div className="min-h-screen">
        {/* HEADER */}
        <header className="sticky top-0 z-30 bg-black/70 border-b border-neutral-800 backdrop-blur">
          <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">LEAF System Snapshot</div>
              <div className="text-[11px] text-neutral-400">
                <span id="pageLabel">Snapshot 1 of {pageCount}</span>
              </div>
            </div>

            {/* Pager dots */}
            <div className="flex items-center gap-2" id="pager">
              {Array.from({ length: pageCount }).map((_, i) => (
                <button
                  key={i}
                  className={"dot" + (i === 0 ? " active" : "")}
                  aria-label={`Go to snapshot ${i + 1}`}
                  data-page={i}
                />
              ))}
            </div>
          </div>
        </header>

        {/* SWIPE CONTAINER */}
        <div id="pages" className="snap-scroll overflow-x-auto flex">
          {pages.map((p, idx) => (
            <div className="snap-page" key={p.id}>
              <main
                className="leaf-page max-w-md mx-auto px-4 pt-5 pb-28 space-y-4"
                data-page-index={idx}
                data-catalog-id={p.catalogSystemId || ""}
              >
                {/* HERO */}
                <section className="glass rounded-3xl p-4 border border-neutral-800 soft-shadow pop">
                  <div className="text-lg font-extrabold tracking-tight mb-1" data-el="heroSystemTitle">
                    {p.existingType ? `🔥 ${p.existingType}` : "LEAF System Snapshot"}
                  </div>
                  <div className="text-sm font-semibold text-neutral-200" data-el="heroSystemSubtitle">
                    {p.existingSubtype || "Upgrade recommendation"}
                  </div>

                  <div className="text-xs text-neutral-300 mt-1">
                    LEAF provides ranges so you can evaluate contractor quotes with confidence.
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <span data-el="heroSavingsPill" className="px-3 py-1 rounded-full bg-[var(--leaf)] text-black text-xs font-semibold">
                      Save ~—
                    </span>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-200 text-xs border border-emerald-500/30" data-el="heroCarbonPill">
                      ~— less CO₂
                    </span>
                  </div>

                  <div className="text-[11px] text-neutral-400 mt-2">
                    Tip: “Best” has the highest estimated savings + lowest estimated carbon — but ROI can drop if install price climbs faster than savings.
                  </div>
                </section>

                {/* CURRENT */}
                <section className="glass rounded-3xl p-4 border border-red-500/30 soft-shadow pop">
                  <div className="flex justify-between mb-3">
                    <div className="text-sm font-semibold">📷 Current system</div>
                    <span className="text-[11px] px-3 py-1 rounded-full bg-red-500/15 text-red-200 border border-red-500/25">
                      {p.snapshot?.existing?.operational || "Current"}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-24 h-24 rounded-3xl overflow-hidden border border-neutral-800 bg-black/40" />
                    <div className="flex-1 text-xs space-y-1">
                      <div className="font-semibold">
                        {p.snapshot?.existing?.label || `Existing ${p.existingSubtype || p.existingType || "system"}`}
                      </div>
                      <div>Age: <b>{p.snapshot?.existing?.ageYears ? `${p.snapshot.existing.ageYears} yrs` : "—"}</b></div>
                      <div>Wear: <b>{p.snapshot?.existing?.wear ? `${p.snapshot.existing.wear}/5` : "—"}</b></div>
                    </div>
                  </div>
                </section>

                {/* RECOMMENDED */}
                <section className="glass rounded-3xl p-4 border border-[var(--leaf)]/35 soft-shadow pop">
                  <div className="flex justify-between mb-3">
                    <div className="text-sm font-semibold">✨ Recommended upgrade</div>
                    <span
                      className="text-[11px] px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
                      data-el="tierTag"
                    >
                      Better
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-24 h-24 rounded-3xl overflow-hidden border border-neutral-800 bg-black/40" />
                    <div className="flex-1 text-xs space-y-1">
                      <div className="font-semibold" data-el="recommendedName">
                        {p.snapshot?.suggested?.name || "Recommended upgrade"}
                      </div>
                      <div>Estimated yearly savings: <b data-el="proposedSavingsYear">—</b></div>
                      <div>Carbon: <b data-el="proposedCarbonRange">—</b></div>
                    </div>
                  </div>
                </section>

                {/* COST & SAVINGS RANGE (static bar) */}
                <details className="glass rounded-3xl p-4 border border-neutral-800 soft-shadow pop">
                  <summary className="cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-semibold">💰 Cost & savings range</div>
                      <span className="text-[11px] text-neutral-400">Tap for details</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
                        <div className="text-neutral-400">Install cost</div>
                        <div className="text-lg font-bold" data-el="summaryInstallRange">—</div>
                      </div>
                      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
                        <div className="text-neutral-400">Monthly savings</div>
                        <div className="text-lg font-bold" data-el="summarySavingsRange">—</div>
                      </div>
                    </div>
                  </summary>

                  <div className="mt-4 text-xs space-y-3">
                    <div className="font-semibold">Cost bar (non-interactive)</div>

                    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-neutral-400">Your selected price</div>
                        <div className="text-sm font-bold" data-el="staticPriceValue">—</div>
                      </div>

                      <div className="mt-3 slider-wrap" style={{ paddingTop: 14, paddingBottom: 10 }}>
                        <div className="range-band" aria-hidden="true" data-el="staticCostTrack">
                          <div data-el="staticCostFill" className="fill" />
                          <div data-el="staticCostOK" className="ok" />
                          <div data-el="staticCostMarker" className="marker" style={{ left: "0%" }} />
                        </div>
                        <div className="band-label">
                          <span data-el="staticCostMinLabel">—</span>
                          <span data-el="staticCostMaxLabel">—</span>
                        </div>
                      </div>

                      <div className="mt-2 text-[11px] text-neutral-400">
                        LEAF tier range is highlighted. The marker shows your selected quote.
                      </div>
                    </div>
                  </div>
                </details>

                {/* INTERACTIVE SLIDER */}
                <section className="glass rounded-3xl p-4 border border-neutral-800 soft-shadow pop">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold">🎚️ Test your quote</div>

                        <div className="flex items-center gap-1 ml-1" data-el="tierGroup" aria-label="Choose upgrade tier">
                          <button type="button" className="tierPill" data-tier="good">Good</button>
                          <button type="button" className="tierPill on" data-tier="better">Better</button>
                          <button type="button" className="tierPill" data-tier="best">Best</button>
                        </div>
                      </div>

                      <div className="text-[11px] text-neutral-400 mt-1">
                        Selecting Good/Better/Best updates the install cost range, estimated savings range, and the green “in-range” band.
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span data-el="overallBadge" className="text-[11px] px-3 py-1 rounded-md bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">
                        —
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-neutral-400">Contractor price</div>
                      <div className="flex items-center gap-2">
                        <span data-el="costBadge" className="text-[11px] px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">
                          —
                        </span>
                        <div className="text-sm font-bold" data-el="priceValue">—</div>
                      </div>
                    </div>

                    <div className="mt-3 slider-wrap">
                      <div className="range-band" aria-hidden="true" data-el="priceBandTrack">
                        <div data-el="priceBandFill" className="fill" />
                        <div data-el="priceBandOK" className="ok" />
                      </div>

                      <input data-el="priceSlider" type="range" min="3000" max="15000" step="100" defaultValue="6000" />

                      <div className="band-label">
                        <span data-el="priceBandMinLabel">—</span>
                        <span data-el="priceBandMaxLabel">—</span>
                      </div>
                    </div>

                    <div className="mt-2 text-[11px] text-neutral-400">
                      LEAF tier range: <b data-el="leafRangeInline">—</b>
                    </div>
                    <div className="mt-2 text-[11px] text-neutral-400">
                      Estimated savings at this price: <b data-el="dynamicSavingsRange">—</b>
                    </div>
                  </div>
                </section>

                {/* INCENTIVES (basic dynamic list) */}
                <details className="glass rounded-3xl p-4 border border-neutral-800 soft-shadow pop">
                  <summary className="cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-semibold">🏷️ Incentives & rebates</div>
                      <span className="text-[11px] text-neutral-400">Tap for details</span>
                    </div>
                    <div className="mt-2 text-xs font-bold">
                      {p.incentives.length ? `${p.incentives.length} program(s) found` : "None found (yet)"}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-1">Federal • State • Utility</div>
                  </summary>

                  <div className="mt-4 space-y-3 text-xs">
                    {!p.incentives.length ? (
                      <div className="text-[11px] text-neutral-400">
                        Add rules in <code>incentiveResolver.ts</code> to populate incentives.
                      </div>
                    ) : (
                      p.incentives.map((r) => (
                        <div
                          key={r.id}
                          className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3"
                        >
                          <div className="font-semibold">{r.programName}</div>
                          {r.shortBlurb && <div className="text-[11px] text-neutral-300 mt-1">{r.shortBlurb}</div>}
                          <div className="text-[11px] text-neutral-400 mt-1">
                            {incentiveAmountText(r) || "—"}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </details>
              </main>
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
    </>
  );
}
