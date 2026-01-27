-- 030_admin_parameters.sql
-- Admin-configurable calculator inputs (read by Snapshot Builder)

create table if not exists public.admin_parameters (
  id uuid primary key default gen_random_uuid(),

  -- stable lookup key used by calculators
  parameter_key text not null,

  -- how to interpret the value
  value_type public.parameter_value_type not null,

  -- raw value storage (interpreted by value_type)
  value_text text,
  value_number numeric,
  value_boolean boolean,
  value_json jsonb,

  -- optional scoping (Phase 1 = simple, Phase 2+ can expand)
  scope text not null default 'global',        -- e.g. global, system_type, climate_zone
  scope_ref text,                              -- e.g. hvac, CZ03, etc.

  is_active boolean not null default true,

  description text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint admin_param_key_scope_unique
    unique (parameter_key, scope, scope_ref)
);

create index if not exists admin_parameters_key_idx
  on public.admin_parameters (parameter_key);

create index if not exists admin_parameters_scope_idx
  on public.admin_parameters (scope, scope_ref);

create index if not exists admin_parameters_value_json_gin
  on public.admin_parameters using gin (value_json);

-- reuse the shared updated_at trigger function
drop trigger if exists trg_admin_parameters_set_updated_at on public.admin_parameters;

create trigger trg_admin_parameters_set_updated_at
before update on public.admin_parameters
for each row
execute function public.set_updated_at();

