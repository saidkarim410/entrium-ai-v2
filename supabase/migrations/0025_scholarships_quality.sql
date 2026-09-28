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
