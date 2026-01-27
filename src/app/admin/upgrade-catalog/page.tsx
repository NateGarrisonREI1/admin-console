// src/app/admin/upgrade-catalog/page.tsx
import { supabaseAdmin } from "@/lib/supabase/server";
import UpgradeCatalogConsole from "./_components/UpgradeCatalogConsole";
import { listUpgradeAssumptionHealth, listUpgradeTypesLite } from "./_actions";

type UpgradeRow = {
  id: string;
  display_name: string;
  description: string | null;
  feature_key: string;
  lead_class: "equipment" | "service";
  intent_keys: string[] | null;
  sort_rank: number | null;
  is_active: boolean | null;
};

type UsageRow = {
  upgrade_catalog_id: string;
  used_count: number | null;
  last_used_at: string | null;
};

type MediaRow = {
  upgrade_catalog_id: string;
  kind: "storage" | "external";
  storage_bucket: string | null;
  storage_path: string | null;
  external_url: string | null;
};

function asArray<T = any>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export default async function UpgradeCatalogPage() {
  const admin = supabaseAdmin;

  // 1) Canonical catalog rows
  const catRes = await admin
    .from("upgrade_catalog")
    .select(
      [
        "id",
        "display_name",
        "description",
        "feature_key",
        "lead_class",
        "intent_keys",
        "sort_rank",
        "is_active",
      ].join(",")
    )
    .order("feature_key", { ascending: true })
    .order("sort_rank", { ascending: true })
    .order("display_name", { ascending: true });

  if (catRes.error) {
    return (
      <div className="p-6">
        <div className="text-lg font-bold">Upgrade Catalog</div>
        <pre className="mt-2 whitespace-pre-wrap text-sm text-rose-600">
          {catRes.error.message}
        </pre>
      </div>
    );
  }

  const catalog = asArray<UpgradeRow>(catRes.data);

  // 2) Usage metrics (optional)
  const useRes = await admin
    .from("v_upgrade_catalog_usage")
    .select("upgrade_catalog_id, used_count, last_used_at");

  const usageRows = useRes.error ? [] : asArray<UsageRow>(useRes.data);
  const usageById = new Map<string, UsageRow>();
  for (const u of usageRows) {
    if (u?.upgrade_catalog_id) usageById.set(u.upgrade_catalog_id, u);
  }

  // 3) Media (optional)
  const mediaRes = await admin
    .from("upgrade_catalog_media")
    .select("upgrade_catalog_id, kind, storage_bucket, storage_path, external_url");

  const mediaRows = mediaRes.error ? [] : asArray<MediaRow>(mediaRes.data);
  const mediaById = new Map<string, MediaRow>();
  for (const m of mediaRows) {
    if (m?.upgrade_catalog_id) mediaById.set(m.upgrade_catalog_id, m);
  }

  // 4) Assumptions health + upgrade types (optional)
  let health: any[] = [];
  let healthErrMsg: string | null = null;
  try {
    health = (await listUpgradeAssumptionHealth()) as any[];
  } catch (e: any) {
    healthErrMsg = e?.message || String(e);
    health = [];
  }

  let upgradeTypes: any[] = [];
  let upgradeTypesErrMsg: string | null = null;
  try {
    upgradeTypes = (await listUpgradeTypesLite()) as any[];
  } catch (e: any) {
    upgradeTypesErrMsg = e?.message || String(e);
    upgradeTypes = [];
  }

  // 5) Feature settings (optional)
  const { data: featureSettingsRows, error: featureSettingsErr } = await admin
    .from("admin_upgrade_feature_settings")
    .select("feature_key,is_priority,priority_rank");

  const featureSettings: Record<
    string,
    { is_priority?: boolean | null; priority_rank?: number | null }
  > = {};

  if (!featureSettingsErr && featureSettingsRows) {
    for (const r of featureSettingsRows as any[]) {
      const k = String(r.feature_key || "").trim();
      if (!k) continue;
      featureSettings[k] = {
        is_priority: r.is_priority ?? false,
        priority_rank: r.priority_rank ?? null,
      };
    }
  }

  // 6) Merge into UI shape
  const merged = catalog.map((r) => {
    const u = usageById.get(r.id);
    const m = mediaById.get(r.id);

    return {
      ...r,
      used_count: u?.used_count ?? 0,
      last_used_at: u?.last_used_at ?? null,
      chosen_count: 0,
      error_count: 0,

      image_kind: m?.kind ?? null,
      image_storage_bucket: m?.storage_bucket ?? null,
      image_storage_path: m?.storage_path ?? null,
      image_external_url: m?.external_url ?? null,
    };
  });

  return (
    <div className="p-6">
      <UpgradeCatalogConsole
        rows={merged as any}
        health={health as any}
        upgradeTypes={upgradeTypes as any}
        featureSettings={featureSettings}
      />

      {healthErrMsg ? (
        <div className="mt-4 text-xs text-amber-700">
          Assumptions health unavailable: {healthErrMsg}
        </div>
      ) : null}

      {upgradeTypesErrMsg ? (
        <div className="mt-2 text-xs text-amber-700">
          Upgrade types unavailable: {upgradeTypesErrMsg}
        </div>
      ) : null}

      {featureSettingsErr ? (
        <div className="mt-2 text-xs text-amber-700">
          Feature settings unavailable: {featureSettingsErr.message}
        </div>
      ) : null}

      {useRes.error ? (
        <div className="mt-2 text-xs text-amber-700">
          Usage metrics unavailable: {useRes.error.message}
        </div>
      ) : null}

      {mediaRes.error ? (
        <div className="mt-2 text-xs text-amber-700">
          Image data unavailable: {mediaRes.error.message}
        </div>
      ) : null}
    </div>
  );
}
