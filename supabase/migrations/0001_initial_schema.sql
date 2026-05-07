-- ─────────────────────────────────────────────────────────────
-- Entrium AI v2 — initial schema (in `entrium` schema)
-- Isolated from other products sharing this Supabase project.
-- ─────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "vector";

create schema if not exists entrium;
grant usage on schema entrium to anon, authenticated, service_role;
grant all on all tables in schema entrium to service_role;
grant all on all routines in schema entrium to service_role;
grant all on all sequences in schema entrium to service_role;
alter default privileges in schema entrium grant all on tables to service_role;
alter default privileges in schema entrium grant all on routines to service_role;
alter default privileges in schema entrium grant all on sequences to service_role;

-- ─────────────────────────────────────────────────────────────
-- profiles — extends auth.users with app-level data
-- ─────────────────────────────────────────────────────────────
create table entrium.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  language text not null default 'ru' check (language in ('ru', 'en', 'uz')),
  tier text not null default 'free' check (tier in ('free', 'pro')),
  pro_until timestamptz,
  stripe_customer_id text unique,
  referral_code text unique,
  referred_by uuid references entrium.profiles(id),
  bonus_credits int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index entrium_profiles_email_idx on entrium.profiles(email);
create index entrium_profiles_referral_code_idx on entrium.profiles(referral_code);

-- ─────────────────────────────────────────────────────────────
-- usage_events — rate limiting per user per day per tool
-- ─────────────────────────────────────────────────────────────
create table entrium.usage_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references entrium.profiles(id) on delete cascade,
  tool text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);

create index entrium_usage_user_created_idx on entrium.usage_events(user_id, created_at desc);
create index entrium_usage_user_tool_idx on entrium.usage_events(user_id, tool);

-- ─────────────────────────────────────────────────────────────
-- tool_runs — history of AI tool runs for users to revisit
-- ─────────────────────────────────────────────────────────────
create table entrium.tool_runs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references entrium.profiles(id) on delete cascade,
  tool text not null,
  input jsonb not null,
  output jsonb,
  status text not null default 'pending' check (status in ('pending', 'success', 'error')),
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index entrium_tool_runs_user_idx on entrium.tool_runs(user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- universities — QS World Rankings 1500+ unis with vector search
-- ─────────────────────────────────────────────────────────────
create table entrium.universities (
  id uuid primary key default uuid_generate_v4(),
  qs_rank int,
  name text not null,
  country text not null,
  city text,
  website text,
  description text,
  ranking_year int default 2025,
  metadata jsonb default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index entrium_unis_country_idx on entrium.universities(country);
create index entrium_unis_qs_rank_idx on entrium.universities(qs_rank);
create index entrium_unis_embedding_idx on entrium.universities
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ─────────────────────────────────────────────────────────────
-- scholarships — 300+ scholarships with semantic search
-- ─────────────────────────────────────────────────────────────
create table entrium.scholarships (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  provider text,
  country text,
  level text check (level in ('bachelor', 'master', 'phd', 'any')),
  amount_usd int,
  full_funding boolean default false,
  deadline date,
  url text,
  description text,
  requirements jsonb default '[]'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index entrium_scholarships_country_idx on entrium.scholarships(country);
create index entrium_scholarships_deadline_idx on entrium.scholarships(deadline);
create index entrium_scholarships_embedding_idx on entrium.scholarships
  using ivfflat (embedding vector_cosine_ops) with (lists = 50);

-- ─────────────────────────────────────────────────────────────
-- subscriptions — Stripe subscription state
-- ─────────────────────────────────────────────────────────────
create table entrium.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references entrium.profiles(id) on delete cascade,
  stripe_subscription_id text unique not null,
  stripe_price_id text not null,
  status text not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index entrium_subs_user_idx on entrium.subscriptions(user_id);

-- ─────────────────────────────────────────────────────────────
-- Auto-create profile on signup
-- ─────────────────────────────────────────────────────────────
create or replace function entrium.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = entrium, public
as $$
begin
  insert into entrium.profiles (id, email, full_name, avatar_url, referral_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    encode(gen_random_bytes(6), 'hex')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_entrium_auth_user_created on auth.users;
create trigger on_entrium_auth_user_created
  after insert on auth.users
  for each row execute function entrium.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────
create or replace function entrium.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger entrium_profiles_updated_at before update on entrium.profiles
  for each row execute function entrium.set_updated_at();
create trigger entrium_subscriptions_updated_at before update on entrium.subscriptions
  for each row execute function entrium.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table entrium.profiles enable row level security;
alter table entrium.usage_events enable row level security;
alter table entrium.tool_runs enable row level security;
alter table entrium.subscriptions enable row level security;
alter table entrium.universities enable row level security;
alter table entrium.scholarships enable row level security;

create policy "profiles_self_read" on entrium.profiles for select using (auth.uid() = id);
create policy "profiles_self_update" on entrium.profiles for update using (auth.uid() = id);
create policy "usage_events_self_read" on entrium.usage_events for select using (auth.uid() = user_id);
create policy "tool_runs_self_read" on entrium.tool_runs for select using (auth.uid() = user_id);
create policy "tool_runs_self_insert" on entrium.tool_runs for insert with check (auth.uid() = user_id);
create policy "subscriptions_self_read" on entrium.subscriptions for select using (auth.uid() = user_id);
create policy "universities_public_read" on entrium.universities for select using (true);
create policy "scholarships_public_read" on entrium.scholarships for select using (true);

-- ─────────────────────────────────────────────────────────────
-- Expose entrium schema via PostgREST API
-- ─────────────────────────────────────────────────────────────
notify pgrst, 'reload config';
