/**
 * Import a programmes CSV into entrium.programs with the service role
 * (no admin login needed). Same parser/validation as the admin UI.
 *
 *   npx tsx scripts/import-programs.ts data/programs/programs-seed-2026-09-28.csv --dry-run
 *   npx tsx scripts/import-programs.ts data/programs/programs-seed-2026-09-28.csv
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Requires migration 0024_programs.sql on the target database.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"
import { programsFromCsv } from "../src/lib/programs/csv"

function loadEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (m) out[m[1]] = m[2].replace(/^"|"$/g, "")
    }
  } catch {
    /* no env file */
  }
  return out
}

async function main() {
  const [, , fileArg, ...flags] = process.argv
  if (!fileArg) {
    console.error("usage: npx tsx scripts/import-programs.ts <file.csv> [--dry-run]")
    process.exit(2)
  }
  const dryRun = flags.includes("--dry-run")
  const csv = readFileSync(resolve(fileArg), "utf8")
  const { rows, errors } = programsFromCsv(csv)

  console.log(`parsed: ${rows.length} rows, ${errors.length} errors`)
  for (const e of errors) console.log(`  line ${e.line}: ${e.error}`)
  for (const r of rows) {
    console.log(`  • ${r.university_name} — ${r.program_name} [${r.level}/${r.language}/${r.intake_year}] ${r.status}`)
  }
  if (errors.length) process.exit(1)
  if (dryRun) {
    console.log("dry run — nothing written")
    return
  }

  const env = { ...loadEnv(resolve(".env.local")), ...process.env }
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing")
    process.exit(2)
  }
  const supabase = createClient(url, key, { db: { schema: "entrium" }, auth: { persistSession: false } })
  const { data, error } = await supabase.from("programs").upsert(rows, { onConflict: "natural_key" }).select("id")
  if (error) {
    const missing = error.code === "42P01" || error.code === "PGRST205"
    console.error(missing ? "table entrium.programs does not exist — apply supabase/migrations/0024_programs.sql first" : error.message)
    process.exit(1)
  }
  console.log(`imported/updated: ${data?.length ?? 0}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
