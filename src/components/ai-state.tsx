"use client"

import { Loader2, AlertTriangle, RotateCw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Shared "loading shimmer" skeleton for AI-result panels.
 * Mimics the height + shape of typical insight cards (verdict + 2-col).
 */
export function AiLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/5 to-transparent p-5 sm:p-6 space-y-5",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="AI генерирует ответ"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-2/3" />
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
      <p className="text-[10px] font-mono-label text-cream-3 text-center inline-flex items-center gap-1.5 justify-center w-full">
        <Loader2 className="h-3 w-3 animate-spin" />
        AI работает · обычно 5-15 секунд
      </p>
    </div>
  )
}

/**
 * Inline error card with one-click retry. Replaces toast-based error UX
 * for AI-generated content where the user otherwise has to find the
 * button again.
 */
export function AiErrorCard({
  message,
  onRetry,
  retrying = false,
  className,
}: {
  message: string
  onRetry: () => void
  retrying?: boolean
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-3",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-rose-500/15 shrink-0">
          <AlertTriangle className="h-4 w-4 text-rose-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm">AI не ответил</p>
          <p className="font-serif text-xs text-cream-2 mt-0.5 leading-relaxed">{message}</p>
        </div>
      </div>
      <Button
        onClick={onRetry}
        disabled={retrying}
        size="sm"
        variant="outline"
        className="gap-2"
      >
        {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
        {retrying ? "Пробую снова..." : "Повторить"}
      </Button>
    </div>
  )
}

/**
 * Empty-state CTA shown before user has triggered AI for the first time
 * on this entity (essay / uni / scholarship / app). Standardized so all
 * AI features have the same first-impression UX.
 */
export function AiEmptyCta({
  title,
  description,
  buttonLabel,
  onClick,
  pending = false,
  icon: Icon = Sparkles,
  className,
}: {
  title: string
  description: string
  buttonLabel: string
  onClick: () => void
  pending?: boolean
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-5 sm:p-6 space-y-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/20 shrink-0">
          <Icon className="h-5 w-5 text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg sm:text-xl">{title}</h3>
          <p className="font-serif text-sm text-cream-2 leading-relaxed mt-0.5">{description}</p>
        </div>
      </div>
      <Button onClick={onClick} disabled={pending} className="gap-2">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        {pending ? "AI работает..." : buttonLabel}
      </Button>
    </section>
  )
}
