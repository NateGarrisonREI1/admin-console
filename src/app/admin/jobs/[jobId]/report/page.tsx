"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { MOCK_JOBS, type Job } from "../../../_data/mockJobs";
import { findLocalJob } from "../../../_data/localJobs";
import { loadLocalSnapshots, snapshotsForJob, type SnapshotDraft } from "../../../_data/localSnapshots";

// OPTIONAL (future-ready incentives rules)
// If you don’t want this yet, you can delete this import and the Incentives section below.
// Path from: src/app/admin/jobs/[jobId]/report/page.tsx -> src/lib/incentives/incentiveRules.ts
import {
  getIncentivesForSystemType,
  type IncentiveResource,
} from "../../../../../lib/incentives/incentiveRules";

function formatMoney(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  if (!Number.isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function MockLeafReportPage() {
  const params = useParams();
  const jobId = (params?.jobId as string) || "";

  const job: Job | null = useMemo(() => {
    if (!jobId) return null;
    return findLocalJob(jobId) ?? MOCK_JOBS.find((j) => j.id === jobId) ?? null;
  }, [jobId]);

  const [pageIndex, setPageIndex] = useState(0);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});

  const snapshots: SnapshotDraft[] = useMemo(() => {
    loadLocalSnapshots();
    return jobId ? snapshotsForJob(jobId) : [];
  }, [jobId]);

  const total = snapshots.length;
  const activeIndex = clamp(pageIndex, 0, Math.max(0, total - 1));
  const active = total > 0 ? snapshots[activeIndex] : null;

  function setActive(i: number) {
    setPageIndex(clamp(i, 0, Math.max(0, total - 1)));
  }

  function setPriceForSnapshot(snapshotId: string, value: number) {
    setPriceOverrides((prev) => ({ ...prev, [snapshotId]: value }));
  }

  // Simple “LEAF-style” default ranges for now (mock)
  // Later this will come from your snapshot math / catalog rules.
  function getLeafRangeFor(snap: SnapshotDraft) {
    // You can adjust these per system type later.
    // For now: HVAC is pricier than Doors, etc.
    const t = (snap.existing.type || "").toLowerCase();
    if (t.includes("hvac")) return { min: 5000, max: 7000 };
    if (t.includes("water")) return { min: 1800, max: 3800 };
    if (t.includes("window")) return { min: 9000, max: 18000 };
    if (t.includes("door")) return { min: 800, max: 2400 };
    if (t.includes("lighting")) return { min: 400, max: 2400 };
    return { min: 1500, max: 6000 };
  }

  function getSavingsRangeFor(price: number, leafMin: number, leafMax: number) {
    // mock: base savings range, bumps slightly as price goes up above max
    const baseMin = 19;
    const baseMax = 35;

    const over = Math.max(0, price - leafMax);
    const steps = Math.floor(over / 1000);
    const bump = steps * 2;

    return { min: baseMin + bump, max: baseMax + bump };
  }

  function getQuoteBadge(price: number, leafMin: number, leafMax: number) {
    const unrealLow = leafMin - 500;
    const overPriced = leafMax + 3000;

    if (price < unrealLow) return { tone: "bad" as const, text: "Unrealistic" };
    if (price < leafMin) return { tone: "warn" as const, text: "Low (verify scope)" };
    if (price > overPriced) return { tone: "bad" as const, text: "Overpriced" };
    if (price > leafMax) return { tone: "warn" as const, text: "Likely overpriced" };
    return { tone: "good" as const, text: "Within range" };
  }

  function badgeStyle(tone: "good" | "warn" | "bad" | "neutral") {
    const map: Record<string, React.CSSProperties> = {
      good: { background: "rgba(16,185,129,.14)", border: "1px solid rgba(16,185,129,.35)", color: "#a7f3d0" },
      warn: { background: "rgba(234,179,8,.14)", border: "1px solid rgba(234,179,8,.35)", color: "#fde68a" },
      bad: { background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.35)", color: "#fecaca" },
      neutral: { background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.86)" },
    };
    return map[tone] ?? map.neutral;
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

  if (snapshots.length === 0) {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <div className="rei-card">
          <div style={{ fontWeight: 900, fontSize: 16 }}>Mock LEAF Report Preview</div>
          <div style={{ color: "var(--muted)", marginTop: 8 }}>
            No snapshots found for this job yet. Create at least 1 snapshot to generate a report.
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="rei-btn" href={`/admin/jobs/${job.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              ← Back to Job
            </Link>
            <Link className="rei-btn rei-btnPrimary" href="/admin/snapshots" style={{ textDecoration: "none", textAlign: "center" }}>
              Go to Snapshots
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Active snapshot derived values
  const leaf = active ? getLeafRangeFor(active) : { min: 0, max: 0 };
  const sliderMin = Math.max(0, leaf.min - 2000);
  const sliderMax = leaf.max + 8000;

  const defaultPrice = Math.round((leaf.min + leaf.max) / 2);
  const price = active ? (priceOverrides[active.id] ?? active.suggested.estCost ?? defaultPrice) : defaultPrice;

  const savings = getSavingsRangeFor(price, leaf.min, leaf.max);
  const quoteBadge = getQuoteBadge(price, leaf.min, leaf.max);

  // Incentives (future-ready, editable rules)
const incentiveResources: IncentiveResource[] = active
  ? getIncentivesForSystemType(active.existing.type, {
      tags: [active.existing.subtype].filter(Boolean),
    })
  : [];



  const existingTitle = active ? `${active.existing.type} — ${active.existing.subtype}` : "Existing";
  const suggestedTitle = active ? (active.suggested.name || "Suggested") : "Suggested";

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* TOP BAR */}
      <div className="rei-card" style={{ background: "black", color: "white", border: "1px solid rgba(255,255,255,.12)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Mock LEAF Report Preview</div>
            <div style={{ opacity: 0.75, marginTop: 4, fontSize: 12 }}>
              {job.customerName} • {job.reportId} • {job.address ?? "—"}
            </div>
            <div style={{ opacity: 0.65, marginTop: 6, fontSize: 12 }}>
              Snapshot {activeIndex + 1} of {snapshots.length} • Updated {active ? formatDate(active.updatedAt) : "—"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Link
              href={`/admin/jobs/${job.id}`}
              className="rei-btn"
              style={{ textDecoration: "none", color: "inherit", background: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.12)" }}
            >
              ← Back
            </Link>

            <button
              type="button"
              className="rei-btn rei-btnPrimary"
              onClick={() => alert("Send Report (placeholder). Next: email + PDF + storage.")}
            >
              Send Report
            </button>
          </div>
        </div>

        {/* Pager */}
        <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            className="rei-btn"
            type="button"
            onClick={() => setActive(activeIndex - 1)}
            disabled={activeIndex === 0}
            style={{ opacity: activeIndex === 0 ? 0.5 : 1 }}
          >
            ← Prev
          </button>

          <button
            className="rei-btn"
            type="button"
            onClick={() => setActive(activeIndex + 1)}
            disabled={activeIndex === snapshots.length - 1}
            style={{ opacity: activeIndex === snapshots.length - 1 ? 0.5 : 1 }}
          >
            Next →
          </button>

          <div style={{ marginLeft: 10, display: "flex", gap: 8 }}>
            {snapshots.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Go to snapshot ${i + 1}`}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.18)",
                  background: i === activeIndex ? "rgba(67,164,25,.95)" : "rgba(255,255,255,.16)",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* HERO */}
      <div className="rei-card" style={{ background: "black", color: "white", border: "1px solid rgba(255,255,255,.12)" }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>
          {active?.existing.type} • {active?.existing.subtype}
        </div>
        <div style={{ opacity: 0.8, fontWeight: 700 }}>{active?.suggested.name || "Suggested upgrade"}</div>

        <div style={{ height: 10 }} />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "#43a419",
              color: "black",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            Save ~${savings.min}–${savings.max}/mo
          </span>

          <span style={{ padding: "6px 10px", borderRadius: 999, ...badgeStyle("neutral"), fontSize: 12 }}>
            ~30–45% less CO₂ (mock)
          </span>

          <span style={{ padding: "6px 10px", borderRadius: 999, ...badgeStyle(quoteBadge.tone), fontSize: 12 }}>
            {quoteBadge.text}
          </span>
        </div>

        <div style={{ opacity: 0.65, fontSize: 12, marginTop: 10 }}>
          Note: higher-priced systems can increase savings slightly — but ROI can drop if the added cost doesn’t pay back over time.
        </div>
      </div>

      {/* EXISTING vs SUGGESTED */}
      <div className="rei-card" style={{ background: "black", color: "white", border: "1px solid rgba(255,255,255,.12)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Existing */}
          <div style={{ border: "1px solid rgba(239,68,68,.25)", borderRadius: 16, padding: 14, background: "rgba(255,255,255,.04)" }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>📷 Current system</div>

            <div style={{ fontWeight: 900 }}>{existingTitle}</div>
            <div style={{ color: "rgba(255,255,255,.72)", fontSize: 12, marginTop: 4 }}>
              Age: {active?.existing.ageYears ?? "—"} yrs • Wear: {active?.existing.wear ?? "—"}/5
              <br />
              Maintenance: {active?.existing.maintenance ?? "—"} • Operational: {active?.existing.operational ?? "—"}
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              Annual cost: <b>$350–$450</b> (mock)
              <br />
              Carbon: <b>3,400–4,000 lbs/yr</b> (mock)
            </div>
          </div>

          {/* Suggested */}
          <div style={{ border: "1px solid rgba(67,164,25,.35)", borderRadius: 16, padding: 14, background: "rgba(255,255,255,.04)" }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>✨ Recommended upgrade</div>

            <div style={{ fontWeight: 900 }}>{suggestedTitle}</div>
            <div style={{ color: "rgba(255,255,255,.72)", fontSize: 12, marginTop: 4 }}>
              Estimated install cost: <b>{formatMoney(price)}</b>
              <br />
              Estimated yearly savings: <b>{formatMoney(active?.suggested.estAnnualSavings ?? null)}</b>
            </div>

            {active?.suggested.notes ? (
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
                Notes: <span style={{ opacity: 0.9 }}>{active.suggested.notes}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* COST SLIDER / QUOTE TEST */}
      <div className="rei-card" style={{ background: "black", color: "white", border: "1px solid rgba(255,255,255,.12)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900 }}>🎚️ Test your quote</div>
            <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
              Adjust the contractor price. Savings bumps slightly with higher cost — but ROI can drop if price rises faster than savings.
            </div>
          </div>

          <button
            className="rei-btn"
            type="button"
            onClick={() => active && setPriceForSnapshot(active.id, defaultPrice)}
            style={{ background: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.12)", color: "white" }}
          >
            Reset
          </button>
        </div>

        <div style={{ height: 12 }} />

        <div style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 16, padding: 12, background: "rgba(255,255,255,.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Contractor price</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ padding: "6px 10px", borderRadius: 999, ...badgeStyle(quoteBadge.tone), fontSize: 12 }}>
                {quoteBadge.text}
              </span>
              <div style={{ fontWeight: 900 }}>{formatMoney(price)}</div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={100}
              value={price}
              onChange={(e) => {
                if (!active) return;
                setPriceForSnapshot(active.id, Number(e.target.value));
              }}
              style={{ width: "100%" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.65 }}>
              <span>{formatMoney(leaf.min)}</span>
              <span>{formatMoney(leaf.max)}</span>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            Estimated savings at this price: <b>${savings.min}–${savings.max}/mo</b>
          </div>
        </div>
      </div>

      {/* INCENTIVES (editable rules live in src/lib/incentives/incentiveRules.ts) */}
      <div className="rei-card" style={{ background: "black", color: "white", border: "1px solid rgba(255,255,255,.12)" }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>🏷️ Incentives & rebates</div>
        <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 12 }}>
          This section is driven by editable rules. Later: rules per state/utility, eligibility logic, and dynamic amounts.
        </div>

        {incentiveResources.length === 0 ? (
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            No incentive resources matched for this system type yet. (That’s normal until you add rules.)
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {incentiveResources.map((r) => (
              <div
                key={r.id}
                style={{
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 14,
                  padding: 12,
                  background: "rgba(255,255,255,.04)",
                }}
              >
                <div style={{ fontWeight: 900 }}>{r.title}</div>
                <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>{r.description}</div>

                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {r.typicalRange ? (
                    <span style={{ padding: "6px 10px", borderRadius: 999, ...badgeStyle("neutral"), fontSize: 12 }}>
                      Typical: {r.typicalRange}
                    </span>
                  ) : null}

                  {r.linkLabel && r.href ? (
                    <a
                      href={r.href}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#86efac", textDecoration: "underline", fontSize: 12 }}
                    >
                      {r.linkLabel}
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 12, fontSize: 11, opacity: 0.65 }}>
          To edit wording / links / ranges: open <code>src/lib/incentives/incentiveRules.ts</code>
        </div>
      </div>
    </div>
  );
}
