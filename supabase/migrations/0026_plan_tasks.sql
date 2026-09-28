-- 0026 — saved plan tasks (CTO TZ P1-03: Agent results become actions).
--
-- A tracker/agent plan used to live only inside a tool_runs row as JSON. Now
-- tasks are first-class rows the student can tick off, re-date and link to an
-- application or a scholarship. `deadline_kind` keeps the TZ distinction between
-- an OFFICIAL programme deadline, a PERSONAL preparation date and an ESTIMATE.

create table if not exists entrium.plan_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references entrium.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'prep',            -- tests | essay | docs | research | activity | application | language | prep
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status text not null default 'todo' check (status in ('todo', 'doing', 'done', 'skipped')),
  due_date date,                                    -- calendar date (P0-04 rules apply)
  deadline_kind text not null default 'personal' check (deadline_kind in ('official', 'personal', 'estimate')),
  month_label text,                                 -- "Октябрь 2026" — grouping label from the plan
  position int not null default 0,
  source text not null default 'manual' check (source in ('agent', 'tracker', 'manual', 'scholarship', 'application', 'program')),
  source_run_id uuid references entrium.tool_runs(id) on delete set null,
  application_id uuid references entrium.applications(id) on delete set null,
  scholarship_id uuid references entrium.scholarships(id) on delete set null,
  program_id uuid,                                  -- entrium.programs (0024) — soft reference
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entrium_plan_tasks_user_idx on entrium.plan_tasks (user_id, status, due_date);
create index if not exists entrium_plan_tasks_run_idx on entrium.plan_tasks (source_run_id);

drop trigger if exists trg_plan_tasks_updated_at on entrium.plan_tasks;
create trigger trg_plan_tasks_updated_at
  before update on entrium.plan_tasks
  for each row execute function entrium.set_updated_at();

alter table entrium.plan_tasks enable row level security;
drop policy if exists "plan_tasks_self" on entrium.plan_tasks;
create policy "plan_tasks_self" on entrium.plan_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on entrium.plan_tasks to authenticated, service_role;
