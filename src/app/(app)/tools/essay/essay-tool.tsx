"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Markdown } from "@/components/markdown"
import { Sparkles, Loader2, Wand2, Microscope, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type Mode = "coach" | "analyze" | "humanize"

const FOCUS_TAGS = [
  "academic strength", "leadership", "personal narrative", "uniqueness",
  "specificity", "structure", "voice", "ending",
]

const TONES = [
  { id: "ivy", label: "Ivy League" },
  { id: "warm", label: "Тёплый и личный" },
  { id: "confident", label: "Уверенный" },
  { id: "creative", label: "Креативный" },
]

export function EssayTool() {
  const [mode, setMode] = useState<Mode>("coach")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>("")
  const [copied, setCopied] = useState(false)

  // Coach inputs
  const [draft, setDraft] = useState("")
  const [major, setMajor] = useState("")
  const [uni, setUni] = useState("")
  const [focusTags, setFocusTags] = useState<Set<string>>(new Set())

  // Analyze inputs
  const [analyzeText, setAnalyzeText] = useState("")
  const [target, setTarget] = useState("")
  const [essayType, setEssayType] = useState("Common App Personal Statement")

  // Humanize inputs
  const [humanizeText, setHumanizeText] = useState("")
  const [tone, setTone] = useState("ivy")

  function toggleTag(tag: string) {
    setFocusTags((s) => {
      const next = new Set(s)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  async function run() {
    setResult("")
    let user = ""
    let tool = "essay"

    if (mode === "coach") {
      if (!draft.trim()) return toast.error("Добавь черновик эссе или хотя бы идею")
      const focus = [...focusTags].join(", ") || "general improvement"
      user = `Специальность: ${major || "не указана"}\nЦелевой университет: ${uni || "топовый университет"}\nФокус улучшения: ${focus}\n\nЧЕРНОВИК ЭССЕ:\n${draft}\n\nСделай полный разбор и напиши переработанную версию на английском в стиле Ivy League.`
      tool = "essay"
    } else if (mode === "analyze") {
      if (!analyzeText.trim()) return toast.error("Вставь текст эссе")
      user = `Тип эссе: ${essayType}\nЦелевой университет: ${target || "Ivy League"}\n\nЭССЕ:\n${analyzeText}`
      tool = "essay"
    } else {
      if (!humanizeText.trim()) return toast.error("Вставь текст для гуманизации")
      const toneDesc = TONES.find((t) => t.id === tone)?.label ?? "Ivy League"
      user = `Humanize this essay. Target tone: ${toneDesc}.\n\nORIGINAL TEXT:\n${humanizeText}`
      tool = "humanizer"
    }

    setLoading(true)
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, user, max_tokens: 8000 }),
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
        {/* Mode tabs */}
        <div className="grid grid-cols-3 gap-2 mb-8 p-1 rounded-lg border border-border bg-card/30">
          {[
            { id: "coach", label: "Coach", icon: Sparkles, hint: "Полный разбор + переработка" },
            { id: "analyze", label: "Analyze", icon: Microscope, hint: "Профессиональный аудит" },
            { id: "humanize", label: "Humanize", icon: Wand2, hint: "Убрать AI-почерк" },
          ].map(({ id, label, icon: Icon, hint }) => (
            <button
              key={id}
              onClick={() => setMode(id as Mode)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-3 rounded-md transition-all text-center",
                mode === id ? "bg-gold text-background" : "hover:bg-card text-cream-2"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" />
                <span className="font-cinzel text-[11px]">{label}</span>
              </div>
              <span className={cn("text-[10px]", mode === id ? "text-background/70" : "text-cream-3")}>
                {hint}
              </span>
            </button>
          ))}
        </div>

        {/* COACH FORM */}
        {mode === "coach" && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-mono-label text-cream-3">Специальность</Label>
                <Input value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Computer Science" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono-label text-cream-3">Целевой университет</Label>
                <Input value={uni} onChange={(e) => setUni(e.target.value)} placeholder="MIT" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-mono-label text-cream-3">Фокус улучшения</Label>
              <div className="flex flex-wrap gap-2">
                {FOCUS_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "px-3 py-1.5 rounded-full border text-xs font-mono transition-all",
                      focusTags.has(tag)
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-border text-cream-3 hover:text-cream"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-mono-label text-cream-3">Черновик эссе</Label>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Вставь свой черновик или опиши идею..."
                rows={10}
                className="font-serif"
              />
            </div>
          </div>
        )}

        {/* ANALYZE FORM */}
        {mode === "analyze" && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-mono-label text-cream-3">Целевой университет</Label>
                <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Harvard" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono-label text-cream-3">Тип эссе</Label>
                <select
                  value={essayType}
                  onChange={(e) => setEssayType(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-cream"
                >
                  <option>Common App Personal Statement</option>
                  <option>Why This College</option>
                  <option>Why This Major</option>
                  <option>Supplemental Essay</option>
                  <option>UCAS Personal Statement</option>
                  <option>Diversity / Background</option>
                  <option>Challenge / Failure</option>
                  <option>Activity</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="font-mono-label text-cream-3">Текст эссе</Label>
              <Textarea
                value={analyzeText}
                onChange={(e) => setAnalyzeText(e.target.value)}
                placeholder="Вставь полный текст эссе..."
                rows={12}
                className="font-serif"
              />
            </div>
          </div>
        )}

        {/* HUMANIZE FORM */}
        {mode === "humanize" && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="font-mono-label text-cream-3">Целевой тон</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    className={cn(
                      "px-3 py-2 rounded-md border text-xs transition-all",
                      tone === t.id
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-border text-cream-3 hover:text-cream"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="font-mono-label text-cream-3">AI-текст для humanize</Label>
              <Textarea
                value={humanizeText}
                onChange={(e) => setHumanizeText(e.target.value)}
                placeholder="Вставь сгенерированный AI текст..."
                rows={12}
                className="font-serif"
              />
            </div>
          </div>
        )}

        <Button
          onClick={run}
          disabled={loading}
          className="w-full mt-6 h-12 bg-gold text-background hover:bg-gold-soft font-cinzel"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> AI обрабатывает...</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" /> Запустить</>
          )}
        </Button>

        {/* RESULT */}
        {result && (
          <div className="mt-10 rounded-xl border border-border bg-card/40 p-7 accent-strip">
            <div className="flex items-center justify-between mb-5">
              <span className="font-mono-label text-gold">
                {mode === "coach" ? "✦ РЕЗУЛЬТАТ ТРЕНЕРА" : mode === "analyze" ? "🔬 АНАЛИЗ ЭССЕ" : "🧠 HUMANIZED ВЕРСИЯ"}
              </span>
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
