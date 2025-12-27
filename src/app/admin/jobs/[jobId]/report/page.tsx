"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";

import { MOCK_JOBS, type Job } from "../../../_data/mockJobs";
import { findLocalJob } from "../../../_data/localJobs";
import { loadLocalSnapshots, snapshotsForJob } from "../../../_data/localSnapshots";
import { MOCK_SYSTEMS } from "../../../_data/mockSystems";
import { getIncentivesForSystemType, type IncentiveResource } from "@/app/admin/_data/incentives/incentiveResolver";

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
        global.uiText.headerPageLabelTemplate ||
        "Snapshot {current} of {total}";
      if (pageLabel)
        pageLabel.textContent = tpl
          .replace("{current}", String(i + 1))
          .replace("{total}", String(dots.length || 0));
    }

    function initLeafPage(root: Element) {
      const $ = (sel: string) => root.querySelector(sel) as HTMLElement | null;

      const pageIndex = Number(root.getAttribute("data-page-index") || "0");
      const catalogId = root.getAttribute("data-catalog-id") || null;

      const snapshot = getSnapshotByIndex(pageIndex, catalogId);
      const calculated = snapshot?.calculatedSavings || null;

      const priceSlider = root.querySelector<HTMLInputElement>(
        '[data-el="priceSlider"]'
      );
      if (!priceSlider) return () => {};

      const slider = priceSlider;
      slider.min = String(globalSlider.min);
      slider.max = String(globalSlider.max);
      slider.step = String(globalSlider.step);

      let tierKey: LeafTierKey = snapshot?.suggested?.tier || "better";

      const dynSavings = $('[data-el="dynamicSavingsRange"]');
      const msSavingsRange = $('[data-el="msSavingsRange"]');
      const heroSavingsPill = $('[data-el="heroSavingsPill"]');

      const priceValue = $('[data-el="priceValue"]');
      const costBadge = $('[data-el="costBadge"]');
      const overallBadge = $('[data-el="overallBadge"]');

      function renderSavings() {
        if (!calculated) return;
        const text = `${formatMoney(
          calculated.minMonthly
        )}–${formatMoney(calculated.maxMonthly)}/mo`;

        if (dynSavings) dynSavings.textContent = text;
        if (msSavingsRange) msSavingsRange.textContent = text;
        if (heroSavingsPill)
          heroSavingsPill.textContent = `Save ~${text}`;
      }

      function updateUI() {
        const price = Number(slider.value);
        if (priceValue) priceValue.textContent = formatMoney(price);

        const t = getTier(snapshot, tierKey);
        const tierMin = Number(t?.leafPriceRange?.min || 0);
        const tierMax = Number(t?.leafPriceRange?.max || 0);

        const costClass = classifyCostFromThresholds({
          price,
          tierMin,
          tierMax,
          unrealLowOffsetFromMin:
            global.rangesAndClassifications.costClassThresholds
              ?.unrealLowOffsetFromMin ?? -500,
          overpricedOffsetFromMax:
            global.rangesAndClassifications.costClassThresholds
              ?.overpricedOffsetFromMax ?? 3000,
        });

        const badgeText =
          (msgLib as any).costBadgeTextByClass?.[costClass] || "—";
        if (costBadge) costBadge.textContent = badgeText;
        if (overallBadge) overallBadge.textContent = badgeText;

        renderSavings();
      }

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

  const effectiveConfig =
    typeof window === "undefined" ? LEAF_SS_CONFIG : getEffectiveLeafConfig();
  const ui = effectiveConfig.global.uiText;
  const incentivesUi = effectiveConfig.global.incentives.labels;

  return (
    <>
      {/* 🔒 STYLES + MARKUP UNCHANGED */}
      {/* (identical to your original file, omitted here for brevity) */}
      {/* KEEP YOUR EXISTING JSX BELOW THIS LINE */}
    </>
  );
}
