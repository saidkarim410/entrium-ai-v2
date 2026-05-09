"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import { Sparkles, Loader2, Trash2, Plus, Check } from "lucide-react"
import { bulkInsertApplications } from "@/lib/applications/actions"
import { APP_LEVELS, type AppLevel } from "@/lib/applications/types"
import { cn } from "@/lib/utils"

type ParsedItem = {
  university_name: string
  university_country: string
  program: string
  level: string
  round: string
  deadline: string
  priority: string
  notes: string
}

type Phase = "input" | "preview"

export function BulkAddDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>("input")
  const [text, setText] = useState("")
  const [items, setItems] = useState<ParsedItem[]>([])
  const [parsing, setParsing] = useState(false)
  const [pending, startTransition] = useTransition()

  function reset() {
    setPhase("input")
    setText("")
    setItems([])
    setParsing(false)
  }

  async function parse() {
    if (text.trim().length < 5) {
      toast.error("Опиши куда подаёшь")
      return
    }
    setParsing(true)
    try {
      const res = await fetch("/api/applications/bulk-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.message ?? json.error ?? "AI не смог разобрать")
        return
      }
      const parsed = (json.items as ParsedItem[]) ?? []
      if (parsed.length === 0) {
        toast.error("AI не нашёл университетов в тексте")
        return
      }
      setItems(parsed)
      setPhase("preview")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка")
    } finally {
      setParsing(false)
    }
  }

  function updateItem(idx: number, patch: Partial<ParsedItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function commit() {
    const valid = items.filter((it) => it.university_name.trim())
    if (valid.length === 0) {
      toast.error("Нет ни одной заявки с университетом")
      return
    }
    startTransition(async () => {
      const r = await bulkInsertApplications(
        valid.map((it) => ({
          university_name: it.university_name.trim(),
          university_country: it.university_country.trim() || undefined,
          program: it.program.trim() || undefined,
          level: (it.level as AppLevel) || "",
          round: it.round.trim() || undefined,
          deadline: it.deadline.trim() || undefined,
          priority: (it.priority || "match") as "reach" | "match" | "safety",
          notes: it.notes.trim() || undefined,
        }))
      )
      if (!r.ok) {
        toast.error(r.error ?? "Не удалось сохранить")
        return
      }
      toast.success(`Добавлено ${r.inserted} ${r.inserted === 1 ? "заявка" : "заявок"}`)
      setOpen(false)
      // Reset for next open
      setTimeout(reset, 300)
      // Refresh list
      window.location.reload()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setTimeout(reset, 200)
      }}
    >
      <DialogTrigger render={<>{trigger}</>} />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" />
            Bulk add · AI парсит твой список
          </DialogTitle>
        </DialogHeader>

        {phase === "input" && (
          <div className="space-y-3 py-2">
            <Label className="font-mono-label text-[11px] text-cream-3">
              Вставь любой формат — список, абзац, выписка из email, заметка
            </Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={9}
              placeholder={`Примеры:
• MIT EA, Stanford RD, Harvard EA Dec 1
• Yale (CS, EA), Princeton (CS, RD by Jan 1)
• I'm applying to MIT, Cambridge for engineering, and TUM in Germany

Чем больше деталей (раунд, дедлайн, программа) — тем точнее AI распарсит.`}
              className="font-serif"
            />
            <p className="font-mono-label text-[10px] text-cream-3">
              AI распарсит до 20 заявок. Cтоимость: 1 запрос из дневной квоты. Сможешь поправить каждую перед сохранением.
            </p>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={parsing}>
                Отмена
              </Button>
              <Button onClick={parse} disabled={parsing || text.trim().length < 5} className="gap-2">
                {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {parsing ? "Парсю..." : "Распарсить"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {phase === "preview" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono-label text-[11px] text-cream-3">
                AI распознал {items.length} {items.length === 1 ? "заявку" : "заявок"} · поправь и сохрани
              </p>
              <Button variant="ghost" size="sm" onClick={() => setPhase("input")}>
                ← Изменить ввод
              </Button>
            </div>

            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border bg-card/40 p-3 space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded font-mono-label text-[10px] bg-gold/15 text-gold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <Input
                      value={item.university_name}
                      onChange={(e) => updateItem(idx, { university_name: e.target.value })}
                      placeholder="University name"
                      className={cn("h-9 flex-1", !item.university_name.trim() && "border-rose-500/50")}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeItem(idx)}
                      className="text-destructive hover:text-destructive shrink-0 mt-0.5"
                      aria-label="Удалить"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-8">
                    <Input
                      value={item.program}
                      onChange={(e) => updateItem(idx, { program: e.target.value })}
                      placeholder="Program"
                      className="h-8 text-xs"
                    />
                    <select
                      value={item.level}
                      onChange={(e) => updateItem(idx, { level: e.target.value })}
                      className="h-8 rounded-md border border-border bg-card px-2 text-xs focus:outline-none"
                    >
                      <option value="">Level</option>
                      {APP_LEVELS.map((l) => (
                        <option key={l} value={l} className="bg-background">{l}</option>
                      ))}
                    </select>
                    <Input
                      value={item.round}
                      onChange={(e) => updateItem(idx, { round: e.target.value })}
                      placeholder="ED/EA/RD"
                      className="h-8 text-xs"
                    />
                    <Input
                      type="date"
                      value={item.deadline}
                      onChange={(e) => updateItem(idx, { deadline: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pl-8">
                    <select
                      value={item.priority}
                      onChange={(e) => updateItem(idx, { priority: e.target.value })}
                      className="h-8 rounded-md border border-border bg-card px-2 text-xs focus:outline-none"
                    >
                      <option value="">Priority</option>
                      <option value="reach" className="bg-background">Reach</option>
                      <option value="match" className="bg-background">Match</option>
                      <option value="safety" className="bg-background">Safety</option>
                    </select>
                    <Input
                      value={item.university_country}
                      onChange={(e) => updateItem(idx, { university_country: e.target.value })}
                      placeholder="Country"
                      className="h-8 text-xs"
                    />
                  </div>

                  {item.notes && (
                    <div className="pl-8">
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono-label">
                        {item.notes}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter className="border-t border-border/40 pt-3">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Отмена
              </Button>
              <Button onClick={commit} disabled={pending || items.length === 0} className="gap-2">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {pending ? "Сохраняю..." : `Добавить ${items.length}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
