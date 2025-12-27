"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { type Job, findLocalJob } from "../../_data/localJobs";
import { upsertLocalSnapshot, type SnapshotDraft } from "../../_data/localSnapshots";
import { loadLocalCatalog } from "../../_data/localCatalog";

// Incentives (kept)
import {
  getIncentivesForSystemType,
  INCENTIVE_COPY,
  type IncentiveResource,
  type IncentiveAmount,
} from "../../../../lib/incentives/incentiveRules";

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

  const lines: string[] = [];
  lines.push("Incentives (informational)");
  lines.push("");

  if (disclaimer) {
    lines.push(disclaimer);
    lines.push("");
  }

  for (const r of selected) {
    const amt = formatAmount(r.amount);
    lines.push(`- ${r.programName}${amt ? ` — ${amt}` : ""}`);
    if (r.shortBlurb) lines.push(`  ${r.shortBlurb}`);
  }

  return lines.join("\n").trim();
}

export default function NewSnapshotClient({
  jobId,
  systemId,
}: {
  jobId: string;
  systemId: string;
}) {
  const router = useRouter();

  const job: Job | null = useMemo(() => {
    return jobId ? findLocalJob(jobId) ?? null : null;
  }, [jobId]);

  const existingSystem = useMemo(() => {
  if (!job || !job.systems?.length) return null;
  return job.systems.find((s: any) => s.id === systemId) ?? null;
}, [job, systemId]);


  // ✅ REAL catalog only — NO FALLBACKS
  const catalog = useMemo(() => loadLocalCatalog(), []);

  const [catalogId, setCatalogId] = useState("");
  const selectedCatalog = useMemo(
    () => catalog.find((c) => c.id === catalogId) ?? null,
    [catalogId, catalog]
  );

  // Incentives only when catalog selected
  const incentives: IncentiveResource[] = useMemo(() => {
    if (!selectedCatalog) return [];
    return getIncentivesForSystemType(selectedCatalog.category, {
      tags: selectedCatalog.tags ?? [],
    });
  }, [selectedCatalog]);

  const [includeIncentivesInNotes, setIncludeIncentivesInNotes] = useState(true);

  // Form state (EMPTY by default — no hard-coded values)
  const [suggestedName, setSuggestedName] = useState("");
  const [estCost, setEstCost] = useState("");
  const [estAnnualSavings, setEstAnnualSavings] = useState("");
  const [estPaybackYears, setEstPaybackYears] = useState("");
  const [notes, setNotes] = useState("");

  function applyCatalogDefaults() {
    if (!selectedCatalog) return;
    setSuggestedName(selectedCatalog.name);
    setNotes(selectedCatalog.highlights?.join(" • ") ?? "");
  }

  function onSave() {
    if (!job || !existingSystem || !suggestedName.trim()) return;

    const incentiveNotes =
      includeIncentivesInNotes && incentives.length
        ? buildIncentivesNotesBlock(incentives)
        : "";

    const finalNotes =
      incentiveNotes && notes
        ? `${notes}\n\n---\n\n${incentiveNotes}`
        : incentiveNotes || notes;

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

  if (!job || !existingSystem) {
    return (
      <div className="rei-card">
        <div style={{ fontWeight: 900 }}>Missing job or system</div>
        <Link className="rei-btn" href="/admin/jobs">← Back to Jobs</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="rei-card">
        <div style={{ fontWeight: 900 }}>Suggested Upgrade (Proposed)</div>

        {catalog.length === 0 ? (
          <div style={{ color: "var(--muted)", marginTop: 10 }}>
            No systems in your catalog yet.<br />
            Add systems in <b>Systems Catalog</b> to enable suggestions.
          </div>
        ) : (
          <>
            <select
              value={catalogId}
              onChange={(e) => setCatalogId(e.target.value)}
              style={{ padding: 10, marginTop: 10 }}
            >
              <option value="">— Select a catalog system —</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <button
              className="rei-btn"
              disabled={!selectedCatalog}
              onClick={applyCatalogDefaults}
              style={{ marginTop: 10 }}
            >
              Apply catalog defaults
            </button>
          </>
        )}

        <input
          placeholder="Suggested system name"
          value={suggestedName}
          onChange={(e) => setSuggestedName(e.target.value)}
          style={{ marginTop: 10 }}
        />

        <button className="rei-btn rei-btnPrimary" onClick={onSave} style={{ marginTop: 12 }}>
          Save Snapshot
        </button>
      </div>
    </div>
  );
}
