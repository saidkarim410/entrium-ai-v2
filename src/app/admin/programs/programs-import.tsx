"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Loader2 } from "lucide-react"

type ImportResult = { imported: number; errors: Array<{ line: number; error: string }> } | { error: string }

/** Paste-or-upload CSV importer for the programme base (admin only). */
export function ProgramsImport({ columns }: { columns: string[] }) {
  const [csv, setCsv] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function onFile(file: File) {
    setCsv(await file.text())
  }

  async function submit() {
    if (!csv.trim()) return
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch("/api/admin/programs/import", {
        method: "POST",
        headers: { "Content-Type": "text/csv; charset=utf-8" },
        body: csv,
      })
      setResult((await res.json()) as ImportResult)
      if (res.ok) window.location.reload()
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Ошибка" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="font-display text-sm">Импорт CSV</p>
        <label className="text-xs font-mono-label text-cream-2 cursor-pointer hover:text-gold">
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          выбрать файл…
        </label>
      </div>
      <p className="text-[11px] text-cream-3 font-mono break-all">
        колонки (порядок любой, по заголовку): {columns.join(", ")}
      </p>
      <Textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={6} placeholder="Вставьте CSV с заголовком…" className="font-mono text-xs" />
      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={busy || !csv.trim()} size="sm" className="gap-2">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Импортировать
        </Button>
        {result && "imported" in result && (
          <span className="text-xs text-cream-2">
            Импортировано: {result.imported}
            {result.errors.length > 0 && ` · ошибок: ${result.errors.length}`}
          </span>
        )}
        {result && "error" in result && <span className="text-xs text-destructive">{result.error}</span>}
      </div>
      {result && "errors" in result && result.errors.length > 0 && (
        <ul className="text-[11px] text-destructive space-y-0.5 max-h-40 overflow-y-auto">
          {result.errors.map((e, i) => (
            <li key={i}>строка {e.line}: {e.error}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
