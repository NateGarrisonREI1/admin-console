"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";

const ALLOWED_TABLES = new Set([
  "incentive_programs",
  "incentive_rules",
  "incentives",
  "incentive_zip_programs",
  "utility_rate_assumptions",
  "admin_parameters",
  "incentive_audit_log",
  "v_incentives_by_zip",
]);

function s(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function safeJsonParse(input: string) {
  try {
    return { ok: true as const, value: JSON.parse(input) };
  } catch {
    return { ok: false as const, error: "Invalid JSON" };
  }
}

export async function updateIncentiveRow(formData: FormData) {
  const table = s(formData.get("table")).trim();
  const id = s(formData.get("id")).trim();
  const patchJson = s(formData.get("patch_json")).trim();

  if (!ALLOWED_TABLES.has(table)) throw new Error(`Table not allowed: ${table}`);
  if (!id) throw new Error("Missing id");
  if (!patchJson) throw new Error("Missing patch_json");

  const parsed = safeJsonParse(patchJson);
  if (!parsed.ok) throw new Error(parsed.error);

  const { error } = await supabaseAdmin.from(table).update(parsed.value).eq("id", id);
  if (error) throw new Error(`Update failed: ${error.message}`);

  revalidatePath("/admin/incentives");
}

export async function insertIncentiveRow(formData: FormData) {
  const table = s(formData.get("table")).trim();
  const rowJson = s(formData.get("row_json")).trim();

  if (!ALLOWED_TABLES.has(table)) throw new Error(`Table not allowed: ${table}`);
  if (!rowJson) throw new Error("Missing row_json");

  const parsed = safeJsonParse(rowJson);
  if (!parsed.ok) throw new Error(parsed.error);

  const { error } = await supabaseAdmin.from(table).insert(parsed.value);
  if (error) throw new Error(`Insert failed: ${error.message}`);

  revalidatePath("/admin/incentives");
}

export async function deleteIncentiveRow(formData: FormData) {
  const table = s(formData.get("table")).trim();
  const id = s(formData.get("id")).trim();

  if (!ALLOWED_TABLES.has(table)) throw new Error(`Table not allowed: ${table}`);
  if (!id) throw new Error("Missing id");

  const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
  if (error) throw new Error(`Delete failed: ${error.message}`);

  revalidatePath("/admin/incentives");
}

export type IncentivePreviewResult = {
  ok: boolean;
  mode?: "zip" | "upgrade" | "state";
  error?: string | null;
  meta?: Record<string, any>;
  incentives?: any[];
  totals?: any;
};

async function rpcSafe(name: string, args: any) {
  const { data, error } = await supabaseAdmin.rpc(name as any, args as any);
  return { data, error };
}

export async function previewIncentives(
  _prev: IncentivePreviewResult,
  formData: FormData
): Promise<IncentivePreviewResult> {
  const zip = s(formData.get("zip")).trim();
  const state = s(formData.get("state")).trim();
  const upgrade_catalog_id = s(formData.get("upgrade_catalog_id")).trim();

  // STATE-ONLY MODE (no zip required)
  if (!zip && state) {
    const args = { p_state: state };
    const inc = await rpcSafe("resolve_incentives_by_state", args);

    if (inc.error) {
      return {
        ok: false,
        mode: "state",
        error: `RPC resolve_incentives_by_state failed: ${inc.error.message}`,
        meta: { args },
      };
    }

    return {
      ok: true,
      mode: "state",
      incentives: inc.data ?? [],
      totals: null,
      meta: { args, incentives_rpc: "resolve_incentives_by_state" },
    };
  }

  if (!zip) return { ok: false, error: "Missing ZIP (or pick a State)" };

  const mode: "zip" | "upgrade" = upgrade_catalog_id ? "upgrade" : "zip";
  const args = mode === "upgrade" ? { zip, upgrade_catalog_id } : { zip };

  const incentivesRpc = mode === "upgrade" ? "resolve_incentives_for_upgrade" : "resolve_incentives";
  const inc = await rpcSafe(incentivesRpc, args);

  if (inc.error) {
    return {
      ok: false,
      mode,
      error: `RPC ${incentivesRpc} failed: ${inc.error.message}`,
      meta: { args, tried: incentivesRpc },
    };
  }

  // totals best-effort (only when zip provided)
  let totals: any = null;
  let totals_error: string | null = null;

  const t1 = await rpcSafe("resolve_incentive_totals", args);
  if (!t1.error) {
    totals = t1.data;
  } else {
    totals_error = t1.error.message;
    if (mode === "upgrade") {
      const t2 = await rpcSafe("resolve_incentive_totals", { zip });
      if (!t2.error) {
        totals = t2.data;
        totals_error = null;
      }
    }
  }

  return {
    ok: true,
    mode,
    incentives: inc.data ?? [],
    totals,
    meta: {
      args,
      incentives_rpc: incentivesRpc,
      totals_error,
      counts: { incentives: Array.isArray(inc.data) ? inc.data.length : inc.data ? 1 : 0 },
    },
  };
}
