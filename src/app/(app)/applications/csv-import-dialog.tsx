"use client"

import { useState, useTransition, type ReactElement } from "react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react"
import { bulkInsertApplications, type AppInput } from "@/lib/applications/actions"
import { APP_STATUSES, APP_PRIORITIES, type AppStatus, type AppPriority } from "@/lib/applications/types"
import { cn } from "@/lib/utils"

/**
 * CSV import dialog (F-10 from TZ_FULLSTACK.md).
 *
 * Two ways in:
 *   1. Paste CSV text directly (the textarea)
 *   2. Drop / pick a .csv file
 *
 * Supported columns (case-insensitive):
 *   university_name (required), country, program, level, round, deadline,
 *   status, priority, fee_usd, notes
 *
 * After parsing, user sees a preview table with row-by-row validation
 * status. Only valid rows are submitted. CSV with quoted fields is
 * supported via a small RFC-4180 parser.
 */

type ParsedRow = {
  raw: Record<string, string>
  app: AppInput
  errors: string[]
}

const SAMPLE = `university_name,country,program,level,round,deadline,priority,notes
MIT,USA,Computer Science,Bachelor,EA,2026-11-01,reach,Need 2 LORs
Stanford,USA,Computer Science,Bachelor,RD,2026-01-05,reach,Reused MIT essay
ETH Zurich,Switzerland,Mathematics,Bachelor,Regular,2026-04-30,match,
NUS,Singapore,Computer Science,Bachelor,Regular,2026-03-15,match,Visa first
`

export function CsvImportDialog({ trigger }: { trigger?: ReactElement }) {
  const [open, setOpen] = useState(false)
  const [csvText, setCsvText] = useState("")
  const [rows, setRows] = useState<ParsedRow[] | null>(null)
  const [pending, startTransition] = useTransition()

  function reset() {
    setCsvText("")
    setRows(null)
  }

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? "")
      setCsvText(text)
      parse(text)
    }
    reader.readAsText(file, "utf-8")
  }

  function parse(text: string) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length < 2) {
      setRows([])
      return
    }
    const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
    const idx = (key: string | string[]) => {
      const keys = Array.isArray(key) ? key : [key]
      for (const k of keys) {
        const i = header.indexOf(k)
        if (i >= 0) return i
      }
      return -1
    }
    const colName = idx(["university_name", "name", "university", "school"])
    const colCountry = idx(["country", "university_country"])
    const colProgram = idx(["program", "major"])
    const colLevel = idx(["level"])
    const colRound = idx(["round"])
    const colDeadline = idx(["deadline", "due"])
    const colStatus = idx(["status"])
    const colPriority = idx(["priority"])
    const colFee = idx(["fee_usd", "fee", "application_fee_usd", "application_fee"])
    const colNotes = idx(["notes", "note", "comment"])

    const out: ParsedRow[] = []
    for (let li = 1; li < lines.length; li++) {
      const cols = parseCsvLine(lines[li])
      const get = (i: number) => (i >= 0 ? (cols[i] ?? "").trim() : "")
      const raw: Record<string, string> = {}
      header.forEach((h, i) => { raw[h] = (cols[i] ?? "").trim() })

      const errors: string[] = []
      const name = get(colName)
      if (!name) errors.push("university_name пустой")

      const deadline = get(colDeadline)
      if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
        errors.push("deadline должен быть YYYY-MM-DD")
      }

      const status = get(colStatus).toLowerCase() as AppStatus
      if (status && !APP_STATUSES.includes(status)) {
        errors.push(`status: ${status} не валиден (${APP_STATUSES.join("/")})`)
      }

      const priority = get(colPriority).toLowerCase() as AppPriority
      if (priority && !APP_PRIORITIES.includes(priority)) {
        errors.push(`priority: ${priority} не валиден (reach/match/safety)`)
      }

      const feeStr = get(colFee)
      const fee = feeStr ? Number(feeStr.replace(/[^0-9.]/g, "")) : undefined
      if (feeStr && Number.isNaN(fee)) errors.push("fee_usd: нечисловое значение")

      const app: AppInput = {
        university_name: name,
        university_country: get(colCountry) || undefined,
        program: get(colProgram) || undefined,
        level: (get(colLevel) || "") as AppInput["level"],
        round: get(colRound) || undefined,
        deadline: deadline || undefined,
        status: (status || "planning") as AppStatus,
        priority: (priority || "match") as AppPriority,
        application_fee_usd: fee,
        notes: get(colNotes) || undefined,
      }

      out.push({ raw, app, errors })
    }
    setRows(out)
  }

  function submit() {
    if (!rows) return
    const valid = rows.filter((r) => r.errors.length === 0).map((r) => r.app)
    if (valid.length === 0) {
      toast.error("Нет валидных строк")
      return
    }
    startTransition(async () => {
      const res = await bulkInsertApplications(valid)
      if (!res.ok) {
        toast.error(res.error ?? "Не удалось импортировать")
        return
      }
      toast.success(`Импортировано: ${res.inserted}`)
      setOpen(false)
      reset()
      window.location.reload()
    })
  }

  const validCount = rows?.filter((r) => r.errors.length === 0).length ?? 0
  const errorCount = rows?.filter((r) => r.errors.length > 0).length ?? 0

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
      <DialogTrigger render={trigger ?? (
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4 text-cream-3" />
          Import CSV
        </Button>
      )} />
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-gold" />
            Импорт заявок из CSV
          </DialogTitle>
        </DialogHeader>

        {!rows && (
          <div className="space-y-4">
            <p className="font-serif text-sm text-cream-2 leading-relaxed">
              Вставь CSV в текстовое поле или загрузи файл. Колонки (регистр не важен):
              <code className="ml-1 font-mono text-[11px] text-cream-3">
                university_name, country, program, level, round, deadline, priority, status, fee_usd, notes
              </code>
            </p>

            <label
              className="block rounded-xl border-2 border-dashed border-border bg-card/20 px-4 py-6 text-center cursor-pointer hover:border-gold/40 transition-colors"
            >
              <Upload className="h-6 w-6 text-cream-3 mx-auto mb-2" />
              <p className="font-display text-sm">Выбрать .csv файл</p>
              <p className="font-mono-label text-[10px] text-cream-3 mt-1">или вставь в поле ниже</p>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
            </label>

            <Textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={SAMPLE}
              rows={10}
              className="font-mono text-xs"
            />

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCsvText(SAMPLE)}
                className="text-xs font-mono-label text-cream-3 hover:text-gold transition-colors"
              >
                Вставить пример →
              </button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>Отмена</Button>
                <Button onClick={() => parse(csvText)} disabled={!csvText.trim()} className="gap-2">
                  Парсить
                </Button>
              </div>
            </div>
          </div>
        )}

        {rows && rows.length === 0 && (
          <div className="space-y-3 text-center py-6">
            <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
            <p className="font-display">Файл пустой или нет заголовка</p>
            <Button variant="outline" onClick={() => setRows(null)}>← Назад</Button>
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono-label text-xs text-cream-3">
                Распознано: {rows.length}
              </span>
              <span className="rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-mono-label">
                Валидно: {validCount}
              </span>
              {errorCount > 0 && (
                <span className="rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2 py-0.5 text-[11px] font-mono-label">
                  С ошибками: {errorCount}
                </span>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card/30 max-h-80 overflow-y-auto">
              <table className="w-full text-xs font-mono">
                <thead className="bg-card/50 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1.5 w-8"></th>
                    <th className="text-left px-2 py-1.5">University</th>
                    <th className="text-left px-2 py-1.5">Program</th>
                    <th className="text-left px-2 py-1.5">Round</th>
                    <th className="text-left px-2 py-1.5">Deadline</th>
                    <th className="text-left px-2 py-1.5">Pri</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      className={cn(
                        "border-t border-border/40",
                        r.errors.length > 0 && "bg-rose-500/5",
                      )}
                    >
                      <td className="px-2 py-1.5">
                        {r.errors.length === 0 ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <span title={r.errors.join("; ")} className="inline-block">
                            <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-cream-2 truncate max-w-[160px]">{r.app.university_name || "—"}</td>
                      <td className="px-2 py-1.5 text-cream-3 truncate max-w-[120px]">{r.app.program || "—"}</td>
                      <td className="px-2 py-1.5 text-cream-3">{r.app.round || "—"}</td>
                      <td className="px-2 py-1.5 text-cream-3">{r.app.deadline || "—"}</td>
                      <td className="px-2 py-1.5 text-cream-3">{r.app.priority || "match"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {errorCount > 0 && (
              <details className="rounded-lg bg-rose-500/5 border border-rose-500/20 px-3 py-2 text-[11px]">
                <summary className="cursor-pointer font-mono-label text-rose-300">Показать ошибки</summary>
                <ul className="mt-2 space-y-1 font-mono text-rose-300/80">
                  {rows.filter((r) => r.errors.length > 0).map((r, i) => (
                    <li key={i}>
                      <span className="text-rose-300">{r.app.university_name || "(без имени)"}</span>
                      <span className="text-rose-300/60"> · {r.errors.join("; ")}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={() => setRows(null)}>← Назад</Button>
              <Button
                onClick={submit}
                disabled={validCount === 0 || pending}
                className="gap-2"
              >
                {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Импортирую...</> : `Импортировать ${validCount}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Minimal RFC-4180 CSV line parser. Supports quoted fields with embedded
 * commas and escaped double-quotes ("" → "). Doesn't support multi-line
 * quoted fields — keeps things simple for a typical paste-from-Excel use
 * case where rows are line-separated.
 */
function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let i = 0
  let cur = ""
  let inQuotes = false
  while (i < line.length) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === "\"") {
        if (line[i + 1] === "\"") {
          cur += "\""
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      cur += ch
      i++
      continue
    }
    if (ch === ",") {
      out.push(cur)
      cur = ""
      i++
      continue
    }
    if (ch === "\"") {
      inQuotes = true
      i++
      continue
    }
    cur += ch
    i++
  }
  out.push(cur)
  return out
}
