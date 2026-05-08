"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Markdown } from "@/components/markdown"
import { Award, Loader2, Sparkles, Copy, Check } from "lucide-react"

type ScholarshipDefaults = {
  citizenship: string; gpa: string; eng: string
  major: string; prog: string
  countries: string; needFull: string; extra: string
}

export function ScholarshipTool({ initial }: { initial?: ScholarshipDefaults } = {}) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState("")
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState<ScholarshipDefaults>(initial ?? {
    citizenship: "Узбекистан", gpa: "", eng: "",
    major: "", prog: "Bachelor",
    countries: "", needFull: "yes",
    extra: "",
  })

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function match() {
    if (!form.major) return toast.error("Укажи специальность")
    setLoading(true)
    setResult("")

    const userPrompt = `ПРОФИЛЬ ДЛЯ ПОДБОРА СТИПЕНДИЙ:
Гражданство: ${form.citizenship}
GPA: ${form.gpa || "не указан"}
Английский: ${form.eng || "не указан"}
Специальность: ${form.major}
Программа: ${form.prog}
Целевые страны: ${form.countries || "любые"}
Нужно ли full funding: ${form.needFull === "yes" ? "да, обязательно" : "не критично"}
Дополнительно: ${form.extra || "—"}

Подбери из базы стипендий релевантные программы под этот профиль. Дай минимум 5 рекомендаций с матчингом, требованиями и стратегией подачи.`

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "scholarship", user: userPrompt, max_tokens: 8000 }),
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
        <div className="rounded-xl border border-border bg-card/40 p-6 accent-strip space-y-5">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-gold" />
            <span className="font-mono-label text-cream-3">Профиль для матчинга</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Гражданство" value={form.citizenship} onChange={update("citizenship")} />
            <Field label="GPA" value={form.gpa} onChange={update("gpa")} placeholder="4.5" />
            <Field label="Английский" value={form.eng} onChange={update("eng")} placeholder="IELTS 7.5" />
            <Field label="Специальность" value={form.major} onChange={update("major")} placeholder="Computer Science" />
            <SelectField label="Программа" value={form.prog} onChange={update("prog")} options={["Bachelor","Master","PhD","MBA","Any"]} />
            <Field label="Целевые страны" value={form.countries} onChange={update("countries")} placeholder="UK, Germany, USA" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <SelectField label="Нужно ли full funding" value={form.needFull} onChange={update("needFull")} options={["yes","no"]} />
            <div />
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono-label text-cream-3">Дополнительно (опыт, награды, особенности)</Label>
            <Textarea value={form.extra} onChange={update("extra")} rows={3} placeholder="Олимпиады, women in STEM, low income, public service..." className="font-serif" />
          </div>
        </div>

        <Button onClick={match} disabled={loading} className="w-full mt-6 h-12 bg-gold text-background hover:bg-gold-soft font-cinzel">
          {loading
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> AI подбирает стипендии из базы...</>
            : <><Sparkles className="h-4 w-4 mr-2" /> Найти стипендии</>}
        </Button>

        {result && (
          <div className="mt-10 rounded-xl border border-border bg-card/40 p-7 accent-strip">
            <div className="flex items-center justify-between mb-5">
              <span className="font-mono-label text-gold">💰 ПОДБОРКА СТИПЕНДИЙ</span>
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
