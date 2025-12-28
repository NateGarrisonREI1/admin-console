"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { type Job, findLocalJob } from "../../_data/localJobs";
import { upsertLocalSnapshot, type SnapshotDraft } from "../../_data/localSnapshots";
import { loadLocalCatalog } from "../../_data/localCatalog";
import {
  calculateLeafSavings,
  type LeafTierKey,
} from "../../_data/leafSSConfigRuntime";
// Incentives
import {
  getIncentivesForSystemType,
  INCENTIVE_COPY,
  normalizeSystemType,
  type IncentiveResource,
  type IncentiveAmount,
} from "../../_data/incentives/incentiveResolver";

function nowIso() {
  return new Date().toISOString();
}

function parseNum(v: string) {
  const cleaned = (v || "").replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatAmount(amount?: IncentiveAmount): string {
  if (!amount) return "";
  if (amount.kind === "text") return amount.value;
  if (amount.kind === "flat") return `$${amount.value}`;
  if (amount.kind === "range") return `$${amount.min}–$${amount.max}`;
  return "";
}

function buildIncentivesNotesBlock(selected: IncentiveResource[]) {
  if (!selected.length) return "";

  const disclaimer = INCENTIVE_COPY.find((x) => x.key === "general_disclaimer")?.body ?? "";
  const fedBlurb = INCENTIVE_COPY.find((x) => x.key === "federal_tax_credit_blurb")?.body ?? "";
  const utilBlurb = INCENTIVE_COPY.find((x) => x.key === "utility_rebate_blurb")?.body ?? "";

  const lines: string[] = [];
  lines.push("Incentives (auto-added)");
  lines.push("");

  if (disclaimer) {
    lines.push(disclaimer);
    lines.push("");
  }
  if (fedBlurb) lines.push(`• ${fedBlurb}`);
  if (utilBlurb) lines.push(`• ${utilBlurb}`);
  lines.push("");

  for (const r of selected) {
    const amt = formatAmount(r.amount);
    lines.push(`- ${r.programName}${amt ? ` — ${amt}` : ""}`);
    if (r.shortBlurb) lines.push(`  ${r.shortBlurb}`);
    if (r.links?.length) {
      for (const l of r.links) lines.push(`  Link: ${l.label} — ${l.url}`);
    }
  }

  return lines.join("\n").trim();
}

// Helps safely read common catalog fields without hard-wiring schema
function pickDefaultNumber(val: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "number" && Number.isFinite(val)) return String(val);
  if (typeof val === "string") return val.replace(/[^0-9.]/g, "");
  return "";
}

export default function NewSnapshotClient({
  job,
  system,
}: {
  job: Job;
  system: any;
}) {

  const router = useRouter();

  // ✅ REAL catalog only (localStorage)
  const catalog = useMemo(() => loadLocalCatalog(), []);

  const [catalogId, setCatalogId] = useState<string>("");

  const selectedCatalog = useMemo(() => {
    if (!catalogId) return null;
    return (catalog ?? []).find((c: any) => c.id === catalogId) ?? null;
  }, [catalogId, catalog]);

  // --- Incentives (only when a catalog system is selected) ---
  const incentives: IncentiveResource[] = useMemo(() => {
    if (!selectedCatalog) return [];

    const categoryKey = normalizeSystemType(String(selectedCatalog.category ?? ""));
    const tags = Array.isArray(selectedCatalog.tags)
      ? selectedCatalog.tags.map((t: any) => String(t || "").toLowerCase().trim()).filter(Boolean)
      : [];

    // Optional extra context from existing system
    const ctxTags = [
      ...tags,
      String((existingSystem as any)?.type ?? "").toLowerCase().trim(),
      String((existingSystem as any)?.subtype ?? "").toLowerCase().trim(),
    ].filter(Boolean);

    return getIncentivesForSystemType(categoryKey, { tags: ctxTags });
  }, [selectedCatalog, existingSystem]);

  const [includeIncentivesInNotes, setIncludeIncentivesInNotes] = useState<boolean>(true);
  const [selectedIncentiveIds, setSelectedIncentiveIds] = useState<string[]>([]);

  // Auto-select all incentives whenever the list changes
  useEffect(() => {
    setSelectedIncentiveIds(incentives.map((x) => x.id));
  }, [catalogId, incentives.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedIncentives = useMemo(() => {
    const set = new Set(selectedIncentiveIds);
    return incentives.filter((x) => set.has(x.id));
  }, [incentives, selectedIncentiveIds]);

  // --- Form state ---
  const [suggestedName, setSuggestedName] = useState<string>("");
  const [estCost, setEstCost] = useState<string>("");
  const [estAnnualSavings, setEstAnnualSavings] = useState<string>("");
  const [estPaybackYears, setEstPaybackYears] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const backHref = job ? `/admin/jobs/${job.id}` : "/admin/jobs";

  function applyCatalogDefaults() {
    if (!selectedCatalog) return;

    // Only fill suggested name if empty
    setSuggestedName((prev) => (prev.trim() ? prev : String(selectedCatalog.name ?? "")));

    // Try to pull default assumptions if you have them
    const da = (selectedCatalog as any).defaultAssumptions ?? {};
    setEstCost((prev) => (prev.trim() ? prev : pickDefaultNumber(da.estCost)));
    setEstAnnualSavings((prev) => (prev.trim() ? prev : pickDefaultNumber(da.estAnnualSavings)));
    setEstPaybackYears((prev) => (prev.trim() ? prev : pickDefaultNumber(da.estPaybackYears)));

    // Notes from highlights (optional)
    const highlights = Array.isArray((selectedCatalog as any).highlights) ? (selectedCatalog as any).highlights : [];
    const hlLine = highlights.length ? highlights.join(" • ") : "";

    setNotes((prev) => {
      const base = prev.trim();
      if (!hlLine) return base;
      if (!base) return hlLine;
      if (base.includes(hlLine)) return base;
      return `${base}\n\n${hlLine}`;
    });
  }

  function onSave() {
    if (!job || !existingSystem) return;

    if (!suggestedName.trim()) {
      alert("Suggested system name is required.");
      return;
    }

    const userNotes = notes.trim();

    const incentivesBlock =
      includeIncentivesInNotes && selectedIncentives.length
        ? buildIncentivesNotesBlock(selectedIncentives)
        : "";

    const finalNotes =
      incentivesBlock && userNotes
        ? `${userNotes}\n\n---\n\n${incentivesBlock}`
        : incentivesBlock || userNotes;

    const draft: SnapshotDraft = {
      id: `snap_${Math.random().toString(16).slice(2)}_${Date.now()}`,
      jobId: job.id,
      systemId: existingSystem.id,
      createdAt: nowIso(),
      updatedAt: nowIso(),

      existing: {
        type: existingSystem.type ?? "",
        subtype: existingSystem.subtype ?? "",
        ageYears: existingSystem.ageYears ?? null,
        operational: existingSystem.operational ?? "",
        wear: existingSystem.wear ?? null,
        maintenance: existingSystem.maintenance ?? "",
      },

      suggested: {
        name: suggestedName.trim(),
        catalogSystemId: catalogId || null,
        estCost: parseNum(estCost),
        estAnnualSavings: parseNum(estAnnualSavings),
        estPaybackYears: parseNum(estPaybackYears),
        notes: finalNotes,
      },
    };

    upsertLocalSnapshot(draft);
    router.push(`/admin/jobs/${job.id}?snapSaved=1`);
  }

  // --- Guards ---
  if (!job || !system) {
    return (
      <div className="rei-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Missing URL parameters</div>
        <div style={{ color: "var(--muted)" }}>
          Expected <code>?jobId=...</code> and <code>&amp;systemId=...</code>.
        </div>
        <Link className="rei-btn" href="/admin/jobs" style={{ width: "fit-content" }}>
          ← Back to Jobs
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="rei-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Job not found</div>
        <div style={{ color: "var(--muted)" }}>
          No local job exists with id: <code>{jobId}</code>
        </div>
        <Link className="rei-btn" href="/admin/jobs" style={{ width: "fit-content" }}>
          ← Back to Jobs
        </Link>
      </div>
    );
  }

  if (!existingSystem) {
    return (
      <div className="rei-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Existing system not found</div>
        <div style={{ color: "var(--muted)" }}>
          No system exists with id: <code>{systemId}</code> for this job.
        </div>
        <Link className="rei-btn" href={backHref} style={{ width: "fit-content" }}>
          ← Back to Job
        </Link>
      </div>
    );
  }

  // --- Main UI (restored) ---
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="rei-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>New LEAF System Snapshot</div>
            <div style={{ color: "var(--muted)", marginTop: 6 }}>
              Job: <b>{(job as any).customerName ?? "—"}</b> —{" "}
              <span style={{ opacity: 0.75 }}>{(job as any).reportId ?? job.id}</span>
            </div>
          </div>

          <Link className="rei-btn" href={backHref} style={{ width: "fit-content" }}>
            ← Back to Job
          </Link>
        </div>
      </div>

      <div className="rei-card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Existing System (from worksheet)</div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, background: "white" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <span style={{ fontWeight: 800 }}>Type:</span> {existingSystem.type}
            </div>
            <div>
              <span style={{ fontWeight: 800 }}>Subtype:</span> {existingSystem.subtype}
            </div>
            <div>
              <span style={{ fontWeight: 800 }}>Age:</span> {existingSystem.ageYears ?? "—"} yrs
            </div>
            <div>
              <span style={{ fontWeight: 800 }}>Operational:</span> {existingSystem.operational ?? "—"}
            </div>
            <div>
              <span style={{ fontWeight: 800 }}>Wear:</span> {existingSystem.wear ?? "—"}/5
            </div>
            <div>
              <span style={{ fontWeight: 800 }}>Maintenance:</span> {existingSystem.maintenance ?? "—"}
            </div>
          </div>

          <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 12 }}>
            This data was captured from the worksheet so your snapshot has context.
          </div>
        </div>
      </div>

      <div className="rei-card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Suggested Upgrade (Proposed)</div>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 700 }}>Choose from Systems Catalog (optional)</div>

            {catalog.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                No systems in your catalog yet. Add systems in <b>Systems Catalog</b> to enable suggestions.
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <select
                  value={catalogId}
                  onChange={(e) => setCatalogId(e.target.value)}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    minWidth: 320,
                    background: "white",
                  }}
                >
                  <option value="">— Select a catalog system —</option>
                  {catalog.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="rei-btn"
                  onClick={applyCatalogDefaults}
                  disabled={!selectedCatalog}
                  style={{
                    opacity: selectedCatalog ? 1 : 0.6,
                    cursor: selectedCatalog ? "pointer" : "not-allowed",
                  }}
                >
                  Apply catalog defaults
                </button>
              </div>
            )}

            {selectedCatalog ? (
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                From catalog • Incentive type: <b>{normalizeSystemType(String(selectedCatalog.category ?? ""))}</b>
                {Array.isArray(selectedCatalog.tags) && selectedCatalog.tags.length ? (
                  <>
                    {" "}
                    • tags: <b>{selectedCatalog.tags.join(", ")}</b>
                  </>
                ) : null}
              </div>
            ) : (
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                Select a suggested upgrade to see matching incentives.
              </div>
            )}
          </div>

          {/* Incentives */}
          {selectedCatalog && incentives.length ? (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, background: "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>Incentives (matched to suggested upgrade)</div>

                <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={includeIncentivesInNotes}
                    onChange={(e) => setIncludeIncentivesInNotes(e.target.checked)}
                  />
                  Include incentives in snapshot notes on save
                </label>
              </div>

              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {incentives.map((r) => {
                  const checked = selectedIncentiveIds.includes(r.id);
                  const amt = formatAmount(r.amount);
                  return (
                    <label
                      key={r.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "20px 1fr",
                        gap: 10,
                        alignItems: "start",
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid #eef2f7",
                        background: "#fafafa",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = new Set(selectedIncentiveIds);
                          if (e.target.checked) next.add(r.id);
                          else next.delete(r.id);
                          setSelectedIncentiveIds(Array.from(next));
                        }}
                        style={{ marginTop: 2 }}
                      />
                      <div>
                        <div style={{ fontWeight: 900 }}>
                          {r.programName}
                          {amt ? <span style={{ fontWeight: 700, color: "#374151" }}> — {amt}</span> : null}
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>{r.shortBlurb}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          {selectedCatalog && !incentives.length ? (
            <div style={{ color: "var(--muted)", fontSize: 12 }}>
              No incentives matched this suggested upgrade. (Check your Incentives rules/tags.)
            </div>
          ) : null}

          {/* Full form fields (restored) */}
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 700 }}>
              Suggested system name <span style={{ color: "#ef4444" }}>(required)</span>
            </div>
            <input
              value={suggestedName}
              onChange={(e) => setSuggestedName(e.target.value)}
              placeholder="e.g., High-efficiency gas furnace"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
            />
            <div style={{ color: "var(--muted)", fontSize: 12 }}>
              Tip: use catalog + tweak later. Or type a custom upgrade name.
            </div>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 700 }}>Est. Cost ($)</div>
              <input
                value={estCost}
                onChange={(e) => setEstCost(e.target.value)}
                placeholder="e.g., 12000"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 700 }}>Est. Savings / yr ($)</div>
              <input
                value={estAnnualSavings}
                onChange={(e) => setEstAnnualSavings(e.target.value)}
                placeholder="e.g., 350"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 700 }}>Est. Payback (yrs)</div>
              <input
                value={estPaybackYears}
                onChange={(e) => setEstPaybackYears(e.target.value)}
                placeholder="e.g., 12"
                style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 700 }}>Notes / highlights</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Short notes to appear on snapshot/report"
              rows={4}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="rei-btn rei-btnPrimary" type="button" onClick={onSave}>
              Save Snapshot
            </button>
          </div>

          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            Saved snapshots are stored in your browser (localStorage) for now.
          </div>
        </div>
      </div>
    </div>
  );
}
