-- ============================================
-- SUPABASE CLEANUP SCRIPT
-- Generated from codebase audit: 2026-02-19
-- REVIEW CAREFULLY before running anything!
-- All DROP statements are commented out.
-- ============================================


-- ============================================
-- SECTION 1: INVESTIGATION QUERIES (safe to run)
-- Check row counts on tables NOT referenced in code
-- ============================================

SELECT 'admin_users' as table_name, count(*) as rows FROM admin_users
UNION ALL
SELECT 'admin_job_contacts', count(*) FROM admin_job_contacts
UNION ALL
SELECT 'admin_parameters', count(*) FROM admin_parameters
UNION ALL
SELECT 'admin_schedule_assignments', count(*) FROM admin_schedule_assignments
UNION ALL
SELECT 'job_files', count(*) FROM job_files
UNION ALL
SELECT 'jobs', count(*) FROM jobs
UNION ALL
SELECT 'zip_codes', count(*) FROM zip_codes
ORDER BY table_name;


-- ============================================
-- SECTION 2: CHECK OVERLAPPING TABLES
-- Compare row counts between suspected duplicates
-- ============================================

-- jobs vs admin_jobs
SELECT 'jobs' as tbl, count(*) as rows FROM jobs
UNION ALL
SELECT 'admin_jobs', count(*) FROM admin_jobs;

-- job_files vs admin_job_files
SELECT 'job_files' as tbl, count(*) as rows FROM job_files
UNION ALL
SELECT 'admin_job_files', count(*) FROM admin_job_files;

-- All lead-related tables
SELECT 'leads' as tbl, count(*) as rows FROM leads
UNION ALL SELECT 'system_leads', count(*) FROM system_leads
UNION ALL SELECT 'contractor_leads', count(*) FROM contractor_leads
UNION ALL SELECT 'broker_leads', count(*) FROM broker_leads
UNION ALL SELECT 'direct_leads', count(*) FROM direct_leads
UNION ALL SELECT 'contractor_lead_status', count(*) FROM contractor_lead_status;


-- ============================================
-- SECTION 3: SAFE TO DROP (confirmed not in code, not LEAF)
-- Only tables that are truly orphaned
-- UNCOMMENT to execute after verifying Section 1 results
-- ============================================

-- jobs: 0 rows, in supabase.ts types but NO .from() calls
-- Superseded by admin_jobs. Verify no DB functions reference it first:
--   SELECT routine_name, routine_definition
--   FROM information_schema.routines
--   WHERE routine_definition LIKE '%jobs%' AND routine_schema = 'public';
-- DROP TABLE IF EXISTS jobs CASCADE;

-- job_files: 0 rows, in supabase.ts types but NO .from() calls
-- Superseded by admin_job_files. Same verification needed.
-- DROP TABLE IF EXISTS job_files CASCADE;

-- admin_schedule_assignments: 0 rows, not in types, not in .from()
-- May have been replaced by admin_job_appointments approach
-- DROP TABLE IF EXISTS admin_schedule_assignments CASCADE;


-- ============================================
-- SECTION 4: INVESTIGATE BEFORE DROPPING
-- These need manual verification
-- ============================================

-- admin_users: 1 row — may be used for admin auth
-- Check if this is referenced by any auth triggers or functions:
--   SELECT * FROM admin_users;
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_definition LIKE '%admin_users%' AND routine_schema = 'public';
-- DROP TABLE IF EXISTS admin_users CASCADE;

-- admin_job_contacts: 1 row, in supabase.ts types
-- Has FK to admin_jobs — check if any data is important:
--   SELECT * FROM admin_job_contacts;
-- DROP TABLE IF EXISTS admin_job_contacts CASCADE;

-- admin_parameters: 0 rows, in supabase.ts types
-- May be intended for future configuration use:
--   SELECT * FROM admin_parameters;
-- DROP TABLE IF EXISTS admin_parameters CASCADE;


-- ============================================
-- SECTION 5: RLS AUDIT (safe to run)
-- Check which tables have Row Level Security enabled
-- ============================================

SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;


-- ============================================
-- SECTION 6: TABLES WITH NO INDEXES (safe to run)
-- Find tables with only a primary key index (or none)
-- ============================================

SELECT t.tablename, count(i.indexname) as index_count
FROM pg_tables t
LEFT JOIN pg_indexes i ON t.tablename = i.tablename AND t.schemaname = i.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename
HAVING count(i.indexname) <= 1
ORDER BY t.tablename;


-- ============================================
-- SECTION 7: FK DEPENDENCY CHECK (safe to run)
-- Find all foreign keys referencing tables we might drop
-- ============================================

SELECT
    tc.table_name as referencing_table,
    kcu.column_name as referencing_column,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name IN ('jobs', 'job_files', 'admin_users', 'admin_schedule_assignments', 'admin_job_contacts', 'admin_parameters')
ORDER BY referenced_table, referencing_table;


-- ============================================
-- SECTION 8: DB FUNCTIONS REFERENCING CANDIDATE TABLES (safe to run)
-- Check if any stored procedures/functions use these tables
-- ============================================

SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND (
        routine_definition LIKE '%jobs%'
        OR routine_definition LIKE '%job_files%'
        OR routine_definition LIKE '%admin_users%'
        OR routine_definition LIKE '%admin_schedule_assignments%'
        OR routine_definition LIKE '%admin_job_contacts%'
        OR routine_definition LIKE '%admin_parameters%'
    )
ORDER BY routine_name;


-- ============================================
-- DO NOT DROP — LEAF ENGINE TABLES
-- These belong to the leaf-ss-module and MUST be preserved:
--   snapshots, snapshot_cache, snapshot_upgrade_recommendations
--   system_catalog, system_compatibility, system_leads
--   upgrade_catalog, upgrade_catalog_features, upgrade_catalog_media
--   upgrade_catalog_upgrade_types, upgrade_type_assumptions, upgrade_types
--   utility_rate_assumptions
--   incentive_programs, incentive_rules, incentives
--   zip_codes
--
-- DO NOT DROP — PHASE 8A TABLES
--   rei_contractor_network, leaf_completions, app_settings
--
-- DO NOT DROP — ALL ACTIVE TABLES (45 tables with .from() refs)
-- ============================================
