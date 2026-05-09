"use client"

import { useState, useTransition, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import {
  Plus, Trash2, Edit2, CalendarDays, GraduationCap, Trophy,
  Sparkles, Loader2, ChevronDown, ChevronUp, Check, Square as SquareIcon, Plus as PlusIcon, ListChecks,
  Copy as CopyIcon, FileText,
} from "lucide-react"
import {
  type Application,
  type AppStatus,
  type AppPriority,
  type AppLevel,
  type AppAiSuggestions,
  APP_STATUSES,
  APP_PRIORITIES,
  APP_LEVELS,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  summarizeApplications,
  daysUntil,
} from "@/lib/applications/types"
import {
  upsertApplication,
  deleteApplication,
  updateApplicationStatus,
  addChecklistItems,
  toggleChecklistItem,
  cloneApplication,
} from "@/lib/applications/actions"
import { BulkAddDialog } from "./bulk-add-dialog"
import { VoiceInputButton } from "@/components/voice-input-button"
import { AiLoadingSkeleton, AiErrorCard } from "@/components/ai-state"
import { DeadlineChip } from "@/components/deadline-chip"
import { analyzePortfolio, type Verdict } from "@/lib/applications/analytics"
import { cn } from "@/lib/utils"

type FormState = {
  id?: string
  university_name: string
  university_country: string
  program: string
  level: AppLevel | ""
  round: string
  deadline: string
  status: AppStatus
  priority: AppPriority
  application_fee_usd: string
  notes: string
}

const EMPTY: FormState = {
  university_name: "",
  university_country: "",
  program: "",
  level: "",
  round: "",
  deadline: "",
  status: "planning",
  priority: "match",
  application_fee_usd: "",
  notes: "",
}

type EssayPreview = {
  id: string
  title: string
  status: "draft" | "reviewing" | "final" | "submitted"
  draft_text: string
}

export function ApplicationsClient({
  initial,
  essaysByApp = {},
}: {
  initial: Application[]
  essaysByApp?: Record<string, EssayPreview[]>
}) {
  const [apps, setApps] = useState<Application[]>(initial)
  const [editing, setEditing] = useState<FormState | null>(null)
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const stats = summarizeApplications(apps)

  // Auto-open Add dialog with prefilled university name from ?add= URL param
  // (used by /universities/[id] "Add to applications" CTA)
  const searchParams = useSearchParams()
  const router = useRouter()
  useEffect(() => {
    const addName = searchParams.get("add")
    if (addName && addName.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditing({ ...EMPTY, university_name: addName.trim() })
      setOpen(true)
      // Clean URL so refresh doesn't re-trigger
      router.replace("/applications", { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openNew() {
    setEditing({ ...EMPTY })
    setOpen(true)
  }

  function clone(id: string) {
    startTransition(async () => {
      const r = await cloneApplication(id)
      if (!r.ok) {
        toast.error(r.error ?? "Не удалось дублировать")
        return
      }
      toast.success("Заявка скопирована — поправь раунд и дедлайн")
      window.location.reload()
    })
  }

  function openEdit(a: Application) {
    setEditing({
      id: a.id,
      university_name: a.university_name,
      university_country: a.university_country ?? "",
      program: a.program ?? "",
      level: (a.level ?? "") as AppLevel | "",
      round: a.round ?? "",
      deadline: a.deadline ?? "",
      status: a.status,
      priority: a.priority,
      application_fee_usd: a.application_fee_usd?.toString() ?? "",
      notes: a.notes ?? "",
    })
    setOpen(true)
  }

  function save() {
    if (!editing) return
    if (!editing.university_name.trim()) {
      toast.error("Укажи университет")
      return
    }
    startTransition(async () => {
      const res = await upsertApplication(editing)
      if (!res.ok) {
        toast.error(res.error ?? "Не удалось сохранить")
        return
      }
      // optimistic refresh: refetch via server action would be cleaner;
      // for now build a synthetic record then ask server
      toast.success(editing.id ? "Заявка обновлена" : "Заявка добавлена")
      setOpen(false)
      setEditing(null)
      // simple page-data refresh
      window.location.reload()
    })
  }

  function remove(id: string) {
    if (!confirm("Удалить заявку?")) return
    startTransition(async () => {
      const res = await deleteApplication(id)
      if (!res.ok) {
        toast.error(res.error ?? "Не удалось удалить")
        return
      }
      setApps((prev) => prev.filter((a) => a.id !== id))
      toast.success("Удалено")
    })
  }

  function quickStatus(id: string, status: AppStatus) {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
    startTransition(async () => {
      const res = await updateApplicationStatus(id, status)
      if (!res.ok) {
        toast.error(res.error ?? "Не удалось обновить")
        // revert: reload from initial via reload
        window.location.reload()
      }
    })
  }

  const analytics = analyzePortfolio(apps)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats + Add */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Всего" value={stats.total} icon={GraduationCap} />
          <StatCard label="Подано" value={stats.submitted} icon={Edit2} />
          <StatCard label="Принят" value={stats.accepted} icon={Trophy} highlight />
          <StatCard
            label="Следующий дедлайн"
            value={stats.nextDeadline ? formatDate(stats.nextDeadline) : "—"}
            icon={CalendarDays}
            small
          />
        </div>

        {apps.length > 0 && <PortfolioPanel analytics={analytics} />}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-display text-xl">Мои заявки</h2>
          <div className="flex items-center gap-2">
            <BulkAddDialog
              trigger={
                <Button variant="outline" className="gap-2">
                  <Sparkles className="h-4 w-4 text-gold" />
                  Bulk add · AI
                </Button>
              }
            />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <Button onClick={openNew} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Добавить
                  </Button>
                }
              />
            {editing && (
              <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display text-xl">
                    {editing.id ? "Редактировать заявку" : "Новая заявка"}
                  </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
                  <FormField label="Университет *">
                    <Input
                      value={editing.university_name}
                      onChange={(e) => setEditing({ ...editing, university_name: e.target.value })}
                      placeholder="MIT"
                    />
                  </FormField>
                  <FormField label="Страна">
                    <Input
                      value={editing.university_country}
                      onChange={(e) => setEditing({ ...editing, university_country: e.target.value })}
                      placeholder="USA"
                    />
                  </FormField>
                  <FormField label="Программа / специальность">
                    <Input
                      value={editing.program}
                      onChange={(e) => setEditing({ ...editing, program: e.target.value })}
                      placeholder="Computer Science"
                    />
                  </FormField>
                  <FormField label="Уровень">
                    <Select
                      value={editing.level}
                      onChange={(v) => setEditing({ ...editing, level: v as AppLevel | "" })}
                      options={[{ value: "", label: "—" }, ...APP_LEVELS.map((l) => ({ value: l, label: l }))]}
                    />
                  </FormField>
                  <FormField label="Раунд (ED / EA / RD)">
                    <Input
                      value={editing.round}
                      onChange={(e) => setEditing({ ...editing, round: e.target.value })}
                      placeholder="EA"
                    />
                  </FormField>
                  <FormField label="Дедлайн">
                    <Input
                      type="date"
                      value={editing.deadline}
                      onChange={(e) => setEditing({ ...editing, deadline: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Статус">
                    <Select
                      value={editing.status}
                      onChange={(v) => setEditing({ ...editing, status: v as AppStatus })}
                      options={APP_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
                    />
                  </FormField>
                  <FormField label="Приоритет">
                    <Select
                      value={editing.priority}
                      onChange={(v) => setEditing({ ...editing, priority: v as AppPriority })}
                      options={APP_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
                    />
                  </FormField>
                  <FormField label="App fee (USD)">
                    <Input
                      type="number"
                      value={editing.application_fee_usd}
                      onChange={(e) => setEditing({ ...editing, application_fee_usd: e.target.value })}
                      placeholder="75"
                    />
                  </FormField>
                  <FormField label="Заметки" wide>
                    <div className="space-y-1.5">
                      <Textarea
                        value={editing.notes}
                        onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                        placeholder="Эссе, рекомендации, спец. требования..."
                        rows={3}
                      />
                      <div className="flex items-center justify-end">
                        <VoiceInputButton
                          size="sm"
                          hint={editing.university_name}
                          onTranscript={(text) =>
                            setEditing({
                              ...editing,
                              notes: editing.notes.trim()
                                ? `${editing.notes.trim()} ${text}`
                                : text,
                            })
                          }
                        />
                      </div>
                    </div>
                  </FormField>
                </div>

                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                    Отмена
                  </Button>
                  <Button onClick={save} disabled={pending}>
                    {pending ? "Сохраняю..." : editing.id ? "Сохранить" : "Добавить"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            )}
            </Dialog>
          </div>
        </div>

        {/* List */}
        {apps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-10 text-center space-y-3">
            <GraduationCap className="h-10 w-10 text-cream-3 mx-auto" />
            <p className="font-display text-lg">Пока ни одной заявки</p>
            <p className="font-serif text-sm text-cream-2 max-w-md mx-auto">
              Добавь первый университет — будем отслеживать дедлайн, статус и список документов.
              Используй <span className="text-gold">AI Agent → Полный package</span> чтобы быстро подобрать список.
            </p>
            <Button onClick={openNew} className="gap-2 mt-2">
              <Plus className="h-4 w-4" />
              Добавить заявку
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {apps.map((a) => (
              <ApplicationCard
                key={a.id}
                app={a}
                onEdit={() => openEdit(a)}
                onDelete={() => remove(a.id)}
                onStatus={(s) => quickStatus(a.id, s)}
                onClone={() => clone(a.id)}
                essays={essaysByApp[a.id] ?? []}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  highlight,
  small,
}: {
  label: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  highlight?: boolean
  small?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card/40 p-3 sm:p-4",
        highlight ? "border-gold/30" : "border-border"
      )}
    >
      <div className="flex items-center gap-2 text-cream-3 mb-1">
        <Icon className={cn("h-3.5 w-3.5", highlight && "text-gold")} />
        <span className="text-[10px] sm:text-[11px] font-mono-label uppercase tracking-wide truncate">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "font-display tracking-tight",
          small ? "text-base" : "text-2xl sm:text-3xl",
          highlight && "text-gold"
        )}
      >
        {value}
      </p>
    </div>
  )
}

function ApplicationCard({
  app,
  onEdit,
  onDelete,
  onStatus,
  onClone,
  essays = [],
}: {
  app: Application
  onEdit: () => void
  onDelete: () => void
  onStatus: (s: AppStatus) => void
  onClone: () => void
  essays?: EssayPreview[]
}) {
  const days = daysUntil(app.deadline)
  const urgent = days !== null && days <= 14 && days >= 0 && app.status === "planning"

  const [expanded, setExpanded] = useState(Boolean(app.ai_suggestions || app.checklist.length))
  const [suggestions, setSuggestions] = useState<AppAiSuggestions | null>(app.ai_suggestions ?? null)
  const [suggestPending, setSuggestPending] = useState(false)
  const [suggestError, setSuggestError] = useState<string | null>(null)
  const [checklist, setChecklist] = useState(app.checklist)
  const [, startTransition] = useTransition()

  const checklistDone = checklist.filter((c) => c.done).length

  async function generateSuggestions() {
    setSuggestPending(true)
    setSuggestError(null)
    try {
      const res = await fetch(`/api/applications/${app.id}/suggest`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        setSuggestError(json.message ?? json.error ?? "AI не ответил — попробуй ещё раз")
        setExpanded(true)
        return
      }
      setSuggestions(json.suggestions)
      setExpanded(true)
      toast.success("AI разобрал заявку")
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "Сетевая ошибка")
      setExpanded(true)
    } finally {
      setSuggestPending(false)
    }
  }

  function toggleItem(itemId: string) {
    setChecklist((prev) =>
      prev.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c))
    )
    startTransition(async () => {
      const r = await toggleChecklistItem(app.id, itemId)
      if (!r.ok) toast.error(r.error ?? "Не удалось")
    })
  }

  function addChecklistAddition(label: string) {
    startTransition(async () => {
      const r = await addChecklistItems(app.id, [label])
      if (!r.ok) {
        toast.error(r.error ?? "Не удалось")
        return
      }
      // Optimistic update — refresh from server side via reload
      // Simpler: refetch by adding locally
      const newItem = { id: Math.random().toString(36).slice(2, 10), label, done: false }
      setChecklist((prev) => [...prev, newItem])
      toast.success("Добавлено в чек-лист")
    })
  }

  function addAllChecklistAdditions() {
    if (!suggestions?.checklist_additions?.length) return
    startTransition(async () => {
      const r = await addChecklistItems(app.id, suggestions.checklist_additions ?? [])
      if (!r.ok) {
        toast.error(r.error ?? "Не удалось")
        return
      }
      // refresh page to pick up canonical ids
      window.location.reload()
    })
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card/40 p-4 space-y-3",
        urgent ? "border-rose-500/40" : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base sm:text-lg truncate">{app.university_name}</h3>
          <p className="font-mono-label text-[11px] text-cream-3 truncate mt-0.5">
            {[app.program, app.level, app.round, app.university_country].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon-sm" onClick={onClone} aria-label="Дублировать (для другого раунда)" title="Дублировать">
            <CopyIcon className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Редактировать">
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            aria-label="Удалить"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={app.status}
          onChange={(e) => onStatus(e.target.value as AppStatus)}
          className={cn(
            "h-7 rounded-md border bg-card px-2 text-xs font-medium focus:outline-none focus:border-gold/60 transition-colors",
            STATUS_COLORS[app.status]
          )}
        >
          {APP_STATUSES.map((s) => (
            <option key={s} value={s} className="bg-background text-foreground">
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <Badge
          variant="outline"
          className={cn("text-[10px] py-0.5 px-2", PRIORITY_COLORS[app.priority])}
        >
          {PRIORITY_LABELS[app.priority]}
        </Badge>

        {app.deadline && (
          <span className="inline-flex items-center gap-1 text-xs font-mono-label">
            <CalendarDays className="h-3 w-3 text-cream-3" />
            <DeadlineChip iso={app.deadline} size="sm" />
          </span>
        )}

        {app.application_fee_usd ? (
          <span className="text-xs font-mono-label text-cream-3">${app.application_fee_usd}</span>
        ) : null}

        {checklist.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-mono-label text-cream-3">
            <ListChecks className="h-3 w-3" />
            {checklistDone}/{checklist.length}
          </span>
        )}
      </div>

      {app.notes && (
        <p className="font-serif text-sm text-cream-2 leading-relaxed border-t border-border/40 pt-2 whitespace-pre-wrap">
          {app.notes}
        </p>
      )}

      {/* Essays panel */}
      <EssaysForApp essays={essays} app={app} />

      {/* AI suggestions + checklist toggle */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
        {!suggestions ? (
          <Button
            variant="outline"
            size="sm"
            onClick={generateSuggestions}
            disabled={suggestPending}
            className="gap-2"
          >
            {suggestPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-gold" />}
            {suggestPending ? "AI разбирает заявку..." : "AI: что делать дальше"}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="gap-2"
          >
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            AI план
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        )}
        {suggestions && (
          <Button
            variant="ghost"
            size="sm"
            onClick={generateSuggestions}
            disabled={suggestPending}
            className="gap-1.5 text-xs text-cream-3"
          >
            {suggestPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Обновить
          </Button>
        )}
      </div>

      {/* AI loading skeleton when first generation in flight */}
      {suggestPending && !suggestions && (
        <div className="border-t border-border/40 pt-3">
          <AiLoadingSkeleton />
        </div>
      )}

      {/* AI error inline retry */}
      {suggestError && !suggestions && !suggestPending && (
        <div className="border-t border-border/40 pt-3">
          <AiErrorCard
            message={suggestError}
            onRetry={generateSuggestions}
            retrying={suggestPending}
          />
        </div>
      )}

      {/* Expanded section: suggestions + checklist */}
      {expanded && (suggestions || checklist.length > 0) && (
        <div className="border-t border-border/40 pt-3 space-y-4">
          {suggestions && (
            <div className="space-y-3">
              {(suggestions.match_strength || suggestions.weakest_area) && (
                <div className="grid sm:grid-cols-2 gap-2">
                  {suggestions.match_strength && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <p className="font-mono-label text-[10px] text-emerald-300 mb-0.5">MATCH</p>
                      <p className="text-xs font-serif text-cream-2">{suggestions.match_strength}</p>
                    </div>
                  )}
                  {suggestions.weakest_area && (
                    <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                      <p className="font-mono-label text-[10px] text-rose-300 mb-0.5">RISK</p>
                      <p className="text-xs font-serif text-cream-2">{suggestions.weakest_area}</p>
                    </div>
                  )}
                </div>
              )}

              <ul className="space-y-2">
                {suggestions.items.map((item, i) => (
                  <li
                    key={i}
                    className={cn(
                      "rounded-lg border p-3",
                      item.priority === "high" && "border-rose-500/30 bg-rose-500/5",
                      item.priority === "medium" && "border-gold/20 bg-gold/5",
                      item.priority === "low" && "border-border bg-card/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-display text-sm leading-snug flex-1 min-w-0">{item.title}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] py-0 px-1.5 shrink-0",
                          item.priority === "high" && "bg-rose-500/15 text-rose-300 border-rose-500/30",
                          item.priority === "medium" && "bg-gold/15 text-gold border-gold/30",
                          item.priority === "low" && "bg-cream-3/15 text-cream-3 border-cream-3/30"
                        )}
                      >
                        {item.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="font-serif text-xs text-cream-2 leading-relaxed">{item.body}</p>
                    {item.weeks_estimate && (
                      <p className="font-mono-label text-[10px] text-cream-3 mt-1">
                        ⏱ {item.weeks_estimate}
                      </p>
                    )}
                  </li>
                ))}
              </ul>

              {suggestions.checklist_additions && suggestions.checklist_additions.length > 0 && (
                <div className="rounded-lg border border-border bg-card/40 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">
                      Предлагаю добавить в чек-лист
                    </p>
                    <Button size="sm" variant="ghost" onClick={addAllChecklistAdditions} className="gap-1.5 h-7">
                      <PlusIcon className="h-3 w-3" />
                      Добавить все
                    </Button>
                  </div>
                  <ul className="space-y-1">
                    {suggestions.checklist_additions.map((label, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs font-serif text-cream-2">
                        <button
                          onClick={() => addChecklistAddition(label)}
                          className="mt-0.5 grid h-4 w-4 place-items-center rounded border border-border hover:border-gold/40 hover:bg-gold/10 transition-colors shrink-0"
                          aria-label="Добавить в чек-лист"
                        >
                          <PlusIcon className="h-2.5 w-2.5 text-cream-3" />
                        </button>
                        <span className="flex-1">{label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {checklist.length > 0 && (
            <div className="space-y-2">
              <p className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">
                Чек-лист ({checklistDone}/{checklist.length})
              </p>
              <ul className="space-y-1">
                {checklist.map((item) => (
                  <li key={item.id} className="flex items-start gap-2 text-sm">
                    <button
                      onClick={() => toggleItem(item.id)}
                      className={cn(
                        "mt-0.5 grid h-4 w-4 place-items-center rounded border transition-colors shrink-0",
                        item.done
                          ? "border-gold bg-gold text-background"
                          : "border-border hover:border-gold/40"
                      )}
                      aria-label={item.done ? "Снять отметку" : "Отметить выполненным"}
                    >
                      {item.done ? <Check className="h-2.5 w-2.5" /> : <SquareIcon className="h-2 w-2 text-transparent" />}
                    </button>
                    <span
                      className={cn(
                        "font-serif flex-1",
                        item.done ? "text-cream-3 line-through" : "text-cream-2"
                      )}
                    >
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FormField({
  label,
  wide,
  children,
}: {
  label: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-1.5", wide && "sm:col-span-2")}>
      <Label className="font-mono-label text-[11px] text-cream-3">{label}</Label>
      {children}
    </div>
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:border-gold/60 transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-background text-foreground">
          {o.label}
        </option>
      ))}
    </select>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" })
}

function EssaysForApp({ essays, app }: { essays: EssayPreview[]; app: Application }) {
  if (essays.length === 0) {
    return (
      <div className="border-t border-border/40 pt-2 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] font-mono-label text-cream-3 inline-flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          Эссе для этой заявки не созданы
        </span>
        <Link
          href={`/essays?new=1&app=${app.id}&title=${encodeURIComponent(app.university_name)}`}
          className="inline-flex items-center gap-1 text-[10px] font-mono-label text-gold hover:underline"
        >
          + Создать эссе
        </Link>
      </div>
    )
  }

  return (
    <div className="border-t border-border/40 pt-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono-label text-cream-3 inline-flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          Эссе ({essays.length})
        </span>
        <Link
          href={`/essays?new=1&app=${app.id}&title=${encodeURIComponent(app.university_name)}`}
          className="text-[10px] font-mono-label text-cream-3 hover:text-gold transition-colors"
        >
          + ещё
        </Link>
      </div>
      <ul className="space-y-1">
        {essays.map((e) => {
          const wc = e.draft_text.trim() ? e.draft_text.trim().split(/\s+/).length : 0
          const statusColor =
            e.status === "submitted"
              ? "text-emerald-400"
              : e.status === "final"
                ? "text-gold"
                : e.status === "reviewing"
                  ? "text-blue-300"
                  : "text-cream-3"
          return (
            <li key={e.id}>
              <Link
                href={`/essays/${e.id}`}
                className="flex items-center gap-2.5 rounded-md border border-border bg-card/30 hover:bg-card hover:border-gold/30 transition-colors p-2"
              >
                <FileText className="h-3 w-3 text-cream-3 shrink-0" />
                <span className="font-display text-xs flex-1 min-w-0 truncate">{e.title}</span>
                <span className={cn("text-[10px] font-mono-label uppercase tracking-wider shrink-0", statusColor)}>
                  {e.status}
                </span>
                <span className="text-[10px] font-mono-label text-cream-3 tabular-nums shrink-0">
                  {wc}w
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function PortfolioPanel({
  analytics,
}: {
  analytics: ReturnType<typeof analyzePortfolio>
}) {
  const { total, byPriority, uniqueCountries, verdicts } = analytics
  const reachPct = total ? Math.round((byPriority.reach / total) * 100) : 0
  const matchPct = total ? Math.round((byPriority.match / total) * 100) : 0
  const safetyPct = total ? Math.round((byPriority.safety / total) * 100) : 0

  return (
    <section className="rounded-xl border border-border bg-card/40 p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">
            Аналитика стека
          </p>
          <p className="font-display text-base mt-0.5">
            {total} {total === 1 ? "заявка" : "заявок"} · {uniqueCountries} {uniqueCountries === 1 ? "страна" : "страны"}
          </p>
        </div>
      </div>

      {/* Reach/Match/Safety bar */}
      <div className="space-y-1.5">
        <div className="flex h-3 w-full rounded-full overflow-hidden border border-border">
          {byPriority.reach > 0 && (
            <div
              className="bg-rose-500/40 border-r border-rose-500/30"
              style={{ width: `${reachPct}%` }}
              title={`${byPriority.reach} reach`}
            />
          )}
          {byPriority.match > 0 && (
            <div
              className="bg-gold/40 border-r border-gold/30"
              style={{ width: `${matchPct}%` }}
              title={`${byPriority.match} match`}
            />
          )}
          {byPriority.safety > 0 && (
            <div
              className="bg-emerald-500/40"
              style={{ width: `${safetyPct}%` }}
              title={`${byPriority.safety} safety`}
            />
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono-label flex-wrap gap-x-3">
          <span className="text-rose-300">Reach {byPriority.reach} · {reachPct}%</span>
          <span className="text-gold">Match {byPriority.match} · {matchPct}%</span>
          <span className="text-emerald-300">Safety {byPriority.safety} · {safetyPct}%</span>
        </div>
      </div>

      {/* Verdicts */}
      {verdicts.length > 0 && (
        <ul className="space-y-1.5">
          {verdicts.map((v: Verdict, i: number) => (
            <li
              key={i}
              className={cn(
                "rounded-lg border p-2.5 flex items-start gap-2.5",
                v.level === "ok" && "border-emerald-500/20 bg-emerald-500/5",
                v.level === "warn" && "border-amber-500/20 bg-amber-500/5",
                v.level === "alert" && "border-rose-500/30 bg-rose-500/5",
              )}
            >
              <span className={cn(
                "mt-0.5 text-[10px] font-mono-label uppercase tracking-wider shrink-0",
                v.level === "ok" && "text-emerald-300",
                v.level === "warn" && "text-amber-300",
                v.level === "alert" && "text-rose-300",
              )}>
                {v.level === "ok" ? "✓" : v.level === "warn" ? "⚠" : "!!"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm">{v.title}</p>
                <p className="font-serif text-xs text-cream-2 mt-0.5">{v.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
