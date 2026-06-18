import { env, telegramEnabled, miniAppBotToken } from "@/lib/env"

const TG_API = "https://api.telegram.org"

type TelegramSendResult = { ok: boolean; result?: unknown; description?: string }

/**
 * Sends a message to a Telegram chat. No-op if bot is not configured.
 * Markdown is supported via "MarkdownV2" but requires escaping — we use HTML
 * mode which is more forgiving with AI output.
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  opts?: { reply_to_message_id?: number; disable_notification?: boolean }
): Promise<TelegramSendResult> {
  if (!telegramEnabled()) return { ok: false, description: "telegram_disabled" }
  return sendViaToken(chatId, text, env.TELEGRAM_BOT_TOKEN, opts)
}

/**
 * Sends a proactive reminder to a STUDENT. Tries the Mini App bot
 * (@entriumcouselorbot) first — that is where students actually pressed Start —
 * and falls back to the main bot (@entriumleedbot) for users who only linked
 * through the web /start flow. A given chat_id can only be messaged by a bot
 * the user has started, so attempting both maximises real delivery.
 * Returns the first successful result (tagged with `via`), or the last error.
 */
export async function sendStudentReminder(
  chatId: string,
  text: string,
  opts?: { reply_to_message_id?: number; disable_notification?: boolean }
): Promise<TelegramSendResult & { via?: "miniapp" | "main" }> {
  const studentToken = miniAppBotToken()
  const mainToken = env.TELEGRAM_BOT_TOKEN

  if (studentToken) {
    const r = await sendViaToken(chatId, text, studentToken, opts)
    if (r.ok) return { ...r, via: "miniapp" }
    // Student bot couldn't reach them — fall back to the main bot if it's a
    // genuinely different token (otherwise we'd just repeat the same failure).
    if (mainToken && mainToken !== studentToken) {
      const r2 = await sendViaToken(chatId, text, mainToken, opts)
      return r2.ok ? { ...r2, via: "main" } : r2
    }
    return r
  }
  if (mainToken) {
    const r = await sendViaToken(chatId, text, mainToken, opts)
    return { ...r, via: "main" }
  }
  return { ok: false, description: "no_token" }
}

/** Chunk + send `text` through a specific bot token (Telegram caps at 4096). */
async function sendViaToken(
  chatId: string,
  text: string,
  token: string,
  opts?: { reply_to_message_id?: number; disable_notification?: boolean }
): Promise<TelegramSendResult> {
  if (!token) return { ok: false, description: "no_token" }
  const MAX = 4000
  let lastResult: TelegramSendResult = { ok: true }
  for (let i = 0; i < text.length; i += MAX) {
    const chunk = text.slice(i, i + MAX)
    lastResult = await callBotApi(
      "sendMessage",
      {
        chat_id: chatId,
        text: chunk,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...opts,
      },
      token
    )
    if (!lastResult.ok) return lastResult
  }
  return lastResult
}

export async function sendTelegramAction(
  chatId: string,
  action: "typing" | "upload_document" = "typing"
) {
  if (!telegramEnabled()) return
  await callBotApi("sendChatAction", { chat_id: chatId, action })
}

export async function setTelegramWebhook(url: string, secret: string) {
  return callBotApi("setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  })
}

async function callBotApi(
  method: string,
  body: Record<string, unknown>,
  token?: string
): Promise<TelegramSendResult> {
  const useToken = token || env.TELEGRAM_BOT_TOKEN
  if (!useToken) return { ok: false, description: "no_token" }

  try {
    const res = await fetch(`${TG_API}/bot${useToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return (await res.json()) as TelegramSendResult
  } catch (err) {
    return { ok: false, description: err instanceof Error ? err.message : "fetch_failed" }
  }
}

/**
 * Convert markdown-ish AI output to HTML-safe format Telegram accepts.
 * Strips most markdown except basic emphasis. Keeps newlines.
 */
export function aiToTelegramHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // **bold** → <b>
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    // _italic_ → <i>
    .replace(/(^|\s)_([^_\n]+)_(\s|$)/g, "$1<i>$2</i>$3")
    // `code` → <code>
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    // Strip headings (#, ##, ###)
    .replace(/^#{1,6}\s+/gm, "")
}

export async function setChatMenuButton(
  url: string,
  text = "Открыть Entrium AI",
): Promise<TelegramSendResult> {
  if (!telegramEnabled()) return { ok: false, description: "telegram_disabled" }
  return callBotApi("setChatMenuButton", {
    menu_button: { type: "web_app", text, web_app: { url } },
  })
}

export function generateLinkCode(): string {
  // Short, URL-safe, easy to type
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
  let out = ""
  for (let i = 0; i < 8; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return out
}
