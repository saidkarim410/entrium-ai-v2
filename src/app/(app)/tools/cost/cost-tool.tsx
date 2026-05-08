"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Markdown } from "@/components/markdown"
import { Wallet, Loader2, Sparkles, Copy, Check, Download } from "lucide-react"

const LIFESTYLES = [
  { id: "modest", label: "Скромно (общежитие, готовка дома)" },
  { id: "standard", label: "Стандартно (студия, периодически кафе)" },
  { id: "comfortable", label: "Комфортно (квартира, рестораны, спорт)" },
] as const

const LEVELS = ["Bachelor", "Master", "PhD", "MBA", "Foundation"] as const
const LANGS = ["Русский", "English", "O'zbekcha"] as const

type CostDefaults = {
  country: string; city: string; university: string
  level: (typeof LEVELS)[number]
  duration: string
  lifestyle: (typeof LIFESTYLES)[number]["id"]
  scholarship: string; budget: string
  citizenship: string; field: string; notes: string
  lang: (typeof LANGS)[number]
}

export function CostTool({ initial }: { initial?: CostDefaults } = {}) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState("")
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState<CostDefaults>(initial ?? {
    country: "", city: "", university: "",
    level: "Bachelor",
    duration: "4",
    lifestyle: "standard",
    scholarship: "", budget: "",
    citizenship: "Узбекистан", field: "", notes: "",
    lang: "Русский",
  })

  const update = (k: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function calculate() {
    if (!form.country) return toast.error("Укажи целевую страну")
    setLoading(true)
    setResult("")

    const lifestyleLabel = LIFESTYLES.find((l) => l.id === form.lifestyle)?.label

    const userPrompt = `РАСЧЁТ СТОИМОСТИ ОБУЧЕНИЯ ЗА РУБЕЖОМ:

Страна: ${form.country}
Город: ${form.city || "(средние данные по стране)"}
Целевой университет: ${form.university || "(general estimate by country)"}
Уровень: ${form.level}
Длительность программы: ${form.duration} лет
Образ жизни: ${lifestyleLabel}
Специальность / поле: ${form.field || "—"}

Имеющаяся стипендия: ${form.scholarship ? `$${form.scholarship}/год` : "пока нет"}
Доступный годовой бюджет студента: ${form.budget ? `$${form.budget}/год` : "не указан"}
Гражданство: ${form.citizenship}

Дополнительно: ${form.notes || "—"}

Язык ответа: ${form.lang}

ИНСТРУКЦИИ:
1. Используй real ranges 2025/2026 для этой страны/города/университета
2. Для каждой суммы укажи диапазон ±20% если нет точных данных
3. Указывай суммы в local currency + USD equivalent
4. В разделе Financial Aid дай минимум 5 конкретных программ для гражданина ${form.citizenship}, специализация ${form.field || "general"}, уровень ${form.level}
5. В Hidden Costs упомяни специфичные для страны затраты (visa fees, blocked account для Германии и т.п.)
6. В разделе "Реалистичность" — конкретный анализ может ли студент потянуть с его бюджетом ${form.budget || "(не указан)"} и стипендией ${form.scholarship || "(пока нет)"}, и что делать если gap большой`

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "cost", user: userPrompt, max_tokens: 7000 }),
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

  function downloadFile(ext: "md" | "txt") {
    if (!result) return
    const mime = ext === "md" ? "text/markdown" : "text/plain"
    const blob = new Blob([result], { type: `${mime};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Cost_${form.country.replace(/\s+/g, "_")}_${form.level}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container max-w-4xl mx-auto px-6 py-8 space-y-6">
        <Section icon={<Wallet className="h-4 w-4 text-gold" />} title="Куда поступаешь">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Страна" value={form.country} onChange={update("country")} placeholder="Germany · USA · UK · Singapore" required />
            <Field label="Город (опционально)" value={form.city} onChange={update("city")} placeholder="Munich · Boston · London" />
            <Field label="Университет (опционально)" value={form.university} onChange={update("university")} placeholder="TU Munich · MIT · LSE" />
            <SelectField label="Уровень" value={form.level} onChange={update("level")} options={LEVELS} />
            <Field label="Длительность (лет)" value={form.duration} onChange={update("duration")} placeholder="4" />
            <Field label="Специальность" value={form.field} onChange={update("field")} placeholder="Computer Science · Business · Medicine" />
          </div>
        </Section>

        <Section icon={<Sparkles className="h-4 w-4 text-gold" />} title="Образ жизни и финансы">
          <div className="space-y-4">
            <SelectField label="Образ жизни" value={form.lifestyle} onChange={update("lifestyle")} options={LIFESTYLES.map((l) => l.id)} optionLabels={LIFESTYLES.map((l) => l.label)} />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Стипендия $/год (если есть)" value={form.scholarship} onChange={update("scholarship")} placeholder="15000" />
              <Field label="Доступный бюджет $/год" value={form.budget} onChange={update("budget")} placeholder="20000" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Гражданство" value={form.citizenship} onChange={update("citizenship")} placeholder="Узбекистан" />
              <SelectField label="Язык ответа" value={form.lang} onChange={update("lang")} options={LANGS} />
            </div>
          </div>
        </Section>

        <Section icon={<Sparkles className="h-4 w-4 text-gold" />} title="Дополнительная информация">
          <FieldArea
            label="Особенности (опционально)"
            value={form.notes}
            onChange={update("notes")}
            placeholder={`women in STEM, low income family, готов работать part-time, нужны medical accommodation, ребёнок с собой, etc`}
            rows={3}
            hint="Это поможет AI подобрать relevant scholarships и cost-saving стратегии"
          />
        </Section>

        <Button onClick={calculate} disabled={loading} className="w-full h-12 bg-gold text-background hover:bg-gold-soft font-cinzel">
          {loading
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> AI рассчитывает...</>
            : <><Sparkles className="h-4 w-4 mr-2" /> Рассчитать стоимость + найти стипендии</>}
        </Button>

        {result && (
          <div className="rounded-xl border border-border bg-card/40 p-7 accent-strip">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <span className="font-mono-label text-gold">💰 ФИНАНСОВЫЙ ПЛАН ГОТОВ</span>
              <div className="flex gap-2">
                <Button onClick={copyResult} variant="ghost" size="sm" className="gap-2">
                  {copied ? <><Check className="h-3.5 w-3.5" /> Скопировано</> : <><Copy className="h-3.5 w-3.5" /> Копировать</>}
                </Button>
                <Button onClick={() => downloadFile("md")} variant="ghost" size="sm" className="gap-2">
                  <Download className="h-3.5 w-3.5" /> .md
                </Button>
                <Button onClick={() => downloadFile("txt")} variant="ghost" size="sm" className="gap-2">
                  <Download className="h-3.5 w-3.5" /> .txt
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

function Field({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono-label text-cream-3">
        {label}{required && <span className="text-gold ml-1">*</span>}
      </Label>
      <Input value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  )
}

function FieldArea({ label, value, onChange, placeholder, rows = 3, hint }: {
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
