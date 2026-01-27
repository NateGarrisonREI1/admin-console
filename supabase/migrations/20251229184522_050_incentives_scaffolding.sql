-- 050_incentives_scaffolding.sql
-- Incentive programs + rule scaffolding (resolution logic comes later)

create table if not exists public.incentive_programs (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  -- jurisdictional metadata (simple in Phase 1)
  jurisdiction text not null,     -- federal, state, utility, local
  jurisdiction_ref text,          -- e.g. CA, PGE, LADWP

  is_active boolean not null default true,

  description text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint incentive_programs_unique
    unique (name, jurisdiction, jurisdiction_ref)
);

create index if not exists incentive_programs_jurisdiction_idx
  on public.incentive_programs (jurisdiction, jurisdiction_ref);

drop trigger if exists trg_incentive_programs_set_updated_at
  on public.incentive_programs;

create trigger trg_incentive_programs_set_updated_at
before update on public.incentive_programs
for each row
execute function public.set_updated_at();


create table if not exists public.incentive_rules (
  id uuid primary key default gen_random_uuid(),

  incentive_program_id uuid not null
    references public.incentive_programs(id) on delete cascade,

  rule_type public.incentive_rule_type not null,

  -- rule definition (ZIP, income bands, system type, etc.)
  rule_definition jsonb not null,

  priority integer not null default 100,

  is_active boolean not null default true,

  created_at timestamptz not null default now()
);

create index if not exists incentive_rules_program_idx
  on public.incentive_rules (incentive_program_id);

create index if not exists incentive_rules_type_idx
  on public.incentive_rules (rule_type);

create index if not exists incentive_rules_definition_gin
  on public.incentive_rules using gin (rule_definition);

