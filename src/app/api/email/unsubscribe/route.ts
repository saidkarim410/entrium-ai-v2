import { supabaseAdmin } from "@/lib/supabase/admin"
import { verifyToken } from "@/lib/email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * One-click unsubscribe (RFC 8058) — Gmail and other big providers reward
 * working unsubscribe links with better deliverability.
 *
 * GET /api/email/unsubscribe?token=<HMAC-signed>
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get("token") ?? ""
  const userId = verifyToken(token, "unsubscribe")

  if (!userId) {
    return new Response(html(false, "Ссылка устарела или некорректна."), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
      status: 400,
    })
  }

  await supabaseAdmin
    .from("profiles")
    .update({ email_digest_enabled: false })
    .eq("id", userId)

  return new Response(html(true, "Готово. Больше не пришлём дайджест."), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}

// Some email clients POST the unsubscribe link (RFC 8058)
export async function POST(req: Request) {
  return GET(req)
}

function html(success: boolean, msg: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Unsubscribe · Entrium</title>
<style>body{margin:0;background:#0F0E0C;color:#F5EFDC;font-family:Helvetica,Arial,sans-serif;display:grid;min-height:100vh;place-items:center;padding:20px}
.box{max-width:480px;text-align:center;border:1px solid #2A271F;background:#1A1813;border-radius:12px;padding:36px}
h1{font-family:Georgia,serif;font-weight:400;font-size:24px;margin:0 0 12px;color:${success ? "#D9B074" : "#fca5a5"}}
p{color:#D8CFB8;line-height:1.6;font-size:15px;margin:0 0 24px}
a{color:#D9B074;text-decoration:none;border:1px solid #D9B07440;background:#D9B07415;padding:10px 18px;border-radius:8px;display:inline-block;font-size:14px}
a:hover{background:#D9B07425}</style></head>
<body><div class="box">
<h1>${success ? "✓ Отписан" : "Не получилось"}</h1>
<p>${msg}</p>
<a href="https://entrium-ai-v2.vercel.app/settings">Открыть настройки</a>
</div></body></html>`
}
