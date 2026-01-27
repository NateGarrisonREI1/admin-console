// src/app/admin/jobs/[id]/_components/UpgradeCardsCard.tsx
import UpgradeCardsList from "./UpgradeCardsList";
import AdminDropdownCard from "./AdminDropdownCard";
import { supabaseAdmin } from "@/lib/supabase/server";

function s(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function n(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const num = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(num) ? num : null;
}

// Shape is intentionally loose; we render defensively.
export type UpgradeCard = {
  title?: string;
  display_name?: string;
  feature_key?: string;
  upgrade_catalog_id?: string;

  install_cost_min?: number | null;
  install_cost_max?: number | null;
  annual_savings_min?: number | null;
  annual_savings_max?: number | null;
  net_cost_min?: number | null;
  net_cost_max?: number | null;
  payback_years_min?: number | null;
  payback_years_max?: number | null;

  incentives?: any[];
  incentive_total_min?: number | null;
  incentive_total_max?: number | null;

  bullets?: string[];
  notes?: string | null;
  tags?: string[];
};

type SnapshotLite = {
  id?: string | null;
  generated_at?: string | null;
  output_data?: any;
};

export default async function UpgradeCardsCard(props: {
  jobId: string;
  snapshot?: SnapshotLite | null;
}) {
  const { jobId, snapshot } = props;

  let snap: SnapshotLite | null = snapshot ?? null;
  let errorMsg = "";

  if (!snap) {
    const { data, error } = await supabaseAdmin
      .from("admin_job_snapshots")
      .select("id, generated_at, output_data")
      .eq("job_id", jobId)
      .eq("status", "completed")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) errorMsg = s(error.message);
    snap = (data as any) ?? null;
  }

  const output = (snap as any)?.output_data || {};
  const cards: UpgradeCard[] = Array.isArray(output?.upgrade_cards)
    ? output.upgrade_cards
    : [];

  const withRoi = cards.filter(
    (c) => n(c?.payback_years_min) != null || n(c?.payback_years_max) != null
  ).length;

  const missingRoi = cards.length - withRoi;

  if (errorMsg) {
    return (
      <AdminDropdownCard
        title="Upgrade Cards"
        subtitle={`Failed to load snapshot: ${errorMsg}`}
        toggleLabel="Toggle Upgrade Cards"
        defaultOpen
        storageKey={`admin:upgrade-cards:${jobId}`}
        headerRight={
          <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
            Snapshot: —
          </span>
        }
      >
        <div className="p-4 text-sm text-red-600">
          Failed to load snapshot.
        </div>
      </AdminDropdownCard>
    );
  }

  return (
    <AdminDropdownCard
      title="Upgrade Cards"
      subtitle={`Latest snapshot • ${cards.length} cards • ${withRoi} w/ ROI • ${missingRoi} pending${
        snap?.generated_at ? ` • Generated: ${snap.generated_at}` : ""
      }`}
      toggleLabel="Toggle Upgrade Cards"
      defaultOpen
      storageKey={`admin:upgrade-cards:${jobId}`}
      headerRight={
        <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
          Snapshot: {snap?.id ? snap.id.slice(0, 8) : "—"}
        </span>
      }
    >
      {cards.length === 0 ? (
        <div className="p-4">
          <div className="text-sm text-slate-700">
            No upgrade cards found on the latest snapshot.
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Expected at{" "}
            <code className="rounded bg-slate-50 px-1">
              snapshots.output_data.upgrade_cards
            </code>
            .
          </div>
        </div>
      ) : (
        <UpgradeCardsList cards={cards} />
      )}
    </AdminDropdownCard>
  );
}
