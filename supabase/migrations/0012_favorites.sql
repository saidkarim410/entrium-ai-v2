-- ─────────────────────────────────────────────────────────────
-- favorites — saved universities / scholarships
-- One row per (user, kind, target). RLS-protected.
-- ─────────────────────────────────────────────────────────────

create table if not exists entrium.favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references entrium.profiles(id) on delete cascade,
  kind text not null check (kind in ('university', 'scholarship')),
  target_id uuid not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, kind, target_id)
);

create index if not exists favorites_user_idx
  on entrium.favorites(user_id, kind, created_at desc);

alter table entrium.favorites enable row level security;

drop policy if exists favorites_owner on entrium.favorites;
create policy favorites_owner
  on entrium.favorites
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant all on entrium.favorites to authenticated, service_role;
