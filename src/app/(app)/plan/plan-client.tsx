"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatIsoDate, daysFromToday } from "@/lib/dates"
import { setPlanTaskStatus, deletePlanTask, addPlanTask, updatePlanTask } from "@/lib/plan/actions"
import {
  planProgress,
  groupTasksByMonth,
  DEADLINE_KIND_LABELS,
  type PlanTask,
  type TaskStatus,
} from "@/lib/plan/types"
import { CheckCircle2, Circle, Trash2, Plus, CalendarClock, AlertTriangle, Pencil, Check, X } from "lucide-react"

const PRIORITY_RING: Record<string, string> = {
  high: "border-l-rose-500/70",
  medium: "border-l-amber-500/70",
  low: "border-l-emerald-500/70",
}

const KIND_CHIP: Record<string, string> = {
  official: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  personal: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  estimate: "bg-card/40 text-cream-3 border-border",
}

export function PlanClient({ initialTasks, today }: { initialTasks: PlanTask[]; today: string }) {
  const [tasks, setTasks] = useState<PlanTask[]>(initialTasks)
  const [showDone, setShowDone] = useState(false)
  const [pending, start] = useTransition()
  const [newTitle, setNewTitle] = useState("")
  const [newDate, setNewDate] = useState("")

  const progress = useMemo(() => planProgress(tasks, today), [tasks, today])
  const visible = useMemo(() => tasks.filter((t) => showDone || t.status !== "done"), [tasks, showDone])
  const groups = useMemo(() => groupTasksByMonth(visible), [visible])

  function toggle(task: PlanTask) {
    const next: TaskStatus = task.status === "done" ? "todo" : "done"
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)))
    start(async () => {
      const res = await setPlanTaskStatus(task.id, next)
      if (!res.ok) {
        toast.error(res.error)
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)))
      }
    })
  }

  function remove(task: PlanTask) {
    if (!confirm(`Удалить задачу «${task.title}»?`)) return
    setTasks((prev) => prev.filter((t) => t.id !== task.id))
    start(async () => {
      const res = await deletePlanTask(task.id)
      if (!res.ok) toast.error(res.error)
    })
  }

  function add() {
    if (!newTitle.trim()) return toast.error("Укажи название задачи")
    start(async () => {
      const res = await addPlanTask({ title: newTitle, due_date: newDate, deadline_kind: "personal" })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Задача добавлена")
      setNewTitle("")
      setNewDate("")
      window.location.reload()
    })
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Progress */}
        <div className="rounded-xl border border-border bg-card/40 p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-lg">
                {progress.done} / {progress.total} задач
              </p>
              <p className="font-mono-label text-[11px] text-cream-3">
                {progress.next ? (
                  <>
                    ближайшая: {progress.next.title} · {formatIsoDate(progress.next.due_date)}
                  </>
                ) : (
                  "ближайших дат нет"
                )}
              </p>
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs font-mono-label text-cream-2 cursor-pointer">
              <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="accent-gold" />
              показывать сделанные
            </label>
          </div>
          <div className="h-1.5 rounded-full bg-border/40 overflow-hidden">
            <div className="h-full bg-gold transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
          {progress.overdue > 0 && (
            <p className="text-xs text-rose-300 inline-flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> просрочено задач: {progress.overdue}
            </p>
          )}
        </div>

        {/* Add manual task */}
        <div className="rounded-xl border border-border/60 bg-card/30 p-3 flex flex-wrap gap-2 items-center">
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Новая задача…" className="flex-1 min-w-[200px]" />
          <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-40" />
          <Button size="sm" onClick={add} disabled={pending} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Добавить
          </Button>
        </div>

        {tasks.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-center space-y-2">
            <p className="font-display text-base">Задач пока нет</p>
            <p className="font-serif text-sm text-cream-2">
              Запусти миссию в{" "}
              <Link href="/agent" className="text-gold hover:underline">
                AI Agent
              </Link>{" "}
              или инструмент{" "}
              <Link href="/tools/tracker" className="text-gold hover:underline">
                План
              </Link>{" "}
              и нажми «Сохранить как задачи».
            </p>
          </div>
        )}

        {groups.map((g) => (
          <section key={g.label} className="space-y-2">
            <h2 className="font-mono-label text-[11px] uppercase tracking-wider text-cream-3 flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5" /> {g.label}
              <span className="text-cream-3/70">· {g.tasks.filter((t) => t.status === "done").length}/{g.tasks.length}</span>
            </h2>
            <div className="space-y-2">
              {g.tasks.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={() => toggle(t)} onRemove={() => remove(t)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function TaskRow({ task, onToggle, onRemove }: { task: PlanTask; onToggle: () => void; onRemove: () => void }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [due, setDue] = useState(task.due_date ?? "")
  const [kind, setKind] = useState(task.deadline_kind)
  const [pending, start] = useTransition()
  const done = task.status === "done"
  const days = daysFromToday(task.due_date)
  const overdue = !done && days !== null && days < 0

  function save() {
    start(async () => {
      const res = await updatePlanTask(task.id, { title, due_date: due, deadline_kind: kind })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Сохранено")
      window.location.reload()
    })
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card/40 border-l-4 px-3 py-2.5 flex items-start gap-3",
        PRIORITY_RING[task.priority],
        done && "opacity-60"
      )}
    >
      <button onClick={onToggle} className="mt-0.5 shrink-0 text-gold" aria-label={done ? "Вернуть в работу" : "Отметить сделанной"}>
        {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 text-cream-3 hover:text-gold" />}
      </button>
      <div className="flex-1 min-w-0 space-y-1">
        {editing ? (
          <div className="flex flex-wrap gap-2 items-center">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 min-w-[180px]" />
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-40" />
            <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="h-8 rounded-md border border-border bg-card px-2 text-xs">
              {Object.entries(DEADLINE_KIND_LABELS).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={save} disabled={pending}><Check className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5" /></Button>
          </div>
        ) : (
          <>
            <p className={cn("font-display text-sm", done && "line-through")}>{task.title}</p>
            {task.description && <p className="font-serif text-xs text-cream-2 line-clamp-2">{task.description}</p>}
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono-label">
              {task.due_date && (
                <span className={cn("inline-flex items-center gap-1", overdue ? "text-rose-300" : "text-cream-2")}>
                  {formatIsoDate(task.due_date)}
                  {days !== null && !done && (days < 0 ? ` · просрочено ${Math.abs(days)}д` : days === 0 ? " · сегодня" : ` · ${days}д`)}
                </span>
              )}
              <span className={cn("rounded-full border px-1.5 py-0", KIND_CHIP[task.deadline_kind])}>{DEADLINE_KIND_LABELS[task.deadline_kind]}</span>
              <span className="text-cream-3">{task.category}</span>
              {task.application_id && (
                <Link href="/applications" className="text-gold hover:underline">заявка →</Link>
              )}
              {task.scholarship_id && (
                <Link href={`/scholarships/${task.scholarship_id}`} className="text-gold hover:underline">стипендия →</Link>
              )}
            </div>
          </>
        )}
      </div>
      {!editing && (
        <div className="flex gap-1 shrink-0">
          <button onClick={() => setEditing(true)} className="text-cream-3 hover:text-gold" aria-label="Редактировать">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onRemove} className="text-cream-3 hover:text-rose-300" aria-label="Удалить">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
