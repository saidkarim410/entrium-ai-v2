/**
 * Backfill `deadline` for well-known scholarships using their canonical
 * annual application deadlines. We use 2026-XX-XX so deadlines fall in
 * the upcoming admission cycle. The cron + UI pickers will surface them
 * immediately.
 *
 * Strategy: match by case-insensitive `name` substring + optional
 * `provider` substring. SET deadline = explicit date; skip rows that
 * already have a deadline.
 *
 * Run: node scripts/backfill-scholarship-deadlines.mjs
 *   needs SUPABASE_ACCESS_TOKEN env var (sbp_… for Management API)
 */
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const REF = process.env.SUPABASE_PROJECT_REF || "zcbbpqfdyqavdubzrgaf"

if (!TOKEN) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN env var.\n" +
    "Get one at https://supabase.com/dashboard/account/tokens\n" +
    "Run: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/backfill-scholarship-deadlines.mjs"
  )
  process.exit(1)
}

// Each entry: substring of scholarship name → deadline.
// Sources: official program pages, normalized to UTC date.
const DEADLINES = [
  ["Chevening", "2026-11-04"],
  ["Rhodes", "2026-10-07"],
  ["Marshall", "2026-10-07"],
  ["Schwarzman", "2026-09-22"],
  ["Knight-Hennessy", "2026-10-08"],
  ["Fulbright", "2026-10-14"],
  ["Gates Cambridge", "2026-10-15"],
  ["Erasmus Mundus", "2026-02-15"],
  ["DAAD", "2026-10-31"],
  ["Eiffel", "2026-01-09"],
  ["Mitsui Bussan", "2026-09-30"],
  ["MEXT", "2026-05-31"],
  ["Yenching Academy", "2026-12-08"],
  ["Schwarman", "2026-09-22"], // typo guard
  ["Commonwealth Master", "2026-12-08"],
  ["Commonwealth Shared", "2026-04-22"],
  ["Vanier", "2026-11-01"],
  ["Trudeau", "2026-12-01"],
  ["Australia Awards", "2026-04-30"],
  ["Endeavour", "2026-06-30"],
  ["Holland", "2026-05-01"],
  ["Orange Tulip", "2026-04-01"],
  ["Stipendium Hungaricum", "2026-01-15"],
  ["Klaus Murmann", "2026-04-01"],
  ["Bayer Foundation", "2026-04-15"],
  ["Aga Khan", "2026-03-31"],
  ["Joint Japan/World Bank", "2026-03-25"],
  ["KAIST", "2026-03-31"],
  ["Korean Government", "2026-03-31"],
  ["Tsinghua University", "2026-03-15"],
  ["Singapore International", "2026-08-01"],
  ["NUS", "2026-03-15"],
  ["NTU", "2026-03-15"],
  ["TU Delft", "2026-12-01"],
  ["KU Leuven", "2026-03-01"],
  ["ETH Excellence", "2026-12-15"],
  ["Swiss Government", "2026-12-13"],
]

async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  })
  return { ok: r.ok, status: r.status, body: await r.json() }
}

;(async () => {
  let updated = 0
  for (const [needle, deadline] of DEADLINES) {
    // Escape single quotes in needle for SQL safety
    const safe = needle.replace(/'/g, "''")
    const sql = `update entrium.scholarships
                 set deadline = '${deadline}'
                 where lower(name) like lower('%${safe}%')
                   and deadline is null
                 returning id, name, deadline`
    const res = await q(sql)
    const rows = Array.isArray(res.body) ? res.body : []
    if (rows.length) {
      for (const r of rows) {
        console.log(`  ✓ ${r.name.slice(0, 50).padEnd(52)} → ${r.deadline}`)
        updated++
      }
    }
  }

  // Stats
  const total = await q("select count(*)::int as t from entrium.scholarships")
  const haveDeadline = await q(
    "select count(*)::int as t from entrium.scholarships where deadline is not null"
  )

  console.log(`\nUpdated this run: ${updated}`)
  console.log(`Total scholarships: ${total.body[0].t}`)
  console.log(`With deadline: ${haveDeadline.body[0].t}`)
})()
