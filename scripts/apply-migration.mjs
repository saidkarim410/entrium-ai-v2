import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const REF = process.env.SUPABASE_PROJECT_REF
const SQL_FILE = process.argv[2] ?? join(__dirname, "..", "supabase", "migrations", "0001_initial_schema.sql")

if (!TOKEN || !REF) {
  console.error("Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx SUPABASE_PROJECT_REF=xxx node scripts/apply-migration.mjs [path]")
  process.exit(1)
}

const sql = readFileSync(SQL_FILE, "utf8")
console.log(`Applying migration: ${SQL_FILE} (${sql.length} chars)`)

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
})

const text = await res.text()
console.log(`Status: ${res.status}`)
console.log(text)

if (!res.ok) process.exit(1)
