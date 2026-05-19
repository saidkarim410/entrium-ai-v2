import { cn } from "@/lib/utils"

/**
 * Entrium wordmark — "Entr" in ink, "ium" in brand red, with a red heart
 * sitting over the "i". Matches the printed logo exactly.
 *
 * The heart is positioned absolutely over the dotless "ı" so the spacing
 * stays correct regardless of font weight or size.
 */
export function EntriumLogo({
  className,
  showTagline = false,
  animateHeart = true,
}: {
  className?: string
  showTagline?: boolean
  animateHeart?: boolean
}) {
  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span className="inline-flex items-baseline font-display font-extrabold tracking-tight">
        <span className="text-foreground">Entr</span>
        <span className="relative">
          <span className="text-foreground" aria-hidden>
            ı
          </span>
          <Heart
            className={cn(
              "absolute left-1/2 -translate-x-1/2 fill-[var(--brand-red)] text-[var(--brand-red)]",
              animateHeart && "heartbeat",
            )}
            style={{
              top: "-0.45em",
              width: "0.65em",
              height: "0.65em",
            }}
          />
        </span>
        <span className="text-[var(--brand-red)]">um</span>
      </span>
      {showTagline && (
        <span className="font-mono-label text-[var(--brand-red)] mt-1">
          Твой большой <span className="text-foreground">брат</span> по поступлению
        </span>
      )}
      <span className="sr-only">Entrium</span>
    </span>
  )
}

function Heart({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      style={style}
      aria-hidden
    >
      <path d="M12 21s-7.5-4.6-9.6-9.2C.7 7.9 3.2 4 7 4c2 0 3.5 1 5 2.7C13.5 5 15 4 17 4c3.8 0 6.3 3.9 4.6 7.8C19.5 16.4 12 21 12 21z" />
    </svg>
  )
}
