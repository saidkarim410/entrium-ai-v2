import Link from "next/link"
import { type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Unified empty state (U-8 from TZ_FULLSTACK.md).
 *
 * Drop-in replacement for the various ad-hoc "no data" blocks scattered
 * across pages. Use this component everywhere a list/grid/tab can be
 * empty so the visual language is consistent.
 *
 * Variants:
 *   - default: dashed border card, suitable for inside content areas
 *   - bare:    no border, for inside another card/dialog
 *   - hero:    larger spacing for whole-page empties
 */
export type EmptyStateAction = {
  label: string
  href?: string
  onClick?: () => void
  variant?: "default" | "outline" | "ghost"
}

export type EmptyStateProps = {
  icon?: LucideIcon
  title: string
  description?: string
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  variant?: "default" | "bare" | "hero"
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        variant === "default" &&
          "rounded-xl border border-dashed border-border bg-card/20 px-6 py-10 sm:py-12",
        variant === "bare" && "px-4 py-6",
        variant === "hero" && "rounded-2xl border border-dashed border-border bg-card/20 px-6 py-16 sm:py-20",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "grid place-items-center rounded-full bg-card/60 mb-4",
            variant === "hero" ? "h-14 w-14" : "h-10 w-10",
          )}
        >
          <Icon className={cn("text-cream-3", variant === "hero" ? "h-6 w-6" : "h-5 w-5")} />
        </div>
      )}
      <h3
        className={cn(
          "font-display text-cream",
          variant === "hero" ? "text-xl sm:text-2xl" : "text-base sm:text-lg",
        )}
      >
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-md font-serif text-sm text-cream-3 leading-relaxed">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action && <ActionButton action={action} />}
          {secondaryAction && <ActionButton action={secondaryAction} />}
        </div>
      )}
    </div>
  )
}

function ActionButton({ action }: { action: EmptyStateAction }) {
  const variant = action.variant ?? "default"
  if (action.href) {
    // Use a styled Link rather than <Button>+asChild — the project's Button is
    // base-ui-backed and doesn't support a Slot polymorphism prop. Mirroring
    // the visual via small inline classes keeps EmptyState dependency-free.
    return (
      <Link
        href={action.href}
        className={cn(
          "inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors",
          variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/80",
          variant === "outline" && "border border-border bg-background hover:bg-muted",
          variant === "ghost" && "hover:bg-muted hover:text-foreground",
        )}
      >
        {action.label}
      </Link>
    )
  }
  return (
    <Button variant={variant} onClick={action.onClick}>
      {action.label}
    </Button>
  )
}
