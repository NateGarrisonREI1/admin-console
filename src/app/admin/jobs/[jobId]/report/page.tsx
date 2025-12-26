"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { MOCK_JOBS, type Job } from "../../../_data/mockJobs";
import { findLocalJob } from "../../../_data/localJobs";
import { loadLocalSnapshots, snapshotsForJob, type SnapshotDraft } from "../../../_data/localSnapshots";

// IMPORTANT: Use relative import so you don’t depend on @ alias yet.
// From: src/app/admin/jobs/[jobId]/report/page.tsx
// To:   src/lib/incentives/incentiveRules.ts
import {
  getIncentivesForSnapshot,
  type IncentiveProgram,
  type IncentiveForm,
} from "../../../../../lib/incentives/incentiveRules";

function formatMoney(n: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n).toLocaleString()}`;
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

/** ✅ ALL wording lives here so you can change “rebate info” text anytime */
const COPY = {
  pageTitle: "Mock LEAF Report Preview",
  backToJob: "← Back to Job",
  sendReport: "Send Report (coming soon)",

  reportIntroTitle: "Report Summary",
  reportIntroBody:
    "This is a mock LEAF report generated from the job profile and saved snapshots. Incentives and forms are rule-driven placeholders for now.",

  sectionTitle: "Upgrade Recommendation",
  existingLabel: "Existing",
  suggestedLabel: "Suggested",
  snapshotMeta: (updatedAt: string) => `Last updated: ${formatDate(updatedAt)}`,

  incentivesTitle: "Incentives & Rebates",
  incentivesSubtitle:
    "These incentives are generated from rules. Later, you’ll attach exact programs, eligibility, forms, and rebate values per system type.",
  formsTitle: "Forms / Links",
  rebatesTitle: "Programs",
  totalsLabel: "Estimated total incentives",
  totalsSuffixEstimated: " (estimated)",
  disclaimer:
    "Note: Incentive amounts and eligibility vary by location, efficiency, program funding, and contractor participation. This section is rule-driven so wording and links can be updated without changing report UI.",

  emptyTitle: "Nothing to preview yet",
  emptyBody: "Create at least one snapshot for this job, then generate the mock report.",
};

export default function JobReportPage() {
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

  const reportId = (job as any).reportId ?? job.id;
  const address = (job as any).address ?? (job as any).propertyAddress ?? "—";

  const ctx = {
    stateCode: (job as any).stateCode,
    city: (job as any).city,
    utilityProvider: (job as any).utilityProvider,
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* HEADER */}
      <div className="rei-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>
              {COPY.pageTitle} — {reportId}
            </div>
            <div style={{ color: "var(--muted)" }}>
              {(job as any).customerName ?? "Customer"} • {address}
            </div>
            <div style={{ height: 10 }} />
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", color: "var(--muted)", fontSize: 12 }}>
              <div>
                <b style={{ color: "var(--text)" }}>Sq Ft:</b> {(job as any).sqft ?? "—"}
              </div>
              <div>
                <b style={{ color: "var(--text)" }}>Year Built:</b> {(job as any).yearBuilt ?? "—"}
              </div>
              <div>
                <b style={{ color: "var(--text)" }}>Snapshots:</b> {snapshots.length}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link
              href={`/admin/jobs/${job.id}`}
              className="rei-btn"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              {COPY.backToJob}
            </Link>

            <button
              className="rei-btn rei-btnPrimary"
              type="button"
              onClick={() => alert("Send Report placeholder — coming next")}
            >
              {COPY.sendReport}
            </button>
          </div>
        </div>
      </div>

      {/* INTRO */}
      <div className="rei-card">
        <div style={{ fontWeight: 900, marginBottom: 6 }}>{COPY.reportIntroTitle}</div>
        <div style={{ color: "var(--muted)", lineHeight: 1.5 }}>{COPY.reportIntroBody}</div>
      </div>

      {/* EMPTY STATE */}
      {snapshots.length === 0 ? (
        <div className="rei-card">
          <div style={{ fontWeight: 900, marginBottom: 6 }}>{COPY.emptyTitle}</div>
          <div style={{ color: "var(--muted)" }}>{COPY.emptyBody}</div>
          <div style={{ height: 12 }} />
          <Link href={`/admin/jobs/${job.id}`} className="rei-btn" style={{ textDecoration: "none", color: "inherit" }}>
            {COPY.backToJob}
          </Link>
        </div>
      ) : (
        <>
          {snapshots.map((snap) => (
            <SnapshotSection key={snap.id} snap={snap} ctx={ctx} />
          ))}
        </>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="rei-btn" type="button" onClick={() => setBump((n) => n + 1)}>
          Refresh report data
        </button>
      </div>
    </div>
  );
}

function SnapshotSection({
  snap,
  ctx,
}: {
  snap: SnapshotDraft;
  ctx: { stateCode?: string; city?: string; utilityProvider?: string };
}) {
  const incentives = useMemo(() => getIncentivesForSnapshot(snap as any, ctx), [snap, ctx]);

  const existingTitle = `${snap.existing.type ?? "System"} • ${snap.existing.subtype ?? "—"}`;
  const suggestedTitle = snap.suggested.name ?? "Suggested Upgrade";

  const cost = typeof snap.suggested.estCost === "number" ? formatMoney(snap.suggested.estCost) : "—";
  const savings = typeof snap.suggested.estAnnualSavings === "number" ? formatMoney(snap.suggested.estAnnualSavings) : "—";
  const payback = typeof snap.suggested.estPaybackYears === "number" ? `${snap.suggested.estPaybackYears} yrs` : "—";

  return (
    <div className="rei-card" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 4 }}>{COPY.sectionTitle}</div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>{COPY.snapshotMeta(snap.updatedAt)}</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Pill label="Est. Cost" value={cost} />
          <Pill label="Savings/yr" value={savings} />
          <Pill label="Payback" value={payback} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 12, background: "rgba(239,68,68,.03)" }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>{COPY.existingLabel}</div>
          <div style={{ fontWeight: 900 }}>{existingTitle}</div>
          <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
            Fuel: {snap.existing.fuel ?? "—"} • Age: {snap.existing.ageYears ?? "—"} yrs • Condition:{" "}
            {snap.existing.operational ?? "—"}
          </div>
        </div>

        <div style={{ border: "1px solid rgba(67,164,25,.35)", borderRadius: 14, padding: 12, background: "rgba(67,164,25,.05)" }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>{COPY.suggestedLabel}</div>
          <div style={{ fontWeight: 900 }}>{suggestedTitle}</div>
          <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
            Source: {snap.suggested.catalogSystemId ? "Catalog" : "Manual"} • Notes:{" "}
            {snap.suggested.notes ? snap.suggested.notes : "—"}
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 4 }}>{COPY.incentivesTitle}</div>
            <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.4 }}>{COPY.incentivesSubtitle}</div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>{COPY.totalsLabel}</div>
            <div style={{ fontWeight: 900 }}>
              {formatMoney(incentives.totals.min)}–{formatMoney(incentives.totals.max)}
              {incentives.totals.estimated ? (
                <span style={{ color: "var(--muted)", fontWeight: 700 }}>{COPY.totalsSuffixEstimated}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div style={{ height: 10 }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormsBlock forms={incentives.forms} />
          <ProgramsBlock programs={incentives.programs} />
        </div>

        <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 12, lineHeight: 1.45 }}>
          {COPY.disclaimer}
        </div>
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 999,
        padding: "8px 10px",
        background: "rgba(16,24,40,.03)",
        display: "flex",
        gap: 8,
        alignItems: "baseline",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 800 }}>{label}:</span>
      <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 900 }}>{value}</span>
    </div>
  );
}

function FormsBlock({ forms }: { forms: IncentiveForm[] }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>{COPY.formsTitle}</div>

      {forms?.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {forms.map((f) => (
            <a
              key={f.id}
              href={f.url}
              target="_blank"
              rel="noreferrer"
              className="rei-btn"
              style={{
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 900 }}>{f.title}</div>
                {f.note ? <div style={{ color: "var(--muted)", fontSize: 12 }}>{f.note}</div> : null}
              </div>
              <div style={{ color: "var(--muted)" }}>↗</div>
            </a>
          ))}
        </div>
      ) : (
        <div style={{ color: "var(--muted)", fontSize: 12 }}>No forms mapped yet.</div>
      )}
    </div>
  );
}

function ProgramsBlock({ programs }: { programs: IncentiveProgram[] }) {
  function fmt(p: IncentiveProgram) {
    if (typeof p.amount === "number") return formatMoney(p.amount);
    const min = typeof p.min === "number" ? p.min : 0;
    const max = typeof p.max === "number" ? p.max : 0;
    if (min === 0 && max === 0) return "—";
    if (min === max) return formatMoney(min);
    return `${formatMoney(min)}–${formatMoney(max)}`;
  }

  const levelLabel: Record<IncentiveProgram["level"], string> = {
    federal: "Federal",
    state: "State",
    utility: "Utility",
    local: "Local",
    other: "Other",
  };

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>{COPY.rebatesTitle}</div>

      {programs?.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {programs.map((p) => (
            <div
              key={p.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 10,
                background: "rgba(16,24,40,.02)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 900 }}>{p.title}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    {levelLabel[p.level]}
                    {p.note ? ` • ${p.note}` : ""}
                  </div>
                </div>
                <div style={{ fontWeight: 900, whiteSpace: "nowrap" }}>{fmt(p)}</div>
              </div>

              {p.links?.length ? (
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {p.links.map((l) => (
                    <a
                      key={l.url}
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--leaf)", fontWeight: 900, fontSize: 12 }}
                    >
                      {l.label} ↗
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: "var(--muted)", fontSize: 12 }}>No programs mapped yet.</div>
      )}
    </div>
  );
}
