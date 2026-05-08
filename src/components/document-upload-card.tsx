"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Upload, FileText, Loader2, Check, X, FileImage, FileBadge,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ApplicantProfile } from "@/lib/applicant/types"

const HINTS = [
  { value: "transcript", label: "📜 Transcript / выписка оценок" },
  { value: "test_report", label: "🎯 SAT / IELTS / TOEFL report" },
  { value: "cv", label: "📄 CV / Resume" },
  { value: "passport", label: "🛂 Паспорт / ID" },
  { value: "diploma", label: "🎓 Диплом / Сертификат" },
  { value: "other", label: "Что-то другое" },
] as const

type ExtractedShape = {
  personal: Record<string, string>
  academic: Record<string, string>
  goals: Record<string, string>
  experience: string
  activities: string
  awards: string
  projects: string
  skillsTech: string
  skillsLang: string
  notes: string
}

/**
 * Upload a transcript / test report / CV → AI extracts fields → user reviews → merge.
 *
 * `onApply` receives a partial ApplicantProfile patch. The parent decides
 * how to merge (we recommend non-destructive: only fill empty fields).
 */
export function DocumentUploadCard({
  onApply,
}: {
  onApply: (patch: Partial<ApplicantProfile>) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [hint, setHint] = useState<(typeof HINTS)[number]["value"]>("transcript")
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedShape | null>(null)

  function pickFile() {
    inputRef.current?.click()
  }

  async function onFile(f: File | null | undefined) {
    if (!f) return
    setFile(f)
    setExtracted(null)
    await parse(f)
  }

  async function parse(f: File) {
    setParsing(true)
    try {
      const fd = new FormData()
      fd.append("file", f)
      fd.append("hint", hint)

      const res = await fetch("/api/profile/parse-document", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.message ?? json.error ?? "Не удалось разобрать")
        return
      }
      setExtracted(json.extracted)
      const filled = countFilled(json.extracted)
      if (filled === 0) {
        toast.warning("AI не нашёл полезных полей в этом документе")
      } else {
        toast.success(`Распознано полей: ${filled}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка загрузки")
    } finally {
      setParsing(false)
    }
  }

  function apply() {
    if (!extracted) return
    const patch = extractedToPatch(extracted)
    onApply(patch)
    toast.success("Поля добавлены в профиль · нажми «Сохранить» внизу")
    discard()
  }

  function discard() {
    setFile(null)
    setExtracted(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="rounded-xl border border-gold/20 bg-gradient-to-br from-gold/5 to-transparent p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15 shrink-0">
          <Upload className="h-5 w-5 text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg">Загрузи документ — заполню за тебя</h3>
          <p className="font-serif text-sm text-cream-2 leading-relaxed">
            PDF транскрипта, скан SAT-репорта, CV или паспорта. AI извлечёт поля и покажет
            что нашёл — ты решаешь, добавлять ли в профиль.
          </p>
        </div>
      </div>

      {/* Type picker */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {HINTS.map((h) => (
          <button
            key={h.value}
            type="button"
            onClick={() => setHint(h.value)}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs font-mono-label text-left transition-colors",
              hint === h.value
                ? "border-gold/50 bg-gold/10 text-gold"
                : "border-border bg-card/40 text-cream-2 hover:border-gold/30"
            )}
          >
            {h.label}
          </button>
        ))}
      </div>

      {/* Upload area */}
      {!file && !parsing && (
        <button
          type="button"
          onClick={pickFile}
          className="w-full rounded-xl border-2 border-dashed border-border/60 hover:border-gold/40 hover:bg-card/40 transition-all p-8 flex flex-col items-center gap-2 text-center"
        >
          <Upload className="h-8 w-8 text-cream-3" />
          <p className="font-display text-base">Выбрать файл</p>
          <p className="font-mono-label text-[11px] text-cream-3">
            PDF · PNG · JPG · до 20 MB
          </p>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      {/* Parsing state */}
      {parsing && file && (
        <div className="rounded-xl border border-border bg-card/40 p-5 flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-gold animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm truncate">Читаю «{file.name}»...</p>
            <p className="font-mono-label text-[11px] text-cream-3">обычно занимает 5-15 секунд</p>
          </div>
        </div>
      )}

      {/* Preview */}
      {extracted && !parsing && (
        <div className="rounded-xl border border-gold/30 bg-card/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileIcon mime={file?.type ?? ""} />
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm truncate">{file?.name}</p>
              <p className="font-mono-label text-[10px] text-cream-3">
                {countFilled(extracted)} полей распознано
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={discard} aria-label="Отменить">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <ExtractedPreview data={extracted} />

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
            <Button onClick={apply} className="gap-2">
              <Check className="h-4 w-4" />
              Добавить в профиль
            </Button>
            <Button variant="outline" onClick={discard}>
              Отменить
            </Button>
          </div>
          <p className="font-mono-label text-[10px] text-cream-3">
            Существующие непустые поля не перезапишутся — добавятся только пробелы.
          </p>
        </div>
      )}
    </div>
  )
}

function FileIcon({ mime }: { mime: string }) {
  if (mime === "application/pdf") return <FileText className="h-4 w-4 text-gold" />
  if (mime.startsWith("image/")) return <FileImage className="h-4 w-4 text-gold" />
  return <FileBadge className="h-4 w-4 text-gold" />
}

function ExtractedPreview({ data }: { data: ExtractedShape }) {
  const rows: Array<{ label: string; value: string }> = []
  const push = (l: string, v: string) => v && v.trim() && rows.push({ label: l, value: v })

  push("Имя", data.personal.name)
  push("Возраст", data.personal.age)
  push("Гражданство", data.personal.citizenship)
  push("Город", data.personal.location)
  push("Email", data.personal.email)
  push("Телефон", data.personal.phone)

  push("Школа", data.academic.school)
  push("Тип школы", data.academic.schoolType)
  push("GPA", data.academic.gpa)
  push("SAT", data.academic.sat)
  push("ACT", data.academic.act)
  push("IELTS", data.academic.ielts)
  push("TOEFL", data.academic.toefl)
  push("Duolingo", data.academic.duolingo)
  push("AP/IB", data.academic.apIb)

  push("Уровень", data.goals.level)
  push("Год", data.goals.year)
  push("Specialty", data.goals.major)
  push("Страны", data.goals.countries)
  push("Универы", data.goals.targetUnis)

  if (data.experience) push("Опыт", trim(data.experience))
  if (data.activities) push("Активности", trim(data.activities))
  if (data.awards) push("Награды", trim(data.awards))
  if (data.projects) push("Проекты", trim(data.projects))
  if (data.skillsTech) push("Tech skills", trim(data.skillsTech))
  if (data.skillsLang) push("Языки", trim(data.skillsLang))
  if (data.notes) push("Заметки AI", trim(data.notes))

  if (rows.length === 0) {
    return (
      <p className="font-serif text-sm text-cream-3 italic">
        Полей не найдено. Попробуй другой документ или тип.
      </p>
    )
  }

  return (
    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5 max-h-[40vh] overflow-y-auto">
      {rows.map(({ label, value }, i) => (
        <div key={i} className="text-sm">
          <span className="font-mono-label text-[10px] text-cream-3">{label}: </span>
          <span className="font-serif text-cream-2 break-words">{value}</span>
        </div>
      ))}
    </div>
  )
}

function trim(s: string, n = 200) {
  return s.length > n ? s.slice(0, n) + "…" : s
}

function countFilled(d: ExtractedShape): number {
  let n = 0
  for (const k of Object.keys(d.personal)) if (d.personal[k]?.trim()) n++
  for (const k of Object.keys(d.academic)) if (d.academic[k]?.trim()) n++
  for (const k of Object.keys(d.goals)) if (d.goals[k]?.trim()) n++
  for (const k of ["experience", "activities", "awards", "projects", "skillsTech", "skillsLang"] as const) {
    if (d[k]?.trim()) n++
  }
  return n
}

/**
 * Convert AI extraction to ApplicantProfile patch with empty strings stripped.
 * Parent merges non-destructively — see useApplyExtraction below.
 */
function extractedToPatch(d: ExtractedShape): Partial<ApplicantProfile> {
  const patch: Partial<ApplicantProfile> = {}

  const personal = stripEmpty(d.personal)
  const academic = stripEmpty(d.academic)
  const goals = stripEmpty(d.goals)
  if (Object.keys(personal).length) patch.personal = personal as ApplicantProfile["personal"]
  if (Object.keys(academic).length) patch.academic = academic as ApplicantProfile["academic"]
  if (Object.keys(goals).length) patch.goals = goals as ApplicantProfile["goals"]

  if (d.experience.trim()) patch.experience = d.experience.trim()
  if (d.activities.trim()) patch.activities = d.activities.trim()
  if (d.awards.trim()) patch.awards = d.awards.trim()
  if (d.projects.trim()) patch.projects = d.projects.trim()
  if (d.skillsTech.trim()) patch.skillsTech = d.skillsTech.trim()
  if (d.skillsLang.trim()) patch.skillsLang = d.skillsLang.trim()

  return patch
}

function stripEmpty(obj: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v && v.trim()) out[k] = v.trim()
  }
  return out
}

/**
 * Helper exported for parents — non-destructive merge.
 * Existing non-empty fields are preserved.
 */
export function mergeProfilePatch(
  current: ApplicantProfile,
  patch: Partial<ApplicantProfile>
): ApplicantProfile {
  const merged: ApplicantProfile = { ...current }

  if (patch.personal) {
    merged.personal = { ...current.personal }
    for (const [k, v] of Object.entries(patch.personal)) {
      const key = k as keyof ApplicantProfile["personal"]
      if (!current.personal[key] && v) {
        ;(merged.personal as Record<string, string>)[key] = v as string
      }
    }
  }
  if (patch.academic) {
    merged.academic = { ...current.academic }
    for (const [k, v] of Object.entries(patch.academic)) {
      const key = k as keyof ApplicantProfile["academic"]
      if (!current.academic[key] && v) {
        ;(merged.academic as Record<string, string>)[key] = v as string
      }
    }
  }
  if (patch.goals) {
    merged.goals = { ...current.goals }
    for (const [k, v] of Object.entries(patch.goals)) {
      const key = k as keyof ApplicantProfile["goals"]
      if (!current.goals[key] && v) {
        ;(merged.goals as Record<string, string>)[key] = v as string
      }
    }
  }
  for (const k of ["experience", "activities", "awards", "projects", "skillsTech", "skillsLang"] as const) {
    if (!current[k] && patch[k]) merged[k] = patch[k]
  }
  return merged
}
