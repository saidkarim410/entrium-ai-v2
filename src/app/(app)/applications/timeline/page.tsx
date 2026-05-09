import Link from "next/link"
import { listApplications } from "@/lib/applications/actions"
import { ApplicationsTimeline } from "./timeline-client"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"
export const metadata = { title: "Timeline · Entrium" }

/**
 * F-3 (TZ): visual timeline of all application deadlines.
 *
 * Renders apps as horizontal bars on a month-by-month axis, color-coded
 * by status. Helps the user see the whole admission cycle at a glance
 * (peak-deadline weeks, gaps, overlap with school exams etc.).
 */
export default async function ApplicationsTimelinePage() {
  const apps = await listApplications()

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link href="/applications" className="text-cream-3 hover:text-gold transition-colors shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-display text-base sm:text-lg tracking-tight truncate">Timeline</h1>
            <p className="font-mono-label text-cream-3 mt-0.5 truncate">Все дедлайны на одной шкале</p>
          </div>
        </div>
      </header>
      <ApplicationsTimeline initial={apps} />
    </>
  )
}
