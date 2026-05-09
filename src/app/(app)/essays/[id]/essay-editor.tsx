"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sparkles, Loader2, Cloud, Clock, RotateCcw, History,
  CheckCircle2, AlertTriangle, Lightbulb, Trophy,
} from "lucide-react"
import { VoiceInputButton } from "@/components/voice-input-button"
import { AiLoadingSkeleton, AiErrorCard } from "@/components/ai-state"
import {
  ESSAY_STATUSES, STATUS_LABELS, STATUS_COLORS, wordCount,
  type Essay, type EssayRevision, type EssayStatus, type EssayAiReview,
} from "@/lib/essays/types"
import { saveEssayDraft, updateEssayMeta, restoreRevision } from "@/lib/essays/actions"
import { type Application } from "@/lib/applications/types"
import { cn } from "@/lib/utils"

type AutosaveState = "idle" | "saving" | "saved" | "error"

export function EssayEditor({
  initial,
  initialRevisions,
  apps,
}: {
  initial: Essay
  initialRevisions: EssayRevision[]
  apps: Application[]
}) {
  const router = useRouter()
  const [essay, setEssay] = useState(initial)
  const [draft, setDraft] = useState(initial.draft_text)
  const [revisions, setRevisions] = useState(initialRevisions)
  const [autosave, setAutosave] = useState<AutosaveState>("idle")
  const [reviewing, setReviewing] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [showRevisions, setShowRevisions] = useState(false)
  const [, startTransition] = useTransition()

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstRenderRef = useRef(true)

  // Autosave draft on every change with 1.5s debounce
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setAutosave("saving")
      const r = await saveEssayDraft(essay.id, draft)
      if (!r.ok) {
        setAutosave("error")
        return
      }
      setAutosave("saved")
      // If a new revision was minted, refresh the local list (cheap reload)
      if (r.revisioned) router.refresh()
      setTimeout(() => setAutosave((s) => (s === "saved" ? "idle" : s)), 2000)
    }, 1500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [draft, essay.id, router])

  // Pull updated revisions from server props
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRevisions(initialRevisions)
  }, [initialRevisions])

  function updateMeta(patch: Partial<Pick<Essay, "title" | "prompt" | "word_limit" | "status" | "application_id">>) {
    setEssay((e) => ({ ...e, ...patch }))
    startTransition(async () => {
      const r = await updateEssayMeta(essay.id, patch)
      if (!r.ok) toast.error(r.error ?? "Не удалось сохранить")
    })
  }

  async function runReview() {
    if (!draft.trim()) {
      toast.error("Сначала напиши хотя бы абзац")
      return
    }
    setReviewing(true)
    setReviewError(null)
    try {
      // Make sure latest text is saved before AI sees it
      await saveEssayDraft(essay.id, draft)
      const res = await fetch(`/api/essays/${essay.id}/review`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        setReviewError(json.message ?? json.error ?? "AI не ответил — попробуй ещё раз")
        return
      }
      setEssay((e) => ({ ...e, ai_review: json.review, ai_review_at: json.generated_at }))
      toast.success(`AI score: ${json.review.score}/10`)
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Сетевая ошибка")
    } finally {
      setReviewing(false)
    }
  }

  async function restore(revId: string) {
    if (!confirm("Заменить текущий draft на этот revision? Текущий пойдёт в новый revision.")) return
    startTransition(async () => {
      // Snapshot current first if there's content worth keeping
      if (draft.trim()) await saveEssayDraft(essay.id, draft)
      const r = await restoreRevision(essay.id, revId)
      if (!r.ok) {
        toast.error(r.error ?? "Не удалось восстановить")
        return
      }
      router.refresh()
      window.location.reload()
    })
  }

  const wc = wordCount(draft)
  const limit = essay.word_limit
  const over = limit && wc > limit
  const review = essay.ai_review as EssayAiReview | null

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Meta bar */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="font-mono-label text-[10px] text-cream-3">Название</Label>
            <Input
              value={essay.title}
              onChange={(e) => setEssay((es) => ({ ...es, title: e.target.value }))}
              onBlur={(e) => updateMeta({ title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-mono-label text-[10px] text-cream-3">Лимит слов</Label>
            <Input
              type="number"
              value={essay.word_limit ?? ""}
              onChange={(e) => setEssay((es) => ({ ...es, word_limit: e.target.value ? Number(e.target.value) : null }))}
              onBlur={(e) => updateMeta({ word_limit: e.target.value ? Number(e.target.value) : null })}
              placeholder="650"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-mono-label text-[10px] text-cream-3">Статус</Label>
            <select
              value={essay.status}
              onChange={(e) => updateMeta({ status: e.target.value as EssayStatus })}
              className={cn(
                "w-full h-9 rounded-md border bg-card px-3 text-sm focus:outline-none transition-colors",
                STATUS_COLORS[essay.status]
              )}
            >
              {ESSAY_STATUSES.map((s) => (
                <option key={s} value={s} className="bg-background text-foreground">
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="font-mono-label text-[10px] text-cream-3">Заявка</Label>
            <select
              value={essay.application_id ?? ""}
              onChange={(e) => updateMeta({ application_id: e.target.value || null })}
              className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:border-gold/60"
            >
              <option value="" className="bg-background">— нет —</option>
              {apps.map((a) => (
                <option key={a.id} value={a.id} className="bg-background">
                  {a.university_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Prompt */}
        <div className="space-y-1.5">
          <Label className="font-mono-label text-[10px] text-cream-3">Prompt</Label>
          <Textarea
            value={essay.prompt ?? ""}
            onChange={(e) => setEssay((es) => ({ ...es, prompt: e.target.value }))}
            onBlur={(e) => updateMeta({ prompt: e.target.value })}
            rows={2}
            className="font-serif"
            placeholder="Tell us about a time you faced a challenge..."
          />
        </div>

        {/* Draft + side panel */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Label className="font-mono-label text-[10px] text-cream-3">DRAFT</Label>
              <div className="flex items-center gap-3">
                <VoiceInputButton
                  size="sm"
                  hint={essay.prompt ?? essay.title}
                  onTranscript={(text) =>
                    setDraft((d) => (d.trim() ? `${d.trim()}\n\n${text}` : text))
                  }
                />
                <span className={cn(
                  "text-xs font-mono-label tabular-nums",
                  over ? "text-rose-400" : "text-cream-3"
                )}>
                  {wc}{limit ? `/${limit}` : ""} слов
                </span>
                <AutosaveBadge state={autosave} />
              </div>
            </div>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={20}
              className="font-serif text-base leading-relaxed resize-y min-h-[400px]"
              placeholder="Start writing — autosave includes a revision every 2 minutes..."
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={runReview} disabled={reviewing || !draft.trim()} className="gap-2">
                {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-gold" />}
                {reviewing ? "AI ревьюит..." : review ? "Прогнать AI ещё раз" : "Получить AI review"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRevisions(!showRevisions)}
                className="gap-2"
              >
                <History className="h-4 w-4" />
                Revisions ({revisions.length})
              </Button>
            </div>

            {/* Revisions panel */}
            {showRevisions && (
              <div className="rounded-xl border border-border bg-card/40 p-4 space-y-2">
                <p className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wide">
                  История · клик чтобы восстановить
                </p>
                {revisions.length === 0 ? (
                  <p className="text-xs font-serif text-cream-3">
                    Revision создаётся когда draft меняется и прошло ≥2 минут с последнего snapshot&apos;a.
                  </p>
                ) : (
                  <ul className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                    {revisions.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-start gap-3 rounded-md border border-border bg-card/40 p-2.5 hover:bg-card transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono-label text-cream-2">
                            {new Date(r.created_at).toLocaleString("ru-RU", {
                              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
                            <span className="text-cream-3"> · {r.word_count} слов</span>
                          </p>
                          <p className="text-xs font-serif text-cream-3 line-clamp-1 mt-0.5">
                            {r.content.slice(0, 140)}...
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => restore(r.id)} className="gap-1.5 shrink-0">
                          <RotateCcw className="h-3 w-3" />
                          Восстановить
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* AI review panel — 4 states: skeleton (running) / error (retry) / data / empty */}
          <aside className="space-y-3">
            {reviewing && !review ? (
              <AiLoadingSkeleton />
            ) : reviewError && !review ? (
              <AiErrorCard message={reviewError} onRetry={runReview} retrying={reviewing} />
            ) : review ? (
              <ReviewPanel review={review} reviewedAt={essay.ai_review_at} />
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card/20 p-5 text-center space-y-2">
                <Sparkles className="h-6 w-6 text-cream-3 mx-auto" />
                <p className="font-display text-sm">AI review будет здесь</p>
                <p className="font-serif text-xs text-cream-3">
                  Score / strengths / weaknesses / next actions / cliché detection / best line.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

function ReviewPanel({ review, reviewedAt }: { review: EssayAiReview; reviewedAt: string | null }) {
  return (
    <div className="rounded-xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-gold/20 shrink-0">
          <Sparkles className="h-5 w-5 text-gold" />
        </div>
        <div>
          <p className="font-mono-label text-[10px] text-gold uppercase tracking-wider">AI score</p>
          <p className="font-display text-2xl text-gold">{review.score}<span className="text-base text-cream-3">/10</span></p>
        </div>
      </div>

      <p className="font-serif text-sm text-cream-2 italic border-l-2 border-gold/40 pl-3">
        {review.summary}
      </p>

      <Section icon={CheckCircle2} title="Сильные" color="emerald" items={review.strengths} />
      <Section icon={AlertTriangle} title="Слабые" color="rose" items={review.weaknesses} />
      <Section icon={Lightbulb} title="Следующие правки" color="gold" items={review.next_actions} />

      {review.cliches?.length > 0 && (
        <div className="rounded-md bg-rose-500/5 border border-rose-500/20 p-2.5 space-y-1">
          <p className="font-mono-label text-[10px] text-rose-300 uppercase">Клише в тексте</p>
          <ul className="text-xs font-serif text-cream-2 space-y-0.5">
            {review.cliches.map((c, i) => (
              <li key={i} className="line-through opacity-80">{c}</li>
            ))}
          </ul>
        </div>
      )}

      {review.highlight && (
        <div className="rounded-md bg-gold/5 border border-gold/20 p-2.5 space-y-1">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3 w-3 text-gold" />
            <p className="font-mono-label text-[10px] text-gold uppercase">Лучшая строка</p>
          </div>
          <p className="text-xs font-serif text-cream italic">&ldquo;{review.highlight}&rdquo;</p>
        </div>
      )}

      {reviewedAt && (
        <p className="text-[10px] font-mono-label text-cream-3 flex items-center gap-1.5">
          <Clock className="h-2.5 w-2.5" />
          {new Date(reviewedAt).toLocaleString("ru-RU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  color,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  color: "emerald" | "rose" | "gold"
  items: string[]
}) {
  const cls = {
    emerald: "text-emerald-300 border-emerald-500/20 bg-emerald-500/5",
    rose: "text-rose-300 border-rose-500/20 bg-rose-500/5",
    gold: "text-gold border-gold/20 bg-gold/5",
  }[color]
  return (
    <div className={cn("rounded-md border p-2.5 space-y-1", cls)}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3" />
        <p className="font-mono-label text-[10px] uppercase">{title}</p>
      </div>
      <ul className="text-xs font-serif text-cream-2 space-y-0.5">
        {items.map((s, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-cream-3 shrink-0">→</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AutosaveBadge({ state }: { state: AutosaveState }) {
  if (state === "idle") return null
  const cls = state === "saving"
    ? "text-cream-3"
    : state === "saved"
      ? "text-emerald-400"
      : "text-rose-400"
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-mono-label", cls)}>
      {state === "saving" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
      {state !== "saving" && <Cloud className="h-2.5 w-2.5" />}
      {state === "saving" ? "Сохраняю..." : state === "saved" ? "Сохранено" : "Ошибка"}
    </span>
  )
}
