"use client"

import { useState, useTransition } from "react"
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
} from "lucide-react"
import {
  type Application,
  type AppStatus,
  type AppPriority,
  type AppLevel,
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
} from "@/lib/applications/actions"
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

export function ApplicationsClient({ initial }: { initial: Application[] }) {
  const [apps, setApps] = useState<Application[]>(initial)
  const [editing, setEditing] = useState<FormState | null>(null)
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const stats = summarizeApplications(apps)

  function openNew() {
    setEditing({ ...EMPTY })
    setOpen(true)
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

        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">Мои заявки</h2>
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
                    <Textarea
                      value={editing.notes}
                      onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                      placeholder="Эссе, рекомендации, спец. требования..."
                      rows={3}
                    />
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
}: {
  app: Application
  onEdit: () => void
  onDelete: () => void
  onStatus: (s: AppStatus) => void
}) {
  const days = daysUntil(app.deadline)
  const urgent = days !== null && days <= 14 && days >= 0 && app.status === "planning"

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
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-mono-label",
              urgent ? "text-rose-400" : days !== null && days < 0 ? "text-cream-3 line-through" : "text-cream-2"
            )}
          >
            <CalendarDays className="h-3 w-3" />
            {formatDate(app.deadline)}
            {days !== null && (
              <span className="text-cream-3">
                {days < 0 ? "прошло" : days === 0 ? "сегодня" : `· ${days} дн.`}
              </span>
            )}
          </span>
        )}

        {app.application_fee_usd ? (
          <span className="text-xs font-mono-label text-cream-3">${app.application_fee_usd}</span>
        ) : null}
      </div>

      {app.notes && (
        <p className="font-serif text-sm text-cream-2 leading-relaxed border-t border-border/40 pt-2 whitespace-pre-wrap">
          {app.notes}
        </p>
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
