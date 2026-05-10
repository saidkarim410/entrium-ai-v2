#!/usr/bin/env node
/**
 * SQL RPC smoke-test (Q-6 from TZ_FULLSTACK.md).
 *
 * Why this exists: between migrations 0015 → 0016 → 0017 we shipped
 * two production bugs in `try_consume_quota` because vitest unit
 * tests don't execute PL/pgSQL — they only test the TS wrapper.
 *
 *   1. 0015 inserted a 'quota_check' reservation row, so every real
 *      AI call cost 2/5 daily slots.
 *   2. 0016/0017 had `column "tier" is ambiguous` (OUT param vs table
 *      column collision) so every call threw → all users got
 *      limit_reached, Pro and Free alike.
 *
 * Both bugs would have been caught instantly by *calling* the
 * function once and asserting on shape. This script does exactly
 * that — read-only, against real Supabase users picked from existing
 * fixtures. No FK gymnastics, no test-user creation.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/smoke-rpc.mjs
 *
 * Run after every SQL migration that touches rate-limit functions.
 *
 * Exit codes:
 *   0 — all checks pass
 *   1 — at least one check failed
 */

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const REF = process.env.SUPABASE_PROJECT_REF || "zcbbpqfdyqavdubzrgaf"

if (!TOKEN) {
  console.error("Missing SUPABASE_ACCESS_TOKEN env var.")
  process.exit(1)
}

async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  })
  return { ok: r.ok, status: r.status, body: await r.json() }
}

let failures = 0
function check(label, predicate, detail) {
  if (predicate) {
    console.log(`  \x1b[32m✓\x1b[0m ${label}`)
  } else {
    console.log(`  \x1b[31m✗\x1b[0m ${label}`)
    if (detail !== undefined) console.log(`      \x1b[33m${JSON.stringify(detail)}\x1b[0m`)
    failures++
  }
}

async function rpc(uuid) {
  const r = await q(`select * from entrium.try_consume_quota('${uuid}'::uuid)`)
  if (!r.ok) return { error: r.body }
  const row = Array.isArray(r.body) ? r.body[0] : r.body
  return row ?? { error: "no rows" }
}

async function pickFixtures() {
  // Pro user — must exist for the suite to be meaningful. Any tier=pro row works.
  const { body: pros } = await q(`
    select id, tier, bonus_credits from entrium.profiles
    where tier = 'pro' and (pro_until is null or pro_until > now())
    order by created_at desc limit 1
  `)
  if (!Array.isArray(pros) || pros.length === 0) {
    console.error("\x1b[31mNo active Pro user in profiles — cannot run Pro-tier checks.\x1b[0m")
    return null
  }

  // Free user with no usage today.
  const { body: frees } = await q(`
    select p.id, p.tier, p.bonus_credits,
           coalesce((select count(*)::int from entrium.usage_events e
                       where e.user_id = p.id
                         and e.created_at >= date_trunc('day', now() at time zone 'utc')
                         and e.created_at <  date_trunc('day', now() at time zone 'utc') + interval '1 day'
                    ), 0) as used_today
    from entrium.profiles p
    where p.tier = 'free' and coalesce(p.bonus_credits, 0) = 0
    order by created_at desc
  `)
  const fresh = Array.isArray(frees) ? frees.find((f) => f.used_today === 0) : null

  // Bogus UUID — used to verify "not_found" path doesn't throw.
  const bogus = "ffffffff-ffff-ffff-ffff-ffffffffffff"

  return { pro: pros[0], free: fresh, bogus }
}

async function main() {
  console.log("RPC smoke test — entrium.try_consume_quota")
  console.log("Read-only, uses existing Supabase profiles as fixtures.\n")

  const fx = await pickFixtures()
  if (!fx) process.exit(1)

  console.log(`[fixtures] pro=${fx.pro.id.slice(0, 8)}…, free=${fx.free?.id?.slice(0, 8) ?? "(none fresh)"}…, bogus=${fx.bogus.slice(0, 8)}…\n`)

  console.log("[1] Pro tier user")
  const proResult = await rpc(fx.pro.id)
  check("RPC executes without error (would have caught ambiguity bug)", !proResult.error, proResult.error)
  check("allowed = true",       proResult.allowed === true,                   proResult)
  check("tier = 'pro'",          proResult.tier === "pro",                    proResult)
  check("remaining is sentinel max (≥1e9)", proResult.remaining >= 1_000_000_000, proResult)

  if (fx.free) {
    console.log("\n[2] Free tier user, no usage today")
    const freeResult = await rpc(fx.free.id)
    check("RPC executes without error",       !freeResult.error,             freeResult.error)
    check("allowed = true",                    freeResult.allowed === true,  freeResult)
    check("tier = 'free'",                     freeResult.tier === "free",   freeResult)
    check("remaining = 5 (would have caught the double-counting bug — was 3 after first call)",
          freeResult.remaining === 5, freeResult)
    check("bonus = 0",                         freeResult.bonus === 0,       freeResult)
  } else {
    console.log("\n[2] (skipped — no fresh free-tier user available)")
  }

  console.log("\n[3] Non-existent user")
  const bogusResult = await rpc(fx.bogus)
  check("RPC executes without throw",        !bogusResult.error,             bogusResult.error)
  check("allowed = false for missing user",   bogusResult.allowed === false, bogusResult)

  console.log("\n[4] No-side-effect verification — RPC call should NOT insert usage rows")
  // Snapshot count before, call RPC, snapshot after — must be unchanged.
  const before = await q(`select count(*)::int as c from entrium.usage_events where user_id = '${fx.pro.id}'`)
  await rpc(fx.pro.id)
  const after  = await q(`select count(*)::int as c from entrium.usage_events where user_id = '${fx.pro.id}'`)
  check("usage_events count unchanged after RPC (would have caught the reservation-insert bug)",
        before.body[0].c === after.body[0].c,
        { before: before.body[0].c, after: after.body[0].c })

  console.log("")
  if (failures > 0) {
    console.log(`\x1b[31m${failures} check(s) failed.\x1b[0m`)
    process.exit(1)
  } else {
    console.log("\x1b[32mAll RPC smoke checks passed.\x1b[0m")
    process.exit(0)
  }
}

main().catch((err) => {
  console.error("Smoke test crashed:", err)
  process.exit(1)
})
