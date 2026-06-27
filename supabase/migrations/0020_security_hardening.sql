-- ────────────────────────────────────────────────────────────────────
-- 0020 — Security hardening (audit 2026-06-26). See docs/security/SECURITY_FINDINGS.md.
--
-- ⚠️  Apply this to PROD via the Supabase SQL editor. Some items (C3) MUST be
--     deployed together with the matching app code on branch
--     security/hardening-2026-06 — see the per-section notes.
--
-- This migration is written to be idempotent and safe whether or not every
-- prior migration was applied to the target DB (guards with IF EXISTS).
-- ────────────────────────────────────────────────────────────────────

-- ── C1 (CRITICAL) — PII/payments view was world-readable to any logged-in user ──
-- The `users_with_payments` view ran with owner privileges (no security_invoker)
-- and was granted to `authenticated` in the PostgREST-exposed `entrium` schema, so
-- any registered user could dump every user's email/phone/payments with the public
-- anon key + their own JWT. Make it RLS-respecting and revoke the broad grant.
-- (The only legitimate callers — admin pages/exports — use the service-role client,
-- which is unaffected by the revoke.)
do $$
begin
  if exists (
    select 1 from pg_views where schemaname = 'entrium' and viewname = 'users_with_payments'
  ) then
    execute 'alter view entrium.users_with_payments set (security_invoker = true)';
    execute 'revoke select on entrium.users_with_payments from authenticated, anon';
  end if;
end $$;

-- ── H8 — profiles self-update policy hardening (latent free-Pro / self-admin) ──
-- `profiles_self_update` had no WITH CHECK and did not scope columns. It is not
-- exploitable today (the authenticated role has no table-level UPDATE on profiles —
-- all writes go through the service-role client), but a single future
-- `grant update on entrium.profiles to authenticated` would silently turn it into a
-- free-Pro + self-`role='admin'` hole. Add WITH CHECK and explicitly revoke UPDATE.
drop policy if exists "profiles_self_update" on entrium.profiles;
create policy "profiles_self_update" on entrium.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
revoke update on entrium.profiles from authenticated, anon;

-- Optional defense-in-depth (recommended): a trigger that makes the privileged
-- columns (tier/pro_until/bonus_credits/role) writable ONLY by the service-role,
-- so even a future accidental GRANT cannot let a user self-upgrade. Left commented
-- because it must be enabled only after confirming EVERY profile write that touches
-- these columns uses the service-role client (the audit confirmed this is the case,
-- but enable + smoke-test referral/Stripe flows before relying on it in prod):
--
-- create or replace function entrium.guard_profile_privileged_cols()
-- returns trigger language plpgsql security definer set search_path = entrium, public as $$
-- begin
--   if (new.tier, new.pro_until, new.bonus_credits, new.role)
--        is distinct from (old.tier, old.pro_until, old.bonus_credits, old.role)
--      and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
--     raise exception 'privileged profile columns are read-only for this role';
--   end if;
--   return new;
-- end $$;
-- drop trigger if exists profiles_guard on entrium.profiles;
-- create trigger profiles_guard before update on entrium.profiles
--   for each row execute function entrium.guard_profile_privileged_cols();

-- ── C3 (CRITICAL) — atomic free-tier quota gate (closes the parallel-request race) ──
-- ⚠️ DEPLOY ORDER: deploy the app code (rate-limit.ts) FIRST, THEN apply this section.
--    Code-first is safe with the OLD function (recordUsage falls back to insert);
--    this function WITHOUT the code would double-count and lock free users out early.
--
-- 0016 removed 0015's reservation INSERT to fix a double-count, but that reopened the
-- race: concurrent requests all counted 0 and all passed the 5/day cap. We restore the
-- atomic reservation — the gate INSERTs a '__reserved__' usage_events row inside the
-- profiles row-lock, so serialized bursts see an incrementing count and cannot overshoot.
-- recordUsage() now UPDATEs that reservation in place (no 2nd row → no double-count).
-- Locals are user_-prefixed to avoid the 0017 ambiguity error.
create or replace function entrium.try_consume_quota(uid uuid)
returns table (allowed boolean, remaining int, tier text, bonus int)
language plpgsql security definer set search_path = entrium, public as $$
declare
  user_tier text; user_pro_until timestamptz; user_bonus int;
  used int; free_limit constant int := 5; is_pro boolean;
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

  -- Reserve the slot atomically (inside the row lock).
  insert into entrium.usage_events (user_id, tool, model, input_tokens, output_tokens, cost_usd)
    values (uid, '__reserved__', 'reserved', 0, 0, 0);

  return query select true,
    free_limit - (used + 1) + coalesce(user_bonus, 0),
    'free'::text, coalesce(user_bonus, 0);
end; $$;

grant execute on function entrium.try_consume_quota(uuid) to authenticated, service_role;

comment on function entrium.try_consume_quota(uuid) is
  'Atomic quota check + __reserved__ slot reservation under a profiles row-lock; recordUsage() fills the reservation in place (no double-count).';

-- ── H1 (HIGH) — public-share profile RPC leaked full applicant_data (incl email/phone) ──
-- get_public_profile returned the ENTIRE applicant_data jsonb to anon. Strip the contact-PII
-- sub-fields so a direct anon RPC call can't harvest email/phone/socials for every shared
-- profile. (`#-` on a missing path is a safe no-op; keeps name/location/academics/goals.)
create or replace function entrium.get_public_profile(p_slug text)
returns table (full_name text, applicant_data jsonb, visibility text)
language plpgsql security definer set search_path = entrium, public
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

  update entrium.profiles set public_views = public_views + 1 where id = uid;

  return query
    select p.full_name,
      (p.applicant_data
         #- '{personal,email}'
         #- '{personal,phone}'
         #- '{personal,linkedin}'
         #- '{personal,github}'
         #- '{personal,portfolio}'),
      p.public_visibility
    from entrium.profiles p
    where p.id = uid;
end;
$$;

grant execute on function entrium.get_public_profile to anon, authenticated, service_role;

-- ── H4 (HIGH) — shared-store rate limiter (the in-memory one is per-instance → useless) ──
-- Postgres-backed fixed-window limiter for expensive endpoints not covered by the daily
-- AI quota (e.g. /api/search). RLS-enabled with no policies → reachable only via the
-- SECURITY DEFINER function / service-role.
create table if not exists entrium.rate_limits (
  bucket text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);
alter table entrium.rate_limits enable row level security;

create or replace function entrium.check_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql security definer set search_path = entrium, public
as $$
declare
  cur record;
begin
  insert into entrium.rate_limits (bucket) values (p_key)
    on conflict (bucket) do nothing;
  select * into cur from entrium.rate_limits where bucket = p_key for update;
  if now() - cur.window_start >= make_interval(secs => p_window_seconds) then
    update entrium.rate_limits set count = 1, window_start = now() where bucket = p_key;
    return true;
  end if;
  if cur.count >= p_max then
    return false;
  end if;
  update entrium.rate_limits set count = count + 1 where bucket = p_key;
  return true;
end;
$$;

grant execute on function entrium.check_rate_limit(text, int, int) to authenticated, service_role;

-- ── L3 — atomic bonus-credit award (referrals) — replaces a read-then-write race ──
create or replace function entrium.award_bonus_credits(uid uuid, amount int)
returns int language sql security definer set search_path = entrium, public as $$
  update entrium.profiles set bonus_credits = coalesce(bonus_credits, 0) + amount
   where id = uid returning bonus_credits;
$$;
grant execute on function entrium.award_bonus_credits(uuid, int) to service_role;
