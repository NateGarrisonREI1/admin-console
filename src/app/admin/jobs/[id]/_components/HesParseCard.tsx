// src/app/admin/jobs/[id]/_components/HesParseCard.tsx
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "../../../../../lib/supabase/admin";
import { generateAndSaveHesSnapshot } from "../../../../../lib/hes/generateHesSnapshot";
import GenerateButton from "./GenerateButton";

async function generateSnapshotAction(formData: FormData) {
  "use server";

  const jobId = String(formData.get("job_id") || "").trim();
  if (!jobId) return;

  const admin = supabaseAdmin();
  await generateAndSaveHesSnapshot(admin, jobId);
  revalidatePath(`/admin/jobs/${jobId}`);
}

function formatNumber(num: number | null | undefined): string {
  if (num == null) return "N/A";
  return new Intl.NumberFormat("en-US").format(num);
}

function formatCurrency(num: number | null | undefined): string {
  if (num == null) return "N/A";
  return `$${formatNumber(num)}`;
}

function fmtIso(iso: any) {
  if (!iso) return "—";
  try {
    return new Date(String(iso)).toLocaleString();
  } catch {
    return String(iso);
  }
}

function clampText(s0: any, n: number) {
  const t = String(s0 || "");
  if (t.length <= n) return t;
  return t.slice(0, n) + "…";
}

function normalizeRow(x: any) {
  return {
    section: String(x?.section || ""),
    feature: String(x?.feature || "").trim(),
    todays_condition: String(x?.todays_condition || "").trim(),
    recommendation: String(x?.recommendation || "").trim(),
  };
}

function renderRows(rows: any[]) {
  if (!rows || rows.length === 0) {
    return (
      <tr className="even:bg-gray-50">
        <td className="px-6 py-4 font-medium">—</td>
        <td className="px-6 py-4 text-gray-700">N/A</td>
        <td className="px-6 py-4 font-semibold">—</td>
      </tr>
    );
  }

  return rows.map((s: any, i: number) => (
    <tr key={i} className="even:bg-gray-50">
      <td className="px-6 py-4 font-medium">{s?.feature || "—"}</td>
      <td className="px-6 py-4 text-gray-700">
        {s?.todays_condition ? s.todays_condition : "N/A"}
      </td>
      <td className="px-6 py-4 font-semibold">
        {s?.recommendation ? s.recommendation : "—"}
      </td>
    </tr>
  ));
}

export default async function HesParseCard({ jobId }: { jobId: string }) {
  const admin = supabaseAdmin();

  const { data: snapshot } = await admin
    .from("admin_job_snapshots")
    .select("id, generated_at, status, output_data")
    .eq("job_id", jobId)
    .eq("status", "completed")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const output = (snapshot?.output_data ?? {}) as any;

  const generatedLabel = snapshot?.generated_at
    ? new Date(snapshot.generated_at).toLocaleString()
    : null;

  const suggestionsRaw = Array.isArray(output?.suggestions) ? output.suggestions : [];
  const suggestions = suggestionsRaw
    .map(normalizeRow)
    .filter((r: { feature: string }) => !!r.feature);

  const prioritySuggestions = suggestions.filter((s: any) => s.section === "priority");
  const additionalSuggestions = suggestions.filter((s: any) => s.section === "additional");

  const score = output?.hes_score ?? null;
  const annualEnergyCost = output?.annual_energy_cost ?? null;
  const solarGeneration = output?.solar_generation_kwh ?? null;
  const carbonFootprint = output?.carbon_footprint ?? null;
  const homeLocation = output?.home_location ?? null;
  const yearBuilt = output?.year_built ?? null;
  const heatedFloorArea = output?.heated_floor_area_sqft ?? null;
  const bedrooms = output?.bedrooms ?? null;

  const hasAny =
    score != null ||
    annualEnergyCost != null ||
    solarGeneration != null ||
    carbonFootprint != null ||
    homeLocation != null ||
    yearBuilt != null ||
    heatedFloorArea != null ||
    bedrooms != null ||
    suggestions.length > 0;

  const statusTone = !snapshot ? "none" : hasAny ? "ok" : "partial";

  // Debug (kept as-is, safe even if fields absent)
  const parsed = output?.debug?.parsed ?? {};
  const usedPdfCoordinates = !!parsed?.used_pdf_coordinates;
  const pdfjsTable = parsed?.pdfjs_table ?? null;
  const pdfjsError = parsed?.pdfjs_error ?? null;

  const solarDebug = output?.debug?.solar_debug ?? null;
  const fileDebug = output?.debug?.file ?? null;

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
      <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-blue-700 text-white flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">Pre-Snapshot Preview (Admin QA)</h3>
          <p className="text-sm mt-1 opacity-90">
            {snapshot
              ? `Last generated: ${generatedLabel ?? "Unknown time"}`
              : "No snapshot generated yet — generate one below"}
          </p>
        </div>

        <div className="shrink-0">
          <form action={generateSnapshotAction}>
            <input type="hidden" name="job_id" value={jobId} />
            <GenerateButton />
          </form>
        </div>
      </div>

      <details open className="border-t border-gray-200">
        <summary className="cursor-pointer select-none px-6 py-3 font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 flex items-center justify-between">
          <span>Toggle Preview View</span>
          <span className="text-sm text-blue-700">▼</span>
        </summary>

        <div className="p-6 space-y-8 text-base">
          {statusTone === "ok" ? (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <p className="font-bold text-green-800">Parsed HES report successfully.</p>
              <p className="mt-2 text-gray-700">
                These values are pulled from the latest completed snapshot (or show N/A if not present).
              </p>
            </div>
          ) : statusTone === "partial" ? (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
              <p className="font-bold text-amber-900">
                Snapshot generated, but limited HES fields parsed.
              </p>
              <p className="mt-2 text-gray-700">Check debug details below or regenerate if needed.</p>
            </div>
          ) : (
            <div className="bg-gray-50 border-l-4 border-gray-300 p-4 rounded">
              <p className="font-bold text-gray-900">No snapshot yet.</p>
              <p className="mt-2 text-gray-700">Generate a snapshot to preview parsed HES data.</p>
            </div>
          )}

          {/* Headline fields */}
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-800">
            <div>
              <dt className="font-semibold">Current Score</dt>
              <dd>{score != null ? `${score} out of 10` : "N/A"}</dd>
            </div>
            <div>
              <dt className="font-semibold">Annual Energy Cost</dt>
              <dd>{formatCurrency(annualEnergyCost)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Solar Generation</dt>
              <dd>{solarGeneration != null ? `${formatNumber(solarGeneration)} kWh/yr` : "N/A"}</dd>
            </div>
            <div>
              <dt className="font-semibold">Carbon Footprint</dt>
              <dd>{carbonFootprint != null ? `${carbonFootprint} tons/yr` : "N/A"}</dd>
            </div>
            <div>
              <dt className="font-semibold">Home Location</dt>
              <dd>{homeLocation || "N/A"}</dd>
            </div>
            <div>
              <dt className="font-semibold">Year Built</dt>
              <dd>{yearBuilt ?? "N/A"}</dd>
            </div>
            <div>
              <dt className="font-semibold">Heated Floor Area</dt>
              <dd>{heatedFloorArea != null ? `${formatNumber(heatedFloorArea)} sqft` : "N/A"}</dd>
            </div>
            <div>
              <dt className="font-semibold">Bedrooms</dt>
              <dd>{bedrooms ?? "N/A"}</dd>
            </div>
          </dl>

          {/* Suggestions */}
          <div className="space-y-12">
            {/* ALWAYS show Priority section */}
            <section>
              <h4 className="font-bold text-2xl mb-4 text-white bg-blue-900 py-3 px-6 rounded-t-lg">
                Priority Energy Improvements
              </h4>
              <div className="overflow-x-auto border border-gray-300 rounded-b-lg">
                <table className="w-full table-auto">
                  <thead className="bg-blue-900 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold">Feature</th>
                      <th className="px-6 py-4 text-left font-semibold">Today&apos;s Condition</th>
                      <th className="px-6 py-4 text-left font-semibold">Recommended Improvements</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {renderRows(prioritySuggestions)}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ALWAYS show Additional section */}
            <section>
              <h4 className="font-bold text-2xl mb-4 text-white bg-blue-800 py-3 px-6 rounded-t-lg">
                Additional Energy Recommendations
              </h4>
              <div className="overflow-x-auto border border-gray-300 rounded-b-lg">
                <table className="w-full table-auto">
                  <thead className="bg-blue-800 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold">Feature</th>
                      <th className="px-6 py-4 text-left font-semibold">Today&apos;s Condition</th>
                      <th className="px-6 py-4 text-left font-semibold">Recommended Improvements</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {renderRows(additionalSuggestions)}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Debug panel (unchanged) */}
          <details className="rounded border border-gray-200 bg-white">
            <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-gray-900 flex items-center justify-between">
              <span>Debug (HES parsing)</span>
              <span className="text-xs font-normal text-gray-600">
                {snapshot ? `snapshot ${String(snapshot.id).slice(0, 8)}…` : "no snapshot"}
              </span>
            </summary>

            <div className="px-4 pb-4 pt-2 space-y-4 text-sm text-gray-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded border border-gray-200 bg-gray-50 p-3">
                  <div className="font-semibold">Table parser</div>
                  <div className="mt-1">
                    {snapshot ? (
                      usedPdfCoordinates ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-600" />
                          PDF coordinates (pdfjs-dist)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-600" />
                          Text fallback (pdf-parse)
                        </span>
                      )
                    ) : (
                      "—"
                    )}
                  </div>
                  {pdfjsError ? (
                    <div className="mt-2 text-xs text-amber-900">
                      <div className="font-semibold">pdfjs error</div>
                      <div className="mt-1 whitespace-pre-wrap">{clampText(pdfjsError, 800)}</div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded border border-gray-200 bg-gray-50 p-3">
                  <div className="font-semibold">Rows parsed</div>
                  <div className="mt-1">
                    Total: <span className="font-semibold">{suggestions.length}</span>{" "}
                    <span className="text-gray-600">
                      (Priority {prioritySuggestions.length}, Additional {additionalSuggestions.length})
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    Generated at: <span className="text-gray-800">{fmtIso(snapshot?.generated_at)}</span>
                  </div>
                </div>

                <div className="rounded border border-gray-200 bg-gray-50 p-3">
                  <div className="font-semibold">Source file</div>
                  <div className="mt-1 text-xs text-gray-700 space-y-1">
                    <div>
                      <span className="text-gray-500">filename:</span>{" "}
                      <span className="text-gray-900">{fileDebug?.filename || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">content_type:</span>{" "}
                      <span className="text-gray-900">{fileDebug?.content_type || "—"}</span>
                    </div>
                    <div className="break-all">
                      <span className="text-gray-500">storage_path:</span>{" "}
                      <span className="text-gray-900">{fileDebug?.storage_path || "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded border border-gray-200 bg-gray-50 p-3">
                  <div className="font-semibold">Solar debug</div>
                  <div className="mt-1 text-xs text-gray-700 space-y-1">
                    <div>
                      <span className="text-gray-500">found:</span>{" "}
                      <span className="text-gray-900">{solarDebug?.found ? "yes" : "no"}</span>
                    </div>
                    <div className="break-words">
                      <span className="text-gray-500">sample:</span>{" "}
                      <span className="text-gray-900">{clampText(solarDebug?.sample || "", 220)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {pdfjsTable ? (
                <div className="rounded border border-gray-200 bg-gray-50 p-3">
                  <div className="font-semibold">pdfjs table diagnostics</div>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="rounded bg-white border border-gray-200 p-2">
                      <div className="text-gray-500">pages</div>
                      <div className="font-semibold">{pdfjsTable.pages ?? "—"}</div>
                    </div>
                    <div className="rounded bg-white border border-gray-200 p-2">
                      <div className="text-gray-500">section hits</div>
                      <div className="font-semibold">
                        P {pdfjsTable.section_hits?.priority ?? 0} / A{" "}
                        {pdfjsTable.section_hits?.additional ?? 0}
                      </div>
                    </div>
                    <div className="rounded bg-white border border-gray-200 p-2">
                      <div className="text-gray-500">header hits</div>
                      <div className="font-semibold">{pdfjsTable.header_hits ?? "—"}</div>
                    </div>
                    <div className="rounded bg-white border border-gray-200 p-2">
                      <div className="text-gray-500">rows emitted</div>
                      <div className="font-semibold">{pdfjsTable.rows_emitted ?? "—"}</div>
                    </div>
                  </div>

                  {Array.isArray(pdfjsTable.sample_rows) && pdfjsTable.sample_rows.length > 0 ? (
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-gray-700">sample rows</div>
                      <pre className="mt-2 overflow-auto rounded border border-gray-200 bg-white p-3 text-[11px] leading-5 text-gray-800">
                        {JSON.stringify(pdfjsTable.sample_rows, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded border border-gray-200 bg-gray-50 p-3">
                <div className="font-semibold">text excerpt (pdf-parse)</div>
                <p className="text-xs text-gray-600 mt-1">
                  Useful to diagnose when flattened text loses table columns.
                </p>
                <pre className="mt-2 overflow-auto rounded border border-gray-200 bg-white p-3 text-[11px] leading-5 text-gray-800 whitespace-pre-wrap">
                  {String(output?.debug?.text_excerpt || "").trim() || "—"}
                </pre>
              </div>
            </div>
          </details>

          <div className="text-xs text-gray-600 bg-gray-50 p-4 rounded border mt-8">
            <p>
              <strong>QA Note:</strong> This is your internal preview only.
            </p>
            <p className="mt-1">
              If the summary looks correct, approve to publish the final customer version.
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}
