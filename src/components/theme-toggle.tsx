"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Three-state theme toggle (U-10 from TZ_FULLSTACK.md).
 *
 *   System  ·  Light  ·  Dark
 *
 * Inline pill-button group. Mounted only on client (next-themes needs
 * window) — `mounted` gate avoids hydration mismatch between SSR
 * (always dark by default) and the client's resolved theme.
 *
 * Drop in any settings sidebar or header.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])

  // Render a placeholder of identical size on server / pre-mount so the
  // toolbar layout doesn't shift when next-themes hydrates.
  if (!mounted) {
    return (
      <div
        className={cn(
          "inline-flex h-7 rounded-md border border-border bg-card/40 p-0.5",
          "w-[120px]",
          className,
        )}
        aria-hidden="true"
      />
    )
  }

  const options = [
    { v: "system", label: "Авто", icon: Monitor },
    { v: "light",  label: "Светлая", icon: Sun },
    { v: "dark",   label: "Тёмная", icon: Moon },
  ] as const

  return (
    <div
      role="radiogroup"
      aria-label="Тема оформления"
      className={cn(
        "inline-flex rounded-md border border-border bg-card/40 p-0.5",
        className,
      )}
    >
      {options.map((o) => {
        const active = theme === o.v
        const Icon = o.icon
        return (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            onClick={() => setTheme(o.v)}
            className={cn(
              "grid place-items-center h-6 w-7 rounded transition-colors",
              active
                ? "bg-gold/15 text-gold"
                : "text-cream-3 hover:text-cream-2",
            )}
            title={o.label}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        )
      })}
    </div>
  )
}
