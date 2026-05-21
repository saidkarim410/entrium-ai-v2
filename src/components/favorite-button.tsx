"use client"

import { useState, useTransition } from "react"
import { Heart } from "lucide-react"
import { toast } from "sonner"
import { toggleFavorite, type FavoriteKind } from "@/lib/favorites/actions"
import { cn } from "@/lib/utils"

export function FavoriteButton({
  kind,
  targetId,
  initial,
  size = "sm",
  variant = "icon",
}: {
  kind: FavoriteKind
  targetId: string
  initial: boolean
  size?: "sm" | "md"
  variant?: "icon" | "labeled"
}) {
  const [on, setOn] = useState(initial)
  const [pending, startTransition] = useTransition()

  function click(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const next = !on
    setOn(next) // optimistic
    startTransition(async () => {
      const r = await toggleFavorite(kind, targetId)
      if (!r.ok) {
        setOn(!next)
        toast.error(r.error ?? "Не удалось")
        return
      }
      toast.success(next ? "В избранном · /shortlist" : "Убрано из избранного")
    })
  }

  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"

  if (variant === "labeled") {
    return (
      <button
        type="button"
        onClick={click}
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2.5 h-8 text-xs font-mono-label transition-colors",
          on
            ? "border-[var(--brand-red)]/40 bg-[var(--brand-red-soft)] text-[var(--brand-red)]"
            : "border-border bg-card hover:border-[var(--brand-red)]/30 text-foreground/60 hover:text-foreground"
        )}
      >
        <Heart className={cn(dim, on && "fill-[var(--brand-red)]")} />
        {on ? "В избранном" : "Сохранить"}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={pending}
      aria-label={on ? "Убрать из избранного" : "Добавить в избранное"}
      className={cn(
        "grid place-items-center rounded-md border transition-colors shrink-0",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        on
          ? "bg-[var(--brand-red-soft)] border-[var(--brand-red)]/40 text-[var(--brand-red)]"
          : "bg-card border-border text-foreground/60 hover:border-[var(--brand-red)]/30 hover:text-[var(--brand-red)]"
      )}
    >
      <Heart className={cn(dim, on && "fill-[var(--brand-red)]")} />
    </button>
  )
}
