-- ─────────────────────────────────────────────────────────────
-- application_essays — drafts the user works on per application
-- essay_revisions — full text snapshots, used as undo + AI review history
-- ─────────────────────────────────────────────────────────────

create table if not exists entrium.application_essays (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references entrium.profiles(id) on delete cascade,
  application_id uuid references entrium.applications(id) on delete set null,

  title text not null,
  prompt text,
  word_limit int,
  draft_text text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'reviewing', 'final', 'submitted')),
  ai_review jsonb,
  ai_review_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists essays_user_idx
  on entrium.application_essays(user_id, updated_at desc);

create index if not exists essays_user_app_idx
  on entrium.application_essays(user_id, application_id);

drop trigger if exists trg_essays_updated_at on entrium.application_essays;
create trigger trg_essays_updated_at
  before update on entrium.application_essays
  for each row execute function entrium.set_updated_at();

alter table entrium.application_essays enable row level security;

drop policy if exists essays_owner on entrium.application_essays;
create policy essays_owner
  on entrium.application_essays
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant all on entrium.application_essays to authenticated, service_role;

-- ── Revisions: full snapshots, max 1 per minute per essay ──────────────

create table if not exists entrium.essay_revisions (
  id uuid primary key default uuid_generate_v4(),
  essay_id uuid not null references entrium.application_essays(id) on delete cascade,
  content text not null,
  word_count int not null default 0,
  ai_review jsonb,
  created_at timestamptz not null default now()
);

create index if not exists essay_rev_essay_idx
  on entrium.essay_revisions(essay_id, created_at desc);

alter table entrium.essay_revisions enable row level security;

drop policy if exists rev_owner on entrium.essay_revisions;
create policy rev_owner
  on entrium.essay_revisions
  for all
  to authenticated
  using (
    exists (
      select 1 from entrium.application_essays e
      where e.id = essay_id and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from entrium.application_essays e
      where e.id = essay_id and e.user_id = auth.uid()
    )
  );

grant all on entrium.essay_revisions to authenticated, service_role;
