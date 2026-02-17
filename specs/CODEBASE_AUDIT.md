# CODEBASE AUDIT: leaf-ss-module (Admin Console)

> Generated: 2026-02-16
> Branch: `main`
> Last commit: `a62933b` — Fix login redirect; finalize reset-password flow

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Folder Structure](#folder-structure)
3. [Dependencies Analysis](#dependencies-analysis)
4. [Database Schema (Current)](#database-schema-current)
5. [API Routes (Current)](#api-routes-current)
6. [Services Breakdown](#services-breakdown)
7. [Components Breakdown](#components-breakdown)
8. [Dead Code Identified](#dead-code-identified)
9. [High Priority Removals](#high-priority-removals)
10. [Configuration Overview](#configuration-overview)

---

## Project Overview

**Name:** `leaf-ss-module` (v0.1.0, private)
**Framework:** Next.js 16+ (App Router) with React 19
**Backend:** Supabase (PostgreSQL, Auth, Storage, RPCs)
**Styling:** Tailwind CSS 3.4 + inline styles (mixed; older components use inline)
**Language:** TypeScript 5.4 (strict mode)
**Auth:** Supabase Auth with middleware-enforced role-based guards
**Roles:** admin, broker, contractor, homeowner, affiliate

### Architecture Summary

- **Admin Console** (`/admin/*`) — Full CRM: jobs, scheduling, upgrade catalog, incentives, user management, contractor leads
- **App Portals** (`/(app)/broker|contractor|homeowner|affiliate`) — Role-gated dashboards (mostly stubs)
- **Public Intake** (`/intake/broker`) — Broker-facing intake form (public, no auth)
- **API Routes** (`/api/*`) — REST endpoints for admin operations, file uploads, cron jobs, snapshot generation

### Key Patterns

- Server actions (`"use server"`) with `FormData` for all mutations
- Two Supabase clients: `supabaseServer()` (RLS-aware, cookie-based) and `supabaseAdmin` (service-role, bypasses RLS)
- Right-side drawer pattern for editing records
- Kebab menu pattern for row-level actions
- `revalidatePath()` after every mutation
- `localStorage` for snapshot draft storage (prototype)

---

## Folder Structure

```
leaf-ss-module/
├── .env.local                         # Environment variables
├── next.config.js                     # Next.js config (pdf-parse external)
├── package.json
├── postcss.config.js                  # PostCSS (Tailwind + Autoprefixer)
├── tailwind.config.js                 # Tailwind config (custom animations)
├── tsconfig.json                      # TypeScript config (strict, @/* paths)
│
├── specs/
│   └── CODEBASE_AUDIT.md              # This file
│
├── supabase/
│   └── migrations/                    # 10 SQL migration files + 2 disabled
│       ├── 20251229184432_001_core_types.sql
│       ├── 20251229184447_010_system_catalog.sql
│       ├── 20251229184455_020_system_compatibility.sql
│       ├── 20251229184501_030_admin_parameters.sql
│       ├── 20251229184522_050_incentives_scaffolding.sql
│       ├── 20251229184720_040_jobs_and_snapshots.sql
│       ├── 20251230060608_phase4_admin_intake_tables.sql
│       ├── 20260104044622_phase4A_admin_job_files_fix.sql
│       ├── 20260104045546_phase4B_job_files_bucket_and_code.sql
│       └── 20260125_000001_app_profiles.sql
│
└── src/
    ├── middleware.ts                   # Auth guards (admin role check via RPC, portal auth)
    │
    ├── types/
    │   ├── pdfjs-dist.d.ts            # Type stubs for pdf-parse
    │   └── supabase.ts                # Auto-generated Supabase types (1365 lines)
    │
    ├── lib/
    │   ├── assumptions/
    │   │   ├── upgradeType.ts          # Fetch upgrade cost/savings from DB (48 lines)
    │   │   └── utilityRates.ts         # Utility rate lookup stub (50 lines)
    │   ├── auth/
    │   │   ├── requireRole.ts          # Portal role guard with redirect (36 lines)
    │   │   └── role.ts                 # AppRole type, defaultPathForRole, ensureProfileAndGetRole (58 lines)
    │   ├── calc/
    │   │   ├── money.ts                # USD formatting, clamping (32 lines)
    │   │   ├── roi.ts                  # Net cost and payback calculations (39 lines)
    │   │   └── savings.ts              # Savings band normalization stub (25 lines)
    │   ├── data/
    │   │   └── systemCatalog.ts        # System catalog queries (50 lines)
    │   ├── google/
    │   │   └── calendar.ts             # STUB: always throws (12 lines)
    │   ├── hes/
    │   │   └── generateHesSnapshot.ts  # HES PDF parser + snapshot pipeline (941 lines)
    │   ├── incentives/
    │   │   ├── energystarRebateFinder.ts  # ENERGY STAR web scraper (180 lines)
    │   │   ├── index.ts                   # Entry point barrel (10 lines)
    │   │   ├── normalize.ts               # Incentive amount normalization (61 lines)
    │   │   ├── types.ts                   # Incentive type definitions (32 lines)
    │   │   └── v0_dbCached/
    │   │       ├── mapUpgradeToTypeKey.ts     # Keyword-based type mapping (29 lines)
    │   │       └── resolveIncentivesV0.ts     # DB-cached incentive resolver (98 lines)
    │   ├── recommendations/
    │   │   ├── fromHes.ts                     # HES -> system recommendations (209 lines)
    │   │   └── persistSnapshotRecommendations.ts  # Save recommendations to DB (125 lines)
    │   ├── snapshot/
    │   │   └── buildSnapshotUpgradeCards.ts   # Build report-ready upgrade cards (419 lines)
    │   └── supabase/
    │       ├── admin.ts                # Admin client factory function (16 lines)
    │       ├── browser.ts              # Browser client factory (9 lines)
    │       └── server.ts               # Server client + admin constant (47 lines)
    │
    └── app/
        ├── globals.css                 # Global styles + Tailwind directives
        ├── layout.tsx                  # Root layout (HTML, body, globals.css)
        ├── page.tsx                    # Root redirect to /login
        │
        ├── login/
        │   ├── page.tsx                # Login page
        │   └── LoginForm.tsx           # Email/password login form
        ├── logout/
        │   └── route.ts               # POST logout handler
        ├── reset-password/
        │   ├── page.tsx                # Reset password page
        │   └── ResetPasswordForm.tsx   # Password reset form
        ├── auth/
        │   └── callback/
        │       └── route.ts            # Supabase auth callback (code exchange + redirect)
        │
        ├── intake/
        │   ├── layout.tsx              # Minimal wrapper
        │   └── broker/
        │       ├── page.tsx            # Public broker intake page
        │       ├── BrokerIntakeForm.tsx # Multi-section intake form
        │       ├── actions.ts          # submitBrokerIntake server action
        │       ├── Success.tsx         # Confirmation component
        │       └── success/
        │           └── page.tsx        # Success page with code display
        │
        ├── (app)/                      # Authenticated portal group
        │   ├── Layout.tsx              # Portal layout with AppShell
        │   ├── _components/
        │   │   └── AppShell.tsx        # Sidebar + content shell
        │   ├── affiliate/dashboard/page.tsx    # Stub
        │   ├── broker/dashboard/page.tsx       # Stub
        │   ├── contractor/
        │   │   ├── layout.tsx                  # Contractor layout w/ sidebar
        │   │   ├── _components/
        │   │   │   └── ContractorSidebar.tsx   # Contractor nav sidebar
        │   │   ├── dashboard/page.tsx          # Contractor dashboard
        │   │   ├── job-board/page.tsx           # Job board (browse leads)
        │   │   ├── leads/
        │   │   │   ├── page.tsx                # My purchased leads
        │   │   │   ├── actions.ts              # Lead purchase action
        │   │   │   └── [id]/page.tsx           # Lead detail
        │   │   ├── refunds/page.tsx            # Refund requests (stub)
        │   │   └── settings/page.tsx           # Contractor settings (stub)
        │   └── homeowner/dashboard/page.tsx    # Stub
        │
        ├── admin/                      # Admin console
        │   ├── layout.tsx              # Admin layout with AdminShell
        │   ├── page.tsx                # Admin dashboard (home)
        │   ├── admin.css               # Admin-specific styles
        │   ├── _components/
        │   │   ├── AdminAuthButton.tsx
        │   │   ├── AdminHomeAttention.tsx
        │   │   ├── AdminHomeHeader.tsx
        │   │   ├── AdminHomeKpis.tsx
        │   │   ├── AdminHomeModules.tsx
        │   │   ├── AdminHomeQuickActions.tsx
        │   │   ├── AdminHomeShell.tsx
        │   │   ├── AdminShell.tsx
        │   │   ├── AdminSidebar.tsx
        │   │   ├── CopyButton.tsx
        │   │   ├── DeleteJobInlineButton.tsx
        │   │   └── deleteJobAction.ts
        │   ├── _data/
        │   │   └── localSnapshots.ts   # localStorage snapshot CRUD (143 lines)
        │   ├── contractor-leads/
        │   │   ├── page.tsx
        │   │   ├── actions.ts
        │   │   └── _components/
        │   │       └── AdminContractorLeadsConsole.tsx  (751 lines)
        │   ├── debug/
        │   │   └── page.tsx            # Disabled calendar debug page
        │   ├── incentives/
        │   │   ├── page.tsx
        │   │   ├── _actions.ts         # CRUD + RPC incentive actions (169 lines)
        │   │   └── _components/
        │   │       └── IncentivesConsole.tsx
        │   ├── intake/
        │   │   ├── page.tsx
        │   │   ├── IntakeClient.tsx
        │   │   └── create/
        │   │       └── route.ts        # Admin intake create route
        │   ├── jobs/
        │   │   ├── page.tsx            # Jobs list (server component)
        │   │   ├── shared.tsx          # Shared types/helpers (135 lines)
        │   │   ├── actions.ts          # Job CRUD actions (293 lines)
        │   │   ├── JobCardClient.tsx   # Card view (615 lines)
        │   │   ├── JobsTableClient.tsx # Table view (748 lines)
        │   │   ├── delete/
        │   │   │   └── route.ts        # Job delete API route
        │   │   └── [id]/
        │   │       ├── page.tsx        # Job detail console (510 lines)
        │   │       ├── _lib/
        │   │       │   ├── console.ts       # Console utilities (142 lines)
        │   │       │   ├── fulfillment.ts   # Fulfillment step templates (207 lines)
        │   │       │   └── workflow.ts      # Status labels/tones (77 lines)
        │   │       └── _components/
        │   │           ├── AdminDropdownCard.tsx  (111 lines)
        │   │           ├── ConsoleHeader.tsx      (476 lines)
        │   │           ├── ContextRail.tsx        (287 lines)
        │   │           ├── FilesCard.tsx          (75 lines)
        │   │           ├── GenerateButton.tsx     (39 lines)
        │   │           ├── HesParseCard.tsx       (407 lines)
        │   │           ├── JobHeader.tsx          (132 lines)
        │   │           ├── NotesCard.tsx          (120 lines)
        │   │           ├── TimelineCard.tsx       (154 lines)
        │   │           ├── UpgradeCardsCard.tsx   (137 lines)
        │   │           ├── UpgradeCardsList.tsx   (382 lines)
        │   │           ├── WorkflowCard.tsx       (429 lines)
        │   │           ├── WorksheetRouter.tsx    (38 lines)
        │   │           └── worksheets/
        │   │               ├── BrokerWorksheet.tsx     (9 lines, stub)
        │   │               ├── HomeownerWorksheet.tsx  (9 lines, stub)
        │   │               ├── InspectorWorksheet.tsx  (9 lines, stub)
        │   │               └── OtherWorksheet.tsx      (9 lines, stub)
        │   ├── schedule/
        │   │   ├── page.tsx            # Scheduler (441 lines)
        │   │   └── _components/
        │   │       ├── AvailabilityControls.tsx  (54 lines)
        │   │       ├── ScheduleDialog.tsx        (0 lines, EMPTY)
        │   │       ├── SchedulerHeader.tsx       (11 lines)
        │   │       └── SlotList.tsx              (362 lines)
        │   ├── settings/
        │   │   ├── page.tsx            # Settings hub
        │   │   ├── users/
        │   │   │   └── page.tsx        # Users list (server)
        │   │   ├── _actions/
        │   │   │   └── users.ts        # User management actions (340 lines)
        │   │   └── _components/
        │   │       ├── AdminUsersTable.tsx     (386 lines)
        │   │       ├── UserDetailsDrawer.tsx   (288 lines)
        │   │       ├── UserEditDrawer.tsx      (385 lines)
        │   │       └── pills.tsx              (56 lines)
        │   ├── snapshots/
        │   │   ├── page.tsx            # localStorage snapshot list
        │   │   ├── new/
        │   │   │   ├── page.tsx
        │   │   │   └── NewSnapshotClient.tsx   (148 lines)
        │   │   └── [snapshotId]/
        │   │       ├── page.tsx
        │   │       └── SnapshotEditorClient.tsx (335 lines)
        │   └── upgrade-catalog/
        │       ├── page.tsx            # Catalog page (192 lines, server)
        │       ├── _actions.ts         # Full CRUD + mapping (661 lines)
        │       └── _components/
        │           ├── UpgradeCatalogConsole.tsx       (1398 lines)
        │           └── UpgradeCatalogImagePicker.tsx   (183 lines)
        │
        └── api/
            ├── admin/
            │   ├── contractors/
            │   │   └── route.ts        # List contractor profiles
            │   ├── systems/
            │   │   └── route.ts        # List system catalog items
            │   └── upload-upgrade-catalog-image/
            │       └── route.ts        # Image upload to Supabase storage
            ├── cron/
            │   └── expire-leads/
            │       └── route.ts        # Expire stale contractor leads
            └── generate-snapshot/
                └── route.ts            # Generate HES snapshot from PDF
```

**Total source files (non-config):** ~95
**Total lines of application code:** ~15,000+

---

## Dependencies Analysis

### Production Dependencies

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| `next` | ^16.1.1 | App framework | **Active** |
| `react` | ^19.2.3 | UI library | **Active** |
| `react-dom` | ^19.2.3 | React DOM renderer | **Active** |
| `@supabase/ssr` | ^0.8.0 | Supabase SSR helpers (cookie-based auth) | **Active** |
| `@supabase/supabase-js` | ^2.89.0 | Supabase client (DB, Auth, Storage) | **Active** |
| `@heroicons/react` | ^2.2.0 | SVG icons | **Active** |
| `cheerio` | ^1.1.2 | HTML parsing (ENERGY STAR scraper) | **Review** -- only used by `energystarRebateFinder.ts` |
| `googleapis` | ^170.0.0 | Google Calendar API | **DEAD** -- calendar.ts is a stub that throws |
| `pdf-parse` | ^1.1.1 | PDF text extraction | **Review** -- only used by HES parsing |
| `pdfjs-dist` | ^3.11.174 | PDF rendering engine | **Review** -- only used by HES parsing |

### Dev Dependencies

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| `typescript` | ^5.4.5 | Type checking | **Active** |
| `@types/node` | ^20.14.9 | Node.js types | **Active** |
| `@types/react` | ^18.3.27 | React types | **Active** |
| `@types/react-dom` | ^18.3.7 | React DOM types | **Active** |
| `tailwindcss` | ^3.4.17 | CSS framework | **Active** |
| `postcss` | ^8.5.6 | CSS processing | **Active** |
| `autoprefixer` | ^10.4.20 | CSS vendor prefixes | **Active** |

### Dependency Issues

- **`googleapis` (170.0.0)** -- **170+ MB** package installed but the integration is a dead stub. HIGH PRIORITY for removal.
- **`cheerio`** -- Only used by the ENERGY STAR scraper (`energystarRebateFinder.ts`). If that module is deleted, cheerio can go too.
- **`pdf-parse` + `pdfjs-dist`** -- Only used by HES PDF parsing (`generateHesSnapshot.ts`). If HES parsing is deleted, both can go.

---

## Database Schema (Current)

### Enums

| Enum | Values |
|------|--------|
| `system_type` | furnace, boiler, heat_pump, mini_split, ac, water_heater, heat_pump_water_heater, insulation, air_sealing, windows, solar_pv, battery, ev_charger, panel_upgrade, smart_thermostat |
| `compatibility_type` | allowed, blocked, conditional |
| `job_status` | new, validated, queued, processing, completed, failed |
| `parameter_value_type` | number, integer, boolean, string, json |
| `incentive_rule_type` | zip, state, utility, income, customer_type, system_type, other |
| `app_role` | admin, broker, contractor, homeowner, affiliate |

### Tables (from migrations + Supabase types)

#### Core Admin Tables

**`admin_jobs`** -- Primary job/project record
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| status | text | `new`, `in_progress`, `complete`, `archived` |
| address1, address2, city, state, zip | text | Property address |
| notes | text | |
| confirmation_code | text | e.g., `REI-XXXX` |
| customer_name, customer_email, customer_phone | text | |
| customer_type | text | e.g., `agent_broker` |
| source, intake_source | text | |
| intake_payload | jsonb | Full structured intake data |
| intake_progress | jsonb | |
| intake_stage | text | |
| inspection_status | text | |
| response_status | text | Workflow status |
| requested_outputs | text[] | `leaf_snapshot`, `inspection`, `hes_report` |
| is_archived | boolean | |
| archive_reason, archived_at, archived_by | text/timestamptz | |

**`admin_job_contacts`** -- Contacts per job
| Column | Type |
|--------|------|
| id | uuid (PK) |
| job_id | uuid (FK -> admin_jobs) |
| role | text |
| name, email, phone, notes | text |

**`admin_job_appointments`** -- Scheduled appointments
| Column | Type |
|--------|------|
| id | uuid (PK) |
| job_id | uuid (FK -> admin_jobs) |
| kind | text |
| assignee, assignee_email | text |
| start_at, end_at | timestamptz |
| status | text |
| service_kinds | text[] |
| google_calendar_id, google_event_id | text |
| google_sync_status, google_sync_error | text |

**`admin_job_files`** -- Uploaded files
| Column | Type |
|--------|------|
| id | uuid (PK) |
| job_id | uuid (FK -> admin_jobs) |
| bucket, path, filename | text |
| content_type, mime_type | text |
| size_bytes, file_size_bytes | bigint/int |
| uploaded_by | text |
| category, kind | text |
| meta | jsonb |
| storage_path, file_path, file_name, original_filename | text (legacy dupes) |

**`admin_job_utilities`** -- Utility usage data
| Column | Type |
|--------|------|
| id | uuid (PK) |
| job_id | uuid (FK -> admin_jobs) |
| utility_type | text (`electric`, `gas`) |
| input_type | text (`usage`, `bill_amount`, `unknown`) |
| period, season, confidence | text |
| utility_name | text |
| bill_amount, usage_kwh, usage_therms, usage_gallons | numeric |
| rate_assumption_id | uuid |
| estimated_usage_kwh, estimated_usage_therms | numeric |

**`admin_job_existing_systems`** -- Existing home systems
| Column | Type |
|--------|------|
| job_id | uuid (PK, FK -> admin_jobs) |
| space_heating, water_heating, cooking_fuel, dryer_fuel, cooling | text |

**`admin_job_requests`** -- Service requests per job
| Column | Type |
|--------|------|
| id | uuid (PK) |
| job_id | uuid (FK -> admin_jobs) |
| request_key | text |
| status | text |

**`admin_schedule_assignments`** -- Schedule assignments
| Column | Type |
|--------|------|
| id | uuid (PK) |
| job_id | uuid (FK -> admin_jobs) |
| assignee | text |
| starts_at, ends_at | timestamptz |
| status | text |
| google_event_id, calendar_id | text |

#### Catalog & Incentive Tables

**`system_catalog`** -- Equipment catalog
| Column | Type |
|--------|------|
| id | uuid (PK) |
| system_type | enum |
| manufacturer, model, display_name | text |
| fuel_type, description | text |
| is_active | boolean |

**`system_compatibility`** -- System pairing rules
| Column | Type |
|--------|------|
| id | uuid (PK) |
| system_id, compatible_with_system_id | uuid (FK -> system_catalog) |
| compatibility_type | enum |
| notes | text |
| rule_flags | jsonb |

**`admin_parameters`** -- Admin-configurable calculator inputs
| Column | Type |
|--------|------|
| id | uuid (PK) |
| parameter_key | text |
| value_type | enum |
| value_text, value_number, value_boolean, value_json | various |
| scope, scope_ref | text |
| is_active | boolean |

**`incentive_programs`** -- Incentive program definitions
| Column | Type |
|--------|------|
| id | uuid (PK) |
| name | text |
| jurisdiction, jurisdiction_ref | text |
| is_active | boolean |

**`incentive_rules`** -- Eligibility rules per program
| Column | Type |
|--------|------|
| id | uuid (PK) |
| incentive_program_id | uuid (FK -> incentive_programs) |
| rule_type | enum |
| rule_definition | jsonb |
| priority | integer |
| is_active | boolean |

**`utility_rate_assumptions`** -- Utility rate reference data
| Column | Type |
|--------|------|
| id | uuid (PK) |
| scope | text (`state`, `utility`) |
| state, utility_name | text |
| season | text |
| electric_rate_per_kwh, gas_rate_per_therm | numeric |
| fixed_monthly_charge_electric, fixed_monthly_charge_gas | numeric |
| effective_start, effective_end | date |

#### Auth Tables

**`app_profiles`** -- User profiles (linked to auth.users)
| Column | Type |
|--------|------|
| id | uuid (PK, FK -> auth.users) |
| role | app_role enum |
| status | text (active, pending, disabled) |
| first_name, last_name, phone | text |
| address1, address2, city, state, postal_code | text |

#### Legacy Tables (from early migrations)

**`jobs`** -- Original raw intake (superseded by `admin_jobs`)
| Column | Type |
|--------|------|
| id | uuid (PK) |
| source | text |
| status | job_status enum |
| raw_payload | jsonb |
| error_message | text |

**`snapshots`** -- Computed outputs for `jobs`
| Column | Type |
|--------|------|
| id | uuid (PK) |
| job_id | uuid (FK -> jobs) |
| snapshot_version | text |
| computed_results | jsonb |

**`job_files`** -- Files for legacy `jobs` table
| Column | Type |
|--------|------|
| id | uuid (PK) |
| job_id | uuid (FK -> admin_jobs, confusingly) |
| storage_path | text |
| bucket, mime_type, original_name | text |
| size_bytes | int |

### Views (referenced in types)

| View | Purpose |
|------|---------|
| `v_admin_jobs_unscheduled` | Jobs without scheduled appointments |
| `v_admin_jobs_with_next_appt` | Jobs with their next appointment data |
| `v_jobs_needing_service_schedule` | Jobs requiring service scheduling |
| `v_incentives_by_zip` | Incentives lookup by ZIP (used by resolver) |
| `v_upgrade_catalog_usage` | Upgrade catalog usage metrics |
| `v_upgrade_assumptions_health` | Assumptions completeness health check |

### RPCs (referenced in code)

| RPC | Called From |
|-----|------------|
| `is_admin` | middleware.ts |
| `resolve_incentives` | incentives/_actions.ts |
| `resolve_incentives_for_upgrade` | incentives/_actions.ts |
| `resolve_incentives_by_state` | incentives/_actions.ts |
| `resolve_incentive_totals` | incentives/_actions.ts |

---

## API Routes (Current)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/admin/contractors` | List contractor profiles | Admin |
| GET | `/api/admin/systems` | List system catalog items | Admin |
| POST | `/api/admin/upload-upgrade-catalog-image` | Upload image to Supabase storage | Admin |
| POST | `/api/cron/expire-leads` | Expire stale contractor leads (cron) | CRON_SECRET |
| POST | `/api/generate-snapshot` | Generate HES snapshot from uploaded PDF | Admin |
| POST | `/admin/intake/create` | Create new admin job | Admin |
| POST | `/admin/jobs/delete` | Delete job + children | Admin |
| GET | `/auth/callback` | Supabase auth code exchange | Public |
| POST | `/logout` | Sign out | Authenticated |

### Server Actions (not API routes, but key mutation endpoints)

| Action | File | Purpose |
|--------|------|---------|
| `submitBrokerIntake` | `intake/broker/actions.ts` | Public broker intake submission |
| `archiveJobAction` | `admin/jobs/actions.ts` | Soft-archive a job |
| `unarchiveJobAction` | `admin/jobs/actions.ts` | Restore archived job |
| `hardDeleteJobAction` | `admin/jobs/actions.ts` | Permanently delete job + children |
| `createLeadFromAdminJobAction` | `admin/jobs/actions.ts` | Post job as contractor lead |
| `updateLeadAction` | `admin/contractor-leads/actions.ts` | Update lead details |
| `removeLeadAction` | `admin/contractor-leads/actions.ts` | Remove lead from board |
| `updateIncentiveRow` | `admin/incentives/_actions.ts` | CRUD on incentive tables |
| `insertIncentiveRow` | `admin/incentives/_actions.ts` | Insert incentive row |
| `deleteIncentiveRow` | `admin/incentives/_actions.ts` | Delete incentive row |
| `previewIncentives` | `admin/incentives/_actions.ts` | Preview incentive resolution |
| `adminListUsers` | `admin/settings/_actions/users.ts` | List all users |
| `adminInviteUser` | `admin/settings/_actions/users.ts` | Create/invite user |
| `adminSetUserRole` | `admin/settings/_actions/users.ts` | Change user role |
| `adminSetUserStatus` | `admin/settings/_actions/users.ts` | Enable/disable user |
| `adminCreatePasswordLink` | `admin/settings/_actions/users.ts` | Generate password reset link |
| `adminCreateMagicLink` | `admin/settings/_actions/users.ts` | Generate magic sign-in link |
| `adminUpdateUserProfile` | `admin/settings/_actions/users.ts` | Update user profile fields |
| `createUpgradeItem` | `admin/upgrade-catalog/_actions.ts` | Create catalog item |
| `updateUpgradeItem` | `admin/upgrade-catalog/_actions.ts` | Update catalog item |
| `toggleUpgradeItemActive` | `admin/upgrade-catalog/_actions.ts` | Activate/deactivate item |
| `seedPresetForFeature` | `admin/upgrade-catalog/_actions.ts` | Seed preset upgrade types |
| `bulkUpsertMappingsAndAssumptions` | `admin/upgrade-catalog/_actions.ts` | Bulk mapping/assumptions |

---

## Services Breakdown

### `/lib/supabase/` -- Database Access Layer
- **`server.ts`** -- `supabaseServer()` (RLS-aware, cookie-based) + `supabaseAdmin` (service-role constant)
- **`admin.ts`** -- `supabaseAdmin()` factory function (DUPLICATE -- see Dead Code)
- **`browser.ts`** -- `supabaseBrowser()` for client components

### `/lib/auth/` -- Authentication & Authorization
- **`role.ts`** -- `AppRole` type, `defaultPathForRole()`, `ensureProfileAndGetRole()` (auto-creates `app_profiles` row)
- **`requireRole.ts`** -- Portal access guard, redirects to correct dashboard

### `/lib/calc/` -- Financial Calculations
- **`money.ts`** -- USD formatting (`fmtUSD`, `fmtRangeUSD`, `fmtYearsRange`), clamping
- **`roi.ts`** -- Net cost range (install minus incentives), payback years
- **`savings.ts`** -- Savings band normalization (stub)

### `/lib/hes/` -- HES PDF Processing
- **`generateHesSnapshot.ts`** (941 lines) -- End-to-end pipeline: download PDF from storage -> extract text via pdf-parse -> regex-based field parsing -> save snapshot to DB -> trigger recommendations -> build upgrade cards -> mark job ready

### `/lib/incentives/` -- Incentive Resolution
- **`index.ts`** -- Entry point, delegates to V0 resolver
- **`types.ts`** -- `ResolvedIncentive`, `IncentivesForUpgrade` types
- **`normalize.ts`** -- Amount normalization and totals
- **`energystarRebateFinder.ts`** -- ENERGY STAR website scraper (cheerio-based)
- **`v0_dbCached/resolveIncentivesV0.ts`** -- Queries `v_incentives_by_zip` view
- **`v0_dbCached/mapUpgradeToTypeKey.ts`** -- Keyword-based upgrade type mapping

### `/lib/recommendations/` -- Recommendation Engine
- **`fromHes.ts`** -- Transforms HES suggestions into structured recommendations, matches to upgrade catalog
- **`persistSnapshotRecommendations.ts`** -- Saves to `snapshot_upgrade_recommendations` table

### `/lib/snapshot/` -- Report Builder
- **`buildSnapshotUpgradeCards.ts`** (419 lines) -- Loads recommendations -> fetches catalog info -> loads cost/savings assumptions -> computes ROI -> attaches incentives -> sorts by payback

### `/lib/data/` -- Data Access
- **`systemCatalog.ts`** -- `listSystems()` and `listSystemTypes()` queries

### `/lib/assumptions/` -- Assumption Lookups
- **`upgradeType.ts`** -- Fetches cost/savings from `upgrade_type_assumptions`
- **`utilityRates.ts`** -- Utility rate lookup (stub, doesn't filter by ZIP)

### `/lib/google/` -- External Integrations
- **`calendar.ts`** -- Dead stub, always throws

---

## Components Breakdown

### Admin Shell & Dashboard
| Component | Lines | Purpose |
|-----------|-------|---------|
| `AdminShell.tsx` | ~80 | Admin layout wrapper (sidebar + content) |
| `AdminSidebar.tsx` | ~120 | Navigation sidebar with links to all admin modules |
| `AdminHomeShell.tsx` | ~50 | Dashboard container |
| `AdminHomeHeader.tsx` | ~60 | Dashboard header with greeting |
| `AdminHomeKpis.tsx` | ~100 | Key performance indicator cards |
| `AdminHomeAttention.tsx` | ~80 | Items needing attention |
| `AdminHomeModules.tsx` | ~60 | Quick links to admin modules |
| `AdminHomeQuickActions.tsx` | ~40 | Action buttons |
| `AdminAuthButton.tsx` | ~30 | Logout button |

### Jobs Module (largest module)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `JobsTableClient.tsx` | 748 | Full-featured job table with filters, search, lead drawer |
| `JobCardClient.tsx` | 615 | Card-based job view with lead management |
| `ConsoleHeader.tsx` | 476 | Job detail header with contact editing drawer |
| `WorkflowCard.tsx` | 429 | 5-step workflow stepper with status controls |
| `HesParseCard.tsx` | 407 | HES parse results display + generation trigger |
| `UpgradeCardsList.tsx` | 382 | Upgrade recommendation cards with ROI display |
| `ContextRail.tsx` | 287 | Side panel with contact/property info |
| `TimelineCard.tsx` | 154 | Activity timeline with event entry |
| `NotesCard.tsx` | 120 | Internal notes editor |
| `UpgradeCardsCard.tsx` | 137 | Upgrade cards container (server component) |
| `AdminDropdownCard.tsx` | 111 | Reusable collapsible card |
| `JobHeader.tsx` | 132 | Legacy job header |
| `FilesCard.tsx` | 75 | File list with signed download URLs |
| `GenerateButton.tsx` | 39 | Loading button for snapshot generation |
| `WorksheetRouter.tsx` | 38 | Routes to customer-type worksheet |
| Worksheets (4x) | 9 each | Stubs |

### Upgrade Catalog Module
| Component | Lines | Purpose |
|-----------|-------|---------|
| `UpgradeCatalogConsole.tsx` | 1398 | **Largest component** -- catalog + bulk mapping |
| `UpgradeCatalogImagePicker.tsx` | 183 | Image upload/URL picker |

### Contractor Leads Module
| Component | Lines | Purpose |
|-----------|-------|---------|
| `AdminContractorLeadsConsole.tsx` | 751 | Lead management table with edit drawer |

### User Management Module
| Component | Lines | Purpose |
|-----------|-------|---------|
| `AdminUsersTable.tsx` | 386 | User table with search, role filter |
| `UserEditDrawer.tsx` | 385 | Full user edit drawer |
| `UserDetailsDrawer.tsx` | 288 | New user invite drawer |
| `pills.tsx` | 56 | Role/status pill components |

### Scheduling Module
| Component | Lines | Purpose |
|-----------|-------|---------|
| `SlotList.tsx` | 362 | Time slot picker with overlap detection |
| `AvailabilityControls.tsx` | 54 | Slot generation settings |
| `ScheduleDialog.tsx` | 0 | **EMPTY FILE** |
| `SchedulerHeader.tsx` | 11 | Simple header |

### Snapshots Module (localStorage-based prototype)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `SnapshotEditorClient.tsx` | 335 | Snapshot draft editor |
| `NewSnapshotClient.tsx` | 148 | New snapshot creator |

### Contractor Portal
| Component | Lines | Purpose |
|-----------|-------|---------|
| `ContractorSidebar.tsx` | ~60 | Contractor nav sidebar |
| `job-board/page.tsx` | ~200 | Browse available leads |
| `leads/page.tsx` | ~100 | Purchased leads list |
| `leads/[id]/page.tsx` | ~150 | Lead detail view |

### Public Intake
| Component | Lines | Purpose |
|-----------|-------|---------|
| `BrokerIntakeForm.tsx` | 241 | Multi-section broker intake form |
| `Success.tsx` | 25 | Confirmation display |

---

## Dead Code Identified

### HIGH PRIORITY -- Delete Immediately

| Item | File(s) | Lines | Reason |
|------|---------|-------|--------|
| **Google Calendar stub** | `src/lib/google/calendar.ts` | 12 | Always throws. Never called by live code. |
| **googleapis dependency** | `package.json` | -- | 170+ MB package, zero actual usage |
| **Debug page** | `src/app/admin/debug/page.tsx` | 10 | Shows "temporarily disabled" message |
| **ScheduleDialog (empty)** | `src/app/admin/schedule/_components/ScheduleDialog.tsx` | 0 | Completely empty file |
| **Duplicate supabaseAdmin** | `src/lib/supabase/admin.ts` | 16 | Function version; `server.ts` exports a constant version. Both are used in different files -- **needs consolidation** |
| **13 .zip backup files** | Various (see list below) | -- | Old file backups cluttering the repo |
| **10+ .DS_Store files** | Various in `src/` | -- | macOS metadata in source tree |
| **`src/.env.local`** | `src/.env.local` | -- | Duplicate of root `.env.local` (or misplaced) |

### .zip files to delete
```
src/app/(app).zip
src/app/(app)/contractor/job-board/page.tsx.zip
src/app/(app)/contractor/job-board/page 2.tsx.zip
src/app/admin/jobs.zip
src/app/admin/jobs/[id]/page.tsx.zip
src/app/admin/schedule/page.tsx.zip
src/app/admin/upgrade-catalog/page.tsx.zip
src/app/admin/upgrade-catalog/_actions.ts.zip
src/app/admin/upgrade-catalog/_components/UpgradeCatalogConsole.tsx.zip
src/app/intake/broker.zip
src/app/login.zip
src/middleware.ts.zip
src/api/generate-snapshot/route.ts.zip
```

### MEDIUM PRIORITY -- Review for Deletion

| Item | File(s) | Lines | Reason |
|------|---------|-------|--------|
| **HES PDF parsing pipeline** | `src/lib/hes/generateHesSnapshot.ts` | 941 | Massive regex-based PDF parser. If HES parsing is no longer needed, this + `pdf-parse` + `pdfjs-dist` + `cheerio` can all go |
| **HesParseCard** | `src/app/admin/jobs/[id]/_components/HesParseCard.tsx` | 407 | UI for HES parse results -- only useful if HES parsing stays |
| **ENERGY STAR scraper** | `src/lib/incentives/energystarRebateFinder.ts` | 180 | Web scraper -- unreliable (site may render client-side), uses `cheerio` |
| **Incentive resolver V0** | `src/lib/incentives/v0_dbCached/` | 127 | DB-cached resolver; if incentives move to RPCs entirely, this is dead |
| **Incentive normalization** | `src/lib/incentives/normalize.ts` | 61 | Only used by snapshot card builder |
| **Recommendation engine** | `src/lib/recommendations/` | 334 | HES-dependent; dead if HES parsing goes |
| **Snapshot card builder** | `src/lib/snapshot/buildSnapshotUpgradeCards.ts` | 419 | End of the HES pipeline; dead if HES parsing goes |
| **Snapshot drafts (localStorage)** | `src/app/admin/snapshots/` + `src/app/admin/_data/localSnapshots.ts` | 783 | Prototype using localStorage. Not backed by DB. |
| **Legacy `jobs` + `snapshots` tables** | Migration 040 | -- | Superseded by `admin_jobs`; `jobs` table may still hold old data |
| **`job_files` table** | Supabase types | -- | Legacy file table (FK points to `admin_jobs` despite the name) |
| **Worksheet stubs** | `worksheets/BrokerWorksheet.tsx` etc. | 36 | 4 files that just re-render `WorksheetRouter` -- circular stubs |
| **pdfjs-dist type declaration** | `src/types/pdfjs-dist.d.ts` | -- | Only needed for HES parsing |
| **Assumptions modules** | `src/lib/assumptions/` | 98 | `utilityRates.ts` is a stub; `upgradeType.ts` only used by snapshot pipeline |

---

## High Priority Removals

These items were specifically flagged by the user for removal consideration:

### 1. HES Parsing (`src/lib/hes/`)
- **File:** `generateHesSnapshot.ts` (941 lines)
- **Dependencies:** `pdf-parse`, `pdfjs-dist`, `src/types/pdfjs-dist.d.ts`
- **Consumers:** `HesParseCard.tsx`, `api/generate-snapshot/route.ts`
- **Impact:** Removing HES parsing also orphans: recommendations engine (`lib/recommendations/`), snapshot card builder (`lib/snapshot/`), upgrade type assumptions (`lib/assumptions/upgradeType.ts`), and the savings calculator (`lib/calc/savings.ts`)
- **Total removable:** ~2,500+ lines + 2 npm packages

### 2. Incentive Mapping (`src/lib/incentives/`)
- **Files:** 6 files, ~590 lines total
- **Dependencies:** `cheerio` (for ENERGY STAR scraper)
- **Consumers:** `buildSnapshotUpgradeCards.ts`, `admin/incentives/` module
- **Admin UI:** `IncentivesConsole.tsx` + `_actions.ts` (169 lines)
- **Note:** The incentive RPCs (`resolve_incentives`, etc.) are DB-side and would remain. Only the client-side resolver, scraper, and normalization code would be removed.
- **Total removable:** ~760+ lines + 1 npm package

### 3. System Info / Catalog (`src/lib/data/systemCatalog.ts`)
- **File:** 50 lines
- **Note:** This is used by the API routes `/api/admin/systems` and potentially the upgrade catalog. Review usage before removal.

### 4. googleapis Dependency
- **Package:** `googleapis` (^170.0.0)
- **Size:** 170+ MB
- **Usage:** Zero. `lib/google/calendar.ts` is a stub.
- **Action:** Remove from `package.json` immediately.

---

## Configuration Overview

### `next.config.js`
```js
serverExternalPackages: ["pdf-parse"]  // Required for pdf-parse in server actions
```

### `tailwind.config.js`
- Content paths: `./src/app/**/*.{js,ts,jsx,tsx}`, `./src/components/**/*.{js,ts,jsx,tsx}`
- Custom animation: `progress-smooth` (for progress bar fill)

### `postcss.config.js`
- Standard Tailwind + Autoprefixer setup

### `tsconfig.json`
- Target: ES2017, strict mode
- Path alias: `@/*` -> `./src/*`
- Bundler module resolution
- Next.js plugin enabled

### Environment Variables (`.env.local`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only, bypasses RLS) |
| `ADMIN_GATE` | Set to `open` -- controls admin access (appears twice in file) |
| `GOOGLE_CALENDAR_IMPERSONATE` | Google Calendar service account email (unused -- integration is dead) |
| `HES_DEBUG` | Set to `1` -- enables HES debug output |
| `CRON_SECRET` | Secret for authenticating cron job requests |

### Middleware (`src/middleware.ts`)
- **Matcher:** `/admin/:path*`, `/broker/:path*`, `/contractor/:path*`, `/homeowner/:path*`, `/affiliate/:path*`
- **Admin guard:** Verifies auth via `getUser()` then checks `is_admin` RPC
- **Portal guard:** Verifies auth via `getUser()` only (no role check at middleware level)
- **Public routes:** `/login`, `/reset-password`, `/auth/callback`
- **Redirect:** `/admin/login` -> `/login?next=/admin`

### Supabase Migrations
- 10 active migrations (core types, system catalog, compatibility, parameters, incentives, jobs/snapshots, admin intake, files, app profiles)
- 2 disabled migrations (`.sql.disabled`)
- RLS enabled on `admin_job_files` and `app_profiles`
- `set_updated_at()` trigger function shared across tables

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Source files (`.ts`/`.tsx`) | ~95 |
| SQL migration files | 10 active, 2 disabled |
| Database tables | 15+ |
| Database views | 5 |
| API routes | 8 |
| Server actions | 25+ |
| npm dependencies (prod) | 10 |
| npm dependencies (dev) | 7 |
| Estimated total app lines | ~15,000+ |
| .zip backup files to clean | 13 |
| .DS_Store files in src/ | 10+ |
| Empty/stub files | 6+ |

### Largest Files (by line count)
1. `UpgradeCatalogConsole.tsx` -- 1,398 lines
2. `supabase.ts` (types) -- 1,365 lines (auto-generated)
3. `generateHesSnapshot.ts` -- 941 lines
4. `AdminContractorLeadsConsole.tsx` -- 751 lines
5. `JobsTableClient.tsx` -- 748 lines
6. `upgrade-catalog/_actions.ts` -- 661 lines
7. `JobCardClient.tsx` -- 615 lines
8. `admin/jobs/[id]/page.tsx` -- 510 lines
9. `ConsoleHeader.tsx` -- 476 lines
10. `admin/schedule/page.tsx` -- 441 lines
