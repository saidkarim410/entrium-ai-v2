"use client"

import { useEffect, useState } from "react"
import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Sticky section nav (U-2 from TZ_FULLSTACK.md, lite version).
 *
 * Settings page (and others with multiple long sections) used to be a
 * straight scroll with no orientation. This component renders a left-rail
 * (md+) or top-pill (mobile) nav that scrolls to anchored sections and
 * highlights the one currently in view via IntersectionObserver.
 *
 * Each `sections[i].id` must correspond to an element id in the page.
 * Use `<section id={...}>` or wrap blocks with a div.
 */
export type NavSection = {
  id: string
  label: string
  icon?: LucideIcon
  badge?: string | number
}

export function SectionNav({
  sections,
  className,
}: {
  sections: NavSection[]
  className?: string
}) {
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null)

  useEffect(() => {
    if (!sections.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the first entry that's intersecting and most visible
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveId(visible.target.id)
      },
      {
        // Trigger when section enters the top half of viewport
        rootMargin: "-10% 0px -60% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    )
    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections])

  function jump(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "start" })
    setActiveId(id)
  }

  return (
    <>
      {/* Mobile: horizontal scroll pill bar */}
      <div className={cn("md:hidden -mx-4 px-4 sticky top-0 z-10 bg-background/85 backdrop-blur border-b border-border/40", className)}>
        <div className="flex gap-1.5 overflow-x-auto py-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => jump(s.id)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono-label text-[10px] uppercase tracking-wider transition-colors",
                activeId === s.id
                  ? "border-gold/50 bg-gold/10 text-gold"
                  : "border-border bg-card/30 text-cream-3 hover:text-cream-2",
              )}
            >
              {s.icon && <s.icon className="h-3 w-3" />}
              {s.label}
              {s.badge !== undefined && (
                <span className="text-[9px] text-cream-3 font-normal">{s.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: sticky left rail */}
      <nav className={cn("hidden md:block sticky top-4 self-start", className)}>
        <ul className="space-y-0.5">
          {sections.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => jump(s.id)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors group",
                  activeId === s.id
                    ? "bg-gold/10 text-gold"
                    : "text-cream-3 hover:text-cream-2 hover:bg-card/40",
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {s.icon && <s.icon className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate font-serif text-sm">{s.label}</span>
                </span>
                {s.badge !== undefined && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 text-[10px] font-mono-label",
                      activeId === s.id ? "bg-gold/20 text-gold" : "bg-card/60 text-cream-3",
                    )}
                  >
                    {s.badge}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
