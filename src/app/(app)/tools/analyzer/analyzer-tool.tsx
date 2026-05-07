"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Markdown } from "@/components/markdown"
import { Sparkles, Loader2, Copy, Check } from "lucide-react"

export function AnalyzerTool() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState("")
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({
    gpa: "", eng: "", sat: "", apTests: "",
    major: "", prog: "Bachelor",
    unis: "", profile: "",
  })

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function analyze() {
    if (!form.unis || !form.major) return toast.error("Укажи целевые вузы и специальность")
    setLoading(true)
    setResult("")
    const userPrompt = `АКАДЕМИЧЕСКИЙ ПРОФИЛЬ:
GPA: ${form.gpa || "—"}
Английский: ${form.eng || "—"}
SAT/ACT: ${form.sat || "—"}
AP-тесты: ${form.apTests || "—"}
Специальность: ${form.major} (${form.prog})

ДОПОЛНИТЕЛЬНЫЙ ПРОФИЛЬ:
${form.profile || "(не указано — оцени только по академике)"}

ЦЕЛЕВЫЕ УНИВЕРСИТЕТЫ:
${form.unis}

Дай детальный анализ шансов по каждому вузу из списка с категориями safety/match/reach. Заверши итоговой стратегической рекомендацией.`
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "analyzer", user: userPrompt, max_tokens: 8000 }),
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
            <Sparkles className="h-4 w-4 text-gold" />
            <span className="font-mono-label text-cream-3">Профиль для анализа</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="GPA" value={form.gpa} onChange={update("gpa")} placeholder="4.5 / A-" />
            <Field label="Английский" value={form.eng} onChange={update("eng")} placeholder="IELTS 7.5" />
            <Field label="SAT / ACT" value={form.sat} onChange={update("sat")} placeholder="1450 / 33" />
            <Field label="AP-тесты" value={form.apTests} onChange={update("apTests")} placeholder="Calc BC: 5, CS: 5" />
            <Field label="Специальность" value={form.major} onChange={update("major")} placeholder="Computer Science" />
            <SelectField label="Программа" value={form.prog} onChange={update("prog")} options={["Bachelor","Master","PhD","MBA"]} />
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono-label text-cream-3">Целевые университеты (список через запятую)</Label>
            <Textarea value={form.unis} onChange={update("unis")} rows={2} placeholder="MIT, Stanford, ETH Zurich, TU Munich, NUS, Cambridge" className="font-serif" />
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono-label text-cream-3">Дополнительный профиль (активность, награды, опыт)</Label>
            <Textarea value={form.profile} onChange={update("profile")} rows={4} placeholder="Олимпиады, проекты, публикации, лидерство, опыт работы..." className="font-serif" />
          </div>
        </div>

        <Button onClick={analyze} disabled={loading} className="w-full mt-6 h-12 bg-gold text-background hover:bg-gold-soft font-cinzel">
          {loading
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> AI анализирует шансы...</>
            : <><Sparkles className="h-4 w-4 mr-2" /> Анализировать шансы</>}
        </Button>

        {result && (
          <div className="mt-10 rounded-xl border border-border bg-card/40 p-7 accent-strip">
            <div className="flex items-center justify-between mb-5">
              <span className="font-mono-label text-gold">🎯 АНАЛИЗ ШАНСОВ</span>
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
