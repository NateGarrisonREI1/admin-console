-- ============================================
-- Phase 5C — contact_log
-- Track all customer/stakeholder interactions for a job.
-- Provides audit trail for communication history.
-- ============================================

create table if not exists public.contact_log (
  id uuid primary key default gen_random_uuid(),

  -- Link to the admin job
  admin_job_id uuid not null
    references public.admin_jobs(id) on delete cascade,

  -- How was contact made?
  contact_method text not null default 'phone'
    check (contact_method in ('phone', 'email', 'sms', 'in_person', 'system')),

  -- Was this inbound (customer called us) or outbound (we called them)?
  direction text not null default 'outbound'
    check (direction in ('inbound', 'outbound')),

  -- What was discussed
  subject text,
  body text,

  -- Who made the contact (admin user, broker, etc.)
  contacted_by uuid references public.app_profiles(id) on delete set null,

  -- When the contact happened
  contacted_at timestamptz not null default now(),

  -- Follow-up tracking
  response_received boolean not null default false,
  response_at timestamptz,

  created_at timestamptz not null default now()
);

-- Look up contact history by job
create index if not exists contact_log_admin_job_id_idx
  on public.contact_log (admin_job_id);

-- Sort by contact date
create index if not exists contact_log_contacted_at_idx
  on public.contact_log (contacted_at desc);

-- Filter by method
create index if not exists contact_log_method_idx
  on public.contact_log (contact_method);

-- Filter by who made contact
create index if not exists contact_log_contacted_by_idx
  on public.contact_log (contacted_by);

-- RLS
alter table public.contact_log enable row level security;

-- Admins can do everything
drop policy if exists "contact_log_admin_all" on public.contact_log;
create policy "contact_log_admin_all"
  on public.contact_log
  for all
  to authenticated
  using (
    exists (select 1 from public.app_profiles where id = auth.uid() and role = 'admin')
  );

-- Users can read contact logs they created
drop policy if exists "contact_log_read_own" on public.contact_log;
create policy "contact_log_read_own"
  on public.contact_log
  for select
  to authenticated
  using (contacted_by = auth.uid());

-- Authenticated users can insert contact logs (brokers, contractors logging calls)
drop policy if exists "contact_log_insert_authenticated" on public.contact_log;
create policy "contact_log_insert_authenticated"
  on public.contact_log
  for insert
  to authenticated
  with check (contacted_by = auth.uid());
