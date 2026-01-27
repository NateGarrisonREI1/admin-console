// src/lib/recommendations/persistSnapshotRecommendations.ts
import type { HesSystemRecommendation } from "./fromHes";

type PersistRecsResult =
  | { ok: true; inserted: number; deleted: number }
  | { ok: false; inserted: 0; deleted: number; error: any };

function s(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function toTextArray(v: any): string[] | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v.map((x) => s(x)).filter(Boolean).slice(0, 20);
  const raw = s(v).trim();
  if (!raw) return null;
  // accept comma-separated strings
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export async function persistSnapshotRecommendations(args: {
  admin: any;
  snapshotId: string;
  jobId: string;
  recommendations: HesSystemRecommendation[];
}): Promise<PersistRecsResult> {
  const { admin, snapshotId, jobId, recommendations } = args;

  if (!snapshotId) {
    console.error("[snapshot_upgrade_recommendations] missing snapshotId");
    return { ok: false, inserted: 0, deleted: 0, error: "missing snapshotId" };
  }

  // 1) Ensure snapshot exists in admin_job_snapshots (prevents confusing FK failures)
  const { data: snap, error: snapErr } = await admin
    .from("admin_job_snapshots")
    .select("id")
    .eq("id", snapshotId)
    .maybeSingle();

  if (snapErr || !snap?.id) {
    const err = snapErr ?? {
      message: `Snapshot not found in admin_job_snapshots: ${snapshotId}`,
    };
    console.error("[snapshot_upgrade_recommendations] snapshot lookup failed", err);
    return { ok: false, inserted: 0, deleted: 0, error: err };
  }

  // 2) Normalize rows
  const rows = (recommendations || [])
    .map((r) => {
      const chosen = r.matches?.[0] ?? null;

      return {
        snapshot_id: snapshotId,
        job_id: jobId,

        feature_key: r.feature_key ?? null,
        intent_key: r.intent_key ?? null,

        upgrade_catalog_id: chosen?.id ?? null,

        lead_class: r.lead_class ?? null,
        confidence: r.confidence ?? null,

        chosen: Boolean(chosen),
        sort_rank: null,

        // raw fields for debugging / audit
        feature_raw: r.feature_raw ?? null,
        todays_condition_raw: r.todays_condition_raw ?? null,
        recommendation_raw: r.recommendation_raw ?? null,

        // optional bullets used by upgrade-cards builder
        // (safe even if some rows don’t have it)
        bullets: toTextArray((r as any).bullets) ?? null,

        error_code: chosen ? null : "NO_MATCH",
        error_message: chosen ? null : "No upgrade_catalog match found",
      };
    })
    .filter(Boolean);

  if (!rows.length) {
    return { ok: true, inserted: 0, deleted: 0 };
  }

  // 3) Make regenerate idempotent: delete prior recs for this snapshot first
  const { error: delErr, count: deletedCount } = await admin
    .from("snapshot_upgrade_recommendations")
    .delete({ count: "exact" })
    .eq("snapshot_id", snapshotId);

  if (delErr) {
    // not fatal; proceed to insert anyway
    console.warn("[snapshot_upgrade_recommendations] delete prior recs failed", delErr);
  }

  const deleted = typeof deletedCount === "number" ? deletedCount : 0;

  // 4) Insert
  const { data, error: insErr } = await admin
    .from("snapshot_upgrade_recommendations")
    .insert(rows)
    .select("id");

  if (insErr) {
    console.error("[snapshot_upgrade_recommendations] insert failed", insErr);
    // intentionally do NOT throw — snapshot generation should still succeed
    return { ok: false, inserted: 0, deleted, error: insErr };
  }

  const inserted = Array.isArray(data) ? data.length : rows.length;

  console.log(
    `[HES][${jobId}] upgrade-recs: saved ${inserted} row(s) to snapshot_upgrade_recommendations (snapshot_id=${snapshotId})`
  );

  return { ok: true, inserted, deleted };
}
