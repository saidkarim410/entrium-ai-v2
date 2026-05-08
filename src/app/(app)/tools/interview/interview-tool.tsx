"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Mic, Loader2, Sparkles, ArrowRight, RotateCcw, SkipForward } from "lucide-react"
import { Markdown } from "@/components/markdown"
import { cn } from "@/lib/utils"

type AnswerEntry = { q: string; a: string; feedback: string; score: number | null }
type Phase = "setup" | "session" | "results"

type InterviewDefaults = {
  uni: string; major: string; type: string; lang: string; count: string; about: string
}

export function InterviewTool({ initial }: { initial?: InterviewDefaults } = {}) {
  const [phase, setPhase] = useState<Phase>("setup")
  const [loading, setLoading] = useState(false)

  // Setup
  const [uni, setUni] = useState(initial?.uni ?? "")
  const [major, setMajor] = useState(initial?.major ?? "")
  const [type, setType] = useState(initial?.type ?? "Alumni interview (US)")
  const [lang, setLang] = useState(initial?.lang ?? "Русский")
  const [count, setCount] = useState(initial?.count ?? "8")
  const [about, setAbout] = useState(initial?.about ?? "")

  // Session
  const [questions, setQuestions] = useState<string[]>([])
  const [current, setCurrent] = useState(0)
  const [answer, setAnswer] = useState("")
  const [answers, setAnswers] = useState<AnswerEntry[]>([])
  const [feedback, setFeedback] = useState<{ text: string; score: number | null } | null>(null)

  async function start() {
    if (!uni || !major) return toast.error("Укажи университет и специальность")
    setLoading(true)
    try {
      const sysOverride = `Ты — опытный интервьюер приёмной комиссии. Генерируй реальные admission interview вопросы. Язык вопросов: ${lang}. Отвечай ТОЛЬКО JSON массивом строк без нумерации, например: ["Вопрос 1", "Вопрос 2"]`
      const userPrompt = `Университет: ${uni}. Специальность: ${major}. Тип: ${type}. О студенте: ${about || "не указано"}. Сгенерируй ${count} реалистичных вопросов для admission interview — смесь: мотивация, личность, академика, будущие планы, почему этот вуз/программа. Только JSON массив строк.`
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "interview", system_override: sysOverride, user: userPrompt, max_tokens: 2048 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Ошибка")
      const text = String(data.text ?? "").replace(/```json|```/g, "").trim()
      const list = JSON.parse(text) as string[]
      setQuestions(list)
      setCurrent(0)
      setAnswers([])
      setFeedback(null)
      setAnswer("")
      setPhase("session")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось начать интервью")
    } finally {
      setLoading(false)
    }
  }

  async function submit() {
    if (!answer.trim()) return toast.error("Напиши ответ")
    setLoading(true)
    try {
      const sysOverride = `Ты — опытный interviewer приёмной комиссии топ-университета. Оцени ответ кандидата. Отвечай на ${lang}. Будь конкретным и строгим. Формат ответа:\nСКОР: X/10\nЧТО ХОРОШО: ...\nЧТО УЛУЧШИТЬ: ...\nЛУЧШИЙ ВАРИАНТ: (1-2 предложения как ответить лучше)`
      const userPrompt = `Вопрос: "${questions[current]}"\n\nОтвет кандидата: "${answer}"`
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "interview", system_override: sysOverride, user: userPrompt, max_tokens: 1024 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Ошибка")
      const text = String(data.text ?? "")
      const m = text.match(/СКОР:\s*(\d+)/i)
      const score = m ? parseInt(m[1], 10) : null
      const cleaned = text.replace(/СКОР:.*?\n?/i, "").trim()
      setFeedback({ text: cleaned, score })
      setAnswers((arr) => [...arr, { q: questions[current], a: answer, feedback: cleaned, score }])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось оценить")
    } finally {
      setLoading(false)
    }
  }

  function next() {
    setFeedback(null)
    setAnswer("")
    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1)
    } else {
      setPhase("results")
    }
  }

  function skip() {
    setAnswers((arr) => [...arr, { q: questions[current], a: "(пропущен)", feedback: "", score: null }])
    next()
  }

  function reset() {
    setPhase("setup")
    setQuestions([])
    setAnswers([])
    setCurrent(0)
    setAnswer("")
    setFeedback(null)
  }

  const realAnswers = answers.filter((a) => a.score !== null)
  const avgScore = realAnswers.length
    ? Math.round((realAnswers.reduce((s, a) => s + (a.score ?? 0), 0) / realAnswers.length) * 10) / 10
    : null

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container max-w-3xl mx-auto px-6 py-8">
        {phase === "setup" && (
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card/40 p-6 accent-strip">
              <div className="flex items-center gap-2 mb-5">
                <Mic className="h-4 w-4 text-gold" />
                <span className="font-mono-label text-cream-3">Параметры интервью</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Университет" value={uni} onChange={setUni} placeholder="Stanford" />
                <Field label="Специальность" value={major} onChange={setMajor} placeholder="Computer Science" />
                <SelectField label="Тип интервью" value={type} onChange={setType} options={[
                  "Alumni interview (US)",
                  "Faculty interview",
                  "Oxbridge academic interview (UK)",
                  "MBA panel interview",
                  "Behavioral interview",
                ]} />
                <SelectField label="Язык" value={lang} onChange={setLang} options={["Русский", "English", "O'zbekcha"]} />
                <SelectField label="Количество вопросов" value={count} onChange={setCount} options={["5", "8", "10", "15"]} />
              </div>
              <div className="mt-4 space-y-1.5">
                <Label className="font-mono-label text-cream-3">О себе (опционально)</Label>
                <Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={3} placeholder="Кратко: GPA, активность, интересы — AI учтёт в вопросах" className="font-serif" />
              </div>
            </div>
            <Button onClick={start} disabled={loading} className="w-full h-12 bg-gold text-background hover:bg-gold-soft font-cinzel">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Генерируем вопросы...</> : <><Sparkles className="h-4 w-4 mr-2" /> Начать интервью</>}
            </Button>
          </div>
        )}

        {phase === "session" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono-label text-cream-3">{uni} · {major} · {type}</span>
              <span className="font-mono-label text-gold">Вопрос {current + 1} / {questions.length}</span>
            </div>

            <div className="rounded-xl border border-border bg-card/50 p-7 accent-strip">
              <p className="font-mono-label text-cream-3 mb-3">● Вопрос</p>
              <p className="font-display text-xl leading-relaxed">{questions[current]}</p>
            </div>

            {!feedback && (
              <>
                <div className="space-y-1.5">
                  <Label className="font-mono-label text-cream-3">Твой ответ</Label>
                  <Textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={6}
                    placeholder="Используй STAR: Situation → Task → Action → Result..."
                    className="font-serif"
                    disabled={loading}
                  />
                </div>
                <div className="flex gap-3">
                  <Button onClick={submit} disabled={loading || !answer.trim()} className="flex-1 h-11 bg-gold text-background hover:bg-gold-soft font-cinzel">
                    {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Оцениваем...</> : <>Получить оценку <ArrowRight className="h-4 w-4 ml-2" /></>}
                  </Button>
                  <Button onClick={skip} variant="outline" disabled={loading} className="gap-2">
                    <SkipForward className="h-4 w-4" /> Пропустить
                  </Button>
                </div>
              </>
            )}

            {feedback && (
              <div
                className="rounded-xl border bg-card/60 p-6 accent-strip"
                style={{ borderColor: scoreColor(feedback.score) + "55" }}
              >
                {feedback.score !== null && (
                  <div className="flex items-center gap-3 mb-4">
                    <span className="font-display text-3xl" style={{ color: scoreColor(feedback.score) }}>
                      {feedback.score}<span className="text-base text-cream-3">/10</span>
                    </span>
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full transition-all" style={{ width: `${feedback.score * 10}%`, background: scoreColor(feedback.score) }} />
                    </div>
                  </div>
                )}
                <Markdown>{feedback.text}</Markdown>
                <Button onClick={next} className="mt-4 w-full h-11 bg-gold text-background hover:bg-gold-soft font-cinzel">
                  {current + 1 < questions.length ? "Следующий вопрос →" : "Завершить интервью ✓"}
                </Button>
              </div>
            )}
          </div>
        )}

        {phase === "results" && (
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card/50 p-7 accent-strip text-center">
              <p className="font-mono-label text-cream-3 mb-2">Интервью завершено</p>
              <h2 className="font-display text-2xl mb-4">{uni} · {major}</h2>
              {avgScore !== null && (
                <>
                  <p className="font-display text-6xl" style={{ color: scoreColor(avgScore) }}>
                    {avgScore}<span className="text-2xl text-cream-3">/10</span>
                  </p>
                  <p className="font-mono-label text-cream-3 mt-2">Средний балл · {realAnswers.length} ответов</p>
                </>
              )}
            </div>

            <div className="space-y-3">
              {answers.map((a, i) => (
                <div key={i} className="rounded-lg border border-border bg-card/40 p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="font-mono-label text-cream-3">Вопрос {i + 1}</span>
                    {a.score !== null && (
                      <span className="font-mono-label" style={{ color: scoreColor(a.score) }}>{a.score}/10</span>
                    )}
                  </div>
                  <p className="font-serif italic text-cream-2 mb-3 leading-relaxed">«{a.q}»</p>
                  {a.feedback && (
                    <div className="text-sm">
                      <Markdown>{a.feedback.slice(0, 400) + (a.feedback.length > 400 ? "..." : "")}</Markdown>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button onClick={reset} className="w-full h-11 bg-gold text-background hover:bg-gold-soft font-cinzel">
              <RotateCcw className="h-4 w-4 mr-2" /> Новое интервью
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function scoreColor(score: number | null): string {
  if (score === null) return "#888"
  if (score >= 8) return "#5aaa78"
  if (score >= 6) return "#c9a84c"
  return "#e05050"
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono-label text-cream-3">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono-label text-cream-3">{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="flex h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-cream">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  )
}
