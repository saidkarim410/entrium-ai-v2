-- ─────────────────────────────────────────────────────────────
-- profile_snapshots — point-in-time copies of applicant_data
-- One row per (user, day) — enforced by snapshot_date column with unique
-- index. Postgres rejects (created_at::date) in a unique index because
-- timestamptz→date depends on session TZ (STABLE not IMMUTABLE), so we
-- materialize the date as its own column.
-- ─────────────────────────────────────────────────────────────

create table if not exists entrium.profile_snapshots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references entrium.profiles(id) on delete cascade,
  snapshot_date date not null default (now() at time zone 'UTC')::date,
  applicant_data jsonb not null,
  completeness int not null default 0,
  apps_count int not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists profile_snap_user_day_uniq
  on entrium.profile_snapshots(user_id, snapshot_date);

create index if not exists profile_snap_user_idx
  on entrium.profile_snapshots(user_id, created_at desc);

alter table entrium.profile_snapshots enable row level security;

drop policy if exists snap_owner on entrium.profile_snapshots;
create policy snap_owner
  on entrium.profile_snapshots
  for select
  to authenticated
  using (user_id = auth.uid());

grant select on entrium.profile_snapshots to authenticated;
grant all on entrium.profile_snapshots to service_role;
