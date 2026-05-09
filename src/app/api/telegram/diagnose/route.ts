import { env, telegramEnabled } from "@/lib/env"
import { getCurrentUser } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Telegram bot health diagnostic — auth-required because it leaks bot info.
 *
 * Returns getMe + getWebhookInfo so we can tell whether:
 *   - bot token is alive
 *   - webhook URL is registered
 *   - Telegram's infrastructure has dropped the URL silently (a known bug
 *     with some bot tokens — Telegram returns ok=true to setWebhook but
 *     getWebhookInfo shows empty URL forever)
 *
 * If the token is stuck (webhook URL won't persist), the only fix is to
 * create a fresh bot at @BotFather and rotate TELEGRAM_BOT_TOKEN.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  if (!telegramEnabled()) {
    return Response.json(
      { ok: false, configured: false, message: "TELEGRAM_BOT_TOKEN not set in env" },
      { status: 503 }
    )
  }

  const tg = env.TELEGRAM_BOT_TOKEN
  const expectedUrl = (env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "") + "/api/telegram/webhook"

  try {
    const [meR, infoR] = await Promise.all([
      fetch(`https://api.telegram.org/bot${tg}/getMe`).then((r) => r.json()),
      fetch(`https://api.telegram.org/bot${tg}/getWebhookInfo`).then((r) => r.json()),
    ])

    const me = meR.ok ? meR.result : null
    const info = infoR.ok ? infoR.result : null

    const webhookHealthy = info?.url && info.url === expectedUrl
    const webhookStuck = !info?.url && (info?.last_error_message ?? null) === null

    return Response.json({
      ok: true,
      configured: true,
      bot: me ? { id: me.id, username: me.username, first_name: me.first_name } : null,
      webhook: info,
      expectedUrl,
      verdict: webhookHealthy
        ? "healthy"
        : webhookStuck
          ? "silent_rejection"
          : info?.last_error_message
            ? "delivery_error"
            : "not_set",
      hints:
        webhookStuck
          ? [
              "Telegram principle silently dropped the webhook URL. setWebhook returns ok=true but the URL never persists.",
              "This happens when a bot token enters a bad state (rare, but our token has hit it).",
              "Fix: open @BotFather → /newbot → create a new bot → /setjoingroups disable, etc.",
              "Then rotate TELEGRAM_BOT_TOKEN in Vercel env to the new token and run scripts/set-telegram-webhook.mjs again.",
              "Alternative: keep using the existing bot for outbound notifications only (sendMessage works fine), and skip incoming /commands for now.",
            ]
          : info?.last_error_message
            ? [
                `Telegram failed to deliver to webhook: ${info.last_error_message}`,
                "Check that /api/telegram/webhook returns 200 to a fake POST with the correct secret_token header.",
              ]
            : !info?.url
              ? [
                  "Webhook is not set. Run: node scripts/set-telegram-webhook.mjs",
                ]
              : [
                  `Webhook is set but to a different URL (${info.url}). Expected ${expectedUrl}.`,
                  "Re-run scripts/set-telegram-webhook.mjs to fix.",
                ],
    })
  } catch (err) {
    return Response.json(
      { ok: false, error: "fetch_failed", message: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    )
  }
}
