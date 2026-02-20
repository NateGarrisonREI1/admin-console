// GET /api/migrate — Run pending table migrations
// Trigger by visiting http://localhost:3000/api/migrate
//
// Requires the exec_sql() postgres function to exist. If it doesn't,
// the route returns the bootstrap SQL to paste into the Supabase SQL editor.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// ─── Bootstrap SQL (paste into Supabase SQL editor if exec_sql is missing) ──

const BOOTSTRAP_SQL = `
CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN EXECUTE query; END;
$$;
`;

// ─── Migration Steps ────────────────────────────────────────────────

const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: "create_rei_contractor_network",
    sql: `
      CREATE TABLE IF NOT EXISTS rei_contractor_network (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contractor_id UUID NOT NULL,
        member_type TEXT NOT NULL DEFAULT 'contractor',
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        company_name TEXT,
        service_areas TEXT[] DEFAULT '{}',
        services TEXT[] DEFAULT '{}',
        added_by UUID,
        status TEXT DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(contractor_id)
      );
    `,
  },
  {
    name: "rei_contractor_network_rls_and_indexes",
    sql: `
      ALTER TABLE rei_contractor_network ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rei_contractor_network' AND policyname='admin_full_rei_network') THEN
          CREATE POLICY "admin_full_rei_network" ON rei_contractor_network FOR ALL
            USING (EXISTS (SELECT 1 FROM app_profiles WHERE id = auth.uid() AND role = 'admin'));
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rei_contractor_network' AND policyname='service_role_rei_network') THEN
          CREATE POLICY "service_role_rei_network" ON rei_contractor_network FOR ALL USING (true);
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_rei_network_contractor ON rei_contractor_network(contractor_id);
      CREATE INDEX IF NOT EXISTS idx_rei_network_status ON rei_contractor_network(status);
      CREATE INDEX IF NOT EXISTS idx_rei_network_member_type ON rei_contractor_network(member_type);
    `,
  },
  {
    name: "create_leaf_completions",
    sql: `
      CREATE TABLE IF NOT EXISTS leaf_completions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        leaf_report_id UUID NOT NULL,
        homeowner_name TEXT,
        homeowner_email TEXT,
        homeowner_phone TEXT,
        property_address TEXT,
        city TEXT,
        state TEXT,
        zip TEXT,
        source_broker_id UUID,
        source_assessor_id UUID,
        energy_score INTEGER,
        recommendations JSONB,
        completed_at TIMESTAMPTZ DEFAULT now(),
        cta_clicked BOOLEAN DEFAULT false,
        cta_clicked_at TIMESTAMPTZ,
        cta_service_type TEXT,
        lead_created BOOLEAN DEFAULT false,
        lead_id UUID,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `,
  },
  {
    name: "leaf_completions_rls_and_indexes",
    sql: `
      ALTER TABLE leaf_completions ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leaf_completions' AND policyname='admin_full_leaf_completions') THEN
          CREATE POLICY "admin_full_leaf_completions" ON leaf_completions FOR ALL
            USING (EXISTS (SELECT 1 FROM app_profiles WHERE id = auth.uid() AND role = 'admin'));
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_leaf_completions_report ON leaf_completions(leaf_report_id);
      CREATE INDEX IF NOT EXISTS idx_leaf_completions_cta ON leaf_completions(cta_clicked);
      CREATE INDEX IF NOT EXISTS idx_leaf_completions_lead ON leaf_completions(lead_id);
      CREATE INDEX IF NOT EXISTS idx_leaf_completions_broker ON leaf_completions(source_broker_id);
      CREATE INDEX IF NOT EXISTS idx_leaf_completions_assessor ON leaf_completions(source_assessor_id);
    `,
  },
  {
    name: "create_app_settings",
    sql: `
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value JSONB,
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `,
  },
  {
    name: "app_settings_rls",
    sql: `
      ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_settings' AND policyname='admin_full_app_settings') THEN
          CREATE POLICY "admin_full_app_settings" ON app_settings FOR ALL
            USING (EXISTS (SELECT 1 FROM app_profiles WHERE id = auth.uid() AND role = 'admin'));
        END IF;
      END $$;
    `,
  },
  {
    name: "create_portal_user_settings",
    sql: `
      CREATE TABLE IF NOT EXISTS portal_user_settings (
        user_id UUID PRIMARY KEY,
        company_name TEXT,
        company_address TEXT,
        company_phone TEXT,
        company_logo_url TEXT,
        invoice_reply_email TEXT,
        invoice_footer_text TEXT,
        schedule_start_time TIME DEFAULT '08:00',
        schedule_end_time TIME DEFAULT '17:00',
        blocked_days TEXT[] DEFAULT '{}',
        notification_new_job BOOLEAN DEFAULT true,
        notification_reschedule BOOLEAN DEFAULT true,
        notification_payment BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `,
  },
  {
    name: "portal_user_settings_rls",
    sql: `
      ALTER TABLE portal_user_settings ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='portal_user_settings' AND policyname='users_own_settings') THEN
          CREATE POLICY "users_own_settings" ON portal_user_settings FOR ALL
            USING (user_id = auth.uid());
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='portal_user_settings' AND policyname='admin_full_portal_settings') THEN
          CREATE POLICY "admin_full_portal_settings" ON portal_user_settings FOR ALL
            USING (EXISTS (SELECT 1 FROM app_profiles WHERE id = auth.uid() AND role = 'admin'));
        END IF;
      END $$;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='portal_user_settings' AND policyname='service_role_portal_settings') THEN
          CREATE POLICY "service_role_portal_settings" ON portal_user_settings FOR ALL USING (true);
        END IF;
      END $$;
    `,
  },
  {
    name: "add_catalog_columns_hes_schedule",
    sql: `
      DO $$ BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='hes_schedule') THEN
          ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS service_category_id UUID;
          ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS service_tier_id UUID;
          ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS addon_ids UUID[] DEFAULT '{}';
          ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS catalog_base_price NUMERIC(10,2);
          ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS catalog_addon_total NUMERIC(10,2) DEFAULT 0;
          ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS catalog_total_price NUMERIC(10,2);
          ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS service_name TEXT;
          ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS tier_name TEXT;
        END IF;
      END $$;
    `,
  },
  {
    name: "add_catalog_columns_inspector_schedule",
    sql: `
      DO $$ BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='inspector_schedule') THEN
          ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS service_category_id UUID;
          ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS service_tier_id UUID;
          ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS addon_ids UUID[] DEFAULT '{}';
          ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS catalog_base_price NUMERIC(10,2);
          ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS catalog_addon_total NUMERIC(10,2) DEFAULT 0;
          ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS catalog_total_price NUMERIC(10,2);
          ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS service_name TEXT;
          ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS tier_name TEXT;
        END IF;
      END $$;
    `,
  },
  {
    name: "create_job_activity_log",
    sql: `
      CREATE TABLE IF NOT EXISTS job_activity_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL,
        actor_id UUID,
        actor_name TEXT,
        actor_role TEXT DEFAULT 'system',
        action TEXT NOT NULL,
        title TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_activity_log_job ON job_activity_log(job_id);
      CREATE INDEX IF NOT EXISTS idx_activity_log_created ON job_activity_log(created_at);
    `,
  },
  {
    name: "job_activity_log_rls",
    sql: `
      ALTER TABLE job_activity_log ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='job_activity_log' AND policyname='service_role_activity_log') THEN
          CREATE POLICY "service_role_activity_log" ON job_activity_log FOR ALL USING (true);
        END IF;
      END $$;
    `,
  },
  {
    name: "add_tech_timestamps_hes_schedule",
    sql: `
      DO $$ BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='hes_schedule') THEN
          ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS tech_en_route_at TIMESTAMPTZ;
          ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS tech_arrived_at TIMESTAMPTZ;
          ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS job_started_at TIMESTAMPTZ;
          ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS job_completed_at TIMESTAMPTZ;
        END IF;
      END $$;
    `,
  },
  {
    name: "add_tech_timestamps_inspector_schedule",
    sql: `
      DO $$ BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='inspector_schedule') THEN
          ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS tech_en_route_at TIMESTAMPTZ;
          ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS tech_arrived_at TIMESTAMPTZ;
          ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS job_started_at TIMESTAMPTZ;
          ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS job_completed_at TIMESTAMPTZ;
        END IF;
      END $$;
    `,
  },
  {
    name: "extend_contractor_leads",
    sql: `
      DO $$ BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='contractor_leads') THEN
          ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS routing_channel TEXT DEFAULT 'open_market';
          ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS exclusive_contractor_id UUID;
          ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS is_free_assignment BOOLEAN DEFAULT false;
          ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS network_release_at TIMESTAMPTZ;
          ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
          ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS leaf_report_id UUID;
          ALTER TABLE contractor_leads ADD COLUMN IF NOT EXISTS leaf_completion_id UUID;
        END IF;
      END $$;
    `,
  },
  {
    name: "extend_system_leads",
    sql: `
      DO $$ BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='system_leads') THEN
          ALTER TABLE system_leads ADD COLUMN IF NOT EXISTS routing_channel TEXT DEFAULT 'open_market';
          ALTER TABLE system_leads ADD COLUMN IF NOT EXISTS exclusive_contractor_id UUID;
          ALTER TABLE system_leads ADD COLUMN IF NOT EXISTS is_free_assignment BOOLEAN DEFAULT false;
          ALTER TABLE system_leads ADD COLUMN IF NOT EXISTS network_release_at TIMESTAMPTZ;
          ALTER TABLE system_leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
          ALTER TABLE system_leads ADD COLUMN IF NOT EXISTS leaf_report_id UUID;
          ALTER TABLE system_leads ADD COLUMN IF NOT EXISTS leaf_completion_id UUID;
        END IF;
      END $$;
    `,
  },
  {
    name: "add_stripe_columns_hes_schedule",
    sql: `
      DO $$ BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='hes_schedule') THEN
          ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS stripe_payment_link_id TEXT;
          ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'none';
          ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS payment_id TEXT;
          ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
          ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMPTZ;
          ALTER TABLE hes_schedule ADD COLUMN IF NOT EXISTS leaf_delivery_status TEXT DEFAULT 'none';
        END IF;
      END $$;
    `,
  },
  {
    name: "add_stripe_columns_inspector_schedule",
    sql: `
      DO $$ BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='inspector_schedule') THEN
          ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS stripe_payment_link_id TEXT;
          ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'none';
          ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS payment_id TEXT;
          ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
          ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMPTZ;
          ALTER TABLE inspector_schedule ADD COLUMN IF NOT EXISTS leaf_delivery_status TEXT DEFAULT 'none';
        END IF;
      END $$;
    `,
  },
];

// ─── Route Handler ──────────────────────────────────────────────────

type Result = { name: string; ok: boolean; error?: string };

export async function GET() {
  // 1. Check if exec_sql helper function exists
  const { error: probe } = await supabaseAdmin.rpc("exec_sql", {
    query: "SELECT 1",
  });

  if (probe) {
    // exec_sql doesn't exist — return bootstrap instructions + full SQL dump
    const fullSql = [
      BOOTSTRAP_SQL,
      ...MIGRATIONS.map((m) => `-- ${m.name}\n${m.sql}`),
    ].join("\n\n");

    return NextResponse.json(
      {
        success: false,
        error: "exec_sql() function not found. Create it first.",
        instructions:
          "Paste the SQL below into the Supabase SQL Editor and run it. " +
          "Then visit /api/migrate again to verify.",
        sql: fullSql,
      },
      { status: 428 },
    );
  }

  // 2. Run each migration through exec_sql
  const results: Result[] = [];

  for (const m of MIGRATIONS) {
    const { error } = await supabaseAdmin.rpc("exec_sql", { query: m.sql });
    if (error) {
      console.error(`[migrate] ✗ ${m.name}:`, error.message);
      results.push({ name: m.name, ok: false, error: error.message });
    } else {
      console.log(`[migrate] ✓ ${m.name}`);
      results.push({ name: m.name, ok: true });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json(
    { success: allOk, results },
    { status: allOk ? 200 : 207 },
  );
}
