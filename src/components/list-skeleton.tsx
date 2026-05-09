import { cn } from "@/lib/utils"

/**
 * List skeleton loaders (U-12 from TZ_FULLSTACK.md).
 *
 * Shape-matched placeholders for lists/tables/grids while data loads.
 * Replaces the inconsistent spinner-or-blank patterns scattered across
 * the app.
 *
 * Use ListSkeleton for stacked rows (applications, essays, history).
 * Use CardGridSkeleton for grids (universities, scholarships).
 * Use TableSkeleton for tabular data with multiple columns.
 */

export function ListSkeleton({
  rows = 5,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card/30 p-4 space-y-2 animate-pulse"
        >
          <div className="h-4 w-2/3 rounded bg-cream-3/15" />
          <div className="h-3 w-1/3 rounded bg-cream-3/10" />
          <div className="flex gap-2 pt-1">
            <div className="h-5 w-16 rounded bg-cream-3/10" />
            <div className="h-5 w-20 rounded bg-cream-3/10" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CardGridSkeleton({
  cards = 6,
  className,
}: {
  cards?: number
  className?: string
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card/30 p-4 space-y-3 animate-pulse"
        >
          <div className="h-5 w-3/4 rounded bg-cream-3/15" />
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded bg-cream-3/10" />
            <div className="h-3 w-5/6 rounded bg-cream-3/10" />
          </div>
          <div className="flex gap-2 pt-1">
            <div className="h-4 w-12 rounded bg-cream-3/10" />
            <div className="h-4 w-16 rounded bg-cream-3/10" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({
  rows = 6,
  cols = 4,
  className,
}: {
  rows?: number
  cols?: number
  className?: string
}) {
  return (
    <div className={cn("rounded-xl border border-border overflow-hidden", className)}>
      <div className="bg-card/50 px-4 py-2.5 grid gap-3 border-b border-border" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 w-3/4 rounded bg-cream-3/15" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, ri) => (
        <div
          key={ri}
          className="px-4 py-3 grid gap-3 border-b border-border/40 last:border-0 animate-pulse"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((_, ci) => (
            <div key={ci} className="h-3 rounded bg-cream-3/10" style={{ width: `${50 + (ci * 10) % 40}%` }} />
          ))}
        </div>
      ))}
    </div>
  )
}
