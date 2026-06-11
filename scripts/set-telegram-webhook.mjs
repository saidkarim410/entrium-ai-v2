/**
 * One-time webhook registration with Telegram Bot API.
 *
 * Usage (PowerShell):
 *   $env:TELEGRAM_BOT_TOKEN="<your-bot-token>"
 *   $env:TELEGRAM_WEBHOOK_SECRET="some-random-string"
 *   $env:NEXT_PUBLIC_SITE_URL="https://entrium-ai-v2.vercel.app"
 *   node scripts/set-telegram-webhook.mjs
 *
 * Run again whenever you change the URL or rotate the secret.
 */
const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")

if (!TOKEN || !SECRET || !SITE) {
  console.error(
    "Missing env. Need TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, NEXT_PUBLIC_SITE_URL."
  )
  process.exit(1)
}

const url = `${SITE}/api/telegram/webhook`
console.log("Setting webhook to:", url)

const res = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url,
    secret_token: SECRET,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  }),
})

const json = await res.json()
console.log("Status:", res.status)
console.log(JSON.stringify(json, null, 2))

if (!json.ok) process.exit(1)

// Verify
const info = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`).then((r) => r.json())
console.log("\nCurrent webhook info:")
console.log(JSON.stringify(info.result, null, 2))
