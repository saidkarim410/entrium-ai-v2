/**
 * Inlined SQL migrations 0006–0011 for the /setup wizard.
 *
 * We embed them as TS constants instead of fs.readFileSync because Vercel
 * lambdas don't auto-include arbitrary repo files in the bundle. Keeping
 * them inline guarantees they ship.
 *
 * Source of truth: supabase/migrations/000{6..11}_*.sql
 */

export type SetupMigration = { name: string; sql: string }

const M0006 = `-- 0006_applications.sql
create table if not exists entrium.applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references entrium.profiles(id) on delete cascade,

  university_name text not null,
  university_country text,
  program text,
  level text check (level is null or level in ('Bachelor','Master','PhD','MBA','Foundation')),
  round text,
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
  checklist jsonb not null default '[]'::jsonb,
  result_decision text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entrium_applications_user_idx
  on entrium.applications(user_id, deadline asc nulls last);

create index if not exists entrium_applications_user_status_idx
  on entrium.applications(user_id, status);

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

alter table entrium.applications enable row level security;

drop policy if exists applications_owner_all on entrium.applications;
create policy applications_owner_all
  on entrium.applications
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant all on entrium.applications to authenticated, service_role;`

const M0007 = `-- 0007_telegram.sql
alter table entrium.profiles
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_username text,
  add column if not exists telegram_link_code text,
  add column if not exists telegram_link_expires timestamptz;

create unique index if not exists profiles_telegram_chat_id_uniq
  on entrium.profiles(telegram_chat_id)
  where telegram_chat_id is not null;

create unique index if not exists profiles_telegram_link_code_uniq
  on entrium.profiles(telegram_link_code)
  where telegram_link_code is not null;`

const M0008 = `-- 0008_notifications.sql
create table if not exists entrium.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references entrium.profiles(id) on delete cascade,

  type text not null check (type in (
    'deadline', 'tip', 'system', 'agent_done', 'referral'
  )),
  title text not null,
  body text,
  link text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifs_user_created_idx
  on entrium.notifications(user_id, created_at desc);

create index if not exists notifs_user_unread_idx
  on entrium.notifications(user_id)
  where read_at is null;

create unique index if not exists notifs_user_dedup_uniq
  on entrium.notifications(user_id, type, (data->>'dedup_key'))
  where data ? 'dedup_key';

alter table entrium.notifications enable row level security;

drop policy if exists notifs_owner on entrium.notifications;
create policy notifs_owner
  on entrium.notifications
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant all on entrium.notifications to authenticated, service_role;`

const M0009 = `-- 0009_public_sharing.sql
alter table entrium.profiles
  add column if not exists public_slug text,
  add column if not exists public_visibility text not null default 'private'
    check (public_visibility in ('private', 'unlisted', 'public')),
  add column if not exists public_views int not null default 0;

create unique index if not exists profiles_public_slug_uniq
  on entrium.profiles(lower(public_slug))
  where public_slug is not null;

create or replace function entrium.get_public_profile(p_slug text)
returns table (
  full_name text,
  applicant_data jsonb,
  visibility text
)
language plpgsql
security definer
set search_path = entrium, public
as $$
declare
  uid uuid;
  vis text;
begin
  select id, public_visibility into uid, vis
  from entrium.profiles
  where lower(public_slug) = lower(p_slug)
  limit 1;

  if uid is null or vis = 'private' then
    return;
  end if;

  update entrium.profiles
    set public_views = public_views + 1
    where id = uid;

  return query
    select p.full_name, p.applicant_data, p.public_visibility
    from entrium.profiles p
    where p.id = uid;
end;
$$;

grant execute on function entrium.get_public_profile to anon, authenticated, service_role;

create or replace function entrium.get_public_applications(p_slug text)
returns table (
  university_name text,
  university_country text,
  program text,
  level text,
  status text,
  priority text,
  deadline date
)
language sql
security definer
set search_path = entrium, public
as $$
  select a.university_name, a.university_country, a.program, a.level,
         a.status, a.priority, a.deadline
  from entrium.applications a
  join entrium.profiles p on p.id = a.user_id
  where lower(p.public_slug) = lower(p_slug)
    and p.public_visibility != 'private'
  order by a.deadline asc nulls last;
$$;

grant execute on function entrium.get_public_applications to anon, authenticated, service_role;`

const M0010 = `-- 0010_app_ai_suggestions.sql
alter table entrium.applications
  add column if not exists ai_suggestions jsonb,
  add column if not exists ai_suggestions_at timestamptz;`

const M0011 = `-- 0011_email_prefs.sql
alter table entrium.profiles
  add column if not exists email_digest_enabled boolean not null default true,
  add column if not exists email_digest_sent_at timestamptz;`

export const SETUP_MIGRATIONS: SetupMigration[] = [
  { name: "0006_applications", sql: M0006 },
  { name: "0007_telegram", sql: M0007 },
  { name: "0008_notifications", sql: M0008 },
  { name: "0009_public_sharing", sql: M0009 },
  { name: "0010_app_ai_suggestions", sql: M0010 },
  { name: "0011_email_prefs", sql: M0011 },
]
