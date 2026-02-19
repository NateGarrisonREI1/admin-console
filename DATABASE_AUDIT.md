# Supabase Database Audit

## Generated: 2026-02-19 (v2 — with live `/api/audit` data)

### Summary

| Metric | Count |
|--------|-------|
| Total tables in database | 67 |
| Active (`.from()` in code) | 45 |
| LEAF engine (in types/DB, not queried by admin console) | 13 |
| Not in code (investigate) | 6 |
| Phase 8A new tables (keep) | 3 |
| Views | 3 |

---

### ACTIVE — Referenced in codebase via `.from()`

| Table | `.from()` Refs | Domain | Rows |
|-------|---------------|--------|------|
| admin_jobs | 57 | Jobs | 11 |
| app_profiles | 54 | User/Auth | 6 |
| system_leads | 40 | Leads | 15 |
| contractor_lead_status | 28 | Contractor | 3 |
| payments | 26 | Billing | 3 |
| hes_requests | 26 | HES | — |
| contractor_profiles | 22 | Contractor | 2 |
| refund_requests | 16 | Billing | — |
| broker_leads | 16 | Broker | 1 |
| user_relationships | 15 | User | 1 |
| leads | 15 | Leads | 0 |
| broker_contractors | 12 | Broker | 1 |
| rei_contractor_network | 10 | Phase 8A | 0 |
| admin_job_appointments | 10 | Jobs | 7 |
| inspector_schedule | 9 | Schedule | 0 |
| hes_schedule | 9 | HES | 4 |
| campaign_recipients | 9 | Broker | 0 |
| broker_campaigns | 9 | Broker | 0 |
| contractor_customers | 8 | Contractor | 3 |
| brokers | 8 | Broker | 4 |
| broker_contacts | 8 | Broker | 0 |
| snapshot_cache | 7 | LEAF Engine | 0 |
| broker_assessments | 7 | Broker | 2 |
| inspector_team_members | 6 | Schedule | 0 |
| hes_team_members | 6 | HES | 2 |
| direct_leads | 6 | Leads | 0 |
| contractor_network | 6 | Contractor | 1 |
| contact_log | 6 | CRM | 0 |
| auth_events | 6 | User/Auth | 41 |
| user_sources | 5 | User | 5 |
| partner_dispatch | 5 | Partner | 0 |
| partner_contractors | 5 | Partner | 0 |
| lead_pricing_config | 5 | Leads | 5 |
| contractor_leads | 5 | Contractor | 3 |
| admin_job_files | 5 | Jobs | 10 |
| service_tiers | 4 | Services | 6 |
| service_addons | 4 | Services | 10 |
| lead_transactions | 2 | Leads | 3 |
| contractor_referrals | 2 | Contractor | 0 |
| admin_job_requests | 2 | Jobs | 13 |
| system_catalog | 1 | LEAF Engine | 6 |
| service_categories | 1 | Services | 2 |
| audit_logs | 1 | Audit | — |
| admin_job_utilities | 1 | Jobs | 0 |
| admin_job_existing_systems | 1 | Jobs | 0 |

**Phase 8A tables (in `/api/migrate` scripts, keep):**

| Table | Rows | Notes |
|-------|------|-------|
| rei_contractor_network | 0 | Active in `.from()` (10 refs) |
| leaf_completions | 0 | Created in `/api/migrate`, LEAF analytics tracking |
| app_settings | 0 | Created in `/api/migrate`, app configuration |

---

### LEAF ENGINE — In types/DB but not queried by admin console

These tables are used by the `leaf-ss-module` calculation engine. **Keep all of them.**

| Table | Rows | In supabase.ts? | Notes |
|-------|------|-----------------|-------|
| snapshots | 118 | Yes | Core LEAF energy snapshot data |
| snapshot_upgrade_recommendations | 77 | No | LEAF calculation output |
| upgrade_catalog | 30 | No | LEAF upgrade reference data |
| upgrade_types | 28 | No | LEAF upgrade type definitions |
| upgrade_type_assumptions | 28 | No | LEAF calculation parameters |
| upgrade_catalog_upgrade_types | 12 | No | LEAF junction table |
| incentive_programs | 10 | Yes | Incentive engine data |
| incentives | 110 | No | Incentive reference records |
| upgrade_catalog_media | 4 | No | LEAF catalog media |
| upgrade_catalog_features | — | No | LEAF catalog features |
| system_compatibility | 0 | Yes | LEAF compatibility matrix |
| utility_rate_assumptions | 0 | Yes | LEAF utility rate data |
| incentive_rules | 0 | Yes | Incentive eligibility rules |

---

### NOT IN CODE — Candidates for investigation

| Table | Rows | In Types? | Recommendation | Notes |
|-------|------|-----------|----------------|-------|
| admin_users | 1 | No | **INVESTIGATE** | May be superseded by `app_profiles` with `role='admin'` |
| zip_codes | 408 | No | **KEEP** | LEAF reference data for service area lookups |
| admin_job_contacts | 1 | Yes | **INVESTIGATE** | In supabase.ts types, has FK to admin_jobs — possibly unused |
| admin_parameters | 0 | Yes | **INVESTIGATE** | In supabase.ts types, 0 rows — possibly planned for future |
| admin_schedule_assignments | 0 | No | **INVESTIGATE** | 0 rows — scheduling may use a different approach now |
| job_files | 0 | Yes | **INVESTIGATE** | Overlaps `admin_job_files` — likely superseded |
| jobs | 0 | Yes | **INVESTIGATE** | Overlaps `admin_jobs` — likely superseded |

---

### VIEWS

| View | In Code? | In Types? | Recommendation |
|------|----------|-----------|----------------|
| v_admin_jobs_unscheduled | Types FK refs only | Yes | **KEEP** — used in scheduling FK relations |
| v_admin_jobs_with_next_appt | Types FK refs only | Yes | **KEEP** — used in scheduling FK relations |
| v_jobs_needing_service_schedule | Displayed in SlotList.tsx | Yes | **KEEP** — actively shown in schedule UI |

---

### TABLE OVERLAPS

#### `jobs` (0 rows) vs `admin_jobs` (11 rows)
- `admin_jobs` is actively used (57 `.from()` refs across 20+ files)
- `jobs` is in supabase.ts types but has 0 rows and 0 `.from()` refs
- **Recommendation:** `jobs` appears to be the original table superseded by `admin_jobs`. Check for DB triggers/functions referencing it, then consider dropping.

#### `job_files` (0 rows) vs `admin_job_files` (10 rows)
- `admin_job_files` is actively used (5 `.from()` refs)
- `job_files` is in supabase.ts types but has 0 rows and 0 `.from()` refs
- **Recommendation:** Likely superseded. Investigate, then consider dropping.

#### Lead table family — All are intentional

| Table | Rows | Refs | Purpose |
|-------|------|------|---------|
| leads | 0 | 15 | Generic/legacy leads table |
| system_leads | 15 | 40 | LEAF-generated marketplace leads |
| contractor_leads | 3 | 5 | Leads assigned to contractors |
| broker_leads | 1 | 16 | Leads from broker channel |
| direct_leads | 0 | 6 | Direct/organic leads |
| contractor_lead_status | 3 | 28 | Contractor's lead pipeline status |

All lead tables are actively used and serve different purposes in the lead routing pipeline. **No consolidation needed.**

---

### ACTION ITEMS

1. **Run `/api/migrate`** to create `rei_contractor_network`, `leaf_completions`, and `app_settings` (if not already done)
2. **Investigate `jobs`/`job_files`** — if confirmed legacy, drop after verifying no DB functions reference them
3. **Investigate `admin_users`** — likely superseded by `app_profiles`
4. **Investigate `admin_job_contacts`/`admin_parameters`/`admin_schedule_assignments`** — 0 rows and unused
5. **Run RLS audit** (Section 5 of `SUPABASE_CLEANUP.sql`) to verify security
6. **Run index audit** (Section 6 of `SUPABASE_CLEANUP.sql`) to check coverage
7. **Do NOT touch** any `upgrade_*`, `incentive_*`, `utility_*`, `snapshot*`, `system_*`, or `zip_codes` tables
