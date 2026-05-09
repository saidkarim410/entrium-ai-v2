-- ────────────────────────────────────────────────────────────────────
-- 0017 — fix `column reference "tier" is ambiguous` in
-- try_consume_quota.
--
-- Migrations 0015/0016 declared the function with an OUT/RETURN column
-- named `tier`, then tried to `select tier, pro_until, ... from
-- entrium.profiles` inside the body. PL/pgSQL refused to disambiguate
-- between the column `profiles.tier` and the return column `tier`
-- (error 42702), so the RPC threw on every call. The TS wrapper saw
-- the error and returned `{allowed: false}` — every user, free or Pro,
-- got "limit_reached" since the function was deployed.
--
-- Fix: alias the table to `p` and qualify all selects as `p.tier`,
-- `p.pro_until`, `p.bonus_credits`. Logic is otherwise identical to
-- the 0016 version.
-- ────────────────────────────────────────────────────────────────────

create or replace function entrium.try_consume_quota(uid uuid)
returns table (
  allowed boolean,
  remaining int,
  tier text,
  bonus int
)
language plpgsql
security definer
set search_path = entrium, public
as $$
declare
  user_tier text;
  user_pro_until timestamptz;
  user_bonus int;
  used int;
  free_limit constant int := 5;
  is_pro boolean;
begin
  -- Lock the profile row so concurrent calls for the same user
  -- serialise their quota check + (caller's later) recordUsage call.
  -- Read columns into named locals — qualifying as `p.tier` would
  -- have been an alternative, but separate locals are clearer.
  select p.tier, p.pro_until, p.bonus_credits
    into user_tier, user_pro_until, user_bonus
    from entrium.profiles p
   where p.id = uid
   for update;

  if not found then
    return query select false, 0, 'free'::text, 0;
    return;
  end if;

  is_pro := user_tier = 'pro' and (user_pro_until is null or user_pro_until > now());

  if is_pro then
    return query select true, 2147483647, 'pro'::text, coalesce(user_bonus, 0);
    return;
  end if;

  -- Free tier: count today's REAL usage events.
  select count(*) into used
    from entrium.usage_events
   where user_id = uid
     and created_at >= date_trunc('day', now() at time zone 'utc')
     and created_at <  date_trunc('day', now() at time zone 'utc') + interval '1 day';

  if used + coalesce(user_bonus, 0) >= free_limit then
    return query select false, 0, 'free'::text, coalesce(user_bonus, 0);
    return;
  end if;

  return query select true,
                      free_limit - used + coalesce(user_bonus, 0),
                      'free'::text,
                      coalesce(user_bonus, 0);
end;
$$;

-- Same ambiguity bug existed in nothing else, but double-check
-- try_consume_bonus is healthy. It uses simple SQL (no PL/pgSQL OUT
-- params), so it's fine — just re-declare for the migration log.
create or replace function entrium.try_consume_bonus(uid uuid)
returns int
language sql
security definer
set search_path = entrium, public
as $$
  update entrium.profiles
     set bonus_credits = bonus_credits - 1
   where id = uid
     and bonus_credits > 0
   returning bonus_credits;
$$;

comment on function entrium.try_consume_quota(uuid) is
  'Quota check with row lock on profiles. Locals are user_-prefixed to avoid ambiguity with OUT cols.';
