"use client"

import { Search } from "lucide-react"

export function MobileSearchTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("cmdk:open"))}
      aria-label="Search (Ctrl+K)"
      className="rounded-lg bg-popover/85 backdrop-blur border border-border/50 p-2 text-cream-2 hover:text-cream transition-colors"
    >
      <Search className="h-4 w-4" />
    </button>
  )
}
