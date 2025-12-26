"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { MOCK_JOBS, type Job } from "../../../_data/mockJobs";
import { findLocalJob } from "../../../_data/localJobs";
import { loadLocalSnapshots, snapshotsForJob, type SnapshotDraft } from "../../../_data/localSnapshots";

/**
 * LEAF SS (mock report) — swipeable per-snapshot pages
 * - Pure CSS (no Tailwind CDN)
 * - Uses your original LEAF glass + slider styling + logic
 * - Reads snapshots from localStorage via localSnapshots helpers
 */

const LEAF_PRICE_MIN = 5000;
const LEAF_PRICE_MAX = 7000;

const BASE_SAVINGS_MIN = 19; // $/mo
const BASE_SAVINGS_MAX = 35; // $/mo

const INCENTIVES_LOW = 750;
const INCENTIVES_HIGH = 3000;

const COST_UNREALISTIC_BELOW = LEAF_PRICE_MIN - 500;
const COST_OVERPRICED_ABOVE = LEAF_PRICE_MAX + 3000;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function formatMoney(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function formatMoneyRange(a: number, b: number) {
  return `${formatMoney(a)}–${formatMoney(b)}`;
}

function dynamicSavingsRange(price: number) {
  const over = Math.max(0, price - LEAF_PRICE_MAX);
  const steps = Math.floor(over / 1000);
  const bump = steps * 2; // +$2/mo per $1k above max
  return { min: BASE_SAVINGS_MIN + bump, max: BASE_SAVINGS_MAX + bump };
}

function classifyCost(price: number) {
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

type Tone = "good" | "warn" | "bad" | "neutral";

function quickReadMessage(costClass: ReturnType<typeof classifyCost>) {
  const premiumWhy = [
    "More expensive systems can provide slightly higher savings (better efficiency/controls/commissioning) — usually incremental.",
    "ROI can drop when cost climbs faster than savings. A premium quote should come with clear, measurable value.",
  ];

  if (costClass === "unreal_low") {
    return {
      tone: "warn" as Tone,
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
      tone: "good" as Tone,
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
      tone: "good" as Tone,
      headline: "This looks like a fair, in-range quote.",
      why: [
        "Pricing aligns with what LEAF typically sees for this replacement category.",
        "In-range quotes usually indicate predictable scope and fewer surprises.",
      ],
      qVisible: [
        "What’s the install timeline and what prep do you need from me?",
        "What warranty coverage comes with the equipment and labor?",
      ],
      qMore: ["Do you handle permits and inspection sign-off?", "What maintenance keeps performance strong long-term?"],
    };
  }

  if (costClass === "likely_over") {
    return {
      tone: "warn" as Tone,
      headline: "Higher than LEAF range — confirm what’s driving the price.",
      why: [
        "Higher quotes can be justified by site conditions (access, venting, ductwork, electrical).",
        "It can also reflect premium add-ons you may not need.",
        ...premiumWhy,
      ],
      qVisible: [
        "What specifically is driving the price above typical range?",
        "Is there a simpler option that still meets the goals?",
      ],
      qMore: ["Can you provide an itemized quote so I can compare bids accurately?", "Which add-ons are optional vs required?"],
    };
  }

  return {
    tone: "warn" as Tone,
    headline: "Major caution — this looks overpriced for the category.",
    why: [
      "This is significantly above typical replacement pricing.",
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

function heroTitleForSnapshot(s: SnapshotDraft) {
  // mimic emoji + type/subtype like your HTML
  const t = s.existing.type?.toLowerCase() || "";
  const emoji =
    t.includes("hvac") ? "🔥" : t.includes("water") ? "💧" : t.includes("window") ? "🪟" : t.includes("door") ? "🚪" : "✨";
  return `${emoji} ${s.existing.type} • ${s.existing.subtype ?? "—"}`;
}

function heroSubtitleForSnapshot(s: SnapshotDraft) {
  const t = (s.existing.type || "").toLowerCase();
  if (t.includes("hvac")) return "Direct-replacement hvac upgrade";
  if (t.includes("water")) return "High-efficiency replacement water heater";
  if (t.includes("window")) return "Upgrade to high-performance windows";
  if (t.includes("door")) return "Improve comfort and reduce drafts";
  return "Recommended energy upgrade";
}

export default function JobReportPage() {
  const params = useParams();
  const jobId = (params?.jobId as string) || "";

  const job: Job | null = useMemo(() => {
    if (!jobId) return null;
    return findLocalJob(jobId) ?? MOCK_JOBS.find((j) => j.id === jobId) ?? null;
  }, [jobId]);

  const snapshots: SnapshotDraft[] = useMemo(() => {
    loadLocalSnapshots();
    return jobId ? snapshotsForJob(jobId) : [];
  }, [jobId]);

  // pager
  const [activeIndex, setActiveIndex] = useState(0);

  // slider state per snapshot (default: midpoint of LEAF range)
  const defaultPrice = Math.round((LEAF_PRICE_MIN + LEAF_PRICE_MAX) / 2);
  const [priceById, setPriceById] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const s of snapshots) init[s.id] = s.suggested.estCost ?? defaultPrice;
    return init;
  });

  function setPrice(snapshotId: string, next: number) {
    setPriceById((prev) => ({ ...prev, [snapshotId]: next }));
  }

  function scrollToIndex(i: number) {
    const el = document.getElementById("leaf-pages");
    if (!el) return;
    const w = el.clientWidth || 1;
    el.scrollTo({ left: i * w, behavior: "smooth" });
    setActiveIndex(i);
  }

  if (!job) {
    return (
      <div className="leafRoot">
        <div className="leafShell">
          <div className="leafCard glass soft-shadow" style={{ padding: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Job not found</div>
            <div style={{ color: "rgba(255,255,255,.65)", marginTop: 8 }}>
              No job exists with id: <code style={{ color: "#fff" }}>{jobId}</code>
            </div>
            <div style={{ marginTop: 12 }}>
              <Link href="/admin/jobs" style={{ color: "var(--leaf)" }}>
                ← Back to Jobs
              </Link>
            </div>
          </div>
        </div>

        <StyleBlock />
      </div>
    );
  }

  const total = Math.max(1, snapshots.length);
  const label = `Snapshot ${Math.min(activeIndex + 1, total)} of ${total}`;

  return (
    <div className="leafRoot">
      {/* HEADER */}
      <header className="leafHeader">
        <div className="leafHeaderInner">
          <div>
            <div className="leafHeaderTitle">Mock LEAF Report Preview</div>
            <div className="leafHeaderSub">{label}</div>
          </div>

          <div className="leafHeaderRight">
            <div className="leafDots" role="tablist" aria-label="Snapshot pager">
              {Array.from({ length: total }).map((_, i) => (
                <button
                  key={i}
                  className={`dot ${i === activeIndex ? "active" : ""}`}
                  aria-label={`Go to snapshot ${i + 1}`}
                  onClick={() => scrollToIndex(i)}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* SWIPE CONTAINER */}
      <div
        id="leaf-pages"
        className="snap-scroll"
        onScroll={(e) => {
          const el = e.currentTarget;
          const w = el.clientWidth || 1;
          const i = Math.round(el.scrollLeft / w);
          const bounded = Math.max(0, Math.min(total - 1, i));
          if (bounded !== activeIndex) setActiveIndex(bounded);
        }}
      >
        {snapshots.length === 0 ? (
          <div className="snap-page">
            <main className="leafShell">
              <section className="glass soft-shadow leafCard" style={{ padding: 16 }}>
                <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>No snapshots yet</div>
                <div style={{ color: "rgba(255,255,255,.65)" }}>
                  Create at least one LEAF System Snapshot from the Job page to see a report preview.
                </div>
                <div style={{ height: 12 }} />
                <Link href={`/admin/jobs/${job.id}`} className="leafLink">
                  ← Back to Job
                </Link>
              </section>
            </main>
          </div>
        ) : (
          snapshots.map((snap, idx) => {
            const price = priceById[snap.id] ?? defaultPrice;
            const costClass = classifyCost(price);
            const msg = quickReadMessage(costClass);
            const dyn = dynamicSavingsRange(price);
            const savText = `$${dyn.min}–$${dyn.max}/mo`;

            const net = computeNetCostRange(price);
            const netMin = Math.min(net.netLow, net.netHigh);
            const netMax = Math.max(net.netLow, net.netHigh);

            const suggestedName = snap.suggested.name || "Suggested Upgrade";
            const existingTitle = `${snap.existing.type ?? "Existing"} — ${snap.existing.subtype ?? "—"}`;

            const costBadge =
              costClass === "unreal_low"
                ? { tone: "bad" as Tone, text: "Unrealistic" }
                : costClass === "low"
                ? { tone: "warn" as Tone, text: "Low (verify scope)" }
                : costClass === "over"
                ? { tone: "bad" as Tone, text: "Overpriced" }
                : costClass === "likely_over"
                ? { tone: "warn" as Tone, text: "Likely overpriced" }
                : { tone: "good" as Tone, text: "Within range" };

            const overallBadge =
              costClass === "over"
                ? { tone: "bad" as Tone, text: "Major caution 🚩" }
                : msg.tone === "good"
                ? { tone: "good" as Tone, text: "Looks good ✅" }
                : { tone: "warn" as Tone, text: "Proceed smart ⚠️" };

            const decisionBadge =
              costClass === "over"
                ? { tone: "bad" as Tone, text: "Unclear 🚩" }
                : costClass === "in"
                ? { tone: "good" as Tone, text: "Likely yes ✅" }
                : { tone: "warn" as Tone, text: "Likely yes (with clarity) ⚠️" };

            const msSummaryHeadline =
              costClass === "over"
                ? "This needs a closer look."
                : costClass === "in"
                ? "This looks financially reasonable."
                : "This can still make sense — confirm a few details.";

            const msSummaryText =
              costClass === "over"
                ? "The quote is well above typical range. Request an itemized scope and compare at least one more bid."
                : costClass === "in"
                ? "If the contractor quote lands within the LEAF range, this is typically a strong replacement decision."
                : "Use the questions above to confirm scope and what’s driving price. Premium cost can bump savings slightly, but ROI often drops if price rises too fast.";

            return (
              <div className="snap-page" key={snap.id}>
                <main className="leafShell">
                  {/* Top actions */}
                  <div className="leafTopActions">
                    <Link href={`/admin/jobs/${job.id}`} className="leafLink">
                      Back
                    </Link>
                    <button
                      type="button"
                      className="leafBtn leafBtnGhost"
                      onClick={() => alert("Send Report (placeholder). Next step: email + PDF pipeline.")}
                    >
                      Send Report
                    </button>
                  </div>

                  {/* HERO */}
                  <section className="glass leafCard soft-shadow pop">
                    <div className="heroTitle">{heroTitleForSnapshot(snap)}</div>
                    <div className="heroSub">{heroSubtitleForSnapshot(snap)}</div>

                    <div className="heroNote">
                      LEAF provides ranges so you can evaluate contractor quotes with confidence.
                    </div>

                    <div className="pillRow">
                      <span className="pill pillLeaf">Save ~{savText}</span>
                      <span className="pill pillGreen">~30–45% less CO₂</span>
                    </div>

                    <div className="finePrint">
                      Note: higher-priced systems can increase savings slightly — but ROI can drop if the added cost doesn’t pay back over time.
                    </div>
                  </section>

                  {/* CURRENT */}
                  <section className="glass leafCard soft-shadow pop borderRed">
                    <div className="rowBetween">
                      <div className="secTitle">📷 Current system</div>
                      <span className="pill pillRed">Near end of life</span>
                    </div>

                    <div className="mediaRow">
                      <div className="imgBox">
                        <div className="imgPlaceholder">photo</div>
                      </div>
                      <div className="mediaText">
                        <div className="mediaBold">{existingTitle}</div>
                        <div>Operational: <b>{snap.existing.operational ?? "—"}</b></div>
                        <div>
                          Age: <b>{snap.existing.ageYears ?? "—"} yrs</b> • Wear: <b>{snap.existing.wear ?? "—"}/5</b>
                        </div>
                        <div>Maintenance: <b>{snap.existing.maintenance ?? "—"}</b></div>
                      </div>
                    </div>
                  </section>

                  {/* RECOMMENDED */}
                  <section className="glass leafCard soft-shadow pop borderLeaf">
                    <div className="rowBetween">
                      <div className="secTitle">✨ Recommended upgrade</div>
                      <span className="pill pillGreen">High efficiency</span>
                    </div>

                    <div className="mediaRow">
                      <div className="imgBox">
                        <div className="imgPlaceholder">photo</div>
                      </div>
                      <div className="mediaText">
                        <div className="mediaBold">{suggestedName}</div>
                        <div>
                          Estimated install cost: <b>{formatMoney(price)}</b>
                        </div>
                        <div>
                          Estimated yearly savings: <b>{snap.suggested.estAnnualSavings ? formatMoney(snap.suggested.estAnnualSavings) : "—"}</b>
                        </div>
                        {snap.suggested.notes ? (
                          <div className="tinyMuted" style={{ marginTop: 6 }}>
                            Notes: <b style={{ color: "#fff" }}>{snap.suggested.notes}</b>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </section>

                  {/* COST & SAVINGS RANGE */}
                  <details className="glass leafCard soft-shadow pop">
                    <summary className="summaryRow">
                      <div>
                        <div className="secTitle">💰 Cost & savings range</div>
                      </div>
                      <span className="tinyMuted">Tap for details</span>
                    </summary>

                    <div className="grid2">
                      <div className="tile">
                        <div className="tinyMuted">Install cost</div>
                        <div className="bigBold">{formatMoneyRange(LEAF_PRICE_MIN, LEAF_PRICE_MAX)}</div>
                      </div>
                      <div className="tile">
                        <div className="tinyMuted">Monthly savings</div>
                        <div className="bigBold">${dyn.min}–${dyn.max}</div>
                      </div>
                    </div>

                    <div style={{ height: 12 }} />

                    <div className="tinyMuted" style={{ fontWeight: 700 }}>
                      Cost bar (non-interactive)
                    </div>

                    <div className="tile" style={{ marginTop: 10 }}>
                      <div className="rowBetween">
                        <div className="tinyMuted">Your selected price</div>
                        <div className="medBold">{formatMoney(price)}</div>
                      </div>

                      <div className="slider-wrap" style={{ marginTop: 12, paddingTop: 14, paddingBottom: 10 }}>
                        <div className="range-band" aria-hidden="true">
                          <div
                            className="fill"
                            style={{
                              width: `${clamp(((price - 3000) / (15000 - 3000)) * 100, 0, 100)}%`,
                            }}
                          />
                          <div
                            className="ok"
                            style={{
                              left: `${clamp(((LEAF_PRICE_MIN - 3000) / (15000 - 3000)) * 100, 0, 100)}%`,
                              width: `${clamp(((LEAF_PRICE_MAX - LEAF_PRICE_MIN) / (15000 - 3000)) * 100, 0, 100)}%`,
                            }}
                          />
                          <div
                            className="marker"
                            style={{
                              left: `${clamp(((price - 3000) / (15000 - 3000)) * 100, 0, 100)}%`,
                            }}
                          />
                        </div>

                        <div className="band-label">
                          <span>{formatMoney(LEAF_PRICE_MIN)}</span>
                          <span>{formatMoney(LEAF_PRICE_MAX)}</span>
                        </div>
                      </div>

                      <div className="tinyMuted" style={{ marginTop: 8 }}>
                        LEAF range is highlighted. The marker shows your selected quote.
                      </div>
                    </div>

                    <div style={{ height: 12 }} />
                    <div className="tinyMuted" style={{ fontWeight: 800 }}>
                      Why it’s a range
                    </div>
                    <ul className="bullets">
                      <li>Based on similar installs in comparable homes</li>
                      <li>Accounts for typical labor, permits, and equipment size</li>
                      <li>Premium options can slightly increase savings, but ROI may drop if cost climbs faster than savings</li>
                      <li>Final scope can change due to ductwork/access/electrical needs</li>
                    </ul>
                  </details>

                  {/* INTERACTIVE SLIDER */}
                  <section className="glass leafCard soft-shadow pop">
                    <div className="rowBetween" style={{ alignItems: "flex-start" }}>
                      <div>
                        <div className="secTitle">🎚️ Test your quote</div>
                        <div className="tinyMuted" style={{ marginTop: 6 }}>
                          Slide the price. Savings bumps slightly with higher system cost — but ROI can drop if price rises faster than savings.
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <button
                          type="button"
                          className="leafBtn leafBtnGhost"
                          onClick={() => setPrice(snap.id, defaultPrice)}
                        >
                          Reset
                        </button>
                        <span className={`badgeSquare ${toneClass(overallBadge.tone)}`}>{overallBadge.text}</span>
                      </div>
                    </div>

                    <div className="tile" style={{ marginTop: 12 }}>
                      <div className="rowBetween">
                        <div className="tinyMuted">Contractor price</div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span className={`badge ${toneClass(costBadge.tone)}`}>{costBadge.text}</span>
                          <div className="medBold">{formatMoney(price)}</div>
                        </div>
                      </div>

                      <div className="slider-wrap" style={{ marginTop: 12 }}>
                        <div className="range-band" aria-hidden="true">
                          <div
                            className="fill"
                            style={{ width: `${clamp(((price - 3000) / (15000 - 3000)) * 100, 0, 100)}%` }}
                          />
                          <div
                            className="ok"
                            style={{
                              left: `${clamp(((LEAF_PRICE_MIN - 3000) / (15000 - 3000)) * 100, 0, 100)}%`,
                              width: `${clamp(((LEAF_PRICE_MAX - LEAF_PRICE_MIN) / (15000 - 3000)) * 100, 0, 100)}%`,
                            }}
                          />
                        </div>

                        <input
                          type="range"
                          min={3000}
                          max={15000}
                          step={100}
                          value={price}
                          onChange={(e) => setPrice(snap.id, Number(e.target.value))}
                          aria-label="Contractor quote slider"
                        />

                        <div className="band-label">
                          <span>{formatMoney(LEAF_PRICE_MIN)}</span>
                          <span>{formatMoney(LEAF_PRICE_MAX)}</span>
                        </div>
                      </div>

                      <div className="tinyMuted" style={{ marginTop: 8 }}>
                        LEAF price range: <b style={{ color: "#fff" }}>{formatMoneyRange(LEAF_PRICE_MIN, LEAF_PRICE_MAX)}</b>
                      </div>
                      <div className="tinyMuted" style={{ marginTop: 6 }}>
                        Estimated savings at this price: <b style={{ color: "#fff" }}>{savText}</b>
                      </div>
                    </div>

                    {/* QUICK READ */}
                    <div className="tileDark" style={{ marginTop: 12 }}>
                      <div className="tinyMuted">Quick read</div>
                      <div className="secHeadline" style={{ marginTop: 6 }}>
                        {msg.headline}
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <div className="tinyMuted" style={{ fontWeight: 800, color: "rgba(255,255,255,.82)" }}>
                          Good questions to ask the contractor
                        </div>
                        <ul className="bullets" style={{ marginTop: 6 }}>
                          {msg.qVisible.map((q) => (
                            <li key={q}>{q}</li>
                          ))}
                        </ul>
                      </div>

                      <details style={{ marginTop: 10 }}>
                        <summary className="leafLink" style={{ cursor: "pointer" }}>
                          Why this message + more questions
                        </summary>

                        <div style={{ marginTop: 10 }}>
                          <div className="tinyMuted" style={{ fontWeight: 800, color: "rgba(255,255,255,.82)" }}>
                            Why LEAF is saying this
                          </div>
                          <ul className="bullets" style={{ marginTop: 6 }}>
                            {msg.why.map((w) => (
                              <li key={w}>{w}</li>
                            ))}
                          </ul>
                        </div>

                        <div style={{ marginTop: 12 }}>
                          <div className="tinyMuted" style={{ fontWeight: 800, color: "rgba(255,255,255,.82)" }}>
                            More questions (optional)
                          </div>
                          <ul className="bullets" style={{ marginTop: 6 }}>
                            {msg.qMore.map((q) => (
                              <li key={q}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    </div>
                  </section>

                  {/* INCENTIVES */}
                  <details className="glass leafCard soft-shadow pop">
                    <summary className="summaryRow">
                      <div className="secTitle">🏷️ Incentives & rebates</div>
                      <span className="tinyMuted">Tap for details</span>
                    </summary>

                    <div className="medBold" style={{ marginTop: 10 }}>
                      {formatMoneyRange(INCENTIVES_LOW, INCENTIVES_HIGH)} typical
                    </div>
                    <div className="tinyMuted" style={{ marginTop: 6 }}>
                      Federal • State • Utility
                    </div>

                    <div style={{ height: 12 }} />

                    <div className="tile">
                      <div className="mediaBold">🇺🇸 Federal</div>
                      <div className="tinyMuted" style={{ marginTop: 6 }}>
                        Tax credit example: <b style={{ color: "#fff" }}>20–30%</b> up to <b style={{ color: "#fff" }}>$600–$2,000</b>
                      </div>
                      <div className="tinyMuted" style={{ marginTop: 6 }}>
                        Claimed by homeowner when filing taxes.
                      </div>
                    </div>

                    <div className="tile" style={{ marginTop: 10 }}>
                      <div className="mediaBold">🏛️ State</div>
                      <div className="tinyMuted" style={{ marginTop: 6 }}>
                        Program rebates often <b style={{ color: "#fff" }}>$500–$1,500</b> (varies by state & funding)
                      </div>
                      <div className="tinyMuted" style={{ marginTop: 6 }}>
                        Eligibility can depend on equipment + participating contractors.
                      </div>
                    </div>

                    <div className="tile" style={{ marginTop: 10 }}>
                      <div className="mediaBold">⚡ Local / Utility</div>
                      <div className="tinyMuted" style={{ marginTop: 6 }}>
                        Flat rebates typically <b style={{ color: "#fff" }}>$250–$750</b>
                      </div>
                      <div className="tinyMuted" style={{ marginTop: 6 }}>
                        Often applied at install or submitted after completion.
                      </div>
                    </div>

                    <div className="tinyMuted" style={{ marginTop: 10 }}>
                      LEAF identifies likely incentives based on system type and location. Contractors confirm eligibility, pricing, and paperwork requirements.
                    </div>
                  </details>

                  {/* DOES THIS MAKE SENSE */}
                  <section className="glass leafCard soft-shadow pop">
                    <div className="rowBetween">
                      <div className="secTitle">🧠 Does this decision make sense?</div>
                      <span className={`badge ${toneClass(decisionBadge.tone)}`}>{decisionBadge.text}</span>
                    </div>

                    <div className="grid2" style={{ marginTop: 12 }}>
                      <div className="tile">
                        <div className="tinyMuted">Install cost (slider)</div>
                        <div className="medBold" style={{ marginTop: 6 }}>
                          {formatMoney(price)}
                        </div>
                      </div>

                      <div className="tile">
                        <div className="tinyMuted">Estimated savings (at this price)</div>
                        <div className="medBold" style={{ marginTop: 6 }}>
                          {savText}
                        </div>
                        <div className="tinyMuted" style={{ marginTop: 6 }}>
                          Higher cost can bump savings slightly, but ROI may drop.
                        </div>
                      </div>

                      <div className="tile" style={{ gridColumn: "1 / -1" }}>
                        <div className="tinyMuted">Estimated net cost (after incentives)</div>
                        <div className="medBold" style={{ marginTop: 6 }}>
                          {formatMoneyRange(netMin, netMax)}
                        </div>
                        <div className="tinyMuted" style={{ marginTop: 6 }}>
                          Based on incentive estimates shown above (contractor confirms final eligibility).
                        </div>
                      </div>

                      <div className="tile">
                        <div className="tinyMuted">Quote value check</div>
                        <div className="medBold" style={{ marginTop: 6 }}>
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

                      <div className="tile">
                        <div className="tinyMuted">What this means</div>
                        <div className="tinyMuted" style={{ marginTop: 6, color: "rgba(255,255,255,.82)" }}>
                          {costClass === "in"
                            ? "Quotes in-range usually indicate predictable scope + fair pricing."
                            : costClass === "low"
                            ? "Could be a great deal — just confirm it’s a full scope replacement quote."
                            : costClass === "unreal_low"
                            ? "High chance something is missing. Get scope in writing before scheduling."
                            : costClass === "likely_over"
                            ? "Premium cost can bump savings slightly, but ROI may drop. Ask what justifies the cost."
                            : "This is likely overpriced. Compare another itemized bid before committing."}
                        </div>
                      </div>
                    </div>

                    <div className="tileDark" style={{ marginTop: 12 }}>
                      <div className="tinyMuted">Decision summary</div>
                      <div className="secHeadline" style={{ marginTop: 6 }}>
                        {msSummaryHeadline}
                      </div>
                      <div className="tinyMuted" style={{ marginTop: 6, color: "rgba(255,255,255,.82)" }}>
                        {msSummaryText}
                      </div>
                    </div>
                  </section>

                  {/* spacing so CTA doesn't cover */}
                  <div style={{ height: 90 }} />

                  {/* small index marker (helps sanity while testing) */}
                  <div className="tinyMuted" style={{ textAlign: "center", paddingBottom: 18 }}>
                    {idx + 1} / {total} • {job.reportId}
                  </div>
                </main>
              </div>
            );
          })
        )}
      </div>

      {/* CTA fixed */}
      <div className="leafCTA">
        <div className="leafCTAInner">
          <button
            className="leafCTABtn"
            type="button"
            onClick={() => alert("Next step: contractor bid request workflow (placeholder).")}
          >
            🔎 Get an exact bid from a contractor
          </button>
          <div className="leafCTASub">Compare the quote against your LEAF range</div>
        </div>
      </div>

      <StyleBlock />
    </div>
  );
}

function toneClass(tone: Tone) {
  if (tone === "good") return "toneGood";
  if (tone === "warn") return "toneWarn";
  if (tone === "bad") return "toneBad";
  return "toneNeutral";
}

/** Global CSS for this page (keeps it self-contained + copy/paste friendly) */
function StyleBlock() {
  return (
    <style jsx global>{`
      :root {
        --leaf: #43a419;
      }

      .leafRoot {
        min-height: 100vh;
        background: #000;
        color: #fff;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      .leafShell {
        max-width: 420px;
        margin: 0 auto;
        padding: 18px 16px 0;
      }

      /* Header */
      .leafHeader {
        position: sticky;
        top: 0;
        z-index: 30;
        background: rgba(0, 0, 0, 0.7);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(12px);
      }
      .leafHeaderInner {
        max-width: 420px;
        margin: 0 auto;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .leafHeaderTitle {
        font-size: 13px;
        font-weight: 800;
      }
      .leafHeaderSub {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.55);
        margin-top: 2px;
      }
      .leafDots {
        display: flex;
        gap: 8px;
        align-items: center;
      }
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

      /* Swipe pages */
      .snap-scroll {
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        display: flex;
        overflow-x: auto;
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

      /* Cards + glass */
      .glass {
        background: rgba(24, 24, 27, 0.78);
        backdrop-filter: blur(12px);
      }
      .soft-shadow {
        box-shadow: 0 18px 45px rgba(0, 0, 0, 0.42);
      }
      .leafCard {
        border: 1px solid rgba(255, 255, 255, 0.10);
        border-radius: 24px;
        padding: 14px;
        margin-bottom: 14px;
      }
      .pop {
        transition: transform 0.18s ease;
      }
      .pop:hover {
        transform: translateY(-1px) scale(1.01);
      }
      .borderLeaf {
        border-color: rgba(67, 164, 25, 0.35);
      }
      .borderRed {
        border-color: rgba(239, 68, 68, 0.30);
      }

      /* Top actions */
      .leafTopActions {
        max-width: 420px;
        margin: 0 auto;
        padding: 10px 16px 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .leafLink {
        color: rgba(110, 231, 183, 0.95);
        text-decoration: underline;
        font-size: 12px;
      }
      .leafBtn {
        border-radius: 999px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 700;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(0, 0, 0, 0.25);
        color: #fff;
      }
      .leafBtnGhost {
        opacity: 0.95;
      }

      /* Typography bits */
      .heroTitle {
        font-size: 18px;
        font-weight: 900;
        letter-spacing: -0.02em;
        margin-bottom: 4px;
      }
      .heroSub {
        font-size: 13px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.82);
      }
      .heroNote {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.72);
        margin-top: 8px;
      }
      .finePrint {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.45);
        margin-top: 10px;
      }
      .secTitle {
        font-size: 13px;
        font-weight: 800;
      }
      .secHeadline {
        font-size: 13px;
        font-weight: 800;
      }
      .tinyMuted {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.55);
      }
      .medBold {
        font-size: 13px;
        font-weight: 900;
      }
      .bigBold {
        font-size: 18px;
        font-weight: 900;
      }
      .mediaBold {
        font-size: 12px;
        font-weight: 800;
        color: rgba(255, 255, 255, 0.92);
      }

      .rowBetween {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .summaryRow {
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        list-style: none;
      }
      summary::-webkit-details-marker {
        display: none;
      }

      /* Pills + badges */
      .pillRow {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 800;
        border: 1px solid rgba(255, 255, 255, 0.12);
      }
      .pillLeaf {
        background: var(--leaf);
        color: #000;
        border-color: rgba(0, 0, 0, 0.2);
      }
      .pillGreen {
        background: rgba(16, 185, 129, 0.15);
        color: rgba(167, 243, 208, 0.95);
        border-color: rgba(16, 185, 129, 0.25);
      }
      .pillRed {
        background: rgba(239, 68, 68, 0.15);
        color: rgba(254, 202, 202, 0.95);
        border-color: rgba(239, 68, 68, 0.25);
        font-size: 11px;
        font-weight: 800;
        padding: 6px 10px;
      }

      .badge {
        font-size: 11px;
        font-weight: 800;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.16);
      }
      .badgeSquare {
        font-size: 11px;
        font-weight: 800;
        padding: 6px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.16);
      }
      .toneGood {
        background: rgba(16, 185, 129, 0.15);
        color: rgba(167, 243, 208, 0.95);
        border-color: rgba(16, 185, 129, 0.25);
      }
      .toneWarn {
        background: rgba(234, 179, 8, 0.15);
        color: rgba(254, 240, 138, 0.95);
        border-color: rgba(234, 179, 8, 0.25);
      }
      .toneBad {
        background: rgba(239, 68, 68, 0.15);
        color: rgba(254, 202, 202, 0.95);
        border-color: rgba(239, 68, 68, 0.25);
      }
      .toneNeutral {
        background: rgba(63, 63, 70, 0.6);
        color: rgba(255, 255, 255, 0.9);
        border-color: rgba(255, 255, 255, 0.14);
      }

      /* Media row */
      .mediaRow {
        display: flex;
        gap: 12px;
        margin-top: 12px;
      }
      .imgBox {
        width: 92px;
        height: 92px;
        border-radius: 18px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(0, 0, 0, 0.35);
        flex: 0 0 auto;
        display: grid;
        place-items: center;
      }
      .imgPlaceholder {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.35);
      }
      .mediaText {
        flex: 1 1 auto;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.78);
        display: grid;
        gap: 6px;
      }

      /* Tiles */
      .grid2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 12px;
      }
      .tile {
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.10);
        background: rgba(8, 8, 10, 0.65);
        padding: 12px;
      }
      .tileDark {
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.10);
        background: rgba(0, 0, 0, 0.30);
        padding: 12px;
      }

      /* Bullets */
      .bullets {
        margin-top: 10px;
        padding-left: 18px;
        color: rgba(255, 255, 255, 0.78);
        font-size: 12px;
        display: grid;
        gap: 6px;
      }

      /* Slider styling (ported from your HTML) */
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
        border-radius: 999px;
        background: linear-gradient(90deg, rgba(67, 164, 25, 0.18), rgba(67, 164, 25, 0.55), rgba(67, 164, 25, 0.18));
        border: 1px solid rgba(67, 164, 25, 0.55);
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25) inset, 0 0 16px rgba(67, 164, 25, 0.22);
        z-index: 2;
        pointer-events: none;
      }
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

      /* CTA */
      .leafCTA {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.80);
        border-top: 1px solid rgba(255, 255, 255, 0.10);
        backdrop-filter: blur(12px);
        z-index: 40;
      }
      .leafCTAInner {
        max-width: 420px;
        margin: 0 auto;
        padding: 12px 16px;
      }
      .leafCTABtn {
        width: 100%;
        background: var(--leaf);
        color: #000;
        font-weight: 900;
        padding: 12px 14px;
        border-radius: 999px;
        border: none;
        cursor: pointer;
      }
      .leafCTASub {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.45);
        text-align: center;
        margin-top: 6px;
      }

      @media (max-width: 380px) {
        .leafShell {
          padding-left: 14px;
          padding-right: 14px;
        }
      }
    `}</style>
  );
}
