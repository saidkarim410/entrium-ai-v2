-- ============================================================
-- APPLY TO PROD SUPABASE: SQL Editor -> paste ALL -> Run (idempotent, in order)
-- Project ref: zcbbpqfdyqavdubzrgaf
-- Migrations 0022 (free limit 3) + 0023 (quota read-only fn, bonus fix)
--            + 0024 (programs table) + 0025 (scholarship quality)
--            + 0026 (plan tasks)
-- Prepared 2026-09-28. App code on branch fix/cto-tz-2026-09 tolerates
-- both states (before/after), so order of deploy vs SQL does not matter.
-- After running: `npx tsx scripts/import-programs.ts data/programs/programs-seed-2026-09-28.csv`
-- ============================================================


-- ─────────────────────────────── 0022_free_daily_limit_3 ───────────────────────────────
-- 0022 — Lower the free-tier daily AI limit from 5 → 3 requests/day.
-- The ONLY change vs 0020's try_consume_quota is `free_limit := 3`.
-- Idempotent (create or replace); no deploy-order hazard (reservation logic unchanged).
create or replace function entrium.try_consume_quota(uid uuid)
returns table (allowed boolean, remaining int, tier text, bonus int)
language plpgsql security definer set search_path = entrium, public as $$
declare
  user_tier text; user_pro_until timestamptz; user_bonus int;
  used int; free_limit constant int := 3; is_pro boolean;
begin
  select p.tier, p.pro_until, p.bonus_credits
    into user_tier, user_pro_until, user_bonus
    from entrium.profiles p where p.id = uid for update;

  if not found then
    return query select false, 0, 'free'::text, 0; return;
  end if;

  is_pro := user_tier = 'pro' and (user_pro_until is null or user_pro_until > now());

  select count(*) into used from entrium.usage_events
    where user_id = uid
      and created_at >= date_trunc('day', now() at time zone 'utc')
      and created_at <  date_trunc('day', now() at time zone 'utc') + interval '1 day';

  if is_pro then
    insert into entrium.usage_events (user_id, tool, model, input_tokens, output_tokens, cost_usd)
      values (uid, '__reserved__', 'reserved', 0, 0, 0);
    return query select true, 2147483647, 'pro'::text, coalesce(user_bonus, 0); return;
  end if;

  if used + coalesce(user_bonus, 0) >= free_limit then
    return query select false, 0, 'free'::text, coalesce(user_bonus, 0); return;
  end if;

  insert into entrium.usage_events (user_id, tool, model, input_tokens, output_tokens, cost_usd)
    values (uid, '__reserved__', 'reserved', 0, 0, 0);

  return query select true,
    free_limit - (used + 1) + coalesce(user_bonus, 0),
    'free'::text, coalesce(user_bonus, 0);
end; $$;

grant execute on function entrium.try_consume_quota(uuid) to authenticated, service_role;


-- ─────────────────────────────── 0023_quota_status_and_bonus_fix ───────────────────────────────
-- 0023 — quota: fix bonus semantics, expose the limit, add a READ-ONLY status function.
--
-- Context (CTO TZ 2026-09-28, P1-04):
--   1. Every version of try_consume_quota gated on `used + bonus >= free_limit`,
--      so referral bonus credits REDUCED the allowance (a user with +10 bonus was
--      locked out immediately). Intended: bonus EXTENDS the daily limit.
--   2. The app had no read-only way to show the balance — it called the reserving
--      function from the dashboard and after every AI call, burning quota.
--   3. The daily limit lived only inside the function; the app hardcoded its own
--      number and they drifted (code 3, prod 5). The function now returns it.
--
-- Safe to apply after the app code that reads `daily_limit` is deployed: the app
-- tolerates the old 4-column shape and falls back to its own constant.

create or replace function entrium.try_consume_quota(uid uuid)
returns table (allowed boolean, remaining int, tier text, bonus int, daily_limit int)
language plpgsql security definer set search_path = entrium, public as $$
declare
  user_tier text; user_pro_until timestamptz; user_bonus int;
  used int; free_limit constant int := 3; is_pro boolean;
begin
  select p.tier, p.pro_until, p.bonus_credits
    into user_tier, user_pro_until, user_bonus
    from entrium.profiles p where p.id = uid for update;

  if not found then
    return query select false, 0, 'free'::text, 0, free_limit; return;
  end if;

  user_bonus := coalesce(user_bonus, 0);
  is_pro := user_tier = 'pro' and (user_pro_until is null or user_pro_until > now());

  select count(*) into used from entrium.usage_events
    where user_id = uid
      and created_at >= date_trunc('day', now() at time zone 'utc')
      and created_at <  date_trunc('day', now() at time zone 'utc') + interval '1 day';

  if is_pro then
    insert into entrium.usage_events (user_id, tool, model, input_tokens, output_tokens, cost_usd)
      values (uid, '__reserved__', 'reserved', 0, 0, 0);
    return query select true, 2147483647, 'pro'::text, user_bonus, free_limit; return;
  end if;

  -- bonus EXTENDS the daily allowance
  if used >= free_limit + user_bonus then
    return query select false, 0, 'free'::text, user_bonus, free_limit; return;
  end if;

  insert into entrium.usage_events (user_id, tool, model, input_tokens, output_tokens, cost_usd)
    values (uid, '__reserved__', 'reserved', 0, 0, 0);

  return query select true,
    greatest(free_limit - (used + 1), 0),
    'free'::text, user_bonus, free_limit;
end; $$;
grant execute on function entrium.try_consume_quota(uuid) to authenticated, service_role;

-- Read-only balance: NO reservation, NO side effects. For dashboards and post-call checks.
create or replace function entrium.get_usage_status(uid uuid)
returns table (allowed boolean, remaining int, tier text, bonus int, daily_limit int, used_today int)
language plpgsql security definer set search_path = entrium, public as $$
declare
  user_tier text; user_pro_until timestamptz; user_bonus int;
  used int; free_limit constant int := 3; is_pro boolean;
begin
  select p.tier, p.pro_until, p.bonus_credits
    into user_tier, user_pro_until, user_bonus
    from entrium.profiles p where p.id = uid;

  if not found then
    return query select false, 0, 'free'::text, 0, free_limit, 0; return;
  end if;

  user_bonus := coalesce(user_bonus, 0);
  is_pro := user_tier = 'pro' and (user_pro_until is null or user_pro_until > now());

  select count(*) into used from entrium.usage_events
    where user_id = uid
      and created_at >= date_trunc('day', now() at time zone 'utc')
      and created_at <  date_trunc('day', now() at time zone 'utc') + interval '1 day';

  if is_pro then
    return query select true, 2147483647, 'pro'::text, user_bonus, free_limit, used; return;
  end if;

  return query select (used < free_limit + user_bonus),
    greatest(free_limit - used, 0),
    'free'::text, user_bonus, free_limit, used;
end; $$;
grant execute on function entrium.get_usage_status(uuid) to authenticated, service_role;


-- ─────────────────────────────── 0024_programs ───────────────────────────────
-- 0024 — verified study PROGRAMS (CTO TZ P0-03).
--
-- The `universities` table is the QS ranking list: name, country, city, a link
-- to topuniversities.com. It has no programmes, language of instruction, tuition
-- or entry requirements — so the AI invented them. The unit of a recommendation
-- is a PROGRAMME; this table is the only source the University Advisor may
-- recommend from. Rows are entered/imported by admins and checked by the
-- admissions specialist (`status`, `verified_at`, `verified_by`).

create extension if not exists vector;

create table if not exists entrium.programs (
  id uuid primary key default gen_random_uuid(),
  university_id uuid references entrium.universities(id) on delete set null,
  university_name text not null,
  country text not null,                      -- canonical English name, e.g. 'Italy'
  city text,
  campus text,
  program_name text not null,                 -- official name, e.g. 'BSc International Economics and Finance'
  level text not null check (level in ('bachelor', 'master', 'phd', 'foundation')),
  language text not null default 'en',        -- ISO 639-1 of instruction: en, it, de, ...
  intake text,                                -- human label, e.g. 'Fall 2027'
  intake_year int,                            -- 2027
  academic_year text,                         -- '2027/2028'
  duration_years numeric(3,1),
  tuition_amount numeric(12,2),               -- per `tuition_period`, in `tuition_currency`
  tuition_currency text default 'EUR',
  tuition_period text default 'year' check (tuition_period in ('year', 'total', 'semester')),
  tuition_note text,                          -- e.g. 'income-based, €0–13,000'
  admission_requirements text,                -- previous education, as published
  accepts_11_year_school text not null default 'unknown'
    check (accepts_11_year_school in ('yes', 'no', 'conditional', 'unknown')),
  required_exams text[] not null default '{}',-- e.g. '{SAT}', '{TOLC-E}'
  english_requirement text,                   -- e.g. 'IELTS 6.0 (no band below 5.5)'
  other_language_requirement text,            -- e.g. 'none' / 'Italian B2 for the IT track'
  application_deadline date,                  -- for `intake_year`; null when not published
  deadline_status text not null default 'not_published'
    check (deadline_status in ('published', 'not_published', 'estimated')),
  deadline_note text,                         -- e.g. 'Round 1 of 3; later rounds until May'
  source_url text not null,                   -- official programme page
  verified_at date,
  verified_by text,
  status text not null default 'draft' check (status in ('verified', 'needs_review', 'draft', 'archived')),
  notes text,
  embedding vector(1536),
  -- Stored natural key so CSV re-imports upsert instead of duplicating (PostgREST on_conflict needs a column)
  natural_key text generated always as (
    lower(university_name) || '|' || lower(program_name) || '|' || level || '|' || language || '|' || coalesce(intake_year::text, '')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entrium_programs_filter_idx
  on entrium.programs (level, country, language, intake_year, status);
create index if not exists entrium_programs_university_idx
  on entrium.programs (university_id);
create unique index if not exists entrium_programs_natural_key
  on entrium.programs (natural_key);

drop trigger if exists trg_programs_updated_at on entrium.programs;
create trigger trg_programs_updated_at
  before update on entrium.programs
  for each row execute function entrium.set_updated_at();

alter table entrium.programs enable row level security;
-- Students may read programmes that passed (or await) specialist review; drafts are admin-only.
drop policy if exists "programs_read_public" on entrium.programs;
create policy "programs_read_public" on entrium.programs
  for select using (status in ('verified', 'needs_review'));
-- Writes go through the service role (admin import) only.

grant select on entrium.programs to authenticated, service_role;
grant insert, update, delete on entrium.programs to service_role;


-- ─────────────────────────────── 0025_scholarships_quality ───────────────────────────────
-- 0025 — scholarship data quality (CTO TZ P1-01).
--
-- Adds the fields needed to stop showing expired contests as opportunities and
-- to check eligibility BEFORE the AI ranks anything: edition status, the year the
-- deadline refers to, official source + verification date, original currency
-- and coverage breakdown, eligibility by level and citizenship.
-- Data fix at the end: contests whose deadline already passed become `closed`.

alter table entrium.scholarships
  add column if not exists status text not null default 'needs_review'
    check (status in ('open', 'announced_soon', 'closed', 'archived', 'needs_review')),
  add column if not exists edition_year int,                 -- the intake/contest year the deadline refers to
  add column if not exists source_url text,
  add column if not exists verified_at date,
  add column if not exists verified_by text,
  add column if not exists amount_original numeric(14,2),
  add column if not exists currency text,
  add column if not exists amount_period text check (amount_period in ('year', 'total', 'month')),
  add column if not exists coverage jsonb not null default '{}'::jsonb,   -- {tuition_waiver, stipend, housing, travel, insurance}
  add column if not exists eligible_levels text[],           -- null = as `level`; e.g. '{bachelor,master}'
  add column if not exists eligible_citizenships text[],     -- null = any; canonical English country names
  add column if not exists excluded_citizenships text[],
  add column if not exists provider_type text check (provider_type in ('government', 'university', 'private', 'international', 'other'));

create index if not exists entrium_scholarships_status_idx on entrium.scholarships (status, deadline);

-- Country name normalisation for the most common variants in the current data
update entrium.scholarships set country = 'United Kingdom' where country in ('UK', 'U.K.', 'Great Britain', 'Britain', 'England');
update entrium.scholarships set country = 'United States' where country in ('USA', 'US', 'U.S.', 'U.S.A.', 'America');
update entrium.scholarships set country = 'South Korea' where country in ('Korea', 'Republic of Korea', 'Korea, South');
update entrium.scholarships set country = 'Netherlands' where country in ('The Netherlands', 'Holland');
update entrium.scholarships set country = 'Czechia' where country in ('Czech Republic');
update entrium.scholarships set country = 'Türkiye' where country in ('Turkey');

-- Past deadlines are not opportunities. Keep the date as "last known deadline".
update entrium.scholarships
   set status = 'closed'
 where deadline is not null and deadline < current_date and status = 'needs_review';

-- A future deadline is provisionally open until the specialist confirms the edition.
update entrium.scholarships
   set status = 'open', edition_year = extract(year from deadline)::int
 where deadline is not null and deadline >= current_date and status = 'needs_review';

-- Semantic search now returns the quality columns so the app can check status,
-- level and citizenship BEFORE the AI sees a scholarship. Return type changes,
-- so the function must be dropped first.
drop function if exists entrium.match_scholarships(vector, float, int, text, text);
create or replace function entrium.match_scholarships(
  query_embedding vector(1536),
  match_threshold float default 0.3,
  match_count int default 10,
  filter_country text default null,
  filter_level text default null
)
returns table (
  id uuid,
  name text,
  provider text,
  country text,
  level text,
  amount_usd int,
  full_funding boolean,
  deadline date,
  description text,
  url text,
  similarity float,
  status text,
  edition_year int,
  source_url text,
  verified_at date,
  amount_original numeric,
  currency text,
  amount_period text,
  coverage jsonb,
  eligible_levels text[],
  eligible_citizenships text[],
  excluded_citizenships text[]
)
language sql stable
as $$
  select
    s.id, s.name, s.provider, s.country, s.level, s.amount_usd, s.full_funding, s.deadline,
    s.description, s.url,
    1 - (s.embedding <=> query_embedding) as similarity,
    s.status, s.edition_year, s.source_url, s.verified_at, s.amount_original, s.currency,
    s.amount_period, s.coverage, s.eligible_levels, s.eligible_citizenships, s.excluded_citizenships
  from entrium.scholarships s
  where
    s.embedding is not null
    and s.status <> 'archived'
    and 1 - (s.embedding <=> query_embedding) > match_threshold
    and (filter_country is null or s.country ilike filter_country)
    and (filter_level is null or s.level = filter_level or s.level = 'any')
  order by s.embedding <=> query_embedding
  limit match_count;
$$;
grant execute on function entrium.match_scholarships(vector, float, int, text, text) to authenticated, service_role;


-- ─────────────────────────────── 0026_plan_tasks ───────────────────────────────
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


-- ─────────────────────────────── verification (expect value = 1 in every row) ───────────────────────────────
select 'try_consume_quota returns daily_limit' as check_name, count(*)::text as value from information_schema.parameters where specific_schema='entrium' and specific_name like 'try_consume_quota%' and parameter_name='daily_limit'
union all select 'get_usage_status exists', count(*)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='entrium' and p.proname='get_usage_status'
union all select 'programs table', count(*)::text from information_schema.tables where table_schema='entrium' and table_name='programs'
union all select 'scholarships.status column', count(*)::text from information_schema.columns where table_schema='entrium' and table_name='scholarships' and column_name='status'
union all select 'plan_tasks table', count(*)::text from information_schema.tables where table_schema='entrium' and table_name='plan_tasks';
