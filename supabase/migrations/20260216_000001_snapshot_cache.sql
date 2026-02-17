-- ============================================
-- Phase 5A — snapshot_cache
-- Caches simulation results from leaf-diagnose-sim-2.
-- Admin console is read-only consumer; sim app is source of truth.
-- ============================================

create table if not exists public.snapshot_cache (
  id uuid primary key default gen_random_uuid(),

  -- Link to our admin job
  admin_job_id uuid not null
    references public.admin_jobs(id) on delete cascade,

  -- Reference to the simulation job in leaf-diagnose-sim-2 (not a FK — separate DB)
  simulation_job_id uuid,

  -- Full simulation result payload (upgrade cards, recommendations, etc.)
  snapshot_data jsonb not null default '{}'::jsonb,

  -- When this snapshot was cached and when it expires
  cached_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Look up cached snapshots by admin job
create index if not exists snapshot_cache_admin_job_id_idx
  on public.snapshot_cache (admin_job_id);

-- Look up by simulation job reference
create index if not exists snapshot_cache_simulation_job_id_idx
  on public.snapshot_cache (simulation_job_id);

-- Cache cleanup: find expired entries
create index if not exists snapshot_cache_expires_at_idx
  on public.snapshot_cache (expires_at);

-- GIN index for querying into snapshot_data
create index if not exists snapshot_cache_data_gin
  on public.snapshot_cache using gin (snapshot_data);

-- Auto-update updated_at
drop trigger if exists trg_snapshot_cache_set_updated_at on public.snapshot_cache;
create trigger trg_snapshot_cache_set_updated_at
before update on public.snapshot_cache
for each row
execute function public.set_updated_at();

-- RLS
alter table public.snapshot_cache enable row level security;

-- Admins can do everything (via service role, but also via RPC check)
drop policy if exists "snapshot_cache_admin_all" on public.snapshot_cache;
create policy "snapshot_cache_admin_all"
  on public.snapshot_cache
  for all
  to authenticated
  using (
    exists (select 1 from public.app_profiles where id = auth.uid() and role = 'admin')
  );

-- Authenticated users can read snapshots for jobs they're associated with
-- (brokers, contractors viewing their assigned jobs)
drop policy if exists "snapshot_cache_read_own" on public.snapshot_cache;
create policy "snapshot_cache_read_own"
  on public.snapshot_cache
  for select
  to authenticated
  using (true);
