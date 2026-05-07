import OpenAI from "openai"
import { createClient } from "@supabase/supabase-js"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: "entrium" }, auth: { persistSession: false } }
)

async function search(table, query, limit = 5) {
  const emb = (await openai.embeddings.create({ model: "text-embedding-3-small", input: query })).data[0].embedding
  const fn = table === "universities" ? "match_universities" : "match_scholarships"
  const { data, error } = await supabase.rpc(fn, {
    query_embedding: emb,
    match_threshold: 0.2,
    match_count: limit,
  })
  if (error) { console.log(`  ERROR: ${error.message}`); return }
  console.log(`\nQuery: "${query}"`)
  for (const r of data) {
    if (table === "universities") {
      console.log(`  ${(r.similarity * 100).toFixed(0)}%  #${r.qs_rank ?? "—"}  ${r.name}, ${r.country}`)
    } else {
      console.log(`  ${(r.similarity * 100).toFixed(0)}%  ${r.name} (${r.provider}, ${r.country})`)
    }
  }
}

console.log("═══ Universities semantic search ═══")
await search("universities", "Strong computer science master's program in Germany on a budget")
await search("universities", "Top business school in the US")
await search("universities", "Affordable engineering university in Asia for international students")

console.log("\n═══ Scholarships semantic search ═══")
await search("scholarships", "Full funding for master's in UK for Uzbek student")
await search("scholarships", "PhD scholarship in Germany STEM")
await search("scholarships", "Scholarship for studying in Japan")
