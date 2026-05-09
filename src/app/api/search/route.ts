import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const Body = z.object({
  q: z.string().min(1).max(200),
})

export type SearchResult = {
  type: "university" | "scholarship" | "application" | "history"
  id: string
  title: string
  subtitle?: string
  href: string
  meta?: string
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = Body.safeParse(body)
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 })

  const q = parsed.data.q.trim()
  // Postgres ilike: escape % and _ to prevent wildcard injection
  const pattern = `%${q.replace(/[%_\\]/g, (c) => "\\" + c)}%`

  // Run all queries in parallel
  const [unisRes, scholarshipsRes, appsRes, runsRes] = await Promise.all([
    supabaseAdmin
      .from("universities")
      .select("id, name, country, city, qs_rank, rank_display")
      .ilike("name", pattern)
      .order("qs_rank", { ascending: true, nullsFirst: false })
      .limit(8),
    supabaseAdmin
      .from("scholarships")
      .select("id, name, country, level, amount")
      .or(`name.ilike.${pattern},country.ilike.${pattern}`)
      .limit(5),
    supabaseAdmin
      .from("applications")
      .select("id, university_name, program, status, deadline")
      .eq("user_id", user.id)
      .or(`university_name.ilike.${pattern},program.ilike.${pattern}`)
      .order("deadline", { ascending: true, nullsFirst: false })
      .limit(5),
    supabaseAdmin
      .from("tool_runs")
      .select("id, tool, output, created_at")
      .eq("user_id", user.id)
      .ilike("output->>text", pattern)
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const results: SearchResult[] = []

  for (const u of unisRes.data ?? []) {
    results.push({
      type: "university",
      id: u.id as string,
      title: u.name as string,
      subtitle: [u.city, u.country].filter(Boolean).join(", "),
      meta: u.qs_rank ? `#${u.rank_display ?? u.qs_rank}` : undefined,
      href: `/universities/${u.id}`,
    })
  }

  for (const s of scholarshipsRes.data ?? []) {
    results.push({
      type: "scholarship",
      id: s.id as string,
      title: s.name as string,
      subtitle: [s.country, s.level].filter(Boolean).join(" · "),
      meta: s.amount ? String(s.amount) : undefined,
      href: `/scholarships`,
    })
  }

  for (const a of appsRes.data ?? []) {
    results.push({
      type: "application",
      id: a.id as string,
      title: a.university_name as string,
      subtitle: [a.program, a.status].filter(Boolean).join(" · "),
      meta: a.deadline ? String(a.deadline) : undefined,
      href: `/applications`,
    })
  }

  for (const r of runsRes.data ?? []) {
    const text = ((r.output as { text?: string } | null)?.text ?? "") as string
    results.push({
      type: "history",
      id: r.id as string,
      title: r.tool as string,
      subtitle: text.slice(0, 80),
      meta: new Date(r.created_at as string).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }),
      href: `/history`,
    })
  }

  return Response.json({ results })
}
