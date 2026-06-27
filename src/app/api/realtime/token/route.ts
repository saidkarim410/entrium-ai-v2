import { z } from "zod"
import { getCurrentUser } from "@/lib/supabase/server"
import { checkUsage, recordUsage } from "@/lib/rate-limit"
import { env } from "@/lib/env"
import { getApplicantProfile } from "@/lib/applicant/actions"
import { profileToContextBlock } from "@/lib/applicant/types"

export const runtime = "nodejs"
export const maxDuration = 30

const REALTIME_MODEL = "gpt-realtime"

const schema = z.object({
  uni: z.string().min(1).max(200),
  major: z.string().min(1).max(200),
  type: z.string().max(120).optional(),
  lang: z.string().max(40).optional(),
  voice: z.enum(["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"]).default("alloy"),
})

/**
 * Mints a short-lived OpenAI Realtime session token (ephemeral key) that the
 * client can use for WebRTC. The OPENAI_API_KEY never leaves the server.
 *
 * Pre-loads a tailored interview-coach instructions block based on the user's
 * profile so the AI behaves like a real admission officer for THIS user.
 */
export async function POST(req: Request) {
  if (!env.OPENAI_API_KEY) {
    return Response.json({ error: "openai_not_configured" }, { status: 503 })
  }

  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  // Voice = expensive. Charge as a regular AI request from the daily quota.
  const usage = await checkUsage(user.id)
  if (!usage.allowed) {
    return Response.json(
      { error: "limit_reached", message: "Дневной лимит исчерпан." },
      { status: 429 }
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 })
  }

  const { uni, major, type, lang = "Русский", voice } = parsed.data

  const applicant = await getApplicantProfile().catch(() => null)
  const profileBlock = applicant ? profileToContextBlock(applicant) : ""

  const instructions = [
    `You are a senior admission officer at ${uni} conducting an admission interview for ${major}${type ? ` (${type})` : ""}.`,
    "",
    "Role-play rules:",
    "- Speak ONLY in the language requested below, including transitions.",
    `- Language: ${lang}.`,
    "- Stay strictly in interviewer voice. Never reveal you are an AI.",
    "- Ask ONE focused question at a time. Wait for the candidate's answer.",
    "- Probe answers with realistic follow-ups (why, how, give an example, what if…).",
    "- After 6-8 exchanges, transition to a soft close and offer brief feedback.",
    "- Keep your speaking turns short — 1-3 sentences. This is a conversation, not a lecture.",
    "- Use a warm but professional tone. Pause naturally; don't rush.",
    "",
    "Opening protocol:",
    "1. Greet the candidate by their first name (if known) or as 'candidate'.",
    "2. Briefly introduce yourself ('I'm an admission officer at <uni>; we'll talk for ~10 minutes').",
    "3. Open with: 'Tell me a little about yourself — what brought you to apply?'",
    "",
    "Feedback at the end:",
    "- If the candidate says 'feedback', 'обратная связь' or similar, drop role and give 3-5 specific points: 1 strength, 2 weaknesses, 1 sample improved answer.",
    "",
    profileBlock ? `Candidate profile (use it but don't read it back):\n${profileBlock}` : "",
  ].filter(Boolean).join("\n")

  const sessionRes = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: REALTIME_MODEL,
        instructions,
        audio: {
          input: {
            transcription: { model: "whisper-1" },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 700,
            },
          },
          output: { voice },
        },
      },
    }),
  })

  if (!sessionRes.ok) {
    const errText = await sessionRes.text()
    console.error("Realtime session create failed:", errText)
    return Response.json(
      { error: "realtime_failed", message: "Realtime session failed" }, // M7: errText logged server-side only
      { status: 502 }
    )
  }

  const session = await sessionRes.json()

  // Record approximate usage — actual minutes are billed by OpenAI; we just count the session start
  await recordUsage({
    userId: user.id,
    tool: "interview_voice",
    model: REALTIME_MODEL,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
  }).catch(() => null)

  return Response.json({
    sessionId: session.session?.id ?? session.id,
    token: session.value,
    expiresAt: session.expires_at,
    model: REALTIME_MODEL,
  })
}
