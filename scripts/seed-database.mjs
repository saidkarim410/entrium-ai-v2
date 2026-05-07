import OpenAI from "openai"
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "entrium" }, auth: { persistSession: false } }
)

const EMBED_MODEL = "text-embedding-3-small"
const BATCH_SIZE = 100

function embedText(uni) {
  if (uni.qs_rank !== undefined) {
    // university
    return [
      uni.name,
      `${uni.city ?? ""}, ${uni.country}`,
      uni.qs_rank ? `QS rank ${uni.qs_rank}` : "",
      uni.description ?? "",
    ].filter(Boolean).join(". ")
  }
  // scholarship
  return [
    uni.name,
    `Provider: ${uni.provider ?? ""}`,
    `Host country: ${uni.country ?? ""}`,
    `Level: ${uni.level ?? "any"}`,
    uni.full_funding ? "Full funding" : "Partial funding",
    uni.amount_usd ? `Worth $${uni.amount_usd}/year` : "",
    uni.description ?? "",
    uni.requirements?.length ? `Requirements: ${uni.requirements.join("; ")}` : "",
  ].filter(Boolean).join(". ")
}

async function embedBatch(items) {
  const texts = items.map(embedText)
  const res = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: texts,
  })
  return res.data.map((d) => d.embedding)
}

async function seedUniversities(path) {
  const data = JSON.parse(readFileSync(path, "utf8"))
  console.log(`\nSeeding ${data.length} universities...`)

  // Clear existing data
  await supabase.from("universities").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  console.log("  Cleared existing universities")

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE)
    const embeddings = await embedBatch(batch)

    const rows = batch.map((u, idx) => ({
      name: u.name,
      country: u.country,
      city: u.city ?? null,
      qs_rank: u.qs_rank ?? null,
      rank_display: u.rank_display ?? null,
      region: u.region ?? null,
      overall_score: u.overall_score ?? null,
      website: u.website ?? null,
      description: u.description ?? null,
      ranking_year: 2026,
      embedding: embeddings[idx],
    }))

    const { error } = await supabase.from("universities").insert(rows)
    if (error) {
      console.error(`  ❌ Batch ${i}-${i + batch.length}:`, error.message)
    } else {
      console.log(`  ✓ Inserted ${i + 1}-${i + batch.length}`)
    }
  }
}

async function seedScholarships(path) {
  const data = JSON.parse(readFileSync(path, "utf8"))
  console.log(`\nSeeding ${data.length} scholarships...`)

  await supabase.from("scholarships").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  console.log("  Cleared existing scholarships")

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE)
    const embeddings = await embedBatch(batch)

    const rows = batch.map((s, idx) => {
      const lvl = (s.level ?? "any").toLowerCase()
      const validLevel = ["bachelor", "master", "phd", "any"].includes(lvl) ? lvl : "any"
      return {
        name: s.name,
        provider: s.provider ?? null,
        country: s.country ?? null,
        level: validLevel,
        amount_usd: typeof s.amount_usd === "number" ? s.amount_usd : null,
        full_funding: !!s.full_funding,
        deadline: null, // dates inconsistent in source data; keep nullable
        url: s.url ?? null,
        description: s.description ?? null,
        requirements: s.requirements ?? [],
        embedding: embeddings[idx],
      }
    })

    const { error } = await supabase.from("scholarships").insert(rows)
    if (error) {
      console.error(`  ❌ Batch ${i}-${i + batch.length}:`, error.message)
    } else {
      console.log(`  ✓ Inserted ${i + 1}-${i + batch.length}`)
    }
  }
}

const seedDir = "C:/Users/Huawei/Documents/entrium-ai-v2/scripts/seed"
await seedUniversities(`${seedDir}/universities.json`)
await seedScholarships(`${seedDir}/scholarships.json`)

const { count: uniCount } = await supabase.from("universities").select("*", { count: "exact", head: true })
const { count: schCount } = await supabase.from("scholarships").select("*", { count: "exact", head: true })

console.log(`\n═══════════════════════════════════════════`)
console.log(`  ✅ Universities in DB: ${uniCount}`)
console.log(`  ✅ Scholarships in DB: ${schCount}`)
console.log(`═══════════════════════════════════════════`)
