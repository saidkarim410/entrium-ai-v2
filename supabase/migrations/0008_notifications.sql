-- ─────────────────────────────────────────────────────────────
-- notifications — in-app notification center
-- Created by:
--   * cron jobs (deadline reminders)
--   * agent runs (mission completed)
--   * system (tips, updates)
-- ─────────────────────────────────────────────────────────────

create table if not exists entrium.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references entrium.profiles(id) on delete cascade,

  type text not null check (type in (
    'deadline', 'tip', 'system', 'agent_done', 'referral'
  )),
  title text not null,
  body text,
  link text,                  -- e.g. /applications/<id> or /tools/reviewer
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifs_user_created_idx
  on entrium.notifications(user_id, created_at desc);

create index if not exists notifs_user_unread_idx
  on entrium.notifications(user_id)
  where read_at is null;

-- Dedup helper: same user + type + dedup_key (in data) shouldn't re-fire
create unique index if not exists notifs_user_dedup_uniq
  on entrium.notifications(user_id, type, (data->>'dedup_key'))
  where data ? 'dedup_key';

-- RLS — user reads only their own
alter table entrium.notifications enable row level security;

drop policy if exists notifs_owner on entrium.notifications;
create policy notifs_owner
  on entrium.notifications
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant all on entrium.notifications to authenticated, service_role;
