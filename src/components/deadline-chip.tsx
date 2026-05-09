import { cn } from "@/lib/utils"
import { daysUntil, deadlineUrgency, URGENCY_STYLES } from "@/lib/applications/types"

/**
 * Color-coded deadline chip (F-4 from TZ_FULLSTACK.md).
 *
 * Renders the date plus a coloured pill showing urgency:
 *   - red: overdue / critical (≤3 days)
 *   - orange: soon (≤7)
 *   - yellow: approaching (≤14)
 *   - blue: comfortable (≤30)
 *   - emerald: far (>30)
 *
 * Use everywhere a deadline date is shown to the user.
 */
export function DeadlineChip({
  iso,
  className,
  size = "sm",
}: {
  iso: string | null
  className?: string
  size?: "xs" | "sm" | "md"
}) {
  if (!iso) {
    return (
      <span className={cn("font-mono text-cream-3", className)}>
        Без даты
      </span>
    )
  }

  const days = daysUntil(iso)
  const urgency = deadlineUrgency(iso)
  const styles = URGENCY_STYLES[urgency]

  const date = new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })

  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono", className)}>
      <span className={cn(styles.text, size === "xs" ? "text-[11px]" : size === "md" ? "text-sm" : "text-xs")}>
        {date}
      </span>
      <span
        className={cn(
          "rounded-full border px-1.5 py-0 font-mono-label uppercase tracking-wider",
          styles.chip,
          size === "xs" ? "text-[9px]" : size === "md" ? "text-[10px]" : "text-[10px]",
        )}
      >
        {urgency === "overdue"
          ? `${Math.abs(days ?? 0)}д`
          : days !== null && days >= 0
          ? `${days}д`
          : styles.label}
      </span>
    </span>
  )
}
