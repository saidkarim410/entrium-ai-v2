-- ─────────────────────────────────────────────────────────────
-- Vector search RPC functions for universities and scholarships
-- ─────────────────────────────────────────────────────────────

create or replace function entrium.match_universities(
  query_embedding vector(1536),
  match_threshold float default 0.3,
  match_count int default 10,
  filter_country text default null,
  max_qs_rank int default null
)
returns table (
  id uuid,
  name text,
  country text,
  city text,
  qs_rank int,
  description text,
  website text,
  similarity float
)
language sql stable
as $$
  select
    u.id,
    u.name,
    u.country,
    u.city,
    u.qs_rank,
    u.description,
    u.website,
    1 - (u.embedding <=> query_embedding) as similarity
  from entrium.universities u
  where
    u.embedding is not null
    and 1 - (u.embedding <=> query_embedding) > match_threshold
    and (filter_country is null or u.country ilike filter_country)
    and (max_qs_rank is null or u.qs_rank is null or u.qs_rank <= max_qs_rank)
  order by u.embedding <=> query_embedding
  limit match_count;
$$;

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
  similarity float
)
language sql stable
as $$
  select
    s.id,
    s.name,
    s.provider,
    s.country,
    s.level,
    s.amount_usd,
    s.full_funding,
    s.deadline,
    s.description,
    s.url,
    1 - (s.embedding <=> query_embedding) as similarity
  from entrium.scholarships s
  where
    s.embedding is not null
    and 1 - (s.embedding <=> query_embedding) > match_threshold
    and (filter_country is null or s.country ilike filter_country)
    and (filter_level is null or s.level = filter_level or s.level = 'any')
  order by s.embedding <=> query_embedding
  limit match_count;
$$;

-- Allow authenticated users to call these via REST
grant execute on function entrium.match_universities to authenticated, anon, service_role;
grant execute on function entrium.match_scholarships to authenticated, anon, service_role;
