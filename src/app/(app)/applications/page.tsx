import Link from "next/link"
import { ApplicationsClient } from "./applications-client"
import { listApplications } from "@/lib/applications/actions"
import { listEssays } from "@/lib/essays/actions"
import type { Essay } from "@/lib/essays/types"
import { CalendarRange } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ApplicationsPage() {
  const [apps, essays] = await Promise.all([listApplications(), listEssays()])

  // Group essays by application_id so client can show them inline per app card
  const essaysByApp: Record<string, Essay[]> = {}
  for (const e of essays) {
    if (e.application_id) {
      ;(essaysByApp[e.application_id] ??= []).push(e)
    }
  }

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base sm:text-lg tracking-tight truncate">Заявки</h1>
          <p className="font-mono-label text-cream-3 mt-0.5 truncate">
            Куда подаю · дедлайны · статусы · чеклисты · эссе
          </p>
        </div>
        {apps.length > 0 && (
          <Link
            href="/applications/timeline"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-card hover:border-gold/30 hover:text-gold px-3 py-1.5 text-xs font-medium text-cream-2 transition-colors shrink-0"
          >
            <CalendarRange className="h-3.5 w-3.5" />
            Timeline
          </Link>
        )}
      </header>
      <ApplicationsClient initial={apps} essaysByApp={essaysByApp} />
    </>
  )
}
