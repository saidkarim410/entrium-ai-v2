"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Markdown } from "@/components/markdown"
import { Brain, Loader2, Sparkles, Copy, Check } from "lucide-react"

type ProfileFormDefaults = {
  name: string; age: string; level: string; year: string
  gpa: string; eng: string; sat: string; apTests: string
  major: string; prog: string; region: string
  unis: string; budget: string; citizenship: string
  extra: string; awards: string; weak: string; goals: string
}

export function ProfileTool({ initial }: { initial?: ProfileFormDefaults } = {}) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState("")
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState<ProfileFormDefaults>(initial ?? {
    name: "", age: "", level: "11 класс", year: "2027",
    gpa: "", eng: "", sat: "", apTests: "",
    major: "", prog: "Bachelor", region: "USA",
    unis: "", budget: "", citizenship: "Узбекистан",
    extra: "", awards: "", weak: "", goals: "",
  })

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function diagnose() {
    if (!form.name || !form.major || !form.unis) {
      return toast.error("Заполни имя, специальность и целевые университеты")
    }
    setLoading(true)
    setResult("")

    const userPrompt = `Студент: ${form.name}, ${form.age || "?"} лет
Гражданство: ${form.citizenship}
Уровень: ${form.level}, поступление в ${form.year}
GPA: ${form.gpa || "—"}
Английский: ${form.eng || "—"}
SAT/ACT: ${form.sat || "—"}
AP-тесты: ${form.apTests || "нет"}
Специальность: ${form.major} (${form.prog})
Регион: ${form.region}
Целевые вузы: ${form.unis}
Бюджет на обучение в год: ${form.budget || "не указан"}
Внеклассная активность: ${form.extra || "—"}
Достижения / награды: ${form.awards || "—"}
Слабые места (своё мнение): ${form.weak || "—"}
Цели: ${form.goals || "—"}

Сделай ПОЛНУЮ диагностику профиля. Будь честным, но конструктивным. Покажи реалистичные шансы по целевым вузам и конкретный план улучшения на 3-6 месяцев.`

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "profile", user: userPrompt, max_tokens: 8000 }),
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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container max-w-4xl mx-auto px-6 py-8">
        <div className="rounded-xl border border-border bg-card/40 p-6 accent-strip">
          <div className="flex items-center gap-2 mb-5">
            <Brain className="h-4 w-4 text-gold" />
            <span className="font-mono-label text-cream-3">Профиль для диагностики</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Имя" value={form.name} onChange={update("name")} placeholder="Саидкарим" />
            <Field label="Возраст" value={form.age} onChange={update("age")} placeholder="17" />
            <Field label="Гражданство" value={form.citizenship} onChange={update("citizenship")} placeholder="Узбекистан" />
            <SelectField label="Уровень" value={form.level} onChange={update("level")} options={["9 класс","10 класс","11 класс","Выпускник школы","Бакалавр","Магистр"]} />
            <Field label="Год поступления" value={form.year} onChange={update("year")} placeholder="2027" />
            <Field label="GPA / средний балл" value={form.gpa} onChange={update("gpa")} placeholder="4.5 / A-" />
            <Field label="Английский (тест)" value={form.eng} onChange={update("eng")} placeholder="IELTS 7.5 / TOEFL 105" />
            <Field label="SAT / ACT" value={form.sat} onChange={update("sat")} placeholder="1450 / 33" />
            <Field label="AP-тесты" value={form.apTests} onChange={update("apTests")} placeholder="Calculus BC: 5, CS A: 5" />
            <Field label="Специальность" value={form.major} onChange={update("major")} placeholder="Computer Science" />
            <SelectField label="Программа" value={form.prog} onChange={update("prog")} options={["Bachelor", "Master", "PhD", "MBA"]} />
            <SelectField label="Целевой регион" value={form.region} onChange={update("region")} options={["USA","UK","EU","Asia","Mixed"]} />
            <Field label="Целевые вузы" value={form.unis} onChange={update("unis")} placeholder="MIT, Stanford, ETH Zurich" />
            <Field label="Бюджет $/год" value={form.budget} onChange={update("budget")} placeholder="20000" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-1.5">
              <Label className="font-mono-label text-cream-3">Внеклассная активность</Label>
              <Textarea value={form.extra} onChange={update("extra")} rows={3} placeholder="Олимпиады, проекты, лидерство, волонтёрство..." className="font-serif" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-mono-label text-cream-3">Достижения / награды</Label>
              <Textarea value={form.awards} onChange={update("awards")} rows={3} placeholder="Призовые места олимпиад, публикации, стипендии..." className="font-serif" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-mono-label text-cream-3">Слабые места</Label>
              <Textarea value={form.weak} onChange={update("weak")} rows={3} placeholder="Что переживаешь — низкий SAT, нет рекомендаций, мало активности..." className="font-serif" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-mono-label text-cream-3">Цели и мотивация</Label>
              <Textarea value={form.goals} onChange={update("goals")} rows={3} placeholder="Чего хочешь добиться, почему именно этот путь..." className="font-serif" />
            </div>
          </div>
        </div>

        <Button onClick={diagnose} disabled={loading} className="w-full mt-6 h-12 bg-gold text-background hover:bg-gold-soft font-cinzel">
          {loading
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> AI анализирует профиль...</>
            : <><Sparkles className="h-4 w-4 mr-2" /> Получить диагностику</>}
        </Button>

        {result && (
          <div className="mt-10 rounded-xl border border-border bg-card/40 p-7 accent-strip">
            <div className="flex items-center justify-between mb-5">
              <span className="font-mono-label text-gold">📊 ДИАГНОСТИКА ПРОФИЛЯ</span>
              <Button onClick={copyResult} variant="ghost" size="sm" className="gap-2">
                {copied ? <><Check className="h-3.5 w-3.5" /> Скопировано</> : <><Copy className="h-3.5 w-3.5" /> Копировать</>}
              </Button>
            </div>
            <Markdown>{result}</Markdown>
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
