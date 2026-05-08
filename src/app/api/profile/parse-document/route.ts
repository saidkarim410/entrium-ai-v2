import { generateObject, type ModelMessage } from "ai"
import { z } from "zod"
import { models } from "@/lib/ai"
import { getCurrentUser } from "@/lib/supabase/server"
import { checkUsage, recordUsage } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const maxDuration = 60

const SUPPORTED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
])

const MAX_BYTES = 20 * 1024 * 1024 // 20 MB

/**
 * Schema for fields the AI is asked to extract from documents.
 * Mirrors a partial ApplicantProfile — strings only so the model
 * can write what it finds verbatim. Empty strings = "not found".
 */
const ExtractionSchema = z.object({
  personal: z.object({
    name: z.string().describe("Full name").default(""),
    age: z.string().describe("Age as a number string").default(""),
    citizenship: z.string().describe("Country of citizenship").default(""),
    location: z.string().describe("City and country of residence").default(""),
    email: z.string().describe("Email address").default(""),
    phone: z.string().describe("Phone number with country code").default(""),
    linkedin: z.string().default(""),
    github: z.string().default(""),
  }),
  academic: z.object({
    school: z.string().describe("Current/previous school or university").default(""),
    schoolType: z.string().describe("Type: IB, A-level, National, American etc.").default(""),
    gpa: z.string().describe("GPA in original scale, e.g. '4.5/5' or '92/100'").default(""),
    sat: z.string().describe("SAT total score").default(""),
    act: z.string().describe("ACT composite score").default(""),
    ielts: z.string().describe("IELTS overall band").default(""),
    toefl: z.string().describe("TOEFL iBT total").default(""),
    duolingo: z.string().describe("Duolingo English Test score").default(""),
    apIb: z.string().describe("AP / IB subjects + scores").default(""),
    coursework: z.string().describe("Notable courses or subjects taken").default(""),
  }),
  goals: z.object({
    level: z.string().describe("Bachelor / Master / PhD / MBA / Foundation").default(""),
    year: z.string().describe("Target enrollment year").default(""),
    major: z.string().describe("Intended field of study").default(""),
    countries: z.string().describe("Comma-separated target countries").default(""),
    targetUnis: z.string().describe("Comma-separated target universities").default(""),
    budget: z.string().describe("Annual tuition budget USD").default(""),
  }),
  experience: z.string().describe("Work / research / internship experience as plain text").default(""),
  activities: z.string().describe("Extracurriculars, clubs, leadership").default(""),
  awards: z.string().describe("Awards, olympiads, honors").default(""),
  projects: z.string().describe("Personal/research/tech projects").default(""),
  skillsTech: z.string().describe("Technical skills, languages, tools").default(""),
  skillsLang: z.string().describe("Spoken languages with levels").default(""),
  notes: z.string().describe("Anything else relevant — short free text").default(""),
})

const SYSTEM_PROMPT = `You read documents an applicant uploads (transcripts, test reports, CVs, IDs)
and extract fields for their admissions profile.

Rules:
- Output ONLY what is present in the document. If a field is not in the document, leave it as an empty string.
- Do not guess, infer, or fabricate. Empty string > wrong guess.
- For test scores, copy the exact number from the document.
- For GPA, preserve the original scale (e.g. "4.5/5", "92/100").
- For lists (activities, awards), join entries with newlines.
- Keep proper nouns (university names, countries) in their original spelling.
- Respond with valid JSON matching the requested schema. No prose, no commentary.`

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  const usage = await checkUsage(user.id)
  if (!usage.allowed) {
    return Response.json(
      {
        error: "limit_reached",
        message: "Дневной лимит исчерпан. Попробуй завтра или обнови до Pro.",
        tier: usage.tier,
      },
      { status: 429 }
    )
  }

  // Parse multipart form
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return Response.json({ error: "invalid_form" }, { status: 400 })
  }

  const file = form.get("file")
  if (!(file instanceof Blob)) {
    return Response.json({ error: "missing_file" }, { status: 400 })
  }

  const mime = file.type || "application/octet-stream"
  if (!SUPPORTED_TYPES.has(mime)) {
    return Response.json(
      { error: "unsupported_type", message: "PDF, PNG, JPG, WEBP, GIF" },
      { status: 415 }
    )
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "file_too_large", message: "Максимум 20 MB" },
      { status: 413 }
    )
  }

  const docHint = (form.get("hint") as string | null)?.slice(0, 200) ?? ""
  const buffer = new Uint8Array(await file.arrayBuffer())

  const userInstruction = docHint
    ? `Документ типа: ${docHint}. Извлеки все поля профиля абитуриента, которые в нём есть.`
    : "Извлеки поля профиля абитуриента, которые есть в этом документе."

  // Always use Sonnet — Haiku is unreliable for vision + structured extraction
  const model = models.claudeSonnet
  const modelId = "claude-sonnet-4-5"

  const messages: ModelMessage[] = [
    {
      role: "user",
      content: [
        { type: "text", text: userInstruction },
        { type: "file", data: buffer, mediaType: mime },
      ],
    },
  ]

  try {
    const result = await generateObject({
      model,
      system: SYSTEM_PROMPT,
      schema: ExtractionSchema,
      messages,
    })

    await recordUsage({
      userId: user.id,
      tool: "doc_parse",
      model: modelId,
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      costUsd: 0,
    })

    return Response.json({ extracted: result.object })
  } catch (err) {
    console.error("Document parse failed:", err)
    return Response.json(
      {
        error: "parse_failed",
        message: err instanceof Error ? err.message : "Не удалось разобрать документ",
      },
      { status: 500 }
    )
  }
}
