-- 001_core_types.sql
-- Core enums used across Phase 1 tables
-- Safe to re-run: uses IF NOT EXISTS guards where supported.

do $$ begin
  -- System categories (identity only; no calculations)
  create type public.system_type as enum (
    'hvac',
    'water_heater',
    'insulation',
    'air_sealing',
    'windows',
    'solar_pv',
    'battery',
    'ev_charger',
    'appliance',
    'lighting',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  -- Compatibility relationship type between two catalog entries
  create type public.compatibility_type as enum (
    'allowed',
    'blocked',
    'conditional'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  -- Intake job lifecycle (raw payload -> snapshot)
  create type public.job_status as enum (
    'new',
    'validated',
    'queued',
    'processing',
    'completed',
    'failed'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  -- How to interpret admin parameter values
  create type public.parameter_value_type as enum (
    'number',
    'integer',
    'boolean',
    'string',
    'json'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  -- Incentive eligibility rule scaffolding (Phase 1 only)
  create type public.incentive_rule_type as enum (
    'zip',
    'state',
    'utility',
    'income',
    'customer_type',
    'system_type',
    'other'
  );
exception
  when duplicate_object then null;
end $$;


