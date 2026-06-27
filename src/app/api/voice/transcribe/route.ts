import { getCurrentUser } from "@/lib/supabase/server"
import { checkUsage, recordUsage } from "@/lib/rate-limit"
import { env } from "@/lib/env"
import { getLocale } from "@/lib/i18n/server"
import { withApiError } from "@/lib/api-error"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_BYTES = 25 * 1024 * 1024 // OpenAI whisper limit

const SUPPORTED_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/m4a",
])

/**
 * POST /api/voice/transcribe
 *   form-data: audio=<Blob>, prompt?=<string>
 *
 * Proxies the audio to OpenAI Whisper and returns { text }.
 * Server-side only — OPENAI_API_KEY never reaches the client.
 */
export const POST = withApiError(async (req: Request) => {
  if (!env.OPENAI_API_KEY) {
    return Response.json({ error: "openai_not_configured" }, { status: 503 })
  }

  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  const usage = await checkUsage(user.id)
  if (!usage.allowed) {
    return Response.json({ error: "limit_reached" }, { status: 429 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return Response.json({ error: "invalid_form" }, { status: 400 })
  }

  const audio = form.get("audio")
  if (!(audio instanceof Blob)) {
    return Response.json({ error: "missing_audio" }, { status: 400 })
  }

  const mime = audio.type || "audio/webm"
  // Be lenient: some browsers send slightly different MIME (audio/webm;codecs=opus)
  const baseMime = mime.split(";")[0].trim()
  if (!SUPPORTED_TYPES.has(baseMime)) {
    return Response.json({ error: "unsupported_mime", mime }, { status: 415 })
  }

  if (audio.size > MAX_BYTES) {
    return Response.json({ error: "too_large", message: "Максимум 25 MB" }, { status: 413 })
  }
  if (audio.size < 100) {
    return Response.json({ error: "too_short", message: "Запись слишком короткая" }, { status: 400 })
  }

  // Hint: Whisper supports language codes like "ru", "en", "uz". Use UI locale.
  const locale = await getLocale().catch(() => "ru")

  const oaForm = new FormData()
  // Whisper expects a filename; some clients send empty Blobs
  const ext = baseMime === "audio/mp4" ? "mp4"
    : baseMime === "audio/mpeg" ? "mp3"
    : baseMime === "audio/ogg" ? "ogg"
    : baseMime === "audio/wav" || baseMime === "audio/x-wav" ? "wav"
    : baseMime === "audio/m4a" ? "m4a"
    : "webm"
  oaForm.append("file", audio, `voice.${ext}`)
  oaForm.append("model", "whisper-1")
  oaForm.append("language", locale)
  oaForm.append("response_format", "json")

  const promptHint = (form.get("prompt") as string | null) ?? null
  if (promptHint) oaForm.append("prompt", promptHint.slice(0, 220))

  const oaRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: oaForm,
  })

  if (!oaRes.ok) {
    const errText = await oaRes.text()
    console.error("Whisper failed:", errText)
    return Response.json(
      { error: "whisper_failed", message: "Transcription failed" }, // M7: errText logged server-side only
      { status: 502 }
    )
  }

  const data = (await oaRes.json()) as { text?: string }
  const text = (data.text ?? "").trim()

  await recordUsage({
    userId: user.id,
    tool: "voice_transcribe",
    model: "whisper-1",
    inputTokens: Math.round(audio.size / 1000), // rough proxy for cost tracking
    outputTokens: text.length,
    costUsd: 0,
  })

  return Response.json({ text })
})
