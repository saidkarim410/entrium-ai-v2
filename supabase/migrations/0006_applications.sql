-- ─────────────────────────────────────────────────────────────
-- applications — student's portfolio of university applications
-- One row per (user, university, program). Tracks deadlines,
-- statuses, checklists, and final decisions.
-- ─────────────────────────────────────────────────────────────

create table if not exists entrium.applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references entrium.profiles(id) on delete cascade,

  university_name text not null,
  university_country text,
  program text,
  level text check (level is null or level in ('Bachelor','Master','PhD','MBA','Foundation')),
  round text,                    -- ED, EA, RD, Rolling, Spring, custom string
  deadline date,

  status text not null default 'planning'
    check (status in (
      'planning','in_progress','submitted',
      'interview','accepted','rejected','waitlisted','deferred','withdrew'
    )),
  priority text not null default 'match'
    check (priority in ('reach','match','safety')),

  application_fee_usd numeric(10, 2),
  notes text,
  -- checklist items: [{id, label, done, due?}]
  checklist jsonb not null default '[]'::jsonb,
  result_decision text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entrium_applications_user_idx
  on entrium.applications(user_id, deadline asc nulls last);

create index if not exists entrium_applications_user_status_idx
  on entrium.applications(user_id, status);

-- updated_at trigger
create or replace function entrium.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_applications_updated_at on entrium.applications;
create trigger trg_applications_updated_at
  before update on entrium.applications
  for each row execute function entrium.set_updated_at();

-- RLS — user sees only their own apps
alter table entrium.applications enable row level security;

drop policy if exists applications_owner_all on entrium.applications;
create policy applications_owner_all
  on entrium.applications
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant all on entrium.applications to authenticated, service_role;
