import Link from "next/link"
import { listActivities } from "@/lib/activities/actions"
import { ActivityBuilder } from "./activity-builder"

export const dynamic = "force-dynamic"

export default async function ActivitiesPage() {
  const items = await listActivities()
  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base sm:text-lg tracking-tight truncate">Activities · Common App</h1>
          <p className="font-mono-label text-cream-3 mt-0.5 truncate">10 слотов · char counters · AI rewrite</p>
        </div>
        <Link href="/dashboard" className="font-mono-label text-xs text-cream-3 hover:text-gold transition-colors">
          ← Dashboard
        </Link>
      </header>
      <ActivityBuilder initial={items} />
    </>
  )
}
