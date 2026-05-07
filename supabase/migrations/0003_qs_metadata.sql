-- Add QS-specific metadata fields
alter table entrium.universities add column if not exists rank_display text;
alter table entrium.universities add column if not exists region text;
alter table entrium.universities add column if not exists overall_score numeric(5,2);

-- Drop old function (return type changed)
drop function if exists entrium.match_universities(vector, float, int, text, int);

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
  rank_display text,
  region text,
  overall_score numeric,
  description text,
  website text,
  similarity float
)
language sql stable
as $$
  select
    u.id, u.name, u.country, u.city, u.qs_rank, u.rank_display, u.region, u.overall_score,
    u.description, u.website,
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

grant execute on function entrium.match_universities to authenticated, anon, service_role;
