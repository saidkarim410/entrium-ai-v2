import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import { History as HistoryIcon, ArrowRight } from "lucide-react"
import { HistoryClient, type Run } from "./history-client"

export const dynamic = "force-dynamic"

export default async function HistoryPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const { data } = await supabaseAdmin
    .from("tool_runs")
    .select("id, tool, output, input, duration_ms, created_at")
    .eq("user_id", user.id)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(200)

  const runs = (data ?? []) as Run[]

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base sm:text-lg tracking-tight truncate">История</h1>
          <p className="font-mono-label text-cream-3 mt-0.5 truncate">
            {runs.length} {runs.length === 1 ? "запуск" : "запусков"} · последние 200
          </p>
        </div>
      </header>

      {runs.length === 0 ? (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
            <div className="rounded-xl border border-border bg-card/40 p-10 text-center accent-strip">
              <HistoryIcon className="h-10 w-10 text-cream-3 mx-auto mb-4" />
              <p className="font-display text-xl mb-2">Пока пусто</p>
              <p className="font-serif text-cream-2 mb-6">
                Запусти любой AI-инструмент — результаты сохранятся здесь
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-gold text-background px-5 h-10 rounded-md font-cinzel hover:bg-gold-soft transition-colors"
              >
                К инструментам <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <HistoryClient runs={runs} />
      )}
    </>
  )
}
