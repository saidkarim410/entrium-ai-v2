"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Keyboard } from "lucide-react"
import { cn } from "@/lib/utils"

type Shortcut = { keys: string[]; label: string; section: string }

const SHORTCUTS: Shortcut[] = [
  // Navigation
  { keys: ["Ctrl", "K"], label: "Глобальный поиск (университеты, заявки, история, инструменты)", section: "Навигация" },
  { keys: ["Ctrl", "/"], label: "Показать эту шпаргалку", section: "Навигация" },
  { keys: ["Esc"], label: "Закрыть диалог / overlay", section: "Навигация" },

  // Inside Cmd+K
  { keys: ["↑", "↓"], label: "Перебор результатов", section: "В поиске" },
  { keys: ["Enter"], label: "Перейти на выбранный результат", section: "В поиске" },

  // AI tools
  { keys: ["click on Mic"], label: "Голосовой ввод в любую textarea (90 сек, Whisper)", section: "AI" },
  { keys: ["click", "Sparkles"], label: "AI review / rewrite / match — везде где видишь золотую звёздочку", section: "AI" },

  // Counselor
  { keys: ["click bottom-right ⚡"], label: "Открыть AI Counselor чат на любой странице", section: "Counselor" },

  // Forms
  { keys: ["Tab"], label: "Следующее поле формы", section: "Формы" },
  { keys: ["Shift", "Tab"], label: "Предыдущее поле", section: "Формы" },
]

export function KbdOverlay() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ctrl+/ or Cmd+/ (US layout uses ?, but / is the actual key)
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Group shortcuts by section
  const sections = SHORTCUTS.reduce<Record<string, Shortcut[]>>((acc, s) => {
    ;(acc[s.section] ??= []).push(s)
    return acc
  }, {})

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-gold" />
            Горячие клавиши
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {Object.entries(sections).map(([section, items]) => (
            <div key={section} className="space-y-1.5">
              <p className="font-mono-label text-[10px] text-gold uppercase tracking-wider">
                {section}
              </p>
              <ul className="space-y-1">
                {items.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-3 rounded-md border border-border bg-card/40 p-2.5"
                  >
                    <span className="font-serif text-sm text-cream-2 flex-1 min-w-0">
                      {s.label}
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      {s.keys.map((k, j) => (
                        <span key={j} className="contents">
                          {j > 0 && <span className="text-cream-3 text-[10px]">+</span>}
                          <kbd
                            className={cn(
                              "inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded border bg-card",
                              "font-mono text-[10px] uppercase",
                              "border-border text-cream-2",
                            )}
                          >
                            {k}
                          </kbd>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-[10px] font-mono-label text-cream-3 text-center pt-2 border-t border-border/40">
          Mac: используй ⌘ вместо Ctrl. На iPhone/iPad клавиатура — обычная Bluetooth.
        </p>
      </DialogContent>
    </Dialog>
  )
}
