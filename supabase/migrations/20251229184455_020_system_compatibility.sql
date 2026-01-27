-- 020_system_compatibility.sql
-- Compatibility rules/relationships only (no calculations)

create table if not exists public.system_compatibility (
  id uuid primary key default gen_random_uuid(),

  system_id uuid not null references public.system_catalog(id) on delete cascade,
  compatible_with_system_id uuid not null references public.system_catalog(id) on delete cascade,

  compatibility_type public.compatibility_type not null default 'allowed',

  -- Optional: lightweight notes / human-readable explanation
  notes text,

  -- Optional: simple flags for future rule engines (Phase 2+)
  rule_flags jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  -- prevent duplicates
  constraint system_compat_unique_pair unique (system_id, compatible_with_system_id),

  -- prevent self-reference
  constraint system_compat_not_self check (system_id <> compatible_with_system_id)
);

create index if not exists system_compat_system_id_idx
  on public.system_compatibility (system_id);

create index if not exists system_compat_compatible_with_idx
  on public.system_compatibility (compatible_with_system_id);

create index if not exists system_compat_rule_flags_gin
  on public.system_compatibility using gin (rule_flags);

