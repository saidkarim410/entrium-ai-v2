import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const VALID_TOOLS = new Set([
  "profile", "analyzer", "tracker", "university",
  "scholarship", "essay", "humanizer", "interview",
  "recommendation", "cv", "cost", "reviewer",
])

export async function proxy(request: NextRequest) {
  // 404 for unknown /tools/<slug> paths — runs before auth redirect.
  const toolMatch = request.nextUrl.pathname.match(/^\/tools\/([^/]+)\/?$/)
  if (toolMatch && !VALID_TOOLS.has(toolMatch[1])) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * S-8/F-6 (TZ): the auth-guard skips routes that authenticate via
     * other means so we don't waste a Supabase round-trip on every cron
     * tick or unauth callback:
     *   - api/cron/*            → CRON_SECRET (Vercel-injected)
     *   - api/stripe/webhook    → Stripe signature
     *   - api/telegram/webhook  → TELEGRAM_WEBHOOK_SECRET
     *   - tg, api/tg            → Telegram Mini App (initData HMAC, no cookie)
     *   - api/calendar.ics      → HMAC token (calendar clients have no cookie)
     *   - api/email/unsubscribe → HMAC token (mail-client clicks)
     *   - monitoring            → Sentry tunnel (no auth needed)
     *   - opengraph-image       → public OG image
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/cron|api/stripe/webhook|api/telegram/webhook|api/tg(?:/|$)|tg(?:/|$)|api/calendar\\.ics|api/email/unsubscribe|monitoring|opengraph-image|r/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
