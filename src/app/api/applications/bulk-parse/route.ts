import { generateObject } from "ai"
import { z } from "zod"
import { models } from "@/lib/ai"
import { getCurrentUser } from "@/lib/supabase/server"
import { checkUsage, recordUsage } from "@/lib/rate-limit"
import { getLanguageInstruction } from "@/lib/ai/language"

export const runtime = "nodejs"
export const maxDuration = 45

const Body = z.object({
  text: z.string().min(5).max(8000),
})

const Item = z.object({
  university_name: z.string().describe("Full proper name (e.g. 'Massachusetts Institute of Technology')"),
  university_country: z.string().describe("Country, free-form (e.g. 'USA', 'UK', 'Netherlands')").default(""),
  program: z.string().describe("Specific program / major if mentioned").default(""),
  level: z.enum(["Bachelor", "Master", "PhD", "MBA", "Foundation", ""]).describe("Degree level if mentioned").default(""),
  round: z.string().describe("ED / EA / RD / Rolling / Spring etc. if mentioned").default(""),
  deadline: z.string().describe("YYYY-MM-DD if a specific date can be inferred, else empty").default(""),
  priority: z.enum(["reach", "match", "safety", ""]).describe("If user explicitly tagged it; else empty").default(""),
  notes: z.string().describe("Any extra detail worth keeping (≤120 chars)").default(""),
})

const BulkSchema = z.object({
  items: z.array(Item).min(0).max(20),
})

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  const usage = await checkUsage(user.id)
  if (!usage.allowed) {
    return Response.json({ error: "limit_reached" }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = Body.safeParse(body)
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 })

  const langInstr = await getLanguageInstruction()
  const system = [
    "You parse messy text into a list of university applications.",
    "",
    "Examples of input:",
    "- A bullet list: 'MIT EA, Stanford RD, Harvard EA Dec 1'",
    "- Paste from email: 'You're applying to: Yale (Computer Science, EA), Princeton (CS, RD by Jan 1)'",
    "- A paragraph: 'I'm thinking MIT, Stanford, and maybe Cambridge for engineering'",
    "- Whatever the user pasted",
    "",
    "Rules:",
    "- university_name: full proper name (e.g. 'Massachusetts Institute of Technology', not 'MIT' if context lets you expand). Keep original spelling otherwise.",
    "- Only extract universities the user wants to apply to — not ones merely mentioned in passing.",
    "- deadline: only if a date is unambiguously stated. Convert relative dates ('next Jan 1') to YYYY-MM-DD using the current year context (today is the user's input date).",
    "- round: prefer canonical short form (ED, ED2, EA, REA, RD, Rolling).",
    "- level: only fill if mentioned. Do NOT default to Bachelor.",
    "- priority: only fill if user explicitly says reach/match/safety. Don't guess.",
    "- If a single uni is mentioned multiple times in different rounds (e.g. 'MIT EA + RD as backup'), output as separate items.",
    "- Cap at 20 items.",
    "- Empty strings for unknowns — never invent data.",
    "",
    langInstr,
  ].join("\n")

  const model = usage.tier === "pro" ? models.claudeSonnet : models.claudeHaiku
  const modelId = usage.tier === "pro" ? "claude-sonnet-4-5" : "claude-haiku-4-5"

  try {
    const result = await generateObject({
      model,
      system,
      schema: BulkSchema,
      messages: [{ role: "user", content: parsed.data.text }],
    })

    await recordUsage({
      userId: user.id,
      tool: "bulk_parse",
      model: modelId,
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      costUsd: 0,
    })

    return Response.json({ items: result.object.items })
  } catch (err) {
    console.error("Bulk parse error:", err)
    return Response.json(
      { error: "ai_failed", message: err instanceof Error ? err.message : "AI failed" },
      { status: 500 }
    )
  }
}
