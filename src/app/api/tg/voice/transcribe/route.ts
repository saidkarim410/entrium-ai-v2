import { checkUsage, recordUsage } from "@/lib/rate-limit"
import { env, miniAppBotToken, miniAppEnabled } from "@/lib/env"
import { withApiError } from "@/lib/api-error"
import { validateInitData } from "@/lib/telegram/init-data"
import { resolveTelegramUser } from "@/lib/telegram/resolve-user"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_BYTES = 25 * 1024 * 1024 // OpenAI Whisper limit

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
 * POST /api/tg/voice/transcribe
 *   header: x-telegram-init-data
 *   form-data: audio=<Blob>
 *
 * initData-authenticated variant of /api/voice/transcribe.
 * Proxies audio to OpenAI Whisper, returns { text }.
 */
export const POST = withApiError(async (req: Request) => {
  if (!miniAppEnabled()) {
    return Response.json({ error: "telegram_disabled" }, { status: 503 })
  }

  if (!env.OPENAI_API_KEY) {
    return Response.json({ error: "openai_not_configured" }, { status: 503 })
  }

  const initData = req.headers.get("x-telegram-init-data") ?? ""
  const verdict = validateInitData(initData, miniAppBotToken())
  if (!verdict.ok) {
    return Response.json({ error: "unauthorized", reason: verdict.reason }, { status: 401 })
  }

  const resolved = await resolveTelegramUser(verdict.user)

  const usage = await checkUsage(resolved.userId)
  if (!usage.allowed) {
    return Response.json({ error: "limit_reached", tier: usage.tier }, { status: 429 })
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
  // Be lenient: some browsers send audio/webm;codecs=opus etc.
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

  // Use the user's resolved language preference as a Whisper hint
  const language = resolved.language || "ru"

  const ext =
    baseMime === "audio/mp4" ? "mp4"
    : baseMime === "audio/mpeg" ? "mp3"
    : baseMime === "audio/ogg" ? "ogg"
    : baseMime === "audio/wav" || baseMime === "audio/x-wav" ? "wav"
    : baseMime === "audio/m4a" ? "m4a"
    : "webm"

  const oaForm = new FormData()
  oaForm.append("file", audio, `voice.${ext}`)
  oaForm.append("model", "whisper-1")
  oaForm.append("language", language)
  oaForm.append("response_format", "json")

  const oaRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: oaForm,
  })

  if (!oaRes.ok) {
    const errText = await oaRes.text()
    console.error("Whisper (tg) failed:", errText)
    return Response.json(
      { error: "whisper_failed", message: "Transcription failed" }, // M7: errText logged server-side only
      { status: 502 },
    )
  }

  const data = (await oaRes.json()) as { text?: string }
  const text = (data.text ?? "").trim()

  await recordUsage({
    userId: resolved.userId,
    tool: "tg_voice_transcribe",
    model: "whisper-1",
    inputTokens: Math.round(audio.size / 1000),
    outputTokens: text.length,
    costUsd: 0,
  })

  return Response.json({ text })
})
