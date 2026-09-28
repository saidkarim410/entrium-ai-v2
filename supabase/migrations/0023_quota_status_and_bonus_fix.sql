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

-- The return type gains a column, which `create or replace` cannot do → drop first.
-- (Callers see a fail-closed "limit_reached" for the milliseconds in between; the app
-- tolerates it.)
drop function if exists entrium.try_consume_quota(uuid);
create function entrium.try_consume_quota(uid uuid)
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
