-- Add applicant_data jsonb column to entrium.profiles
-- This is the Single Profile that all 11 tools will pre-fill from.

alter table entrium.profiles
  add column if not exists applicant_data jsonb not null default '{}'::jsonb;

-- Index for efficient querying of profile completeness
create index if not exists profiles_applicant_data_idx
  on entrium.profiles using gin (applicant_data);

-- Helper: check if user has completed onboarding
-- (used for redirect logic on dashboard)
create or replace function entrium.has_completed_onboarding(uid uuid)
returns boolean
language sql stable
as $$
  select coalesce(
    (applicant_data->>'_completed')::boolean,
    false
  )
  from entrium.profiles
  where id = uid;
$$;

grant execute on function entrium.has_completed_onboarding to authenticated, anon, service_role;
