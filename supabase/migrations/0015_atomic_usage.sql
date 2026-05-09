-- ────────────────────────────────────────────────────────────────────
-- 0015 — Atomic usage tracking (closes S-4, S-5 from TZ_FULLSTACK.md)
--
-- Problem before this migration:
--   - rate-limit.ts read count, then inserted — race window let
--     concurrent calls overshoot the daily 5/day limit.
--   - consumeBonus did read-then-write of bonus_credits — race let
--     the same bonus get spent twice.
--
-- This migration introduces:
--   1. SQL function `entrium.try_consume_quota(uid uuid)` that does
--      check + insert in a single transaction, returning whether the
--      call was allowed and how many remain.
--   2. SQL function `entrium.try_consume_bonus(uid uuid)` that
--      decrements bonus_credits atomically with `update ... returning`.
--
-- Both are SECURITY DEFINER so they can be called by the auth user
-- without giving direct table grants on usage_events.
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
  prof record;
  used int;
  free_limit constant int := 5;
  is_pro boolean;
begin
  -- Lock the profile row to serialize concurrent attempts for the same user
  select tier, pro_until, bonus_credits
    into prof
    from entrium.profiles
   where id = uid
   for update;

  if not found then
    return query select false, 0, 'free'::text, 0;
    return;
  end if;

  is_pro := prof.tier = 'pro' and (prof.pro_until is null or prof.pro_until > now());

  if is_pro then
    -- Pro users are unlimited; still record the event for billing/insight
    insert into entrium.usage_events (user_id, tool, model, input_tokens, output_tokens, cost_usd)
      values (uid, 'quota_check', 'n/a', 0, 0, 0);
    return query select true, 2147483647, 'pro'::text, coalesce(prof.bonus_credits, 0);
    return;
  end if;

  -- Free tier: count today's usage events
  select count(*) into used
    from entrium.usage_events
   where user_id = uid
     and created_at >= date_trunc('day', now() at time zone 'utc')
     and created_at <  date_trunc('day', now() at time zone 'utc') + interval '1 day';

  if used + coalesce(prof.bonus_credits, 0) >= free_limit then
    return query select false, 0, 'free'::text, coalesce(prof.bonus_credits, 0);
    return;
  end if;

  -- Reserve the slot now — caller still needs to record the actual tool call
  insert into entrium.usage_events (user_id, tool, model, input_tokens, output_tokens, cost_usd)
    values (uid, 'quota_check', 'reserved', 0, 0, 0);

  return query select true,
                      free_limit - (used + 1) + coalesce(prof.bonus_credits, 0),
                      'free'::text,
                      coalesce(prof.bonus_credits, 0);
end;
$$;

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

grant execute on function entrium.try_consume_quota(uuid) to authenticated, service_role;
grant execute on function entrium.try_consume_bonus(uuid) to authenticated, service_role;

-- Add an index on usage_events for the per-day lookup
create index if not exists usage_events_user_day_idx
  on entrium.usage_events (user_id, created_at);

comment on function entrium.try_consume_quota(uuid) is
  'Atomic quota check + reservation. Returns allowed/remaining/tier/bonus.';
comment on function entrium.try_consume_bonus(uuid) is
  'Atomic decrement of bonus_credits. Returns remaining bonus or NULL if none.';
