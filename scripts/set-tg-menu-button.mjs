// Run once to point the bot's menu button at the Mini App.
// Usage: TELEGRAM_BOT_TOKEN=... TG_MINIAPP_URL=https://entrium-ai-v2.vercel.app/tg node scripts/set-tg-menu-button.mjs
const token = process.env.TELEGRAM_BOT_TOKEN
const url = process.env.TG_MINIAPP_URL ?? "https://entrium-ai-v2.vercel.app/tg"
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required")
  process.exit(1)
}
const res = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    menu_button: { type: "web_app", text: "Открыть Entrium AI", web_app: { url } },
  }),
})
console.log(res.status, await res.text())
