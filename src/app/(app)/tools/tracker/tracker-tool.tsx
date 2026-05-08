"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Map, Loader2, CheckSquare, Square, Sparkles, Printer } from "lucide-react"
import { cn } from "@/lib/utils"

type Task = {
  id: string
  title: string
  description: string
  priority: "high" | "medium" | "low"
  category: string
  deadline?: string
  duration?: string
}

type Month = {
  month: string
  emoji: string
  color: string
  tasks: Task[]
}

type Plan = {
  diagnosis: string
  score: number
  months: Month[]
}

const CATEGORY_LABELS: Record<string, string> = {
  tests: "Тесты", essay: "Эссе", docs: "Документы", research: "Исследование",
  activity: "Активность", application: "Заявка", language: "Язык", prep: "Подготовка",
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "border-l-red-500", medium: "border-l-amber-500", low: "border-l-emerald-500",
}

type TrackerDefaults = {
  name: string; age: string; level: string; year: string
  gpa: string; eng: string; sat: string; major: string; prog: string
  unis: string; extra: string; weak: string
}

export function TrackerTool({ initial }: { initial?: TrackerDefaults } = {}) {
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())

  const [form, setForm] = useState<TrackerDefaults>(initial ?? {
    name: "", age: "", level: "11 класс", year: "2027",
    gpa: "", eng: "", sat: "", major: "", prog: "Bachelor",
    unis: "", extra: "", weak: "",
  })

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function generate() {
    if (!form.name || !form.major || !form.unis) {
      return toast.error("Заполни имя, специальность и целевые университеты")
    }
    setLoading(true)
    setPlan(null)

    const userPrompt = `Студент: ${form.name}, ${form.age || "?"} лет
Уровень: ${form.level}, поступление в ${form.year}
GPA/оценки: ${form.gpa || "—"}
Английский: ${form.eng || "—"}
SAT/ACT: ${form.sat || "—"}
Специальность: ${form.major} (${form.prog})
Целевые вузы: ${form.unis}
Внеклассная активность: ${form.extra || "не указана"}
Слабые места: ${form.weak || "не указаны"}

Создай персональный план подготовки к поступлению.`

    let parsedPlan: Plan | null = null
    let lastErr: unknown = null
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: "tracker",
            user: attempt === 1
              ? userPrompt
              : userPrompt + "\n\nВНИМАНИЕ: ответ ДОЛЖЕН быть ТОЛЬКО JSON. Первый символ — { , последний — }. Никакого Markdown.",
            max_tokens: 12000,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message ?? data.error ?? "Ошибка")

        let jsonStr = String(data.text ?? "")
          .trim()
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/, "")
          .replace(/\s*```\s*$/, "")
          .trim()

        if (!jsonStr.startsWith("{")) {
          const start = jsonStr.indexOf("{")
          const end = jsonStr.lastIndexOf("}")
          if (start === -1 || end === -1 || end <= start) {
            throw new Error("AI вернул не JSON")
          }
          jsonStr = jsonStr.slice(start, end + 1)
        }

        const parsed = JSON.parse(jsonStr) as Plan
        if (!parsed.months || !Array.isArray(parsed.months) || parsed.months.length === 0) {
          throw new Error("Пустой план")
        }
        parsedPlan = parsed
        break
      } catch (e) {
        lastErr = e
      }
    }

    if (parsedPlan) {
      setPlan(parsedPlan)
    } else {
      toast.error(lastErr instanceof Error ? lastErr.message : "Не удалось сгенерировать план. Попробуйте ещё раз.")
    }
    setLoading(false)
  }

  function toggle(id: string) {
    setDone((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const totalTasks = plan?.months.reduce((sum, m) => sum + m.tasks.length, 0) ?? 0
  const doneCount = done.size
  const progress = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container max-w-5xl mx-auto px-6 py-8">
        {!plan ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card/40 p-6 accent-strip">
              <div className="flex items-center gap-2 mb-4">
                <Map className="h-4 w-4 text-gold" />
                <span className="font-mono-label text-cream-3">Профиль для плана</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Имя" value={form.name} onChange={update("name")} placeholder="Саидкарим" />
                <Field label="Возраст" value={form.age} onChange={update("age")} placeholder="17" />
                <SelectField label="Уровень школы" value={form.level} onChange={update("level")} options={["9 класс","10 класс","11 класс","Выпускник школы","Бакалавр","Магистр"]} />
                <Field label="Год поступления" value={form.year} onChange={update("year")} placeholder="2027" />
                <Field label="GPA / оценки" value={form.gpa} onChange={update("gpa")} placeholder="4.5 / A-" />
                <Field label="Английский (тест)" value={form.eng} onChange={update("eng")} placeholder="IELTS 7.5" />
                <Field label="SAT / ACT" value={form.sat} onChange={update("sat")} placeholder="1450 / 33" />
                <Field label="Специальность" value={form.major} onChange={update("major")} placeholder="Computer Science" />
                <SelectField label="Программа" value={form.prog} onChange={update("prog")} options={["Bachelor", "Master", "PhD", "MBA"]} />
                <Field label="Целевые вузы" value={form.unis} onChange={update("unis")} placeholder="MIT, Stanford, ETH Zurich" />
              </div>

              <div className="mt-4 space-y-1.5">
                <Label className="font-mono-label text-cream-3">Внеклассная активность</Label>
                <Textarea value={form.extra} onChange={update("extra")} rows={2} placeholder="Олимпиады, проекты, лидерство..." className="font-serif" />
              </div>
              <div className="mt-4 space-y-1.5">
                <Label className="font-mono-label text-cream-3">Слабые места</Label>
                <Textarea value={form.weak} onChange={update("weak")} rows={2} placeholder="Слабый эссе, низкий SAT, нет рекомендаций..." className="font-serif" />
              </div>
            </div>

            <Button onClick={generate} disabled={loading} className="w-full h-12 bg-gold text-background hover:bg-gold-soft font-cinzel">
              {loading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> AI создаёт твой персональный план...</>
                : <><Sparkles className="h-4 w-4 mr-2" /> Создать персональный трекер</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-6 print-area">
            {/* Header */}
            <div className="rounded-xl border border-border bg-card/50 p-6 accent-strip">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <p className="font-mono-label text-cream-3 mb-1">AI · Диагностика</p>
                  <h2 className="font-display text-2xl">{form.name} · {form.major}</h2>
                  <p className="font-mono-label text-cream-3 mt-1">→ {form.unis}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono-label text-cream-3">Готовность</p>
                  <p className={cn(
                    "font-display text-4xl",
                    plan.score >= 80 ? "text-emerald-500" : plan.score >= 60 ? "text-gold" : "text-amber-500"
                  )}>{plan.score}<span className="text-base text-cream-3">/100</span></p>
                </div>
              </div>
              <p className="font-serif text-cream-2 leading-relaxed">{plan.diagnosis}</p>

              <div className="mt-5 pt-5 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono-label text-cream-3">Прогресс</span>
                  <span className="font-mono-label text-gold">{progress}% · {doneCount}/{totalTasks}</span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4 print-hide">
                <Button onClick={() => setPlan(null)} variant="ghost" size="sm">
                  ← Изменить профиль и регенерировать
                </Button>
                <Button onClick={() => window.print()} variant="ghost" size="sm" className="gap-2">
                  <Printer className="h-3.5 w-3.5" /> PDF / Print
                </Button>
              </div>
            </div>

            {/* Months */}
            <div className="space-y-5">
              {plan.months.map((m, idx) => {
                const monthDoneCount = m.tasks.filter((t) => done.has(`${idx}_${t.id}`)).length
                const monthProgress = m.tasks.length ? Math.round((monthDoneCount / m.tasks.length) * 100) : 0
                return (
                  <div key={idx} className="rounded-xl border border-border bg-card/40 overflow-hidden">
                    <div className="flex items-center justify-between p-5 border-b border-border" style={{ borderLeftWidth: 3, borderLeftColor: m.color }}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{m.emoji}</span>
                        <div>
                          <h3 className="font-display text-lg">{m.month}</h3>
                          <p className="font-mono-label text-cream-3">{monthDoneCount}/{m.tasks.length} задач</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-xl" style={{ color: m.color }}>{monthProgress}%</p>
                      </div>
                    </div>
                    <ul className="divide-y divide-border">
                      {m.tasks.map((t) => {
                        const taskId = `${idx}_${t.id}`
                        const isDone = done.has(taskId)
                        return (
                          <li
                            key={taskId}
                            className={cn(
                              "p-5 hover:bg-card/40 cursor-pointer border-l-2 transition-colors",
                              PRIORITY_COLORS[t.priority] ?? "border-l-border",
                              isDone && "opacity-50"
                            )}
                            onClick={() => toggle(taskId)}
                          >
                            <div className="flex items-start gap-3">
                              {isDone ? <CheckSquare className="h-5 w-5 text-gold mt-0.5 shrink-0" /> : <Square className="h-5 w-5 text-cream-3 mt-0.5 shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <h4 className={cn("font-medium", isDone && "line-through")}>{t.title}</h4>
                                  <span className="font-mono-label text-cream-3 shrink-0 mt-0.5">{CATEGORY_LABELS[t.category] ?? t.category}</span>
                                </div>
                                <p className="font-serif text-sm text-cream-2 mt-1.5 leading-relaxed">{t.description}</p>
                                {(t.deadline || t.duration) && (
                                  <div className="flex gap-3 mt-2 font-mono-label text-cream-3">
                                    {t.deadline && <span>● Дедлайн: {t.deadline}</span>}
                                    {t.duration && <span>● Длительность: {t.duration}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono-label text-cream-3">{label}</Label>
      <Input value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: string[] }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono-label text-cream-3">{label}</Label>
      <select value={value} onChange={onChange} className="flex h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-cream">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  )
}
