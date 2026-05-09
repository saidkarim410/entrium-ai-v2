"use client"

import { Search } from "lucide-react"

/**
 * Inline search trigger button. Dispatches `cmdk:open` so the global
 * <CmdK /> dialog opens. Use anywhere — sidebar, headers, anywhere.
 */
export function CmdKTrigger({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("cmdk:open"))}
      aria-label="Search (Ctrl+K)"
      className={
        className ??
        "inline-flex items-center gap-2 rounded-md border border-border bg-card/40 hover:bg-card transition-colors h-8 px-2.5 text-xs text-cream-3 w-full"
      }
    >
      <Search className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 text-left">Поиск</span>
      <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1 py-0.5 font-mono text-[9px] text-cream-3">
        ⌘K
      </kbd>
    </button>
  )
}
