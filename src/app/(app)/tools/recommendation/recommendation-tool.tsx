"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Markdown } from "@/components/markdown"
import { Mail, Loader2, Sparkles, Copy, Check, Download } from "lucide-react"

const TONES = [
  { id: "formal", label: "Академический формальный" },
  { id: "warm", label: "Тёплый менторский" },
  { id: "professional", label: "Профессиональный краткий" },
] as const

const LENGTHS = [
  { id: "short", label: "Короткое (~250 слов)" },
  { id: "medium", label: "Среднее (~400 слов)" },
  { id: "long", label: "Длинное (~600 слов)" },
] as const

const LANGS = [
  { id: "Русский", label: "Русский" },
  { id: "English", label: "English" },
  { id: "O'zbekcha", label: "O'zbekcha" },
] as const

export function RecommendationTool() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState("")
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({
    // Recommender
    rec_name: "",
    rec_position: "",
    rec_institution: "",
    rec_email: "",
    rec_subject: "",
    rec_duration: "",
    // Student
    st_name: "",
    st_target: "",
    st_program: "Bachelor",
    // Substance
    achievements: "",
    qualities: "",
    anecdote: "",
    growth: "",
    // Style
    lang: "Русский" as (typeof LANGS)[number]["id"],
    tone: "formal" as (typeof TONES)[number]["id"],
    length: "medium" as (typeof LENGTHS)[number]["id"],
  })

  const update = (k: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function generate() {
    if (!form.rec_name || !form.rec_position || !form.st_name || !form.st_target) {
      return toast.error("Заполни рекомендателя, студента и целевой университет")
    }
    if (!form.achievements && !form.anecdote) {
      return toast.error("Нужны конкретные достижения или история — без них письмо будет шаблонным")
    }
    setLoading(true)
    setResult("")

    const toneLabel = TONES.find((t) => t.id === form.tone)?.label
    const lengthLabel = LENGTHS.find((l) => l.id === form.length)?.label

    const userPrompt = `РЕКОМЕНДАТЕЛЬ:
Имя: ${form.rec_name}
Должность / роль: ${form.rec_position}
Институт / организация: ${form.rec_institution || "не указан"}
Email: ${form.rec_email || "(не указан — оставь поле для подписи пустым)"}
Предмет / характер отношений: ${form.rec_subject || "не указан"}
Знает студента: ${form.rec_duration || "не указано"}

СТУДЕНТ:
Имя: ${form.st_name}
Целевой университет / программа: ${form.st_target}
Уровень: ${form.st_program}

КОНКРЕТИКА (это самое важное — используй ВСЁ):
Достижения с метриками: ${form.achievements || "—"}
Личные качества: ${form.qualities || "—"}
Конкретная история / момент: ${form.anecdote || "—"}
Зоны роста: ${form.growth || "(не указано — упомяни одну area for growth, чтобы письмо звучало правдоподобно)"}

СТИЛЬ:
Язык: ${form.lang}
Тон: ${toneLabel}
Длина: ${lengthLabel}

Напиши полное готовое к отправке рекомендательное письмо. После письма добавь короткий disclaimer на русском.`

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "recommendation", user: userPrompt, max_tokens: 3000 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Ошибка")
      setResult(data.text)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Что-то пошло не так")
    } finally {
      setLoading(false)
    }
  }

  function copyResult() {
    if (!result) return
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function downloadDocx() {
    if (!result) return
    // Plain .txt download — we don't have a docx generator, but .txt opens in Word
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Recommendation_${form.st_name || "student"}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Recommender */}
        <Section icon={<Mail className="h-4 w-4 text-gold" />} title="Рекомендатель">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Имя рекомендателя" value={form.rec_name} onChange={update("rec_name")} placeholder="Иван Иванов" />
            <Field label="Должность / роль" value={form.rec_position} onChange={update("rec_position")} placeholder="Учитель математики" />
            <Field label="Институт / организация" value={form.rec_institution} onChange={update("rec_institution")} placeholder="Лицей №2 при ТАШГУ" />
            <Field label="Email (для подписи)" value={form.rec_email} onChange={update("rec_email")} placeholder="ivanov@school.uz" />
            <Field label="Предмет / характер отношений" value={form.rec_subject} onChange={update("rec_subject")} placeholder="Calculus AB · Research mentor" />
            <Field label="Знает студента" value={form.rec_duration} onChange={update("rec_duration")} placeholder="2 года, с 10 класса" />
          </div>
        </Section>

        {/* Student */}
        <Section icon={<Sparkles className="h-4 w-4 text-gold" />} title="Студент и цель">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Имя студента" value={form.st_name} onChange={update("st_name")} placeholder="Saidkarim Tursunbaev" />
            <Field label="Целевой университет / программа" value={form.st_target} onChange={update("st_target")} placeholder="MIT · BS Computer Science" />
          </div>
          <div className="mt-4">
            <SelectField label="Уровень" value={form.st_program} onChange={update("st_program")} options={["Bachelor", "Master", "PhD", "Internship", "Job"]} />
          </div>
        </Section>

        {/* Substance — most important */}
        <Section icon={<Sparkles className="h-4 w-4 text-gold" />} title="Конкретика (самое важное)">
          <div className="space-y-4">
            <FieldArea
              label="Достижения с метриками"
              value={form.achievements}
              onChange={update("achievements")}
              placeholder="3-е место в National Math Olympiad 2025 (out of 800+ participants); GPA 4.9/5; led 4-person team that built a chatbot used by 200+ students"
              rows={3}
              hint="Цифры/даты/контекст. «Помог в проекте» — мусор. «Led 4-person team» — золото."
            />
            <FieldArea
              label="Личные качества"
              value={form.qualities}
              onChange={update("qualities")}
              placeholder="curiosity, leadership under pressure, analytical thinking, collaboration"
              rows={2}
            />
            <FieldArea
              label="Конкретная история / момент"
              value={form.anecdote}
              onChange={update("anecdote")}
              placeholder="When the school internet went down before the regional Olympiad, Saidkarim organized offline practice sessions for 12 students using printed problem sets..."
              rows={4}
              hint="Короткая story 3-5 предложений. Это secret sauce письма."
            />
            <FieldArea
              label="Зоны роста (для правдоподобности)"
              value={form.growth}
              onChange={update("growth")}
              placeholder="initially struggled with public presentations, but by 11 grade was leading school-wide TEDx-style talks"
              rows={2}
            />
          </div>
        </Section>

        {/* Style */}
        <Section icon={<Sparkles className="h-4 w-4 text-gold" />} title="Стиль">
          <div className="grid sm:grid-cols-3 gap-4">
            <SelectField label="Язык" value={form.lang} onChange={update("lang")} options={LANGS.map((l) => l.id)} />
            <SelectField label="Тон" value={form.tone} onChange={update("tone")} options={TONES.map((t) => t.id)} optionLabels={TONES.map((t) => t.label)} />
            <SelectField label="Длина" value={form.length} onChange={update("length")} options={LENGTHS.map((l) => l.id)} optionLabels={LENGTHS.map((l) => l.label)} />
          </div>
        </Section>

        <Button onClick={generate} disabled={loading} className="w-full h-12 bg-gold text-background hover:bg-gold-soft font-cinzel">
          {loading
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> AI пишет письмо...</>
            : <><Sparkles className="h-4 w-4 mr-2" /> Сгенерировать письмо</>}
        </Button>

        {result && (
          <div className="rounded-xl border border-border bg-card/40 p-7 accent-strip">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <span className="font-mono-label text-gold">✉ ГОТОВОЕ ПИСЬМО</span>
              <div className="flex gap-2">
                <Button onClick={copyResult} variant="ghost" size="sm" className="gap-2">
                  {copied ? <><Check className="h-3.5 w-3.5" /> Скопировано</> : <><Copy className="h-3.5 w-3.5" /> Копировать</>}
                </Button>
                <Button onClick={downloadDocx} variant="ghost" size="sm" className="gap-2">
                  <Download className="h-3.5 w-3.5" /> Скачать
                </Button>
              </div>
            </div>
            <Markdown>{result}</Markdown>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-6 accent-strip">
      <div className="flex items-center gap-2 mb-5">
        {icon}
        <span className="font-mono-label text-cream-3">{title}</span>
      </div>
      {children}
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

function FieldArea({
  label, value, onChange, placeholder, rows = 3, hint,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  rows?: number
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono-label text-cream-3">{label}</Label>
      <Textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} className="font-serif" />
      {hint && <p className="text-xs text-cream-3 italic">{hint}</p>}
    </div>
  )
}

function SelectField({
  label, value, onChange, options, optionLabels,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: readonly string[]
  optionLabels?: readonly string[]
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono-label text-cream-3">{label}</Label>
      <select value={value} onChange={onChange} className="flex h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-cream">
        {options.map((o, i) => <option key={o} value={o}>{optionLabels?.[i] ?? o}</option>)}
      </select>
    </div>
  )
}
