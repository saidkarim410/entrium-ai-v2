import OpenAI from "openai"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { env } from "@/lib/env"

let _openai: OpenAI | null = null
function openai() {
  if (!_openai) _openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
  return _openai
}

async function embed(text: string): Promise<number[]> {
  const res = await openai().embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  })
  return res.data[0].embedding
}

export type University = {
  id: string
  name: string
  country: string
  city: string | null
  qs_rank: number | null
  rank_display: string | null
  region: string | null
  overall_score: number | null
  description: string | null
  website: string | null
  similarity: number
}

export type Scholarship = {
  id: string
  name: string
  provider: string | null
  country: string | null
  level: string | null
  amount_usd: number | null
  full_funding: boolean | null
  deadline: string | null
  description: string | null
  url: string | null
  similarity: number
}

export async function searchUniversities(query: string, limit = 10): Promise<University[]> {
  const embedding = await embed(query)
  const { data, error } = await supabaseAdmin.rpc("match_universities", {
    query_embedding: embedding,
    match_threshold: 0.2,
    match_count: limit,
  })
  if (error) {
    console.error("match_universities:", error)
    return []
  }
  return (data ?? []) as University[]
}

export async function searchScholarships(query: string, limit = 10): Promise<Scholarship[]> {
  const embedding = await embed(query)
  const { data, error } = await supabaseAdmin.rpc("match_scholarships", {
    query_embedding: embedding,
    match_threshold: 0.2,
    match_count: limit,
  })
  if (error) {
    console.error("match_scholarships:", error)
    return []
  }
  return (data ?? []) as Scholarship[]
}

export function formatUniversitiesContext(unis: University[]): string {
  if (unis.length === 0) return ""
  return (
    `Top matching universities from QS database (use these in your recommendation):\n\n` +
    unis
      .map(
        (u, i) =>
          `${i + 1}. ${u.name}${u.rank_display ? ` (QS 2026 #${u.rank_display})` : ""} — ${u.city ? u.city + ", " : ""}${u.country}${u.overall_score ? ` · score ${u.overall_score}/100` : ""}${u.website ? `\n   Profile: ${u.website}` : ""}`
      )
      .join("\n\n")
  )
}

export function formatScholarshipsContext(sch: Scholarship[]): string {
  if (sch.length === 0) return ""
  return (
    `Matching scholarships from database (use these in your recommendation):\n\n` +
    sch
      .map(
        (s, i) =>
          `${i + 1}. ${s.name} — ${s.provider ?? "—"} (${s.country ?? "—"})\n   Level: ${s.level} | ${s.full_funding ? "Full funding" : "Partial"}${s.amount_usd ? ` | ~$${s.amount_usd}/year` : ""}\n   ${s.description ?? ""}${s.url ? `\n   ${s.url}` : ""}`
      )
      .join("\n\n")
  )
}
