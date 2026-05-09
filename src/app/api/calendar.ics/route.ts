import { supabaseAdmin } from "@/lib/supabase/admin"
import { verifyToken } from "@/lib/email"
import {
  type Application,
  STATUS_LABELS,
  PRIORITY_LABELS,
  type AppStatus,
  type AppPriority,
} from "@/lib/applications/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://entrium-ai-v2.vercel.app").replace(/\/$/, "")
const HOSTNAME = SITE.replace(/^https?:\/\//, "")

/**
 * Subscribable iCalendar feed of admission deadlines.
 *
 * URL: GET /api/calendar.ics?token=<HMAC>
 * The token = signToken(userId, "calendar") — same HMAC scheme as the
 * email-unsubscribe link. Doesn't require login because calendar clients
 * (Google, Apple, Outlook) poll the URL periodically without browser auth.
 *
 * Each VEVENT has:
 *   - SUMMARY = "🎓 MIT · CS · EA"
 *   - DTSTART = deadline (whole-day)
 *   - DESCRIPTION = status + priority + program info + Entrium URL
 *   - VALARM at -7d (display reminder)
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get("token") ?? ""
  const userId = verifyToken(token, "calendar")
  if (!userId) {
    return new Response("Invalid or expired token", { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .not("deadline", "is", null)

  if (error) {
    return new Response("Database error", { status: 500 })
  }

  const apps = (data ?? []) as Application[]

  const lines: string[] = []
  lines.push("BEGIN:VCALENDAR")
  lines.push("VERSION:2.0")
  lines.push("PRODID:-//Entrium AI//Admission Calendar//EN")
  lines.push("CALSCALE:GREGORIAN")
  lines.push("METHOD:PUBLISH")
  lines.push("X-WR-CALNAME:Entrium · Admission Deadlines")
  lines.push("X-WR-CALDESC:Application deadlines tracked in Entrium AI")
  lines.push("X-PUBLISHED-TTL:PT1H")
  lines.push("REFRESH-INTERVAL;VALUE=DURATION:PT1H")

  const now = new Date()
  const dtstamp = formatTimestamp(now)

  for (const a of apps) {
    if (!a.deadline) continue
    const dt = a.deadline.replace(/-/g, "") // YYYYMMDD
    const dtEnd = nextDay(a.deadline)

    const program = [a.program, a.level, a.round].filter(Boolean).join(" · ")
    const summary = `🎓 ${a.university_name}${program ? " · " + program : ""}`

    const status = STATUS_LABELS[a.status as AppStatus] ?? a.status
    const priority = PRIORITY_LABELS[a.priority as AppPriority] ?? a.priority
    const descParts = [
      `Статус: ${status}`,
      `Приоритет: ${priority}`,
      a.application_fee_usd ? `App fee: $${a.application_fee_usd}` : "",
      a.notes ? `\\n${escapeIcs(a.notes.slice(0, 300))}` : "",
      `\\n→ ${SITE}/applications`,
    ].filter(Boolean)

    lines.push("BEGIN:VEVENT")
    lines.push(`UID:${a.id}@${HOSTNAME}`)
    lines.push(`DTSTAMP:${dtstamp}`)
    lines.push(`DTSTART;VALUE=DATE:${dt}`)
    lines.push(`DTEND;VALUE=DATE:${dtEnd}`)
    lines.push(`SUMMARY:${escapeIcs(summary)}`)
    lines.push(`DESCRIPTION:${descParts.join("\\n")}`)
    lines.push(`URL:${SITE}/applications`)
    lines.push("TRANSP:OPAQUE")
    lines.push(`STATUS:${status === "Подано" || status === "Принят 🎉" ? "CONFIRMED" : "TENTATIVE"}`)

    // 7-day reminder
    if (["planning", "in_progress"].includes(a.status as AppStatus)) {
      lines.push("BEGIN:VALARM")
      lines.push("ACTION:DISPLAY")
      lines.push("TRIGGER:-P7D")
      lines.push(`DESCRIPTION:${escapeIcs(`${a.university_name} — дедлайн через 7 дней`)}`)
      lines.push("END:VALARM")

      // 1-day reminder
      lines.push("BEGIN:VALARM")
      lines.push("ACTION:DISPLAY")
      lines.push("TRIGGER:-P1D")
      lines.push(`DESCRIPTION:${escapeIcs(`${a.university_name} — дедлайн завтра`)}`)
      lines.push("END:VALARM")
    }

    lines.push("END:VEVENT")
  }

  lines.push("END:VCALENDAR")

  // ICS spec requires CRLF line endings
  const body = lines.join("\r\n") + "\r\n"

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="entrium-deadlines.ics"',
      "Cache-Control": "private, max-age=300",
    },
  })
}

// ── Helpers ────────────────────────────────────────────────────────────────

function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
}

function formatTimestamp(d: Date): string {
  // YYYYMMDDTHHMMSSZ (UTC)
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  )
}

function nextDay(iso: string): string {
  // YYYY-MM-DD → next day's YYYYMMDD
  const d = new Date(iso + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10).replace(/-/g, "")
}
