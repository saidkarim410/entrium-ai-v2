-- ─────────────────────────────────────────────────────────────
-- public_slug / public_visibility — opt-in public share page
-- A profile can choose to expose a sanitized "admission package"
-- at /p/<slug>. Owner controls slug + visibility (private/public/unlisted).
-- ─────────────────────────────────────────────────────────────

alter table entrium.profiles
  add column if not exists public_slug text,
  add column if not exists public_visibility text not null default 'private'
    check (public_visibility in ('private', 'unlisted', 'public')),
  add column if not exists public_views int not null default 0;

-- Unique slug across the app (case-insensitive), only when present
create unique index if not exists profiles_public_slug_uniq
  on entrium.profiles(lower(public_slug))
  where public_slug is not null;

-- Public read function: returns sanitized profile by slug.
-- Used by the /p/[slug] page (no auth). Bumps view counter on hit.
-- Returns null when slug is private or doesn't exist.
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

  -- Best-effort view counter
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

-- Helper to also fetch applications for the public profile
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

grant execute on function entrium.get_public_applications to anon, authenticated, service_role;
