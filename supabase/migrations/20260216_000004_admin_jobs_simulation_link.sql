-- ============================================
-- Phase 5D — admin_jobs simulation link columns
-- Add columns to link admin_jobs to leaf-diagnose-sim-2.
-- ============================================

-- Reference to the simulation job in leaf-diagnose-sim-2 (cross-DB, not a FK)
alter table public.admin_jobs
  add column if not exists simulation_job_id uuid;

-- When was the last sync from the simulation service?
alter table public.admin_jobs
  add column if not exists last_simulation_sync timestamptz;

-- Sync status: pending (awaiting result), synced (up to date), failed (last sync failed)
alter table public.admin_jobs
  add column if not exists simulation_sync_status text
    default 'pending'
    check (simulation_sync_status is null or simulation_sync_status in ('pending', 'synced', 'failed'));

-- Index for finding jobs by simulation reference
create index if not exists admin_jobs_simulation_job_id_idx
  on public.admin_jobs (simulation_job_id);

-- Index for finding jobs needing sync
create index if not exists admin_jobs_simulation_sync_status_idx
  on public.admin_jobs (simulation_sync_status)
  where simulation_sync_status is not null;
