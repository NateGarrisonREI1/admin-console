-- 010_system_catalog.sql
-- System Catalog = identity only (no savings/cost/carbon)

create table if not exists public.system_catalog (
  id uuid primary key default gen_random_uuid(),

  system_type public.system_type not null,

  manufacturer text not null,
  model text not null,
  display_name text not null,

  fuel_type text,
  description text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- prevent obvious duplicates within a type
  constraint system_catalog_unique_type_mfr_model unique (system_type, manufacturer, model)
);

-- helpful lookup index
create index if not exists system_catalog_type_idx
  on public.system_catalog (system_type);

-- auto-update updated_at on row changes
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_system_catalog_set_updated_at on public.system_catalog;

create trigger trg_system_catalog_set_updated_at
before update on public.system_catalog
for each row
execute function public.set_updated_at();

