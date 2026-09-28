import Link from "next/link"
import { listPlanTasks } from "@/lib/plan/actions"
import { planProgress } from "@/lib/plan/types"
import { todayIso } from "@/lib/ai/temporal"
import { PlanClient } from "./plan-client"

export const dynamic = "force-dynamic"

/** Saved plan — the tasks behind "Agent → план" (P1-03). */
export default async function PlanPage() {
  const { tasks, available } = await listPlanTasks()
  const today = todayIso()
  const progress = planProgress(tasks, today)

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base sm:text-lg tracking-tight truncate">План</h1>
          <p className="font-mono-label text-cream-3 mt-0.5 truncate">
            {available
              ? `${progress.done} из ${progress.total} задач сделано · ${progress.percent}%${progress.overdue ? ` · просрочено ${progress.overdue}` : ""}`
              : "Сохранённые задачи · раздел ещё не активирован"}
          </p>
        </div>
        <Link href="/tools/tracker" className="text-xs font-mono-label text-gold hover:underline shrink-0">
          <span className="hidden sm:inline">Сгенерировать план →</span>
          <span className="sm:hidden">+ План</span>
        </Link>
      </header>
      {!available ? (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 text-center space-y-2">
          <p className="font-display text-lg">Таблица задач ещё не создана</p>
          <p className="font-serif text-sm text-cream-2">
            Нужна миграция <code>0026_plan_tasks.sql</code>. До этого планы остаются в Истории и в инструменте «План».
          </p>
        </div>
      ) : (
        <PlanClient initialTasks={tasks} today={today} />
      )}
    </>
  )
}
