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
