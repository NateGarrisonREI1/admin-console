// src/lib/hes/generateHesSnapshot.ts
import { createRequire } from "module";

// ✅ NEW: recommendation wiring
import { buildSystemRecommendationsFromHes } from "@/lib/recommendations/fromHes";
import { persistSnapshotRecommendations } from "@/lib/recommendations/persistSnapshotRecommendations";

//Snapshot generation
import { buildSnapshotUpgradeCards } from "@/lib/snapshot/buildSnapshotUpgradeCards";

/**
 * ✅ Stable PDF text extraction for Next 16 + Turbopack (no native deps):
 * - Use pdf-parse@1.1.1 (callable function export)
 * - Load via Node require() so Turbopack doesn't mangle the module shape
 *
 * Install:
 *   npm i pdf-parse@1.1.1
 */
type PdfParseResult = { text?: string };
type PdfParseFn = (data: Buffer) => Promise<PdfParseResult>;

const nodeRequire = createRequire(import.meta.url);
let _pdfParseFn: PdfParseFn | null = null;

function getPdfParseFn(): PdfParseFn {
  if (_pdfParseFn) return _pdfParseFn;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod: any = nodeRequire("pdf-parse");

  const fn: any =
    typeof mod === "function"
      ? mod
      : typeof mod?.default === "function"
        ? mod.default
        : null;

  if (typeof fn !== "function") {
    const keys =
      mod && typeof mod === "object" ? Object.keys(mod).join(", ") : String(mod);

    throw new Error(
      `pdf-parse did not resolve to a callable function. Keys: ${keys}. ` +
        `Make sure you're on: npm i pdf-parse@1.1.1`
    );
  }

  _pdfParseFn = fn as PdfParseFn;
  return _pdfParseFn;
}

const BUCKET = "job-files";

// -----------------------------
// DEBUG LOGGING
// -----------------------------
function isHesDebugOn() {
  return (
    process.env.HES_DEBUG === "1" ||
    process.env.NEXT_PUBLIC_HES_DEBUG === "1" ||
    process.env.NODE_ENV !== "production"
  );
}

function logHes(jobId: string, ...args: any[]) {
  if (!isHesDebugOn()) return;
  // eslint-disable-next-line no-console
  console.log(`[HES][${jobId}]`, ...args);
}

// -----------------------------
// HELPERS
// -----------------------------
function s(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function normalizeText(raw: string) {
  return s(raw)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normLine(x: string) {
  return s(x).replace(/[ \t]+/g, " ").trim();
}

// Fix joined words + CRITICAL: add digit<->letter boundaries
// Examples fixed:
// - "8.0 SEERWhen replacing" -> "8.0 SEER When replacing"
// - "R-30Insulate" -> "R-30 Insulate"
function fixJoinedWords(line: string) {
  return s(line)
    // "Attic insulationCeiling" -> "Attic insulation Ceiling"
    .replace(/([a-z])([A-Z])/g, "$1 $2")

    // ✅ NEW: "SEERWhen" / "AFUEWhen" -> "SEER When"
    // (ALLCAPS + CapitalizedWord)
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1 $2")

    // digit/letter boundaries
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanNum(s0: string) {
  const n = Number(String(s0).replace(/[^\d.]+/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toTitle(s0: string) {
  const t = s(s0).replace(/_/g, " ").trim();
  if (!t) return t;
  return t.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const pdf = getPdfParseFn();
  const result = await pdf(buffer);
  const raw = s(result?.text);

  const normalized = raw
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const lines = normalized.split("\n").map((l: string) => fixJoinedWords(l));
  return normalizeText(lines.join("\n"));
}

// -----------------------------
// FIELD PARSERS
// -----------------------------
function pickScore(text: string) {
  const t = text.replace(/\s+/g, " ");

  const m1 = t.match(/THIS\s+HOME'?S\s+SCORE\s+(\d{1,2})\s*OUT\s+OF\s+10/i);
  if (m1?.[1]) {
    const n = cleanNum(m1[1]);
    if (n != null && n >= 1 && n <= 10) return n;
  }

  const m2 = t.match(/SCORE\s*today:\s*(\d{1,2})/i);
  if (m2?.[1]) {
    const n = cleanNum(m2[1]);
    if (n != null && n >= 1 && n <= 10) return n;
  }

  return null;
}

function pickAnnualCost(text: string) {
  const t = text.replace(/\s+/g, " ");

  const mFront = t.match(
    /ESTIMATED\s+ENERGY\s+COSTS[^$]{0,80}\$([\d,]+)\s+PER\s+YEAR/i
  );
  if (mFront?.[1]) return cleanNum(mFront[1]);

  const m1 = t.match(/TOTAL\s+ENERGY\s+COSTS\s+PER\s+YEAR[:\s]+\$?([\d,]+)/i);
  if (m1?.[1]) return cleanNum(m1[1]);

  const m2 = t.match(/TOTAL\s+ENERGY\s+COSTS\s+PER\s+YEAR[^$]{0,60}\$([\d,]+)/i);
  if (m2?.[1]) return cleanNum(m2[1]);

  return null;
}

function pickSolarGenerationKwh(text: string) {
  const raw = String(text || "");
  const normalizedRaw = raw.replace(/k\s+Wh/gi, "kWh");

  const flat = normalizedRaw.replace(/\s+/g, " ");
  const m =
    flat.match(/solar\s*generation[^0-9]{0,80}([\d,]+)\s*kWh/i) ??
    flat.match(/how\s*much\s*solar\s*energy[^0-9]{0,80}([\d,]+)\s*kWh/i);

  if (m?.[1]) {
    const n = cleanNum(m[1]);
    if (n != null && n > 100) return n;
  }

  return null;
}

function pickCarbonFootprint(text: string) {
  const lines = text.split("\n").map((x: string) => fixJoinedWords(normLine(x)));

  const start = lines.findIndex((l: string) =>
    /THIS\s+HOME'?S\s+CARBON\s+FOOTPRINT/i.test(l)
  );
  const window =
    start >= 0 ? lines.slice(start, start + 60).join(" ") : text.replace(/\s+/g, " ");

  const m1 = window.match(/(\d+(?:\.\d+)?)\s*This\s+Home/i);
  if (m1?.[1]) {
    const n = cleanNum(m1[1]);
    if (n != null && n >= 0 && n <= 50) return n;
  }

  const m2 = window.match(/CARBON\s+FOOTPRINT[^0-9]{0,60}(\d+(?:\.\d+)?)/i);
  if (m2?.[1]) {
    const n = cleanNum(m2[1]);
    if (n != null && n >= 0 && n <= 50) return n;
  }

  return null;
}

function pickHomeProfile(text: string) {
  const lines = text
    .split("\n")
    .map((x: string) => fixJoinedWords(normLine(x)))
    .filter((x: string) => Boolean(x));

  const out: any = {};

  function valueAfter(labelRe: RegExp) {
    const idx = lines.findIndex((l: string) => labelRe.test(l));
    if (idx === -1) return null;

    const same = lines[idx];
    const after = same.replace(labelRe, "").replace(/^:\s*/, "").trim();
    if (after) return after;

    return lines[idx + 1] || null;
  }

  const locIdx = lines.findIndex((l: string) => /^LOCATION\b/i.test(l));
  if (locIdx !== -1) {
    const take: string[] = [];
    const sameLine = lines[locIdx].replace(/^LOCATION\b\s*:?\s*/i, "").trim();
    if (sameLine) take.push(sameLine);

    for (let i = 1; i <= 3; i++) {
      const ln = lines[locIdx + i];
      if (!ln) break;
      if (
        /^(YEAR\s+BUILT|HEATED\s+FLOOR\s*AREA|NUMBER\s+OF\s+BEDROOMS|ASSESSMENT|ASSESSOR)\b/i.test(
          ln
        )
      ) {
        break;
      }
      take.push(ln);
    }

    const loc = take
      .join(", ")
      .replace(/,\s*,/g, ",")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (loc) out.location = loc;
  }

  const yearRaw = valueAfter(/^YEAR\s+BUILT\b/i);
  const year = yearRaw ? cleanNum(yearRaw) : null;
  if (year != null && year > 0) out.year_built = year;

  const hfaRaw = valueAfter(/^HEATED\s+FLOOR\s*AREA\b/i);
  if (hfaRaw) {
    const cleaned = hfaRaw.replace(/sq\.?\s*ft\.?/i, "").trim();
    const n = cleanNum(cleaned);
    if (n != null && n > 0) out.heated_floor_area_sqft = n;
  }

  const bedsRaw = valueAfter(/^NUMBER\s+OF\s+BEDROOMS\b/i);
  const beds = bedsRaw ? cleanNum(bedsRaw) : null;
  if (beds != null && beds > 0) out.bedrooms = beds;

  return out;
}

// -----------------------------
// SUGGESTIONS — TEMPLATE FIRST + FILL
// -----------------------------
export type HesSuggestionRow = {
  section: "priority" | "additional";
  feature: string;
  todays_condition: string;
  recommendation: string;
};

function escapeRe(s0: string) {
  return s0.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collapseSpaces(s0: string) {
  return s(s0).replace(/\s+/g, " ").trim();
}

function normKey(s0: string) {
  return collapseSpaces(s0)
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * ✅ Priority list for Oregon HES reports (matches your screenshot)
 */
const PRIORITY_FEATURES = [
  "Air Conditioner",
  "Envelope/Air sealing",
  "Heating equipment",
  "Water Heater",
] as const;

/**
 * ✅ Canonical “Additional Energy Recommendations” list (Oregon/DOE format)
 */
const ADDITIONAL_FEATURES = [
  "Attic insulation",
  "Basement wall insulation",
  "Cathedral Ceiling/Roof",
  "Duct insulation",
  "Duct sealing",
  "Floor insulation",
  "Foundation wall insulation",
  "Knee Wall insulation",
  "Skylights",
  "Wall insulation",
  "Windows",
  "Solar PV",
] as const;

// Strong split marker for priority rows
const WHEN_REPLACING_RE = /\bwhen\s+replacing\b\s*,?/i;

// Recommendation “verbs” used to split additional rows
const REC_VERB_RE = /\b(insulate|install|replace|upgrade|add|seal|reduce)\b/i;

function findSectionRange(lines: string[], headerRe: RegExp) {
  const start = lines.findIndex((l: string) => headerRe.test(l));
  if (start === -1) return null;

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];

    if (
      /^ADDITIONAL ENERGY RECOMMENDATIONS/i.test(l) &&
      !headerRe.source.includes("ADDITIONAL")
    ) {
      end = i;
      break;
    }

    if (/^\d+\.\s+To achieve the/i.test(l)) {
      end = i;
      break;
    }
    if (/^\d+\.\s+Today'?s Condition represents/i.test(l)) {
      end = i;
      break;
    }
    if (/^\d+\.\s+For in this report/i.test(l)) {
      end = i;
      break;
    }
  }

  return { start, end };
}

// Safety: if a row accidentally includes another feature label, cut it off.
function truncateAtAnyFeature(rest: string, currentFeature: string, features: readonly string[]) {
  const low = rest.toLowerCase();
  let cut = -1;

  for (const f of features) {
    if (f === currentFeature) continue;
    const idx = low.indexOf(f.toLowerCase());
    if (idx >= 0) cut = cut === -1 ? idx : Math.min(cut, idx);
  }

  if (cut >= 0) return collapseSpaces(rest.slice(0, cut));
  return rest;
}

// Feature-anchored parser (template-fill friendly)
function parseByFeatureAnchors(
  section: "priority" | "additional",
  sectionText: string,
  features: readonly string[]
): HesSuggestionRow[] {
  // extra join-word fix on the whole block helps with SEERWhen / R-30Insulate patterns
  const blob = collapseSpaces(fixJoinedWords(sectionText));

  const SUPERS = "¹²³⁴⁵⁶⁷⁸⁹⁰";
  const supOrDigit = `[0-9${SUPERS}]*`;

  function featureRegex(feature: string) {
    const parts = feature.split(/\s+/).map((p) => escapeRe(p));
    const body = parts.join("\\s*");
    return new RegExp(`\\b${body}${supOrDigit}`, "i");
  }

  type Hit = { feature: string; idx: number; re: RegExp };
  const hits: Hit[] = [];

  for (const f of features) {
    const re = featureRegex(f);
    const m = re.exec(blob);
    if (m && typeof m.index === "number") hits.push({ feature: f, idx: m.index, re });
  }

  if (hits.length < 1) return [];

  hits.sort((a, b) => a.idx - b.idx);

  const out: HesSuggestionRow[] = [];

  for (let i = 0; i < hits.length; i++) {
    const cur = hits[i];
    const next = hits[i + 1];
    const seg = blob.slice(cur.idx, next ? next.idx : blob.length);

    let rest = collapseSpaces(seg.replace(cur.re, ""));

    rest = rest
      .replace(/\bFEATURE\b/i, "")
      .replace(/\bTODAY'?S\s+CONDITION\b/i, "")
      .replace(/\bRECOMMENDED\s+IMPROVEMENTS\b/i, "")
      .trim();

    // prevent bleed (Skylights swallowing Wall insulation, etc.)
    rest = truncateAtAnyFeature(rest, cur.feature, features);

    let todays_condition = rest ? rest : "N/A";
    let recommendation = "";

    // ---- Priority splitting rules ----
    if (section === "priority") {
      const m = WHEN_REPLACING_RE.exec(rest);
      if (m && typeof m.index === "number") {
        const before = collapseSpaces(rest.slice(0, m.index));
        const after = collapseSpaces(rest.slice(m.index));
        todays_condition = before || "N/A";
        recommendation = after || "";
      }

      if (/envelope\/air\s*sealing/i.test(cur.feature)) {
        const recPhrase = /professionally\s+air\s+seal/i;
        if (recPhrase.test(rest)) {
          recommendation = "Professionally air seal";

          const mNot = rest.match(/\bNot\b[^.]{0,80}sealed/i);
          if (mNot?.[0]) {
            todays_condition = collapseSpaces(mNot[0]);
          } else if (!todays_condition || todays_condition === "N/A") {
            todays_condition = collapseSpaces(rest.replace(recPhrase, "").trim()) || "N/A";
          }
        }
      }

      if (/air\s*conditioner/i.test(cur.feature)) {
        const mSeer = seg.match(/(\d+(?:\.\d+)?)\s*SEER\b/i);
        if (mSeer?.[1]) todays_condition = `${mSeer[1]} SEER`;
      }
    }

    // ---- Additional splitting rules ----
    if (section === "additional") {
      const mv = REC_VERB_RE.exec(rest);
      if (mv && typeof mv.index === "number") {
        const before = collapseSpaces(rest.slice(0, mv.index));
        const after = collapseSpaces(rest.slice(mv.index));

        if (after.length >= 8) {
          todays_condition = before || "N/A";
          recommendation = after;
        }
      }

      if (/solar\s*pv/i.test(cur.feature)) {
        const mCap = seg.match(/Capacity\s+of\s+(\d+(?:\.\d+)?)\s*kW\s*in\s*DC/i);
        if (mCap?.[1]) todays_condition = `Capacity of ${mCap[1]} kW in DC`;
      }
    }

    out.push({
      section,
      feature: cur.feature,
      todays_condition: todays_condition || "N/A",
      recommendation: recommendation || "",
    });
  }

  return out;
}

function parsePriorityHeuristic(linesRaw: string[]): HesSuggestionRow[] {
  const lines = linesRaw
    .map((x: string) => fixJoinedWords(normLine(x)))
    .filter((x: string) => Boolean(x));

  let startIdx = 0;
  const headerIdx = lines.findIndex((l: string) => /^FEATURE\b/i.test(l));
  if (headerIdx !== -1) startIdx = headerIdx + 1;

  const body = lines.slice(startIdx);

  const out: HesSuggestionRow[] = [];

  for (const line of body) {
    if (/^\d+\.\s+To achieve/i.test(line)) break;
    if (/^\d+\.\s+Today'?s Condition/i.test(line)) break;
    if (/^ADDITIONAL ENERGY RECOMMENDATIONS/i.test(line)) break;
    if (/^PRIORITY ENERGY IMPROVEMENTS/i.test(line)) break;

    const l0 = fixJoinedWords(normLine(line));
    if (!l0) continue;
    if (/^FEATURE\b/i.test(l0)) continue;

    const parts = l0.split(/\s{2,}/).map(collapseSpaces).filter(Boolean);
    if (parts.length === 0) continue;

    const feature = toTitle(parts[0] || "");
    const todays_condition = parts[1] || "N/A";
    const recommendation = parts.slice(2).join(" ").trim();

    if (feature.length < 3) continue;

    out.push({
      section: "priority",
      feature,
      todays_condition,
      recommendation,
    });
  }

  return out;
}

function buildTemplateRows(): HesSuggestionRow[] {
  const pri = PRIORITY_FEATURES.map((f) => ({
    section: "priority" as const,
    feature: f,
    todays_condition: "N/A",
    recommendation: "",
  }));

  const add = ADDITIONAL_FEATURES.map((f) => ({
    section: "additional" as const,
    feature: f,
    todays_condition: "N/A",
    recommendation: "",
  }));

  return [...pri, ...add];
}

function mergeIntoTemplate(
  template: HesSuggestionRow[],
  parsed: HesSuggestionRow[]
): HesSuggestionRow[] {
  const map = new Map<string, HesSuggestionRow>();

  for (const r of parsed) {
    const k = `${r.section}|${normKey(r.feature)}`;
    map.set(k, r);
  }

  return template.map((t) => {
    const k = `${t.section}|${normKey(t.feature)}`;
    const hit = map.get(k);
    if (!hit) return t;

    return {
      ...t,
      todays_condition: hit.todays_condition || t.todays_condition,
      recommendation: hit.recommendation || t.recommendation,
    };
  });
}

function parseHesSuggestions(text: string): HesSuggestionRow[] {
  const lines = text.split("\n").map((x: string) => fixJoinedWords(normLine(x)));

  const pri = findSectionRange(lines, /^PRIORITY ENERGY IMPROVEMENTS/i);
  const add = findSectionRange(lines, /^ADDITIONAL ENERGY RECOMMENDATIONS/i);

  const parsed: HesSuggestionRow[] = [];

  if (pri) {
    const priText = lines.slice(pri.start, pri.end).join("\n");

    const anchoredPri = parseByFeatureAnchors("priority", priText, PRIORITY_FEATURES);
    parsed.push(...anchoredPri);

    if (anchoredPri.length === 0) {
      parsed.push(...parsePriorityHeuristic(lines.slice(pri.start, pri.end)));
    }
  }

  if (add) {
    const addText = lines.slice(add.start, add.end).join("\n");
    const anchoredAdd = parseByFeatureAnchors("additional", addText, ADDITIONAL_FEATURES);
    parsed.push(...anchoredAdd);
  }

  const seen = new Set<string>();
  const uniqueParsed = parsed.filter((x: HesSuggestionRow) => {
    const k = `${x.section}|${normKey(x.feature)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const template = buildTemplateRows();
  return mergeIntoTemplate(template, uniqueParsed);
}

function parseHesSuggestionsFromText(text: string, jobId: string): HesSuggestionRow[] {
  const suggestions = parseHesSuggestions(text);

  logHes(jobId, `text-table: emitted ${suggestions.length} row(s)`);
  if (isHesDebugOn()) {
    for (const row of suggestions.slice(0, 14)) logHes(jobId, `row:`, row);
  }

  return suggestions;
}

// -----------------------------
// OUTPUT TYPES + MAIN FUNCTIONS
// -----------------------------
export type HesParseOutput = {
  generated_at: string;

  hes_score: number | null;
  annual_energy_cost: number | null;
  solar_generation_kwh: number | null;
  carbon_footprint: number | null;

  home_location: string | null;
  year_built: number | null;
  heated_floor_area_sqft: number | null;
  bedrooms: number | null;

  suggestions: HesSuggestionRow[];

  existing_conditions: string[];
  recommendations: string[];

  debug: {
    parser_used: "pdf-parse-text";
    text_excerpt: string;
    file: { filename: string | null; content_type: string | null; storage_path: string };
    parsed: {
      suggestions_count: number;
      has_priority: boolean;
      has_additional: boolean;
    };
    table_debug: {
      rows_emitted: number;
      sample_rows: HesSuggestionRow[];
    };
    solar_debug: {
      found: boolean;
      sample: string;
    };
  };
};

export type GenerateHesSnapshotResult = {
  jobId: string;
  generated_at: string;
  hesText: string;
  output: HesParseOutput;
  suggestionSummary: string;
  file: { filename: string | null; content_type: string | null; storage_path: string };
};

export async function buildHesParseForJob(
  admin: any,
  jobId: string
): Promise<GenerateHesSnapshotResult> {
  const { data: files, error: filesErr } = await admin
    .from("admin_job_files")
    .select("id, job_id, storage_path, filename, content_type, created_at")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (filesErr) throw new Error(`Failed to load job files: ${filesErr.message}`);

  const pdfFile =
    (files || []).find((f: any) => s(f.content_type).toLowerCase().includes("pdf")) ||
    (files || []).find((f: any) => s(f.filename).toLowerCase().endsWith(".pdf")) ||
    null;

  if (!pdfFile?.storage_path) {
    throw new Error("No PDF file found for this job (upload HES PDF first).");
  }

  const { data: dl, error: dlErr } = await admin.storage
    .from(BUCKET)
    .download(pdfFile.storage_path);

  if (dlErr || !dl) {
    throw new Error(
      `Failed to download PDF from storage: ${dlErr?.message || "unknown"}`
    );
  }

  const buffer = Buffer.from(await dl.arrayBuffer());
  const text = await extractTextFromPdfBuffer(buffer);

  if (!text) {
    throw new Error(
      "Parsed PDF but got no text. This usually means the PDF is scanned images (needs OCR later)."
    );
  }

  logHes(jobId, `pdf-parse: extracted ${text.length} chars`);

  const hes_score = pickScore(text);
  const annual_energy_cost = pickAnnualCost(text);
  const solar_generation_kwh = pickSolarGenerationKwh(text);
  const carbon_footprint = pickCarbonFootprint(text);

  const home_profile = pickHomeProfile(text);

  const suggestions = parseHesSuggestionsFromText(text, jobId);
  logHes(jobId, `text-table: emitted ${suggestions.length} suggestion rows`);

  const existing_conditions = suggestions
    .map((x: HesSuggestionRow) => `${x.feature}: ${x.todays_condition || "—"}`.trim())
    .slice(0, 80);

  const recommendations = suggestions
    .map((x: HesSuggestionRow) => `${x.feature}: ${x.recommendation || "—"}`.trim())
    .slice(0, 80);

  const generated_at = new Date().toISOString();

  const flat = text.replace(/\s+/g, " ");
  const solarIdx = flat.toLowerCase().indexOf("solar generation");
  const solarSample =
    solarIdx >= 0 ? flat.slice(solarIdx, Math.min(flat.length, solarIdx + 320)) : "";

  const output: HesParseOutput = {
    generated_at,
    hes_score,
    annual_energy_cost,
    solar_generation_kwh,
    carbon_footprint,
    home_location: home_profile?.location ?? null,
    year_built: home_profile?.year_built ?? null,
    heated_floor_area_sqft: home_profile?.heated_floor_area_sqft ?? null,
    bedrooms: home_profile?.bedrooms ?? null,
    suggestions,
    existing_conditions,
    recommendations,
    debug: {
      parser_used: "pdf-parse-text",
      text_excerpt: text.slice(0, 4200),
      file: {
        filename: pdfFile.filename ?? null,
        content_type: pdfFile.content_type ?? null,
        storage_path: pdfFile.storage_path,
      },
      parsed: {
        suggestions_count: suggestions.length,
        has_priority: suggestions.some((x: HesSuggestionRow) => x.section === "priority"),
        has_additional: suggestions.some((x: HesSuggestionRow) => x.section === "additional"),
      },
      table_debug: {
        rows_emitted: suggestions.length,
        sample_rows: suggestions.slice(0, 12),
      },
      solar_debug: {
        found: solar_generation_kwh != null,
        sample: solarSample,
      },
    },
  };

  const suggestionSummary =
    suggestions
      .filter((x) => x.recommendation && x.recommendation !== "—")
      .slice(0, 8)
      .map((x: HesSuggestionRow) => `${x.feature}: ${x.recommendation}`.trim())
      .filter(Boolean)
      .join(" • ") || "No recommendations extracted.";

  return {
    jobId,
    generated_at,
    hesText: text,
    output,
    suggestionSummary,
    file: {
      filename: pdfFile.filename ?? null,
      content_type: pdfFile.content_type ?? null,
      storage_path: pdfFile.storage_path,
    },
  };
}

export async function generateAndSaveHesSnapshot(
  admin: any,
  jobId: string
): Promise<{ snapshotId: string; output: HesParseOutput }> {
  const built = await buildHesParseForJob(admin, jobId);

  const { data: inserted, error: insertErr } = await admin
    .from("admin_job_snapshots")
    .insert({
      job_id: jobId,
      status: "completed",
      generated_at: built.generated_at,
      input_data: { hes_text: built.hesText },
      output_data: built.output,
      suggestion: built.suggestionSummary,
    })
    .select("id")
    .single();

  if (insertErr) throw new Error(`Failed to save snapshot: ${insertErr.message}`);
  if (!inserted?.id) throw new Error("Failed to save snapshot: no id returned");

  const newSnapshotId = String(inserted.id);
  logHes(jobId, `snapshot: created admin_job_snapshots.id=${newSnapshotId}`);

  // ✅ Build + persist upgrade recommendations (does not block snapshot success)
  try {
    logHes(jobId, `snapshot: using admin_job_snapshots.id=${newSnapshotId}`);

    // Sanity: ensure the snapshot row exists (prevents confusing FK failures later)
    const { data: snapExists, error: snapChkErr } = await admin
      .from("admin_job_snapshots")
      .select("id")
      .eq("id", newSnapshotId)
      .maybeSingle();

    if (snapChkErr) throw snapChkErr;
    if (!snapExists?.id) {
      throw new Error(
        `Snapshot id not found in admin_job_snapshots: ${newSnapshotId} (table mismatch or insert failed)`
      );
    }

    const recs = await buildSystemRecommendationsFromHes(
      admin,
      (built.output?.suggestions ?? []) as any
    );

    const recRes = await persistSnapshotRecommendations({
      admin,
      snapshotId: newSnapshotId, // ✅ IMPORTANT
      jobId,
      recommendations: recs,
    });

    // If you dropped in the updated persistSnapshotRecommendations.ts, it returns ok/inserted
    if (recRes && typeof recRes === "object" && "ok" in recRes) {
      logHes(
        jobId,
        `upgrade-recs: ok=${(recRes as any).ok} inserted=${(recRes as any).inserted} deleted=${(recRes as any).deleted ?? 0}`
      );
    } else {
      // fallback if old function signature is still in place
      logHes(jobId, `upgrade-recs: attempted ${recs.length} row(s)`);
    }
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.warn(`[HES][${jobId}] upgrade-recs: failed to persist`, e?.message || e);
  }

  // ✅ Build + persist upgrade recommendation cards (incentives + ROI)
  // Stores report-ready model in admin_job_snapshots.output_data.upgrade_cards
  try {
    const { data: jobRow, error: jobErr } = await admin
      .from("admin_jobs")
      .select("zip")
      .eq("id", jobId)
      .maybeSingle();

    if (jobErr) throw jobErr;

    const zip = String(jobRow?.zip || "").trim();
    if (!zip) {
      logHes(jobId, `upgrade-cards: skipped (missing admin_jobs.zip)`);
    } else {
      const upgrade_cards = await buildSnapshotUpgradeCards({
        snapshotId: newSnapshotId, // ✅ IMPORTANT
        zip,
        regions: null,
        incomeQualified: null,
      });

      // Merge into output_data (keep all existing output keys)
      const nextOutput = {
        ...(built.output as any),
        upgrade_cards,
      };

      const { error: updErr } = await admin
        .from("admin_job_snapshots")
        .update({ output_data: nextOutput })
        .eq("id", newSnapshotId); // ✅ IMPORTANT

      if (updErr) throw updErr;

      logHes(
        jobId,
        `upgrade-cards: attached ${upgrade_cards.length} card(s) to admin_job_snapshots.output_data`
      );
    }
  } catch (e: any) {
    // non-blocking — snapshot generation should still succeed
    // eslint-disable-next-line no-console
    console.warn(`[HES][${jobId}] upgrade-cards: failed`, e?.message || e);
  }

  // Mark job ready (non-blocking, but we'd like to know if it fails)
  const { error: readyErr } = await admin
    .from("admin_jobs")
    .update({ response_status: "ready" })
    .eq("id", jobId);

  if (readyErr) {
    // eslint-disable-next-line no-console
    console.warn(
      `[HES][${jobId}] admin_jobs: failed to set response_status=ready`,
      readyErr
    );
  }

  return { snapshotId: newSnapshotId, output: built.output };
}
