"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";

import { MOCK_JOBS, type Job } from "../../../_data/mockJobs";
import { findLocalJob } from "../../../_data/localJobs";
import { loadLocalSnapshots, snapshotsForJob } from "../../../_data/localSnapshots";
import { MOCK_SYSTEMS } from "../../../_data/mockSystems";
import { getIncentivesForSystemType, type IncentiveResource } from "../../../../../lib/incentives/incentiveRules";

import { LEAF_SS_CONFIG } from "../../../_data/leafSSConfig";
import {
  getSnapshotByIndex,
  getTier,
  classifyCostFromThresholds,
  dynamicSavingsRangeFromRule,
  type LeafTierKey,
} from "../../../_data/leafSSConfigRuntime";

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
      global: {
        ...LEAF_SS_CONFIG.global,
        ...(override.global || {}),
      },
      messageLibrary: {
        ...LEAF_SS_CONFIG.messageLibrary,
        ...(override.messageLibrary || {}),
      },
    };
  } catch {
    return LEAF_SS_CONFIG;
  }
}

export default function JobReportPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params?.jobId;

  const job: Job | null = useMemo(() => {
    if (!jobId) return null;
    return findLocalJob(jobId) || MOCK_JOBS.find((j) => j.id === jobId) || null;
  }, [jobId]);

  const snaps: any[] = useMemo(() => {
    if (!jobId) return [];
    try {
      loadLocalSnapshots();
      return snapshotsForJob(jobId) || [];
    } catch {
      return [];
    }
  }, [jobId]);

  const pages = useMemo(() => {
    const list = Array.isArray(snaps) ? snaps : [];
    return list.slice(0, 3).map((s, idx) => {
      const existingType = String(s?.existing?.type || "").trim();
      const existingSubtype = String(s?.existing?.subtype || "").trim();

      const catalogId = s?.suggested?.catalogSystemId || null;
      const catalog = catalogId ? (MOCK_SYSTEMS as any[]).find((x) => x.id === catalogId) : null;
      const tags: string[] = (catalog?.tags || [])
        .map((t: any) => normalizeTag(String(t || "")))
        .filter(Boolean);

      const incentives = getIncentivesForSystemType(existingType, { tags }).filter(
        (r: any) => !(r as any).disabled
      );

      return {
        id: s?.id || `page_${idx}`,
        existingType,
        existingSubtype,
        ageYears: s?.existing?.ageYears ?? null,
        wear: s?.existing?.wear ?? null,
        suggestedName: String(s?.suggested?.name || "Suggested upgrade").trim(),
        estCost: s?.suggested?.estCost ?? null,
        estAnnualSavings: s?.suggested?.estAnnualSavings ?? null,
        estPaybackYears: s?.suggested?.estPaybackYears ?? null,
        tags,
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

    function setActiveDot(i: number) {
      dots.forEach((d, idx) => d.classList.toggle("active", idx === i));
      const tpl =
        LEAF_SS_CONFIG.global.uiText.headerPageLabelTemplate ||
        "Snapshot {current} of {total}";
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

    function onPagerClick(e: any) {
      const btn = e?.target?.closest?.("[data-page]");
      if (!btn) return;
      scrollToPage(Number(btn.dataset.page || 0));
    }

    function onScroll() {
      if (!pagesEl) return;
      const w = pagesEl.clientWidth || 1;
      const i = Math.round(pagesEl.scrollLeft / w);
      setActiveDot(Math.max(0, Math.min(dots.length - 1, i)));
    }

    function onResize() {
      const i = dots.findIndex((d) => d.classList.contains("active"));
      scrollToPage(Math.max(0, i));
    }

    pagerEl?.addEventListener("click", onPagerClick);
    pagesEl?.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onResize);

    const effectiveConfig = getEffectiveLeafConfig();
const global = effectiveConfig.global;
const msgLib = effectiveConfig.messageLibrary;
    const globalSlider = global.slider;
    const globalIncentives = global.incentives;


    const clamp = (v: number, min: number, max: number) =>
      Math.min(max, Math.max(min, v));
    const formatMoney = (n: number) =>
      "$" + Math.round(n).toLocaleString(global.format.currencyLocale || "en-US");
    const formatMoneyRange = (a: number, b: number) =>
      `${formatMoney(a)}–${formatMoney(b)}`;

    function setBadge(
      el: HTMLElement,
      tone: "good" | "warn" | "bad" | "neutral",
      text: string
    ) {
      el.setAttribute("data-tone", tone);
      el.textContent = text;
    }

    function setBand(
      okEl: HTMLElement,
      sliderMin: number,
      sliderMax: number,
      okMin: number,
      okMax: number
    ) {
      const span = sliderMax - sliderMin || 1;
      const L = ((okMin - sliderMin) / span) * 100;
      const R = ((okMax - sliderMin) / span) * 100;
      okEl.style.left = `${clamp(L, 0, 100)}%`;
      okEl.style.width = `${Math.max(
        0,
        clamp(R, 0, 100) - clamp(L, 0, 100)
      )}%`;
    }

    function setFill(
      fillEl: HTMLElement,
      sliderMin: number,
      sliderMax: number,
      value: number
    ) {
      const span = sliderMax - sliderMin || 1;
      const pct = ((value - sliderMin) / span) * 100;
      fillEl.style.width = `${clamp(pct, 0, 100)}%`;
    }

    function renderList(el: HTMLElement | null, items: string[]) {
      if (!el) return;
      el.innerHTML = (items || []).map((t) => `<li>${t}</li>`).join("");
    }

    function computeNetCostRange(installCost: number) {
      const low = Number(globalIncentives.low || 0);
      const high = Number(globalIncentives.high || 0);
      const netLow = Math.max(0, installCost - high);
      const netHigh = Math.max(0, installCost - low);
      return { netLow, netHigh };
    }
function initLeafPage(root: Element) {
  const $ = (sel: string) => root.querySelector(sel) as HTMLElement | null;

  const priceSlider = root.querySelector<HTMLInputElement>('[data-el="priceSlider"]');
  if (!priceSlider) return () => {};

  // ✅ TS-safe alias (non-null forever in this closure)
  const slider = priceSlider;

const pageIndex = Number(root.getAttribute("data-page-index") || "0");
const catalogId = root.getAttribute("data-catalog-id") || null;
const snapshot = getSnapshotByIndex(pageIndex, catalogId);

  let tierKey: LeafTierKey = "better";

  const priceValue = $('[data-el="priceValue"]');
  const costBadge = $('[data-el="costBadge"]');
  const overallBadge = $('[data-el="overallBadge"]');
  const overallHeadline = $('[data-el="overallHeadline"]');

  const quickReadWhy = $('[data-el="quickReadWhy"]');
  const qVisible = $('[data-el="quickReadQuestionsVisible"]');
  const qMore = $('[data-el="quickReadQuestionsMore"]');

  const msNetCostRange = $('[data-el="msNetCostRange"]');
  const msSavingsRange = $('[data-el="msSavingsRange"]');
  const heroSavingsPill = $('[data-el="heroSavingsPill"]');

  const recommendedNameEl = $('[data-el="recommendedName"]');
  const recommendedStatusPill = $('[data-el="recommendedStatusPill"]');

  const priceBandOK = $('[data-el="priceBandOK"]');
  const priceBandFill = $('[data-el="priceBandFill"]');

  const dynSavings = $('[data-el="dynamicSavingsRange"]');
  const leafRangeText = $('[data-el="leafRangeText"]');
  const resetBtn = $('[data-el="resetBtn"]');

  const tierButtons = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-el="tierBtn"]')
  );

  slider.min = String(globalSlider.min);
  slider.max = String(globalSlider.max);
  slider.step = String(globalSlider.step);

  function getRuleOverrides() {
    const snapOverrides = (snapshot?.rulesOverrides ?? {}) as {
      costClassThresholds?: {
        unrealLowOffsetFromMin?: number;
        overpricedOffsetFromMax?: number;
      };
      dynamicSavingsRule?: {
        type?: string;
        stepSizeDollars?: number;
        bumpPerStepMonthlyDollars?: number;
      };
    };

    const thresholds =
      snapOverrides.costClassThresholds ||
      global.rangesAndClassifications.costClassThresholds;

    const dynRule =
      snapOverrides.dynamicSavingsRule ||
      global.rangesAndClassifications.dynamicSavingsRule;

    return { thresholds, dynRule };
  }

  function setTier(next: LeafTierKey) {
    tierKey = next;

    tierButtons.forEach((b) =>
      b.classList.toggle("active", b.dataset.tier === tierKey)
    );

    const t = getTier(snapshot, tierKey);
    const min = Number(t?.leafPriceRange?.min || globalSlider.min);
    const max = Number(t?.leafPriceRange?.max || globalSlider.max);
    const mid = Math.round((min + max) / 2);

    slider.value = String(mid);
    updateUI();
  }

  function updateUI() {
    const price = Number(slider.value);

    const t = getTier(snapshot, tierKey);
    const tierMin = Number(t?.leafPriceRange?.min || 0);
    const tierMax = Number(t?.leafPriceRange?.max || 0);

    const baseMin = Number(t?.baseMonthlySavings?.min || 0);
    const baseMax = Number(t?.baseMonthlySavings?.max || 0);

    const { thresholds, dynRule } = getRuleOverrides();

    const recName = snapshot?.recommendedSystemCard?.recommendedNameByTier?.[tierKey];
    const recStatus = snapshot?.recommendedSystemCard?.statusPillTextByTier?.[tierKey];
    if (recommendedNameEl && recName) recommendedNameEl.textContent = String(recName);
    if (recommendedStatusPill && recStatus) recommendedStatusPill.textContent = String(recStatus);

    if (priceValue) priceValue.textContent = formatMoney(price);

    const dyn = dynamicSavingsRangeFromRule({
      baseMin,
      baseMax,
      price,
      tierMax,
      stepSizeDollars: Number(dynRule?.stepSizeDollars ?? 1000),
      bumpPerStepMonthlyDollars: Number(dynRule?.bumpPerStepMonthlyDollars ?? 2),
    });

    const savText = `${formatMoney(dyn.min)}–${formatMoney(dyn.max)}/mo`;
    if (dynSavings) dynSavings.textContent = savText;
    if (msSavingsRange) msSavingsRange.textContent = savText;
    if (heroSavingsPill)
      heroSavingsPill.textContent = `Save ~${formatMoney(dyn.min)}–${formatMoney(dyn.max)}/mo`;

    if (leafRangeText) leafRangeText.textContent = formatMoneyRange(tierMin, tierMax);

    if (priceBandOK) setBand(priceBandOK, Number(slider.min), Number(slider.max), tierMin, tierMax);
    if (priceBandFill) setFill(priceBandFill, Number(slider.min), Number(slider.max), price);

    const costClass = classifyCostFromThresholds({
      price,
      tierMin,
      tierMax,
      unrealLowOffsetFromMin: Number(thresholds?.unrealLowOffsetFromMin ?? -500),
      overpricedOffsetFromMax: Number(thresholds?.overpricedOffsetFromMax ?? 3000),
    });

    const costBadgeText = (msgLib as any).costBadgeTextByClass?.[costClass] || "—";
    if (costBadge) {
      const tone =
        costClass === "in"
          ? "good"
          : costClass === "low" || costClass === "likely_over"
          ? "warn"
          : "bad";
      setBadge(costBadge, tone, costBadgeText);
    }

    const overallText = (msgLib as any).overallBadgeTextByClass?.[costClass] || "—";
    if (overallBadge) {
      const tone = costClass === "in" ? "good" : costClass === "over" ? "bad" : "warn";
      setBadge(overallBadge, tone, overallText);
    }

    const quick = (msgLib as any).quickReadByCostClass?.[costClass];
    if (overallHeadline && quick?.headline) overallHeadline.textContent = quick.headline;
    renderList(quickReadWhy, quick?.why || []);
    renderList(qVisible, quick?.qVisible || []);
    renderList(qMore, quick?.qMore || []);

    const decision = (msgLib as any).decisionByCostClass?.[costClass];
    const decisionBadgeEl = $('[data-el="decisionBadge"]');
    const decisionHeadlineEl = $('[data-el="decisionHeadline"]');
    const decisionTextEl = $('[data-el="decisionText"]');
    const msValueCheckEl = $('[data-el="msValueCheck"]');
    const msMeaningEl = $('[data-el="msMeaning"]');

    if (decisionBadgeEl && decision?.decisionBadge) decisionBadgeEl.textContent = decision.decisionBadge;
    if (decisionHeadlineEl && decision?.summaryHeadline) decisionHeadlineEl.textContent = decision.summaryHeadline;
    if (decisionTextEl && decision?.summaryText) decisionTextEl.textContent = decision.summaryText;
    if (msValueCheckEl && decision?.msValueCheck) msValueCheckEl.textContent = decision.msValueCheck;
    if (msMeaningEl && decision?.msMeaning) msMeaningEl.textContent = decision.msMeaning;

    const net = computeNetCostRange(price);
    const netMin = Math.min(net.netLow, net.netHigh);
    const netMax = Math.max(net.netLow, net.netHigh);
    if (msNetCostRange) msNetCostRange.textContent = formatMoneyRange(netMin, netMax);
  }

  function resetToTierMid() {
    const t = getTier(snapshot, tierKey);
    const min = Number(t?.leafPriceRange?.min || globalSlider.min);
    const max = Number(t?.leafPriceRange?.max || globalSlider.max);
    const mid = Math.round((min + max) / 2);
    slider.value = String(mid);
    updateUI();
  }

  const onTierClick = (e: Event) => {
    const btn = (e.target as HTMLElement | null)?.closest?.('[data-el="tierBtn"]') as
      | HTMLButtonElement
      | null;
    if (!btn) return;
    const t = (btn.dataset.tier || "better") as LeafTierKey;
    setTier(t);
  };

  const onInput = () => updateUI();
  const onReset = () => resetToTierMid();

  slider.addEventListener("input", onInput);
  resetBtn?.addEventListener("click", onReset);
  root.addEventListener("click", onTierClick);

  setTier("better");

  return () => {
    slider.removeEventListener("input", onInput);
    resetBtn?.removeEventListener("click", onReset);
    root.removeEventListener("click", onTierClick);
  };
}


    const cleanups: Array<() => void> = [];
    document.querySelectorAll(".leaf-page").forEach((el) => {
      const c = initLeafPage(el);
      if (typeof c === "function") cleanups.push(c);
    });

    setActiveDot(0);

    return () => {
      pagerEl?.removeEventListener("click", onPagerClick);
      pagesEl?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cleanups.forEach((fn) => fn());
    };
  }, [pages.length]);

  if (!jobId) return <div style={{ padding: 24 }}>Missing jobId</div>;
  if (!job) return <div style={{ padding: 24 }}>Job not found</div>;
  if (!pages.length) return <div style={{ padding: 24 }}>No snapshots yet</div>;

  const ui = LEAF_SS_CONFIG.global.uiText;
  const incentivesUi = LEAF_SS_CONFIG.global.incentives.labels;

  return (
    <>
      {/* Full styling (no Tailwind required) */}
      <style jsx global>{`
        :root { --leaf:${LEAF_SS_CONFIG.global.leafBrandColorHex || "#43a419"}; }

        /* isolate from v0 admin css */
        .leafRoot {
          background: #000;
          color: #fff;
          min-height: 100vh;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji";
        }

        .leafHeader {
          position: sticky;
          top: 0;
          z-index: 30;
          background: rgba(0,0,0,.70);
          border-bottom: 1px solid rgba(38,38,38,1);
          backdrop-filter: blur(10px);
        }
        .leafHeaderInner{
          max-width: 420px;
          margin: 0 auto;
          padding: 12px 16px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 12px;
        }
        .leafTitle { font-size: 13px; font-weight: 700; }
        .leafSub { font-size: 11px; color: rgba(163,163,163,1); margin-top: 2px; }

        .dot{
          width: 8px; height: 8px;
          border-radius: 999px;
          background: rgba(255,255,255,.22);
          border: 1px solid rgba(255,255,255,.18);
          cursor:pointer;
          transition: transform .15s ease, background .15s ease;
        }
        .dot.active{
          background: rgba(67,164,25,.95);
          border-color: rgba(67,164,25,.75);
          transform: scale(1.12);
        }

        .snapScroll{
          display:flex;
          overflow-x:auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .snapScroll::-webkit-scrollbar{ display:none; }
        .snapPage{
          scroll-snap-align: center;
          width: 100%;
          flex: 0 0 100%;
        }

        .leafPage{
          max-width: 420px;
          margin: 0 auto;
          padding: 18px 16px 120px;
          display:flex;
          flex-direction:column;
          gap: 14px;
        }

        .glass{
          background: rgba(24,24,27,.78);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(38,38,38,1);
          border-radius: 24px;
          box-shadow: 0 18px 45px rgba(0,0,0,.42);
          padding: 14px;
        }

        .sectionTitleRow{
          display:flex; align-items:center; justify-content:space-between;
          gap: 10px; margin-bottom: 10px;
        }
        .h1{ font-size: 18px; font-weight: 800; letter-spacing: -0.02em; }
        .h2{ font-size: 13px; font-weight: 700; }
        .subText{ font-size: 11px; color: rgba(163,163,163,1); margin-top: 6px; }
        .pillRow{ display:flex; gap: 8px; flex-wrap:wrap; margin-top: 10px; }
        .pill{
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(67,164,25,.35);
          background: rgba(67,164,25,.18);
          color: #fff;
          font-weight: 700;
        }
        .pillLeaf{
          background: var(--leaf);
          color: #000;
          border-color: rgba(0,0,0,.25);
        }
        .chip{
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(16,185,129,.30);
          background: rgba(16,185,129,.15);
          color: rgba(209,250,229,1);
          font-weight: 700;
          white-space: nowrap;
        }
        .chipRed{
          border-color: rgba(239,68,68,.25);
          background: rgba(239,68,68,.15);
          color: rgba(254,202,202,1);
        }

        .cardRow{ display:flex; gap: 12px; }
        .thumb{
          width: 92px; height: 92px;
          border-radius: 22px;
          border: 1px solid rgba(38,38,38,1);
          background: rgba(10,10,10,.7);
          flex: 0 0 auto;
        }
        .cardMeta{ font-size: 12px; line-height: 1.35; }
        .cardMeta b{ font-weight: 800; }

        /* Slider block */
        .sliderBox{
          border-radius: 18px;
          border: 1px solid rgba(38,38,38,1);
          background: rgba(10,10,10,.65);
          padding: 12px;
          margin-top: 10px;
        }
        .rowBetween{ display:flex; align-items:center; justify-content:space-between; gap: 10px; }
        .smallLabel{ font-size: 12px; color: rgba(163,163,163,1); }
        .priceText{ font-size: 14px; font-weight: 800; }

        /* badges via data-tone */
        .badge{
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(16,185,129,.30);
          background: rgba(16,185,129,.15);
          color: rgba(209,250,229,1);
          font-weight: 700;
          white-space: nowrap;
        }
        .badgeSquare{ border-radius: 10px; }
        .badge[data-tone="warn"]{
          border-color: rgba(234,179,8,.30);
          background: rgba(234,179,8,.15);
          color: rgba(254,249,195,1);
        }
        .badge[data-tone="bad"]{
          border-color: rgba(239,68,68,.25);
          background: rgba(239,68,68,.15);
          color: rgba(254,202,202,1);
        }
        .badge[data-tone="neutral"]{
          border-color: rgba(82,82,82,1);
          background: rgba(38,38,38,.6);
          color: rgba(229,229,229,1);
        }

        .btnSmall{
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(38,38,38,1);
          background: rgba(10,10,10,.65);
          color: #fff;
          cursor:pointer;
        }

        /* tier buttons */
        .tierRow { display:flex; gap: 8px; margin-top: 10px; }
        .tierBtn{
          flex: 1;
          border-radius: 999px;
          border: 1px solid rgba(38,38,38,1);
          background: rgba(10,10,10,.65);
          color: rgba(229,229,229,1);
          font-size: 12px;
          font-weight: 800;
          padding: 8px 10px;
          cursor:pointer;
          transition: transform .08s ease, border-color .12s ease, background .12s ease;
        }
        .tierBtn.active{
          background: rgba(67,164,25,.20);
          border-color: rgba(67,164,25,.55);
          color: #fff;
        }
        .tierBtn:active{ transform: scale(.99); }

        /* Range band visuals */
        .sliderWrap{ position: relative; padding-top: 10px; }
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
        }
        .rangeBand{
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
        .rangeBand .fill{
          position: absolute;
          top: 0; bottom: 0; left: 0;
          width: 0%;
          border-radius: 999px;
          background: rgba(67,164,25,.18);
          transition: width .06s linear;
        }
        .rangeBand .ok{
          position: absolute;
          top: 0; bottom: 0;
          left: 0%;
          width: 0%;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(67,164,25,.18), rgba(67,164,25,.55), rgba(67,164,25,.18));
          border: 1px solid rgba(67,164,25,.55);
          box-shadow: 0 0 0 1px rgba(0,0,0,.25) inset, 0 0 16px rgba(67,164,25,.22);
          pointer-events: none;
        }

        details summary{ list-style: none; }
        summary::-webkit-details-marker{ display:none; }
        .summaryRow{ display:flex; align-items:center; justify-content:space-between; gap: 12px; cursor:pointer; }
        .summaryHint{ font-size: 11px; color: rgba(163,163,163,1); }

        .incentiveCard{
          border-radius: 18px;
          border: 1px solid rgba(38,38,38,1);
          background: rgba(10,10,10,.65);
          padding: 12px;
        }
        .incentiveTitle{ font-size: 12px; font-weight: 800; }
        .incentiveBlurb{ margin-top: 6px; font-size: 11px; color: rgba(163,163,163,1); }

        .ctaBar{
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: rgba(0,0,0,.80);
          border-top: 1px solid rgba(38,38,38,1);
          backdrop-filter: blur(10px);
        }
        .ctaInner{
          max-width: 420px;
          margin: 0 auto;
          padding: 12px 16px;
        }
        .ctaBtn{
          width: 100%;
          border: 0;
          border-radius: 999px;
          padding: 12px 14px;
          font-size: 13px;
          font-weight: 800;
          background: var(--leaf);
          color: #000;
          cursor:pointer;
        }
        .ctaNote{ margin-top: 6px; font-size: 11px; color: rgba(163,163,163,1); text-align:center; }
      `}</style>

      <div className="leafRoot">
        {/* Header */}
        <header className="leafHeader">
          <div className="leafHeaderInner">
            <div>
              <div className="leafTitle">{ui.headerTitle || "LEAF System Snapshot"}</div>
              <div className="leafSub">
                <span id="pageLabel">Snapshot 1 of {pages.length}</span>
              </div>
            </div>
            <div id="pager" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {pages.map((p, i) => (
                <button key={p.id} className={`dot ${i === 0 ? "active" : ""}`} data-page={i} aria-label={`Go to snapshot ${i + 1}`} />
              ))}
            </div>
          </div>
        </header>

        {/* Pages */}
        <div id="pages" className="snapScroll">
          {pages.map((p, idx) => (
            <div key={p.id} className="snapPage">
              <main
  className="leafPage leaf-page"
  data-page-index={idx}
  data-catalog-id={p.catalogSystemId || ""}
/>

                {/* HERO */}
                <section className="glass">
                  <div className="h1">
                    🔥 {p.existingType || "System"} • {p.existingSubtype || "Unknown"}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: "rgba(229,229,229,1)" }}>
                    Upgrade for: {p.existingSubtype || "Mixed / Unknown"}
                  </div>
                  <div className="subText">
                    {ui.heroHelper || "LEAF provides ranges so you can evaluate contractor quotes with confidence."}
                  </div>

                  <div className="pillRow">
                    <span className="pill pillLeaf" data-el="heroSavingsPill">
                      Save ~$19–$35/mo
                    </span>
                    <span className="pill">~30–45% less CO₂</span>
                  </div>

                  <div className="subText">
                    {ui.heroNote || "Note: higher-priced systems can increase savings slightly — but ROI can drop if the added cost doesn’t pay back over time."}
                  </div>
                </section>

                {/* CURRENT */}
                <section className="glass" style={{ borderColor: "rgba(239,68,68,.30)" }}>
                  <div className="sectionTitleRow">
                    <div className="h2">{ui.sections.currentTitle || "📷 Current system"}</div>
                    <span className="chip chipRed">Near end of life</span>
                  </div>

                  <div className="cardRow">
                    <div className="thumb" />
                    <div className="cardMeta">
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>Existing {p.existingSubtype || "system"}</div>
                      <div>Age: <b>{p.ageYears ?? "—"} yrs</b></div>
                      <div>Wear: <b>{p.wear ?? "—"}/5</b></div>
                    </div>
                  </div>
                </section>

                {/* RECOMMENDED */}
                <section className="glass" style={{ borderColor: "rgba(67,164,25,.35)" }}>
                  <div className="sectionTitleRow">
                    <div className="h2">{ui.sections.recommendedTitle || "✨ Recommended upgrade"}</div>
                    <span className="chip" data-el="recommendedStatusPill">High efficiency</span>
                  </div>

                  <div className="cardRow">
                    <div className="thumb" />
                    <div className="cardMeta">
                      <div style={{ fontWeight: 800, marginBottom: 6 }} data-el="recommendedName">
                        {p.suggestedName}
                      </div>
                      <div>Estimated cost: <b>{money(p.estCost)}</b></div>
                      <div>Est. savings / yr: <b>{money(p.estAnnualSavings)}</b></div>
                      <div>Payback: <b>{p.estPaybackYears ?? "—"} yrs</b></div>
                    </div>
                  </div>

                  <div className="tierRow">
                    <button className="tierBtn" data-el="tierBtn" data-tier="good">Good</button>
                    <button className="tierBtn active" data-el="tierBtn" data-tier="better">Better</button>
                    <button className="tierBtn" data-el="tierBtn" data-tier="best">Best</button>
                  </div>
                </section>

                {/* SLIDER */}
                <section className="glass">
                  <div className="rowBetween" style={{ alignItems: "flex-start" }}>
                    <div>
                      <div className="h2">{ui.sections.testQuoteTitle || "🎚️ Test your quote"}</div>
                      <div className="subText">
                        {ui.sections.testQuoteHelper || "Slide the price. Savings bumps slightly with higher system cost — but ROI can drop if price rises faster than savings."}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button className="btnSmall" data-el="resetBtn">{ui.buttons.reset || "Reset"}</button>
                      <span className="badge badgeSquare" data-tone="good" data-el="overallBadge">Looks good ✅</span>
                    </div>
                  </div>

                  <div className="sliderBox">
                    <div className="rowBetween">
                      <div className="smallLabel">Contractor price</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className="badge" data-tone="good" data-el="costBadge">Within range</span>
                        <div className="priceText" data-el="priceValue">$6,000</div>
                      </div>
                    </div>

                    <div className="sliderWrap">
                      <div className="rangeBand" aria-hidden="true">
                        <div className="fill" data-el="priceBandFill"></div>
                        <div className="ok" data-el="priceBandOK"></div>
                      </div>
                      <input data-el="priceSlider" type="range" min="3000" max="15000" step="100" defaultValue="6000" />
                    </div>

                    <div className="subText" style={{ marginTop: 10 }}>
                      LEAF price range: <b data-el="leafRangeText">$5,000–$7,000</b>
                    </div>
                    <div className="subText">
                      Estimated savings at this price: <b data-el="dynamicSavingsRange">$19–$35/mo</b>
                    </div>
                  </div>

                  <div className="sliderBox" style={{ background: "rgba(0,0,0,.30)" }}>
                    <div className="smallLabel">{ui.sections.quickReadTitle || "Quick read"}</div>
                    <div style={{ fontWeight: 800, marginTop: 6 }} data-el="overallHeadline">
                      This looks like a solid deal.
                    </div>

                    <div style={{ marginTop: 10, fontSize: 11, color: "rgba(229,229,229,1)" }}>
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>Good questions to ask the contractor</div>
                      <ul data-el="quickReadQuestionsVisible" style={{ paddingLeft: 16, margin: 0 }} />
                    </div>

                    <details style={{ marginTop: 10 }}>
                      <summary style={{ cursor: "pointer", fontSize: 11, color: "rgba(110,231,183,1)", fontWeight: 700 }}>
                        {ui.sections.quickReadExpand || "Why this message + more questions"}
                      </summary>
                      <div style={{ marginTop: 10, fontSize: 11, color: "rgba(229,229,229,1)" }}>
                        <div style={{ fontWeight: 800, marginBottom: 6 }}>
                          {ui.sections.quickReadWhyTitle || "Why LEAF is saying this"}
                        </div>
                        <ul data-el="quickReadWhy" style={{ paddingLeft: 16, margin: 0 }} />
                        <div style={{ height: 10 }} />
                        <div style={{ fontWeight: 800, marginBottom: 6 }}>
                          {ui.sections.quickReadMoreQuestionsTitle || "More questions (optional)"}
                        </div>
                        <ul data-el="quickReadQuestionsMore" style={{ paddingLeft: 16, margin: 0 }} />
                      </div>
                    </details>
                  </div>
                </section>

                {/* INCENTIVES (REAL) */}
                <details className="glass">
                  <summary className="summaryRow">
                    <div>
                      <div className="h2">{incentivesUi.sectionTitle || "🏷️ Incentives & rebates"}</div>
                      <div className="subText" style={{ marginTop: 4 }}>
                        {p.incentives.length
                          ? `${p.incentives.length} incentive${p.incentives.length === 1 ? "" : "s"} matched`
                          : "No incentives matched"}
                      </div>
                    </div>
                    <div className="summaryHint">{ui.sections.rangeDetailsTap || "Tap for details"}</div>
                  </summary>

                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    {p.incentives.length === 0 ? (
                      <div className="subText">
                        No incentives matched this upgrade. Check Incentives tags + this system type.
                      </div>
                    ) : (
                      p.incentives.map((r) => {
                        const amt = incentiveAmountText(r);
                        return (
                          <div key={r.id} className="incentiveCard">
                            <div className="incentiveTitle">
                              {r.programName}
                              {amt ? <span style={{ fontWeight: 600, color: "rgba(229,229,229,1)" }}> — {amt}</span> : null}
                            </div>
                            {(r as any).shortBlurb ? <div className="incentiveBlurb">{(r as any).shortBlurb}</div> : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                </details>

                {/* DECISION */}
                <section className="glass">
                  <div className="rowBetween">
                    <div className="h2">{ui.sections.decisionTitle || "🧠 Does this decision make sense?"}</div>
                    <span className="badge" data-tone="good" data-el="decisionBadge">Likely yes ✅</span>
                  </div>

                  <div className="sliderBox" style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 800, marginBottom: 6 }} data-el="decisionHeadline">
                      This looks financially reasonable.
                    </div>
                    <div className="subText" data-el="decisionText">
                      If the contractor quote lands within the LEAF range, this is typically a strong replacement decision.
                    </div>

                    <div className="rowBetween" style={{ marginTop: 12 }}>
                      <div className="smallLabel">Estimated net cost (after incentives)</div>
                      <div className="priceText" data-el="msNetCostRange">$3,500–$4,500</div>
                    </div>

                    <div className="subText" style={{ marginTop: 8 }}>
                      Based on incentive estimates shown above (contractor confirms final eligibility).
                    </div>

                    <div className="subText" style={{ marginTop: 8 }}>
                      Estimated savings (at this price): <b data-el="msSavingsRange">$19–$35/mo</b>
                    </div>

                    <div className="sliderBox" style={{ marginTop: 12, background: "rgba(0,0,0,.30)" }}>
                      <div className="rowBetween">
                        <div className="smallLabel" data-el="msValueCheck">Within range ✅</div>
                        <div className="smallLabel" data-el="msMeaning">Quotes in-range usually indicate predictable scope + fair pricing.</div>
                      </div>
                    </div>
                  </div>
                </section>
              </main>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="ctaBar">
          <div className="ctaInner">
            <button className="ctaBtn">{ui.buttons.ctaPrimary || "🔎 Get an exact bid from a contractor"}</button>
            <div className="ctaNote">{ui.ctaFooterText || "Compare the quote against your LEAF range"}</div>
          </div>
        </div>
      </div>
    </>
  );
}
