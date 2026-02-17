-- ============================================
-- Phase 5B — leads
-- Lead posting and sales workflow.
-- A lead is created from an admin_job and posted to the job board.
-- Contractors can purchase leads.
-- ============================================

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),

  -- Link to the admin job this lead was created from
  admin_job_id uuid not null
    references public.admin_jobs(id) on delete cascade,

  -- Lead lifecycle
  status text not null default 'draft'
    check (status in ('draft', 'active', 'sold', 'expired', 'canceled')),

  -- Posting details
  posted_at timestamptz,
  expires_at timestamptz,

  -- Pricing
  price numeric,

  -- Buyer info (filled when sold)
  buyer_id uuid references public.app_profiles(id) on delete set null,
  buyer_type text check (buyer_type is null or buyer_type in ('contractor', 'broker', 'other')),
  sold_at timestamptz,

  -- Metadata
  notes text,

  -- Service type tags (e.g. ['hvac', 'insulation'])
  service_tags text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Look up leads by job
create index if not exists leads_admin_job_id_idx
  on public.leads (admin_job_id);

-- Filter by status (active leads for job board)
create index if not exists leads_status_idx
  on public.leads (status);

-- Sort/filter by posted date
create index if not exists leads_posted_at_idx
  on public.leads (posted_at desc);

-- Look up leads by buyer
create index if not exists leads_buyer_id_idx
  on public.leads (buyer_id);

-- Expiration cleanup
create index if not exists leads_expires_at_idx
  on public.leads (expires_at);

-- Auto-update updated_at
drop trigger if exists trg_leads_set_updated_at on public.leads;
create trigger trg_leads_set_updated_at
before update on public.leads
for each row
execute function public.set_updated_at();

-- RLS
alter table public.leads enable row level security;

-- Admins can do everything
drop policy if exists "leads_admin_all" on public.leads;
create policy "leads_admin_all"
  on public.leads
  for all
  to authenticated
  using (
    exists (select 1 from public.app_profiles where id = auth.uid() and role = 'admin')
  );

-- Authenticated users can read active leads (job board)
drop policy if exists "leads_read_active" on public.leads;
create policy "leads_read_active"
  on public.leads
  for select
  to authenticated
  using (status = 'active');

-- Buyers can read their own purchased leads
drop policy if exists "leads_read_own_purchased" on public.leads;
create policy "leads_read_own_purchased"
  on public.leads
  for select
  to authenticated
  using (buyer_id = auth.uid());
