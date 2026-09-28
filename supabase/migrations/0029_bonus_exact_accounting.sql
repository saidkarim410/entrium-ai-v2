-- 0029 — referral bonus: exact accounting (found by the manual regression run, scenario 12).
--
-- Before: the gate was `used_today < 3 + bonus`, and the app decremented `bonus_credits`
-- after every call that left the base quota at 0 — including the 3rd call, which did not
-- need a bonus. Because bonus-funded calls were ALSO counted in `used_today`, a user with
-- +2 bonus got 4 calls instead of 5 (and +10 gave 6 instead of 13).
--
-- Now: a reservation records whether it was paid with a bonus credit (`bonus_funded`).
-- `used_today` counts only base-quota calls; the bonus is charged atomically inside
-- `try_consume_quota` (profile row is locked) only when the base quota is exhausted, and
-- refunded by `refund_bonus` when the app releases a bonus-funded reservation after a
-- technical failure. Idempotent.

alter table entrium.usage_events add column if not exists bonus_funded boolean not null default false;

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

  -- base-quota calls only; bonus-funded calls are accounted for by the decremented bonus
  select count(*) into used from entrium.usage_events
    where user_id = uid
      and not bonus_funded
      and created_at >= date_trunc('day', now() at time zone 'utc')
      and created_at <  date_trunc('day', now() at time zone 'utc') + interval '1 day';

  if is_pro then
    insert into entrium.usage_events (user_id, tool, model, input_tokens, output_tokens, cost_usd)
      values (uid, '__reserved__', 'reserved', 0, 0, 0);
    return query select true, 2147483647, 'pro'::text, user_bonus, free_limit; return;
  end if;

  if used < free_limit then
    insert into entrium.usage_events (user_id, tool, model, input_tokens, output_tokens, cost_usd)
      values (uid, '__reserved__', 'reserved', 0, 0, 0);
    return query select true, free_limit - (used + 1), 'free'::text, user_bonus, free_limit; return;
  end if;

  if user_bonus > 0 then
    update entrium.profiles set bonus_credits = user_bonus - 1 where id = uid;
    insert into entrium.usage_events (user_id, tool, model, input_tokens, output_tokens, cost_usd, bonus_funded)
      values (uid, '__reserved__', 'reserved', 0, 0, 0, true);
    return query select true, 0, 'free'::text, user_bonus - 1, free_limit; return;
  end if;

  return query select false, 0, 'free'::text, 0, free_limit;
end; $$;
grant execute on function entrium.try_consume_quota(uuid) to authenticated, service_role;

drop function if exists entrium.get_usage_status(uuid);
create function entrium.get_usage_status(uid uuid)
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
      and not bonus_funded
      and created_at >= date_trunc('day', now() at time zone 'utc')
      and created_at <  date_trunc('day', now() at time zone 'utc') + interval '1 day';

  if is_pro then
    return query select true, 2147483647, 'pro'::text, user_bonus, free_limit, used; return;
  end if;

  return query select (used < free_limit or user_bonus > 0),
    greatest(free_limit - used, 0),
    'free'::text, user_bonus, free_limit, used;
end; $$;
grant execute on function entrium.get_usage_status(uuid) to authenticated, service_role;

-- Give a bonus credit back when a bonus-funded reservation is released (technical failure).
create or replace function entrium.refund_bonus(uid uuid)
returns int
language sql security definer set search_path = entrium, public as $$
  update entrium.profiles set bonus_credits = coalesce(bonus_credits, 0) + 1 where id = uid
  returning bonus_credits;
$$;
grant execute on function entrium.refund_bonus(uuid) to service_role;
