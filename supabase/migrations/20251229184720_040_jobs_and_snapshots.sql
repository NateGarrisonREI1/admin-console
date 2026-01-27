-- 040_jobs_and_snapshots.sql
-- jobs = raw intake payload storage
-- snapshots = computed outputs storage (separated from catalog)
--
-- IMPORTANT:
-- We explicitly drop + recreate to avoid conflicts with any pre-existing tables.
-- This is safe for Phase 1.

drop table if exists public.snapshots cascade;
drop table if exists public.jobs cascade;

------------------------------------------------------------
-- JOBS
-- Raw, unnormalized intake payload
------------------------------------------------------------

create table public.jobs (
  id uuid primary key default gen_random_uuid(),

  -- where the job came from (web form, admin console, api, etc.)
  source text not null default 'web',

  -- lifecycle state
  status public.job_status not null default 'new',

  -- raw intake payload (unvalidated)
  raw_payload jsonb not null default '{}'::jsonb,

  -- optional error capture
  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- indexes
create index jobs_status_idx
  on public.jobs (status);

create index jobs_source_idx
  on public.jobs (source);

create index jobs_raw_payload_gin
  on public.jobs using gin (raw_payload);

-- updated_at trigger
drop trigger if exists trg_jobs_set_updated_at on public.jobs;

create trigger trg_jobs_set_updated_at
before update on public.jobs
for each row
execute function public.set_updated_at();

------------------------------------------------------------
-- SNAPSHOTS
-- Computed outputs only (savings / cost / carbon live here)
------------------------------------------------------------

create table public.snapshots (
  id uuid primary key default gen_random_uuid(),

  job_id uuid not null
    references public.jobs(id)
    on delete cascade,

  -- Snapshot Builder output schema version
  snapshot_version text not null default 'v1',

  -- computed results only
  computed_results jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

-- indexes
create index snapshots_job_id_idx
  on public.snapshots (job_id);

create index snapshots_version_idx
  on public.snapshots (snapshot_version);

create index snapshots_computed_results_gin
  on public.snapshots using gin (computed_results);

