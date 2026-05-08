"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Markdown } from "@/components/markdown"
import { GraduationCap, Loader2, Sparkles, Copy, Check } from "lucide-react"

type UniversityDefaults = {
  gpa: string; eng: string; sat: string
  major: string; prog: string
  countries: string; budget: string; preferences: string
}

export function UniversityTool({ initial }: { initial?: UniversityDefaults } = {}) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState("")
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState<UniversityDefaults>(initial ?? {
    gpa: "", eng: "", sat: "",
    major: "", prog: "Bachelor",
    countries: "", budget: "",
    preferences: "",
  })

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function recommend() {
    if (!form.major) return toast.error("Укажи специальность")
    setLoading(true)
    setResult("")

    const userPrompt = `ПРОФИЛЬ ДЛЯ ПОДБОРА УНИВЕРСИТЕТОВ:
GPA: ${form.gpa || "не указан"}
Английский: ${form.eng || "не указан"}
SAT/ACT: ${form.sat || "не указан"}
Специальность: ${form.major}
Программа: ${form.prog}
Целевые страны/регионы: ${form.countries || "любые"}
Бюджет $/год: ${form.budget || "не указан"}
Предпочтения: ${form.preferences || "—"}

Дай рекомендации в трёх категориях: Safety / Target / Reach. По каждому универу: QS rank, локация, программа, стоимость, дедлайн, почему подходит.`

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "university", user: userPrompt, max_tokens: 8000 }),
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
            <GraduationCap className="h-4 w-4 text-gold" />
            <span className="font-mono-label text-cream-3">Профиль для подбора</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="GPA" value={form.gpa} onChange={update("gpa")} placeholder="4.5" />
            <Field label="Английский" value={form.eng} onChange={update("eng")} placeholder="IELTS 7.5" />
            <Field label="SAT / ACT" value={form.sat} onChange={update("sat")} placeholder="1450 / 33" />
            <Field label="Специальность" value={form.major} onChange={update("major")} placeholder="Computer Science" />
            <SelectField label="Программа" value={form.prog} onChange={update("prog")} options={["Bachelor","Master","PhD","MBA"]} />
            <Field label="Бюджет $/год" value={form.budget} onChange={update("budget")} placeholder="20000" />
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono-label text-cream-3">Целевые страны / регионы</Label>
            <Input value={form.countries} onChange={update("countries")} placeholder="USA, UK, Germany, Singapore" />
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono-label text-cream-3">Предпочтения / контекст</Label>
            <Textarea value={form.preferences} onChange={update("preferences")} rows={3} placeholder="Город / климат / community / research focus / industry partnerships..." className="font-serif" />
          </div>
        </div>

        <Button onClick={recommend} disabled={loading} className="w-full mt-6 h-12 bg-gold text-background hover:bg-gold-soft font-cinzel">
          {loading
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> AI подбирает из базы 1504 универов...</>
            : <><Sparkles className="h-4 w-4 mr-2" /> Подобрать университеты</>}
        </Button>

        {result && (
          <div className="mt-10 rounded-xl border border-border bg-card/40 p-7 accent-strip">
            <div className="flex items-center justify-between mb-5">
              <span className="font-mono-label text-gold">🎓 ПОДБОРКА УНИВЕРСИТЕТОВ</span>
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
