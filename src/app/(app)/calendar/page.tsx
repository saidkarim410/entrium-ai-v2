import Link from "next/link"
import { listApplications } from "@/lib/applications/actions"
import { getCalendarFeedUrl } from "@/lib/calendar-feed/actions"
import { CalendarClient, type CalEvent } from "./calendar-client"

export const dynamic = "force-dynamic"

export default async function CalendarPage() {
  const [apps, feed] = await Promise.all([
    listApplications(),
    getCalendarFeedUrl(),
  ])

  const events: CalEvent[] = apps
    .filter((a) => a.deadline)
    .map((a) => ({
      id: a.id,
      date: a.deadline!,
      title: a.university_name,
      subtitle: [a.program, a.round, a.level].filter(Boolean).join(" · "),
      status: a.status,
      priority: a.priority,
    }))

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base sm:text-lg tracking-tight truncate">Календарь</h1>
          <p className="font-mono-label text-cream-3 mt-0.5 truncate">
            Все дедлайны заявок · по месяцам
          </p>
        </div>
        <Link href="/applications" className="font-mono-label text-xs text-cream-3 hover:text-gold transition-colors">
          ← Заявки
        </Link>
      </header>
      <CalendarClient events={events} feed={feed} />
    </>
  )
}
