"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Plus, Trash2, Sparkles, Loader2, ArrowUp, ArrowDown, Check,
} from "lucide-react"
import {
  type ActivityEntry,
  type ActivityType,
  ACTIVITY_TYPES,
  GRADE_LEVELS,
  COMMON_APP_LIMITS,
  emptyActivity,
  activityCharCount,
} from "@/lib/activities/types"
import { saveActivities } from "@/lib/activities/actions"
import { VoiceInputButton } from "@/components/voice-input-button"
import { cn } from "@/lib/utils"

const MAX = 10

export function ActivityBuilder({ initial }: { initial: ActivityEntry[] }) {
  const [items, setItems] = useState<ActivityEntry[]>(
    initial.length ? initial : [emptyActivity()]
  )
  const [pending, startTransition] = useTransition()
  const [aiPending, setAiPending] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  function update(id: string, patch: Partial<ActivityEntry>) {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }

  function add() {
    if (items.length >= MAX) {
      toast.error(`Common App допускает максимум ${MAX} активностей`)
      return
    }
    setItems((prev) => [...prev, emptyActivity()])
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((a) => a.id !== id))
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    setItems((prev) => {
      const next = prev.slice()
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  function moveDown(idx: number) {
    setItems((prev) => {
      if (idx >= prev.length - 1) return prev
      const next = prev.slice()
      ;[next[idx + 1], next[idx]] = [next[idx], next[idx + 1]]
      return next
    })
  }

  async function rewriteOne(id: string) {
    const item = items.find((a) => a.id === id)
    if (!item || !item.description.trim()) {
      toast.error("Сначала напиши описание")
      return
    }
    setAiPending(id)
    try {
      const res = await fetch("/api/activities/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: item.position,
          organization: item.organization,
          description: item.description,
          type: item.type,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.message ?? json.error ?? "AI не смог")
        return
      }
      update(id, { description: json.description })
      if (json.notes) toast.success(`AI: ${json.notes}`)
      else toast.success("Перефразировано")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка")
    } finally {
      setAiPending(null)
    }
  }

  function save() {
    startTransition(async () => {
      const r = await saveActivities(items)
      if (!r.ok) {
        toast.error(r.error ?? "Не удалось сохранить")
        return
      }
      toast.success("Сохранено · теперь во всех 11 tools")
      setSavedAt(Date.now())
    })
  }

  const totalChars = items.reduce((s, a) => s + a.description.length, 0)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="rounded-xl border border-gold/20 bg-gradient-to-br from-gold/5 to-transparent p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15 shrink-0">
              <Sparkles className="h-5 w-5 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-lg">Common App Activities</h2>
              <p className="font-serif text-sm text-cream-2 leading-relaxed">
                10 слотов · 150-char description · AI перефразирует под admission стандарт.
                Самую важную активность ставь #1 — приёмная комиссия читает по порядку.
              </p>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="Слотов заполнено" value={`${items.filter((a) => a.position || a.description).length}/${MAX}`} />
          <Stat label="Всего символов" value={String(totalChars)} />
          <Stat
            label="Сохранено"
            value={savedAt ? new Date(savedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "—"}
          />
        </div>

        {/* Activity slots */}
        <div className="space-y-4">
          {items.map((item, idx) => (
            <ActivityCard
              key={item.id}
              idx={idx}
              isFirst={idx === 0}
              isLast={idx === items.length - 1}
              item={item}
              aiPending={aiPending === item.id}
              onChange={(patch) => update(item.id, patch)}
              onRemove={() => remove(item.id)}
              onMoveUp={() => moveUp(idx)}
              onMoveDown={() => moveDown(idx)}
              onRewrite={() => rewriteOne(item.id)}
            />
          ))}
        </div>

        {/* Add + Save bar */}
        <div className="flex flex-wrap gap-3 sticky bottom-0 bg-background/95 backdrop-blur border-t border-border/40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3">
          <Button onClick={add} variant="outline" disabled={items.length >= MAX} className="gap-2">
            <Plus className="h-4 w-4" />
            Добавить активность
          </Button>
          <span className="text-xs font-mono-label text-cream-3 self-center">
            {items.length}/{MAX} слотов
          </span>
          <Button onClick={save} disabled={pending} className="ml-auto gap-2 sm:min-w-[180px]">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {pending ? "Сохраняю..." : "Сохранить"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ActivityCard({
  idx,
  isFirst,
  isLast,
  item,
  aiPending,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onRewrite,
}: {
  idx: number
  isFirst: boolean
  isLast: boolean
  item: ActivityEntry
  aiPending: boolean
  onChange: (patch: Partial<ActivityEntry>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRewrite: () => void
}) {
  const descCount = activityCharCount("description", item.description)
  const posCount = activityCharCount("position", item.position)
  const orgCount = activityCharCount("organization", item.organization)

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 sm:p-5 space-y-4">
      {/* Slot header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "grid h-7 w-7 place-items-center rounded-md font-mono-label text-xs font-medium",
              idx === 0
                ? "bg-gold text-background"
                : "bg-cream-3/10 text-cream-2 border border-border"
            )}
          >
            {idx + 1}
          </span>
          {idx === 0 && (
            <Badge className="text-[9px] py-0 px-1.5 bg-gold/20 text-gold border-gold/30">
              MOST IMPORTANT
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" onClick={onMoveUp} disabled={isFirst} aria-label="Вверх">
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onMoveDown} disabled={isLast} aria-label="Вниз">
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
            aria-label="Удалить"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Type + grades + hours */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="font-mono-label text-[11px] text-cream-3">Activity type</Label>
          <select
            value={item.type}
            onChange={(e) => onChange({ type: e.target.value as ActivityType | "" })}
            className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:border-gold/60"
          >
            <option value="" className="bg-background">— select —</option>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t} className="bg-background">
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="font-mono-label text-[11px] text-cream-3">Grades involved</Label>
          <div className="flex gap-1.5 flex-wrap">
            {GRADE_LEVELS.map((g) => {
              const on = item.grades.includes(g)
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() =>
                    onChange({
                      grades: on
                        ? item.grades.filter((x) => x !== g)
                        : [...item.grades, g],
                    })
                  }
                  className={cn(
                    "h-9 px-3 rounded-md border text-sm font-mono-label transition-colors",
                    on
                      ? "bg-gold/15 text-gold border-gold/40"
                      : "bg-card border-border text-cream-3 hover:text-cream"
                  )}
                >
                  {g === "PG" ? "PG" : g}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Position + Organization */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Field
          label="Position / Leadership"
          value={item.position}
          onChange={(v) => onChange({ position: v })}
          placeholder="President, Captain, Founder, Volunteer..."
          char={posCount}
        />
        <Field
          label="Organization"
          value={item.organization}
          onChange={(v) => onChange({ organization: v })}
          placeholder="Math Olympiad Club, IB Diploma Program..."
          char={orgCount}
        />
      </div>

      {/* Hours / weeks / continue */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="font-mono-label text-[11px] text-cream-3">Hours / week</Label>
          <Input
            type="number"
            value={item.hoursPerWeek}
            onChange={(e) => onChange({ hoursPerWeek: e.target.value })}
            placeholder="8"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-mono-label text-[11px] text-cream-3">Weeks / year</Label>
          <Input
            type="number"
            value={item.weeksPerYear}
            onChange={(e) => onChange({ weeksPerYear: e.target.value })}
            placeholder="40"
            className="h-9"
          />
        </div>
        <label className="flex items-end gap-2 pb-2 select-none">
          <input
            type="checkbox"
            checked={item.continue_in_college}
            onChange={(e) => onChange({ continue_in_college: e.target.checked })}
            className="h-4 w-4 rounded border-border bg-card accent-gold"
          />
          <span className="text-xs font-serif text-cream-2">Продолжу в колледже</span>
        </label>
      </div>

      {/* Description with char counter + AI rewrite */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label className="font-mono-label text-[11px] text-cream-3">
            Description (Common App: ≤{COMMON_APP_LIMITS.description} chars)
          </Label>
          <div className="flex items-center gap-2">
            <VoiceInputButton
              size="sm"
              hint={`${item.position} ${item.organization}`.trim() || "activity description"}
              onTranscript={(text) =>
                onChange({
                  description: item.description.trim()
                    ? `${item.description.trim()} ${text}`
                    : text,
                })
              }
            />
            <CharBadge {...descCount} />
          </div>
        </div>
        <Textarea
          value={item.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          placeholder="Led 25-member robotics team to regional finals; designed autonomous arm; mentored 8 freshmen..."
          className={cn(
            "font-serif resize-none",
            descCount.over && "border-rose-500/60",
            descCount.warning && !descCount.over && "border-amber-500/60"
          )}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRewrite}
            disabled={aiPending || !item.description.trim()}
            className="gap-2"
          >
            {aiPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-gold" />}
            AI: переписать с impact
          </Button>
          <span className="text-[10px] font-mono-label text-cream-3 self-center">
            Сильные глаголы · цифры · без «I/my»
          </span>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  char,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  char: { count: number; limit: number; over: boolean; warning: boolean }
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="font-mono-label text-[11px] text-cream-3">{label}</Label>
        <CharBadge {...char} />
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          char.over && "border-rose-500/60",
          char.warning && !char.over && "border-amber-500/60"
        )}
      />
    </div>
  )
}

function CharBadge({ count, limit, over, warning }: { count: number; limit: number; over: boolean; warning: boolean }) {
  return (
    <span
      className={cn(
        "text-[10px] font-mono-label",
        over ? "text-rose-400" : warning ? "text-amber-400" : "text-cream-3"
      )}
    >
      {count}/{limit}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3">
      <p className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wide">{label}</p>
      <p className="font-display text-xl tracking-tight mt-0.5">{value}</p>
    </div>
  )
}
