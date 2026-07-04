-- 0022 — Lower the free-tier daily AI limit from 5 → 3 requests/day.
-- The ONLY change vs 0020's try_consume_quota is `free_limit := 3`.
-- Idempotent (create or replace); no deploy-order hazard (reservation logic unchanged).
create or replace function entrium.try_consume_quota(uid uuid)
returns table (allowed boolean, remaining int, tier text, bonus int)
language plpgsql security definer set search_path = entrium, public as $$
declare
  user_tier text; user_pro_until timestamptz; user_bonus int;
  used int; free_limit constant int := 3; is_pro boolean;
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

  insert into entrium.usage_events (user_id, tool, model, input_tokens, output_tokens, cost_usd)
    values (uid, '__reserved__', 'reserved', 0, 0, 0);

  return query select true,
    free_limit - (used + 1) + coalesce(user_bonus, 0),
    'free'::text, coalesce(user_bonus, 0);
end; $$;

grant execute on function entrium.try_consume_quota(uuid) to authenticated, service_role;
