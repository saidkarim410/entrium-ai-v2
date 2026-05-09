"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import { Plus, FileText, Loader2, Trash2, Sparkles } from "lucide-react"
import {
  STATUS_LABELS, STATUS_COLORS, wordCount, type Essay,
} from "@/lib/essays/types"
import { createEssay, deleteEssay } from "@/lib/essays/actions"
import { type Application } from "@/lib/applications/types"
import { cn } from "@/lib/utils"

export function EssaysClient({
  initial,
  apps,
}: {
  initial: Essay[]
  apps: Application[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [prompt, setPrompt] = useState("")
  const [wordLimit, setWordLimit] = useState("")
  const [appId, setAppId] = useState<string>("")
  const [pending, startTransition] = useTransition()

  // Deep-link from /applications: ?new=1&app=<id>&title=<uni> auto-opens
  // the create dialog with a pre-filled title and pre-selected application.
  useEffect(() => {
    if (searchParams.get("new") !== "1") return
    const appParam = searchParams.get("app") ?? ""
    const titleParam = searchParams.get("title") ?? ""
    if (titleParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(`${titleParam} · Common App essay`)
    }
    if (appParam) setAppId(appParam)
    setOpen(true)
    // Clean the URL so refresh doesn't re-open
    router.replace("/essays", { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function reset() {
    setTitle("")
    setPrompt("")
    setWordLimit("")
    setAppId("")
  }

  function create() {
    if (!title.trim()) {
      toast.error("Дай эссе название")
      return
    }
    startTransition(async () => {
      const r = await createEssay({
        title,
        prompt,
        word_limit: wordLimit ? Number(wordLimit) : undefined,
        application_id: appId || null,
      })
      if (!r.ok || !r.id) {
        toast.error(r.error ?? "Не удалось создать")
        return
      }
      setOpen(false)
      reset()
      router.push(`/essays/${r.id}`)
    })
  }

  function remove(id: string) {
    if (!confirm("Удалить эссе и все revisions?")) return
    startTransition(async () => {
      const r = await deleteEssay(id)
      if (!r.ok) {
        toast.error(r.error ?? "Не удалось удалить")
        return
      }
      router.refresh()
    })
  }

  const appNameById = new Map(apps.map((a) => [a.id, a.university_name]))

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">Все эссе</h2>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
            <DialogTrigger
              render={
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Новое эссе
                </Button>
              }
            />
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Новое эссе</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="font-mono-label text-[11px] text-cream-3">Название *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder='MIT Common App "Why Major"'
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono-label text-[11px] text-cream-3">Prompt</Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    placeholder='Describe the world you come from and how it has shaped you...'
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-mono-label text-[11px] text-cream-3">Лимит слов</Label>
                    <Input
                      type="number"
                      value={wordLimit}
                      onChange={(e) => setWordLimit(e.target.value)}
                      placeholder="650"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-mono-label text-[11px] text-cream-3">Связать с заявкой</Label>
                    <select
                      value={appId}
                      onChange={(e) => setAppId(e.target.value)}
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
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                  Отмена
                </Button>
                <Button onClick={create} disabled={pending}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Создать
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {initial.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-10 text-center space-y-3">
            <FileText className="h-10 w-10 text-cream-3 mx-auto" />
            <p className="font-display text-lg">Здесь будут твои эссе</p>
            <p className="font-serif text-sm text-cream-2 max-w-md mx-auto">
              Заведи отдельный эссе под каждую заявку — AI будет ревьюить с учётом
              prompt&apos;a и твоего профиля. Каждое сохранение — автоматическая
              revision (до 50 на эссе).
            </p>
            <Button onClick={() => setOpen(true)} className="gap-2 mt-2">
              <Plus className="h-4 w-4" />
              Создать первое
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {initial.map((e) => {
              const wc = wordCount(e.draft_text)
              const over = e.word_limit && wc > e.word_limit
              return (
                <li key={e.id} className="flex items-stretch gap-2">
                  <Link href={`/essays/${e.id}`} className="block flex-1 min-w-0">
                    <div className="rounded-xl border border-border bg-card/40 hover:bg-card hover:border-gold/40 p-4 transition-all space-y-2">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-display text-base truncate">{e.title}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge
                              variant="outline"
                              className={cn("text-[9px] py-0 px-1.5", STATUS_COLORS[e.status])}
                            >
                              {STATUS_LABELS[e.status]}
                            </Badge>
                            {e.application_id && appNameById.get(e.application_id) && (
                              <span className="text-[10px] font-mono-label text-cream-3">
                                · {appNameById.get(e.application_id)}
                              </span>
                            )}
                            {e.ai_review && typeof e.ai_review === "object" && (e.ai_review as { score?: number }).score !== undefined && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono-label text-gold">
                                <Sparkles className="h-2.5 w-2.5" />
                                AI {(e.ai_review as { score: number }).score}/10
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "text-xs font-mono-label tabular-nums shrink-0",
                            over ? "text-rose-400" : "text-cream-3"
                          )}
                        >
                          {wc}
                          {e.word_limit ? `/${e.word_limit}` : ""}
                        </span>
                      </div>
                      {e.prompt && (
                        <p className="text-xs font-serif text-cream-3 italic line-clamp-1">
                          {e.prompt}
                        </p>
                      )}
                    </div>
                  </Link>
                  <button
                    onClick={() => remove(e.id)}
                    className="shrink-0 grid h-auto w-10 place-items-center rounded-lg border border-border bg-card text-cream-3 hover:text-destructive hover:border-destructive/40 transition-colors"
                    aria-label="Удалить"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
