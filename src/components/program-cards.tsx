"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { upsertApplication } from "@/lib/applications/actions"
import { addPlanTask } from "@/lib/plan/actions"
import { logEvent } from "@/lib/analytics/actions"
import { MATCH_LABELS, type Program, type ProgramMatch } from "@/lib/programs/types"
import { formatIsoDate } from "@/lib/dates"
import { ExternalLink, FilePlus2, CalendarPlus, Check } from "lucide-react"

const STATUS_CHIP: Record<ProgramMatch["status"], string> = {
  meets: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  conditions: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  not_eligible: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  insufficient_data: "bg-card/40 text-cream-3 border-border",
}

/**
 * Structured cards for the programmes the advisor actually used (P1-03):
 * every card links to the official page and offers "draft application" and
 * "official deadline → plan" without retyping anything.
 */
export function ProgramCards({ items }: { items: Array<{ program: Program; match: ProgramMatch }> }) {
  if (!items.length) return null
  const inside = items.filter((i) => i.match.outsideRequest.length === 0)
  const alternatives = items.filter((i) => i.match.outsideRequest.length > 0 && !i.match.outsideRequest.includes("level"))
  return (
    <div className="mt-8 space-y-4">
      <p className="font-mono-label text-[11px] uppercase tracking-wider text-cream-3">
        Программы из проверенной базы, использованные в подборе
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {inside.map((i) => (
          <ProgramCard key={i.program.id} program={i.program} match={i.match} />
        ))}
      </div>
      {alternatives.length > 0 && (
        <>
          <p className="font-mono-label text-[11px] uppercase tracking-wider text-cream-3 pt-2">Альтернативы вне заданных условий</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {alternatives.map((i) => (
              <ProgramCard key={i.program.id} program={i.program} match={i.match} alternative />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ProgramCard({ program: p, match: m, alternative }: { program: Program; match: ProgramMatch; alternative?: boolean }) {
  const [pending, start] = useTransition()
  const [drafted, setDrafted] = useState(false)
  const [planned, setPlanned] = useState(false)
  const officialDeadline = p.deadline_status === "published" && p.application_deadline ? p.application_deadline : null

  function draftApplication() {
    start(async () => {
      const res = await upsertApplication({
        university_name: p.university_name,
        university_country: p.country,
        program: p.program_name,
        level: p.level === "bachelor" ? "Bachelor" : p.level === "master" ? "Master" : p.level === "phd" ? "PhD" : "",
        deadline: officialDeadline ?? "",
        status: "planning",
        priority: m.status === "meets" ? "safety" : m.status === "conditions" ? "match" : "reach",
        notes: `Черновик из подбора · ${MATCH_LABELS[m.status]}${m.reasons.length ? ` — ${m.reasons.join("; ")}` : ""}\nИсточник: ${p.source_url}`,
      } as Parameters<typeof upsertApplication>[0])
      if (!res.ok) {
        toast.error(res.error ?? "Не удалось создать заявку")
        return
      }
      setDrafted(true)
      void logEvent("program_draft_created", { country: p.country, status: m.status, has_deadline: Boolean(officialDeadline) })
      toast.success("Черновик заявки создан — раздел «Заявки»")
    })
  }

  function addDeadline() {
    start(async () => {
      const res = await addPlanTask({
        title: `Дедлайн: ${p.university_name} — ${p.program_name}`,
        due_date: officialDeadline ?? "",
        deadline_kind: officialDeadline ? "official" : "estimate",
        priority: "high",
        category: "application",
        source: "program",
        program_id: p.id,
      })
      if (!res.ok) {
        toast.error(res.error === "plan_table_missing" ? "Раздел «План» ещё не активирован (миграция 0026)" : res.error)
        return
      }
      setPlanned(true)
      void logEvent("program_deadline_saved", { country: p.country, kind: officialDeadline ? "official" : "estimate" })
      toast.success("Добавлено в план")
    })
  }

  return (
    <div className={cn("rounded-xl border border-border/60 bg-card/40 p-4 space-y-2", alternative && "opacity-80")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-sm truncate">{p.university_name}</p>
          <p className="font-serif text-xs text-cream-2">{p.program_name}</p>
          <p className="font-mono-label text-[10px] text-cream-3 mt-0.5">
            {p.city ? `${p.city}, ` : ""}{p.country} · {p.language.toUpperCase()} · набор {p.intake_year ?? "—"}
          </p>
        </div>
        <a href={p.source_url} target="_blank" rel="noreferrer" className="text-cream-3 hover:text-gold shrink-0" aria-label="Официальная страница">
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      <div className="flex flex-wrap gap-1.5 text-[10px] font-mono-label">
        <span className={cn("rounded-full border px-1.5 py-0", STATUS_CHIP[m.status])}>{MATCH_LABELS[m.status]}</span>
        {p.status !== "verified" && <span className="rounded-full border border-amber-500/30 text-amber-300 px-1.5 py-0">требует проверки</span>}
        {officialDeadline ? (
          <span className="text-cream-2">дедлайн {formatIsoDate(officialDeadline)}</span>
        ) : (
          <span className="text-cream-3">дедлайн не опубликован</span>
        )}
      </div>
      {m.reasons.length > 0 && <p className="font-serif text-[11px] text-cream-2 line-clamp-3">{m.reasons.join("; ")}</p>}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={draftApplication} disabled={pending || drafted} className="gap-1.5">
          {drafted ? <Check className="h-3.5 w-3.5" /> : <FilePlus2 className="h-3.5 w-3.5" />}
          {drafted ? "Черновик создан" : "Черновик заявки"}
        </Button>
        <Button size="sm" variant="outline" onClick={addDeadline} disabled={pending || planned} className="gap-1.5">
          {planned ? <Check className="h-3.5 w-3.5" /> : <CalendarPlus className="h-3.5 w-3.5" />}
          {planned ? "В плане" : officialDeadline ? "Дедлайн в план" : "В план (уточнить дату)"}
        </Button>
      </div>
    </div>
  )
}
