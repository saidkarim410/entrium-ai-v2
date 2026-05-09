-- ────────────────────────────────────────────────────────────────────
-- 0016 — Hot-fix for quota double-counting introduced in 0015.
--
-- Bug: try_consume_quota inserted a 'quota_check' reservation row,
-- and the caller ALSO inserted a real 'daily_summary' / 'tool_X' row
-- via recordUsage. Result: every real AI call cost 2 quota slots,
-- so users hit the 5/day limit after ~2 actions.
--
-- Fix:
--   1. Replace try_consume_quota with a version that locks the row,
--      counts today's REAL events, and returns allowed/remaining
--      WITHOUT inserting a reservation. The race window between
--      check and recordUsage is narrow enough for a single-user
--      session that we accept it; concurrent burst protection can
--      come back later via Postgres advisory locks if it becomes
--      a real abuse vector.
--   2. Wipe out the bogus 'quota_check' rows accumulated since
--      migration 0015 went live.
-- ────────────────────────────────────────────────────────────────────

-- Step 1 — clean up bogus reservations that were eating users' quota.
delete from entrium.usage_events
 where tool = 'quota_check';

-- Step 2 — replace the function so it no longer inserts.
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
  -- Lock the profile row so concurrent calls for the same user serialise
  -- their quota check + (caller's later) recordUsage call.
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
    return query select true, 2147483647, 'pro'::text, coalesce(prof.bonus_credits, 0);
    return;
  end if;

  -- Free tier: count today's REAL usage events. Reservation rows no
  -- longer exist (we deleted them and stopped emitting them), so a
  -- count of `usage_events` is a faithful measure of how many AI
  -- calls the user has made today.
  select count(*) into used
    from entrium.usage_events
   where user_id = uid
     and created_at >= date_trunc('day', now() at time zone 'utc')
     and created_at <  date_trunc('day', now() at time zone 'utc') + interval '1 day';

  if used + coalesce(prof.bonus_credits, 0) >= free_limit then
    return query select false, 0, 'free'::text, coalesce(prof.bonus_credits, 0);
    return;
  end if;

  return query select true,
                      free_limit - used + coalesce(prof.bonus_credits, 0),
                      'free'::text,
                      coalesce(prof.bonus_credits, 0);
end;
$$;

comment on function entrium.try_consume_quota(uuid) is
  'Quota check with row-level lock on profiles. Caller still must call recordUsage on success.';
