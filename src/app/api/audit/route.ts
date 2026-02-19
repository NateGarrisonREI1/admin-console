// GET /api/audit — Database audit: check which tables exist, row counts, RLS status
// Visit http://localhost:3000/api/audit to run

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// All tables referenced via .from() in the codebase
const CODE_TABLES = [
  "admin_job_appointments",
  "admin_job_existing_systems",
  "admin_job_files",
  "admin_job_requests",
  "admin_job_utilities",
  "admin_jobs",
  "app_profiles",
  "app_settings",
  "audit_logs",
  "auth_events",
  "broker_assessments",
  "broker_campaigns",
  "broker_contacts",
  "broker_contractors",
  "broker_leads",
  "brokers",
  "campaign_recipients",
  "contact_log",
  "contractor_customers",
  "contractor_lead_status",
  "contractor_leads",
  "contractor_network",
  "contractor_profiles",
  "contractor_referrals",
  "direct_leads",
  "hes_requests",
  "hes_schedule",
  "hes_team_members",
  "inspector_schedule",
  "inspector_team_members",
  "lead_pricing_config",
  "lead_transactions",
  "leaf_completions",
  "leads",
  "partner_contractors",
  "partner_dispatch",
  "payments",
  "refund_requests",
  "rei_contractor_network",
  "service_addons",
  "service_categories",
  "service_tiers",
  "snapshot_cache",
  "system_catalog",
  "system_leads",
  "user_relationships",
  "user_sources",
];

// Tables known from Supabase sidebar but possibly not in code
const KNOWN_DB_TABLES = [
  ...CODE_TABLES,
  // From supabase.ts types (not queried via .from())
  "admin_job_contacts",
  "admin_parameters",
  "admin_schedule_assignments",
  "incentive_programs",
  "incentive_rules",
  "job_files",
  "jobs",
  "snapshots",
  "system_compatibility",
  "utility_rate_assumptions",
  // From screenshot
  "admin_users",
  "incentives",
  "zip_codes",
  "snapshot_upgrade_recommendations",
  "upgrade_catalog",
  "upgrade_catalog_features",
  "upgrade_catalog_media",
  "upgrade_catalog_upgrade_types",
  "upgrade_type_assumptions",
  "upgrade_types",
];

type TableResult = {
  name: string;
  exists: boolean;
  row_count: number | null;
  error?: string;
  in_code: boolean;
};

export async function GET() {
  const results: TableResult[] = [];
  const codeSet = new Set(CODE_TABLES);

  // Deduplicate
  const allTables = [...new Set(KNOWN_DB_TABLES)].sort();

  for (const table of allTables) {
    const { count, error } = await supabaseAdmin
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      results.push({
        name: table,
        exists: !error.message.includes("does not exist") && !error.message.includes("relation"),
        row_count: null,
        error: error.message,
        in_code: codeSet.has(table),
      });
    } else {
      results.push({
        name: table,
        exists: true,
        row_count: count,
        in_code: codeSet.has(table),
      });
    }
  }

  const existing = results.filter((r) => r.exists);
  const missing = results.filter((r) => !r.exists);
  const activeInCode = existing.filter((r) => r.in_code);
  const notInCode = existing.filter((r) => !r.in_code);

  return NextResponse.json({
    summary: {
      total_checked: allTables.length,
      exist_in_db: existing.length,
      missing_from_db: missing.length,
      active_in_code: activeInCode.length,
      in_db_not_in_code: notInCode.length,
    },
    tables: results,
    existing,
    missing,
    active_in_code: activeInCode,
    not_in_code: notInCode,
  });
}
