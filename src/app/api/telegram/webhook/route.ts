import { generateText } from "ai"
import { models, MODEL_IDS } from "@/lib/ai"
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { env, telegramEnabled } from "@/lib/env"
import { sendTelegramMessage, sendTelegramAction, aiToTelegramHtml } from "@/lib/telegram"
import { profileToContextBlock, type ApplicantProfile, EMPTY_PROFILE } from "@/lib/applicant/types"
import { applicationsToContextBlock } from "@/lib/applications/types"
import { checkUsage, recordUsage } from "@/lib/rate-limit"
import { languageInstruction } from "@/lib/ai/language"
import type { Locale } from "@/lib/i18n/dict"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

type TGUser = { id: number; username?: string; first_name?: string }
type TGMessage = {
  message_id: number
  from?: TGUser
  chat: { id: number; type: string }
  text?: string
  date: number
}
type TGUpdate = { update_id: number; message?: TGMessage }

/**
 * Telegram bot webhook.
 *
 * Verifies the X-Telegram-Bot-Api-Secret-Token header, then routes:
 *   /start <code>   → link account by link_code
 *   /start          → instructions to link
 *   /unlink         → drop telegram_chat_id
 *   /help           → usage info
 *   anything else   → run through Counselor (only for linked users)
 *
 * Set the webhook once with:
 *   node scripts/set-telegram-webhook.mjs
 */
export async function POST(req: Request) {
  if (!telegramEnabled()) {
    return Response.json({ error: "telegram_disabled" }, { status: 503 })
  }

  // Verify secret token (Telegram echoes whatever we set in setWebhook).
  // L1: fail CLOSED — on any deployed env the secret is mandatory; without it
  // anyone could POST forged bot updates to drive account-linking.
  const webhookSecret = env.TELEGRAM_WEBHOOK_SECRET
  if (!webhookSecret) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV) {
      return Response.json({ error: "webhook_misconfigured" }, { status: 503 })
    }
  } else {
    const got = req.headers.get("x-telegram-bot-api-secret-token")
    if (got !== webhookSecret) {
      return Response.json({ error: "bad_secret" }, { status: 401 })
    }
  }

  let update: TGUpdate
  try {
    update = (await req.json()) as TGUpdate
  } catch {
    return Response.json({ error: "bad_payload" }, { status: 400 })
  }

  const msg = update.message
  if (!msg || !msg.text) {
    return Response.json({ ok: true })
  }

  const chatId = String(msg.chat.id)
  const text = msg.text.trim()

  try {
    if (text.startsWith("/start")) {
      await handleStart(chatId, msg, text)
    } else if (text === "/unlink") {
      await handleUnlink(chatId)
    } else if (text === "/help") {
      await sendTelegramMessage(chatId, helpText())
    } else {
      await handleCounselorMessage(chatId, text, msg)
    }
  } catch (err) {
    console.error("Telegram handler error:", err)
    await sendTelegramMessage(chatId, "Что-то пошло не так. Попробуй ещё раз.").catch(() => null)
  }

  return Response.json({ ok: true })
}

// ── Handlers ───────────────────────────────────────────────────────────────

async function handleStart(chatId: string, msg: TGMessage, text: string) {
  const code = text.replace(/^\/start\s*/, "").trim().toUpperCase()

  if (!code) {
    await sendTelegramMessage(
      chatId,
      [
        "<b>Привет 👋 Это AI-консультант Entrium</b>",
        "",
        "Чтобы я мог отвечать с учётом твоего профиля абитуриента, привяжи аккаунт:",
        "",
        "1. Открой <a href=\"https://entrium-ai-v2.vercel.app/settings\">Настройки на сайте</a>",
        "2. Найди раздел <b>Telegram</b>",
        "3. Нажми «Создать код привязки» и пришли мне сюда команду:",
        "   <code>/start КОД</code>",
        "",
        "После этого я буду отвечать как полноценный AI-консультант — с твоим профилем, заявками и контекстом.",
      ].join("\n")
    )
    return
  }

  // Find profile by link_code
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, telegram_link_expires, full_name")
    .eq("telegram_link_code", code)
    .maybeSingle()

  if (!profile) {
    await sendTelegramMessage(chatId, "❌ Код не найден. Сгенерируй новый в /settings.")
    return
  }

  if (profile.telegram_link_expires && new Date(profile.telegram_link_expires) < new Date()) {
    await sendTelegramMessage(chatId, "⏰ Код устарел. Сгенерируй новый в /settings.")
    return
  }

  // Detach this chat from any other account first
  await supabaseAdmin
    .from("profiles")
    .update({ telegram_chat_id: null, telegram_username: null })
    .eq("telegram_chat_id", chatId)

  // Link
  const tgUsername = msg.from?.username ?? null
  await supabaseAdmin
    .from("profiles")
    .update({
      telegram_chat_id: chatId,
      telegram_username: tgUsername,
      telegram_link_code: null,
      telegram_link_expires: null,
    })
    .eq("id", profile.id)

  await sendTelegramMessage(
    chatId,
    [
      `✅ <b>Аккаунт привязан</b>`,
      profile.full_name ? `Привет, ${escapeHtml(profile.full_name)}!` : "",
      "",
      "Теперь я знаю твой профиль и заявки. Спрашивай что угодно про поступление — я отвечу с учётом контекста.",
      "",
      "<b>Команды:</b>",
      "/help — что я умею",
      "/unlink — отвязать аккаунт",
    ]
      .filter(Boolean)
      .join("\n")
  )
}

async function handleUnlink(chatId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ telegram_chat_id: null, telegram_username: null })
    .eq("telegram_chat_id", chatId)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    await sendTelegramMessage(chatId, "Этот чат и так не привязан.")
    return
  }
  await sendTelegramMessage(chatId, "🔓 Аккаунт отвязан. Чтобы снова привязать — открой /settings на сайте.")
}

async function handleCounselorMessage(chatId: string, text: string, msg: TGMessage) {
  // Resolve user
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, tier, applicant_data, language")
    .eq("telegram_chat_id", chatId)
    .maybeSingle()

  if (!profile) {
    await sendTelegramMessage(
      chatId,
      "Сначала привяжи аккаунт командой /start КОД (получи код в /settings на сайте)."
    )
    return
  }

  // Quota
  const usage = await checkUsage(profile.id)
  if (!usage.allowed) {
    await sendTelegramMessage(
      chatId,
      "⚠️ Дневной лимит запросов исчерпан. Попробуй завтра или открой Pro: https://entrium-ai-v2.vercel.app/pricing"
    )
    return
  }

  await sendTelegramAction(chatId, "typing")

  // Build context — same as /api/chat counselor flow
  const applicant = (profile.applicant_data as ApplicantProfile | null) ?? EMPTY_PROFILE
  const profileBlock = profileToContextBlock(applicant)

  const { data: appsRows } = await supabaseAdmin
    .from("applications")
    .select("*")
    .eq("user_id", profile.id)
    .order("deadline", { ascending: true, nullsFirst: false })
  const appsBlock = applicationsToContextBlock((appsRows ?? []) as never[])

  let systemPrompt: string = SYSTEM_PROMPTS.counselor
  if (profileBlock) systemPrompt += `\n\n---\n\n${profileBlock}`
  if (appsBlock) systemPrompt += `\n\n---\n\n${appsBlock}`

  const userLang: Locale = ((profile.language as string | null) ?? "ru") as Locale
  systemPrompt += `\n\n---\n\n${languageInstruction(userLang)}`

  systemPrompt +=
    "\n\nIMPORTANT (Telegram delivery): Reply concisely (3-7 sentences). " +
    "Avoid markdown tables and code blocks. You can use **bold** and _italic_. " +
    "For deep analysis, invite the user to open the full tool on the website."

  const model = profile.tier === "pro" ? models.claudeSonnet : models.claudeHaiku
  const modelId = profile.tier === "pro" ? MODEL_IDS.sonnet : MODEL_IDS.haiku

  const result = await generateText({
    model,
    maxOutputTokens: 1500, // H5: cap counselor reply (TG message)
    system: systemPrompt,
    messages: [{ role: "user", content: text }],
  })

  await recordUsage({
    userId: profile.id,
    tool: "counselor_tg",
    model: modelId,
    inputTokens: result.usage?.inputTokens ?? 0,
    outputTokens: result.usage?.outputTokens ?? 0,
    costUsd: 0,
  })

  const reply = aiToTelegramHtml(result.text || "Не получилось ответить.")
  await sendTelegramMessage(chatId, reply, { reply_to_message_id: msg.message_id })
}

// ── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function helpText(): string {
  return [
    "<b>Я — AI-консультант Entrium</b>",
    "",
    "Знаю твой профиль (если привязан) и помогу с поступлением.",
    "",
    "<b>Что я умею:</b>",
    "• Оценить шансы поступления",
    "• Подсказать с эссе и интервью",
    "• Подобрать университеты и стипендии",
    "• Объяснить дедлайны и план действий",
    "",
    "<b>Команды:</b>",
    "/start — привязать аккаунт",
    "/unlink — отвязать аккаунт",
    "/help — это сообщение",
    "",
    "Для глубокого анализа — открывай полные инструменты на сайте: https://entrium-ai-v2.vercel.app",
  ].join("\n")
}
