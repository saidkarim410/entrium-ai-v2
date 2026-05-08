import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import { Markdown } from "@/components/markdown"
import { History as HistoryIcon, ArrowRight } from "lucide-react"

export const dynamic = "force-dynamic"

const TOOL_LABELS: Record<string, string> = {
  profile: "Диагностика профиля",
  analyzer: "Анализ шансов",
  tracker: "Персональный план",
  university: "Подбор универов",
  scholarship: "Подбор стипендий",
  essay: "Essay Coach",
  humanizer: "Humanizer",
  interview: "Interview Trainer",
  recommendation: "Рекомендательное письмо",
  cv: "CV / Resume",
  cost: "Cost Calculator",
  reviewer: "Mock Reviewer",
}

type Run = {
  id: string
  tool: string
  output: { text: string } | null
  duration_ms: number | null
  created_at: string
}

export default async function HistoryPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const { data } = await supabaseAdmin
    .from("tool_runs")
    .select("id, tool, output, duration_ms, created_at")
    .eq("user_id", user.id)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(50)

  const runs = (data ?? []) as Run[]

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base sm:text-lg tracking-tight truncate">История</h1>
          <p className="font-mono-label text-cream-3 mt-0.5 truncate">{runs.length} запусков · последние 50</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-4xl mx-auto px-6 py-8">
          {runs.length === 0 ? (
            <div className="rounded-xl border border-border bg-card/40 p-12 text-center accent-strip">
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
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <details
                  key={run.id}
                  className="group rounded-xl border border-border bg-card/40 overflow-hidden"
                >
                  <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer hover:bg-card/60 transition-colors list-none">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-mono-label text-gold">{TOOL_LABELS[run.tool] ?? run.tool}</span>
                        {run.duration_ms && (
                          <span className="font-mono-label text-cream-3">{(run.duration_ms / 1000).toFixed(1)}s</span>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-serif text-cream-2 line-clamp-1">
                        {run.output?.text?.slice(0, 200) ?? "(нет результата)"}
                      </p>
                      <p className="mt-1 font-mono-label text-cream-3 text-[10px]">
                        {new Date(run.created_at).toLocaleString("ru-RU", {
                          year: "numeric", month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className="font-display text-2xl text-gold shrink-0 transition-transform group-open:rotate-180">↓</span>
                  </summary>
                  <div className="border-t border-border bg-background/40 p-6 accent-strip">
                    {run.output?.text ? (
                      <Markdown>{run.output.text}</Markdown>
                    ) : (
                      <p className="font-mono-label text-cream-3">Нет данных</p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
