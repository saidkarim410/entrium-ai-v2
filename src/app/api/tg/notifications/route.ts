import { supabaseAdmin } from "@/lib/supabase/admin"
import { miniAppBotToken, miniAppEnabled } from "@/lib/env"
import { validateInitData } from "@/lib/telegram/init-data"
import { resolveTelegramUser } from "@/lib/telegram/resolve-user"
import { mergePrefs, type NotificationPrefs } from "@/lib/notifications/prefs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type AuthResult = { ok: true; userId: string } | { ok: false; res: Response }

async function authed(req: Request): Promise<AuthResult> {
  if (!miniAppEnabled()) {
    return { ok: false, res: Response.json({ error: "telegram_disabled" }, { status: 503 }) }
  }
  const initData = req.headers.get("x-telegram-init-data") ?? ""
  const verdict = validateInitData(initData, miniAppBotToken())
  if (!verdict.ok) {
    return { ok: false, res: Response.json({ error: "unauthorized", reason: verdict.reason }, { status: 401 }) }
  }
  const resolved = await resolveTelegramUser(verdict.user)
  return { ok: true, userId: resolved.userId }
}

function readStoredPrefs(applicantData: unknown): Partial<NotificationPrefs> {
  return (
    (applicantData as { _notification_prefs?: Partial<NotificationPrefs> } | null)?._notification_prefs ?? {}
  )
}

export async function GET(req: Request) {
  const a = await authed(req)
  if (!a.ok) return a.res

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("applicant_data")
    .eq("id", a.userId)
    .maybeSingle()

  const prefs = mergePrefs(readStoredPrefs(data?.applicant_data))
  return Response.json({ telegramPush: prefs.telegramPush })
}

export async function POST(req: Request) {
  const a = await authed(req)
  if (!a.ok) return a.res

  let body: { enabled?: unknown }
  try {
    body = (await req.json()) as { enabled?: unknown }
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 })
  }
  if (typeof body.enabled !== "boolean") {
    return Response.json({ error: "invalid_input" }, { status: 400 })
  }

  // Deep-merge so we never wipe the rest of applicant_data or other prefs.
  const { data: row } = await supabaseAdmin
    .from("profiles")
    .select("applicant_data")
    .eq("id", a.userId)
    .maybeSingle()

  const current = (row?.applicant_data as Record<string, unknown> | null) ?? {}
  const nextPrefs = mergePrefs({ ...readStoredPrefs(current), telegramPush: body.enabled })
  const merged = { ...current, _notification_prefs: nextPrefs }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ applicant_data: merged })
    .eq("id", a.userId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, telegramPush: body.enabled })
}
