-- ─────────────────────────────────────────────────────────────
-- 0019 — TZ "Правки для системы" (2026-05-22)
--   • Extend entrium.profiles with PDF-spec demographic + auth-provider fields
--   • Create entrium.payments (per-transaction history, separate from subscriptions)
--   • Add role + admin RLS policies
--   • Add entrium.audit_logs for admin actions
--   • Update handle_new_user() to capture provider IDs + first/last name
--     from auth.users.raw_user_meta_data + raw_app_meta_data
-- ─────────────────────────────────────────────────────────────

set search_path = entrium, public, extensions;

-- ── 1. profiles: PDF-spec columns ────────────────────────────
alter table entrium.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists age int check (age is null or (age between 10 and 120)),
  add column if not exists gender text check (gender is null or gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists school_or_university text,
  add column if not exists class_or_course text,
  add column if not exists google_id text,
  add column if not exists telegram_id text,
  add column if not exists yandex_id text,
  add column if not exists whatsapp_phone text,
  add column if not exists whatsapp_verified boolean not null default false,
  add column if not exists auth_provider text,
  add column if not exists registration_date timestamptz,
  add column if not exists role text not null default 'user' check (role in ('user', 'admin'));

-- Unique provider IDs (where present) — so the same Google/Yandex/TG account
-- can't be associated with two profiles
create unique index if not exists profiles_google_id_uniq
  on entrium.profiles(google_id) where google_id is not null;
create unique index if not exists profiles_yandex_id_uniq
  on entrium.profiles(yandex_id) where yandex_id is not null;
create unique index if not exists profiles_telegram_id_uniq
  on entrium.profiles(telegram_id) where telegram_id is not null;
create unique index if not exists profiles_whatsapp_phone_uniq
  on entrium.profiles(whatsapp_phone) where whatsapp_phone is not null;

create index if not exists profiles_phone_idx on entrium.profiles(phone) where phone is not null;
create index if not exists profiles_country_city_idx on entrium.profiles(country, city);
create index if not exists profiles_role_idx on entrium.profiles(role);
create index if not exists profiles_registration_date_idx on entrium.profiles(registration_date);

-- Backfill registration_date for existing rows
update entrium.profiles
  set registration_date = coalesce(registration_date, created_at)
  where registration_date is null;

-- Backfill first/last name from existing full_name where possible
update entrium.profiles
  set
    first_name = coalesce(first_name, split_part(full_name, ' ', 1)),
    last_name  = coalesce(last_name,  nullif(regexp_replace(full_name, '^\S+\s*', ''), ''))
  where full_name is not null and (first_name is null or last_name is null);

-- ── 2. payments: separate from subscriptions ─────────────────
-- subscriptions tracks recurring billing state.
-- payments logs each individual successful charge (one-time or recurring).
create table if not exists entrium.payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references entrium.profiles(id) on delete cascade,
  amount numeric(12, 2) not null,
  currency text not null default 'USD',
  payment_method text,                          -- 'card' | 'wallet' | 'bank_transfer' | ...
  payment_platform text not null default 'stripe',
  payment_status text not null check (payment_status in ('pending', 'succeeded', 'failed', 'refunded')),
  stripe_payment_intent_id text unique,
  stripe_invoice_id text,
  description text,
  metadata jsonb default '{}'::jsonb,
  payment_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists entrium_payments_user_date_idx on entrium.payments(user_id, payment_date desc);
create index if not exists entrium_payments_status_idx on entrium.payments(payment_status);

alter table entrium.payments enable row level security;
create policy "payments_self_read" on entrium.payments for select using (auth.uid() = user_id);
create policy "payments_admin_all" on entrium.payments for all
  using (exists (select 1 from entrium.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ── 3. audit_logs: admin actions ─────────────────────────────
create table if not exists entrium.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references entrium.profiles(id) on delete set null,
  action text not null,
  target_table text,
  target_id text,
  details jsonb default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists entrium_audit_logs_actor_idx on entrium.audit_logs(actor_id, created_at desc);
create index if not exists entrium_audit_logs_action_idx on entrium.audit_logs(action);

alter table entrium.audit_logs enable row level security;
create policy "audit_logs_admin_only" on entrium.audit_logs for all
  using (exists (select 1 from entrium.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ── 4. Admin-wide RLS read policies on existing tables ───────
-- Admin can read all profiles / usage / runs / payments (in addition to own)
create policy "profiles_admin_read" on entrium.profiles for select
  using (exists (select 1 from entrium.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "usage_events_admin_read" on entrium.usage_events for select
  using (exists (select 1 from entrium.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "tool_runs_admin_read" on entrium.tool_runs for select
  using (exists (select 1 from entrium.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "subscriptions_admin_read" on entrium.subscriptions for select
  using (exists (select 1 from entrium.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ── 5. Updated handle_new_user() — capture provider IDs ──────
-- Pulls everything Supabase Auth gives us in raw_user_meta_data
-- (per-provider profile) and raw_app_meta_data (provider name).
create or replace function entrium.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = entrium, public, extensions
as $$
declare
  v_provider text;
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_avatar text;
  v_meta jsonb;
begin
  v_meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_provider := coalesce(new.raw_app_meta_data->>'provider', 'email');

  -- Best-effort name extraction (provider key varies)
  v_full_name := coalesce(
    v_meta->>'full_name',
    v_meta->>'name',
    v_meta->>'display_name',
    concat_ws(' ', v_meta->>'first_name', v_meta->>'last_name')
  );
  v_first_name := coalesce(
    v_meta->>'first_name',
    v_meta->>'given_name',
    case when v_full_name <> '' then split_part(v_full_name, ' ', 1) else null end
  );
  v_last_name := coalesce(
    v_meta->>'last_name',
    v_meta->>'family_name',
    case when position(' ' in coalesce(v_full_name, '')) > 0
         then regexp_replace(v_full_name, '^\S+\s*', '')
         else null end
  );
  v_avatar := coalesce(v_meta->>'avatar_url', v_meta->>'picture', v_meta->>'photo_url');

  insert into entrium.profiles (
    id, email,
    full_name, first_name, last_name,
    avatar_url,
    auth_provider, registration_date,
    google_id, telegram_id, yandex_id,
    referral_code
  )
  values (
    new.id,
    coalesce(new.email, new.id::text || '@unknown.local'),
    nullif(v_full_name, ''),
    nullif(v_first_name, ''),
    nullif(v_last_name, ''),
    v_avatar,
    v_provider,
    new.created_at,
    case when v_provider = 'google'   then coalesce(v_meta->>'sub', v_meta->>'provider_id') end,
    case when v_provider = 'telegram' then coalesce(v_meta->>'telegram_id', v_meta->>'sub') end,
    case when v_provider = 'yandex'   then coalesce(v_meta->>'sub', v_meta->>'provider_id') end,
    encode(extensions.gen_random_bytes(6), 'hex')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Trigger remains attached (re-create defensively)
drop trigger if exists on_entrium_auth_user_created on auth.users;
create trigger on_entrium_auth_user_created
  after insert on auth.users
  for each row execute function entrium.handle_new_user();

-- ── 6. Helper view for admin user lookup ─────────────────────
create or replace view entrium.users_with_payments as
select
  p.id as user_id,
  p.email, p.first_name, p.last_name, p.full_name,
  p.phone, p.age, p.gender, p.country, p.city,
  p.school_or_university, p.class_or_course,
  p.auth_provider, p.tier, p.role,
  p.google_id, p.telegram_id, p.yandex_id,
  p.whatsapp_phone, p.whatsapp_verified,
  p.registration_date, p.created_at, p.updated_at,
  coalesce(sum(case when pay.payment_status = 'succeeded' then pay.amount end), 0) as total_paid,
  count(case when pay.payment_status = 'succeeded' then 1 end)::int as payment_count,
  max(pay.payment_date) filter (where pay.payment_status = 'succeeded') as last_payment_at
from entrium.profiles p
left join entrium.payments pay on pay.user_id = p.id
group by p.id;

grant select on entrium.users_with_payments to authenticated, service_role;

notify pgrst, 'reload config';
