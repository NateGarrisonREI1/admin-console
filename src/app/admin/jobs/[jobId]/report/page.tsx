"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";

import { MOCK_JOBS, type Job } from "../../../_data/mockJobs";
import { findLocalJob } from "../../../_data/localJobs";
import { loadLocalSnapshots, snapshotsForJob } from "../../../_data/localSnapshots";
import { MOCK_SYSTEMS } from "../../../_data/mockSystems";
import { getIncentivesForSystemType, type IncentiveResource } from "../../../../../lib/incentives/incentiveRules";

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
      const tags: string[] = (catalog?.tags || []).map((t: any) => normalizeTag(String(t || ""))).filter(Boolean);

      const incentives = getIncentivesForSystemType(existingType, { tags }).filter((r: any) => !(r as any).disabled);

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
    const dots = pagerEl ? Array.from(pagerEl.querySelectorAll<HTMLButtonElement>(".dot")) : [];
    const pageLabel = document.getElementById("pageLabel");

    function setActiveDot(i: number) {
      dots.forEach((d, idx) => d.classList.toggle("active", idx === i));
      if (pageLabel) pageLabel.textContent = `Snapshot ${i + 1} of ${dots.length || 0}`;
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

    // ---- Slider logic ----
    const LEAF_PRICE_MIN = 5000;
    const LEAF_PRICE_MAX = 7000;
    const BASE_SAVINGS_MIN = 19;
    const BASE_SAVINGS_MAX = 35;

    const INCENTIVES_LOW = 750;
    const INCENTIVES_HIGH = 3000;

    const COST_UNREALISTIC_BELOW = LEAF_PRICE_MIN - 500;
    const COST_OVERPRICED_ABOVE = LEAF_PRICE_MAX + 3000;

    const formatMoney = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

    function dynamicSavingsRange(price: number) {
      const over = Math.max(0, price - LEAF_PRICE_MAX);
      const steps = Math.floor(over / 1000);
      const bump = steps * 2;
      return { min: BASE_SAVINGS_MIN + bump, max: BASE_SAVINGS_MAX + bump };
    }

    function classifyCost(price: number) {
      if (price < COST_UNREALISTIC_BELOW) return "unreal_low";
      if (price < LEAF_PRICE_MIN) return "low";
      if (price > COST_OVERPRICED_ABOVE) return "over";
      if (price > LEAF_PRICE_MAX) return "likely_over";
      return "in";
    }

    function setBadge(el: HTMLElement, tone: "good" | "warn" | "bad" | "neutral", text: string) {
      el.setAttribute("data-tone", tone);
      el.textContent = text;
    }

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

    function computeNetCostRange(installCost: number) {
      const netLow = Math.max(0, installCost - INCENTIVES_HIGH);
      const netHigh = Math.max(0, installCost - INCENTIVES_LOW);
      return { netLow, netHigh };
    }

    function formatMoneyRange(a: number, b: number) {
      return `${formatMoney(a)}–${formatMoney(b)}`;
    }

    function renderList(el: HTMLElement | null, items: string[]) {
      if (!el) return;
      el.innerHTML = (items || []).map((t) => `<li>${t}</li>`).join("");
    }

    function quickReadMessage(costClass: string) {
      const premiumWhy = [
        "More expensive systems can provide slightly higher savings (better efficiency/controls/commissioning) — usually incremental.",
        "ROI can drop when cost climbs faster than savings. A premium quote should come with clear, measurable value.",
      ];

      if (costClass === "unreal_low") {
        return {
          tone: "warn",
          headline: "This price is extremely low — verify scope before scheduling.",
          why: ["Very low pricing often means partial scope or missing line items.", "Confirming scope protects you from surprise add-ons later."],
          qVisible: [
            "Is this a full replacement quote (equipment, labor, permits, startup/commissioning)?",
            "What’s excluded that could be added later (venting, thermostat, disposal, permits)?",
          ],
          qMore: ["Can you itemize model numbers + warranty terms in writing?", "Is there any scenario where price changes after work begins?"],
        };
      }

      if (costClass === "low") {
        return {
          tone: "good",
          headline: "Competitive quote — great sign if scope is complete.",
          why: ["Competitive bids happen and can be a win for the homeowner.", "A quick scope check ensures it’s apples-to-apples."],
          qVisible: ["Can you walk me through exactly what’s included in this price?", "Are permits/inspections and commissioning included?"],
          qMore: ["Is the thermostat included? What about haul-away/disposal?", "Can you confirm final scope and model numbers in writing?"],
        };
      }

      if (costClass === "in") {
        return {
          tone: "good",
          headline: "This looks like a fair, in-range quote.",
          why: ["Pricing aligns with what LEAF typically sees for this replacement category.", "In-range quotes usually indicate predictable scope and fewer surprises."],
          qVisible: ["What’s the install timeline and what prep do you need from me?", "What warranty coverage comes with the equipment and labor?"],
          qMore: ["Do you handle permits and inspection sign-off?", "What maintenance keeps performance strong long-term?"],
        };
      }

      if (costClass === "likely_over") {
        return {
          tone: "warn",
          headline: "Higher than LEAF range — confirm what’s driving the price.",
          why: [
            "Higher quotes can be justified by site conditions (access, venting, ductwork, electrical).",
            "It can also reflect premium add-ons you may not need.",
            ...premiumWhy,
          ],
          qVisible: ["What specifically is driving the price above typical range?", "Is there a simpler option that still meets the goals?"],
          qMore: ["Can you provide an itemized quote so I can compare bids accurately?", "Which add-ons are optional vs required?"],
        };
      }

      return {
        tone: "warn",
        headline: "Major caution — this looks overpriced for the category.",
        why: ["This is significantly above typical replacement pricing.", "Before committing, compare at least one itemized bid.", ...premiumWhy],
        qVisible: ["Can you itemize the quote (equipment, labor, permits, extras) line-by-line?", "What would the ‘standard replacement’ option cost and what changes?"],
        qMore: [
          "Are there scope items here that belong in a separate project (duct redesign, electrical upgrades)?",
          "Can you confirm model numbers and efficiency details to justify pricing?",
        ],
      };
    }

    function initLeafPage(root: Element) {
  const $ = (sel: string) => root.querySelector(sel) as HTMLElement | null;

  // ✅ Make TS happy: strongly type this as an INPUT and guard it.
  const priceSlider = root.querySelector<HTMLInputElement>('[data-el="priceSlider"]');
  if (!priceSlider) return () => {};

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

  const priceBandOK = $('[data-el="priceBandOK"]');
  const priceBandFill = $('[data-el="priceBandFill"]');

  const dynSavings = $('[data-el="dynamicSavingsRange"]');
  const resetBtn = $('[data-el="resetBtn"]');

  function updateUI() {
    const price = Number(priceSlider.value);

    if (priceValue) priceValue.textContent = formatMoney(price);

    const dyn = dynamicSavingsRange(price);
    const savText = `$${dyn.min}–$${dyn.max}/mo`;

    if (dynSavings) dynSavings.textContent = savText;
    if (msSavingsRange) msSavingsRange.textContent = savText;
    if (heroSavingsPill) heroSavingsPill.textContent = `Save ~$${dyn.min}–$${dyn.max}/mo`;

    if (priceBandOK) setBand(priceBandOK, Number(priceSlider.min), Number(priceSlider.max), LEAF_PRICE_MIN, LEAF_PRICE_MAX);
    if (priceBandFill) setFill(priceBandFill, Number(priceSlider.min), Number(priceSlider.max), price);

    const costClass = classifyCost(price);

    if (costBadge) {
      if (costClass === "unreal_low") setBadge(costBadge, "bad", "Unrealistic");
      else if (costClass === "low") setBadge(costBadge, "warn", "Low (verify scope)");
      else if (costClass === "over") setBadge(costBadge, "bad", "Overpriced");
      else if (costClass === "likely_over") setBadge(costBadge, "warn", "Likely overpriced");
      else setBadge(costBadge, "good", "Within range");
    }

    const msg = quickReadMessage(costClass);

    if (overallBadge) {
      if (costClass === "over") setBadge(overallBadge, "bad", "Major caution 🚩");
      else if ((msg as any).tone === "good") setBadge(overallBadge, "good", "Looks good ✅");
      else setBadge(overallBadge, "warn", "Proceed smart ⚠️");
    }

    if (overallHeadline) overallHeadline.textContent = (msg as any).headline;

    renderList(quickReadWhy, (msg as any).why);
    renderList(qVisible, (msg as any).qVisible);
    renderList(qMore, (msg as any).qMore);

    const net = computeNetCostRange(price);
    const netMin = Math.min(net.netLow, net.netHigh);
    const netMax = Math.max(net.netLow, net.netHigh);
    if (msNetCostRange) msNetCostRange.textContent = formatMoneyRange(netMin, netMax);
  }

  function resetToLeafMid() {
    const mid = Math.round((LEAF_PRICE_MIN + LEAF_PRICE_MAX) / 2);
    priceSlider.value = String(mid);
    updateUI();
  }

  const onInput = () => updateUI();
  const onReset = () => resetToLeafMid();

  priceSlider.addEventListener("input", onInput);
  resetBtn?.addEventListener("click", onReset);

  updateUI();

  // ✅ cleanup (nice long-term)
  return () => {
    priceSlider.removeEventListener("input", onInput);
    resetBtn?.removeEventListener("click", onReset);
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

  return (
    <>
      {/* Full styling (no Tailwind required) */}
      <style jsx global>{`
        :root { --leaf:#43a419; }

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
              <div className="leafTitle">LEAF System Snapshot</div>
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
          {pages.map((p) => (
            <div key={p.id} className="snapPage">
              <main className="leafPage leaf-page">
                {/* HERO */}
                <section className="glass">
                  <div className="h1">
                    🔥 {p.existingType || "System"} • {p.existingSubtype || "Unknown"}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: "rgba(229,229,229,1)" }}>
                    Upgrade for: {p.existingSubtype || "Mixed / Unknown"}
                  </div>
                  <div className="subText">
                    LEAF provides ranges so you can evaluate contractor quotes with confidence.
                  </div>

                  <div className="pillRow">
                    <span className="pill pillLeaf" data-el="heroSavingsPill">
                      Save ~$19–$35/mo
                    </span>
                    <span className="pill">~30–45% less CO₂</span>
                  </div>

                  <div className="subText">
                    Note: higher-priced systems can increase savings slightly — but ROI can drop if the added cost doesn’t pay back over time.
                  </div>
                </section>

                {/* CURRENT */}
                <section className="glass" style={{ borderColor: "rgba(239,68,68,.30)" }}>
                  <div className="sectionTitleRow">
                    <div className="h2">📷 Current system</div>
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
                    <div className="h2">✨ Recommended upgrade</div>
                    <span className="chip">High efficiency</span>
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
                </section>

                {/* SLIDER */}
                <section className="glass">
                  <div className="rowBetween" style={{ alignItems: "flex-start" }}>
                    <div>
                      <div className="h2">🎚️ Test your quote</div>
                      <div className="subText">
                        Slide the price. Savings bumps slightly with higher system cost — but ROI can drop if price rises faster than savings.
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button className="btnSmall" data-el="resetBtn">Reset</button>
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
                      LEAF price range: <b>$5,000–$7,000</b>
                    </div>
                    <div className="subText">
                      Estimated savings at this price: <b data-el="dynamicSavingsRange">$19–$35/mo</b>
                    </div>
                  </div>

                  <div className="sliderBox" style={{ background: "rgba(0,0,0,.30)" }}>
                    <div className="smallLabel">Quick read</div>
                    <div style={{ fontWeight: 800, marginTop: 6 }} data-el="overallHeadline">
                      This looks like a solid deal.
                    </div>

                    <div style={{ marginTop: 10, fontSize: 11, color: "rgba(229,229,229,1)" }}>
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>Good questions to ask the contractor</div>
                      <ul data-el="quickReadQuestionsVisible" style={{ paddingLeft: 16, margin: 0 }} />
                    </div>

                    <details style={{ marginTop: 10 }}>
                      <summary style={{ cursor: "pointer", fontSize: 11, color: "rgba(110,231,183,1)", fontWeight: 700 }}>
                        Why this message + more questions
                      </summary>
                      <div style={{ marginTop: 10, fontSize: 11, color: "rgba(229,229,229,1)" }}>
                        <div style={{ fontWeight: 800, marginBottom: 6 }}>Why LEAF is saying this</div>
                        <ul data-el="quickReadWhy" style={{ paddingLeft: 16, margin: 0 }} />
                        <div style={{ height: 10 }} />
                        <div style={{ fontWeight: 800, marginBottom: 6 }}>More questions (optional)</div>
                        <ul data-el="quickReadQuestionsMore" style={{ paddingLeft: 16, margin: 0 }} />
                      </div>
                    </details>
                  </div>
                </section>

                {/* INCENTIVES (REAL) */}
                <details className="glass">
                  <summary className="summaryRow">
                    <div>
                      <div className="h2">🏷️ Incentives & rebates</div>
                      <div className="subText" style={{ marginTop: 4 }}>
                        {p.incentives.length
                          ? `${p.incentives.length} incentive${p.incentives.length === 1 ? "" : "s"} matched`
                          : "No incentives matched"}
                      </div>
                    </div>
                    <div className="summaryHint">Tap for details</div>
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
                    <div className="h2">🧠 Does this decision make sense?</div>
                    <span className="badge" data-tone="good">Likely yes ✅</span>
                  </div>

                  <div className="sliderBox" style={{ marginTop: 12 }}>
                    <div className="rowBetween">
                      <div className="smallLabel">Estimated net cost (after incentives)</div>
                      <div className="priceText" data-el="msNetCostRange">$3,500–$4,500</div>
                    </div>
                    <div className="subText" style={{ marginTop: 8 }}>
                      Based on incentive estimates shown above (contractor confirms final eligibility).
                    </div>
                    <div className="subText" style={{ marginTop: 8 }}>
                      Estimated savings (at this price): <b data-el="msSavingsRange">$19–$35/mo</b>
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
            <button className="ctaBtn">🔎 Get an exact bid from a contractor</button>
            <div className="ctaNote">Compare the quote against your LEAF range</div>
          </div>
        </div>
      </div>
    </>
  );
}
