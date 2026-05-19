"use client"

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { cn } from "@/lib/utils"

/* ──────────────────────────────────────────────────────────────────────────
   Aurora — soft red mesh that drifts behind the hero. Pure CSS, no JS work
   per frame. Three blurred orbs with staggered animation delays.
   ────────────────────────────────────────────────────────────────────────── */
export function Aurora({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <span
        className="aurora-orb"
        style={{
          left: "-10%",
          top: "-15%",
          width: "55vw",
          height: "55vw",
          background: "var(--brand-red)",
          opacity: 0.55,
          animationDelay: "0s",
        }}
      />
      <span
        className="aurora-orb"
        style={{
          right: "-10%",
          top: "5%",
          width: "45vw",
          height: "45vw",
          background: "#ff6b71",
          opacity: 0.4,
          animationDelay: "-6s",
        }}
      />
      <span
        className="aurora-orb"
        style={{
          left: "30%",
          bottom: "-20%",
          width: "60vw",
          height: "60vw",
          background: "#ffd1d3",
          opacity: 0.5,
          animationDelay: "-12s",
        }}
      />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Reveal — fades + lifts its children when they cross into the viewport.
   Uses a single IntersectionObserver; once revealed, stays revealed.
   ────────────────────────────────────────────────────────────────────────── */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: "div" | "section" | "article" | "li" | "span"
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            io.disconnect()
            break
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const style: CSSProperties = { transitionDelay: `${delay}ms` }

  // The polymorphic `as` prop with refs is awkward in strict TS — cast once.
  const Comp = Tag as React.ElementType
  return (
    <Comp
      ref={ref as React.Ref<HTMLDivElement>}
      className={cn("reveal", visible && "is-visible", className)}
      style={style}
    >
      {children}
    </Comp>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   CountUp — animates a number from 0 (or `from`) to its target when the
   element enters the viewport. Handles non-numeric suffixes (1500+, ∞).
   ────────────────────────────────────────────────────────────────────────── */
export function CountUp({
  value,
  duration = 1500,
  className,
}: {
  value: string
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [display, setDisplay] = useState<string>(() => placeholder(value))

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const target = parseTarget(value)
    if (target === null) {
      // Non-numeric (e.g. "∞") — render as-is, no animation.
      setDisplay(value)
      return
    }
    if (typeof IntersectionObserver === "undefined") {
      setDisplay(value)
      return
    }
    let raf = 0
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        io.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - progress, 3)
          const current = Math.round(target.number * eased)
          setDisplay(formatNumber(current) + target.suffix)
          if (progress < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [value, duration])

  return (
    <span ref={ref} className={className} aria-label={value}>
      {display}
    </span>
  )
}

function parseTarget(s: string): { number: number; suffix: string } | null {
  const match = s.match(/^(\d[\d\s,]*)(.*)$/)
  if (!match) return null
  const raw = match[1].replace(/[\s,]/g, "")
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return { number: n, suffix: match[2] ?? "" }
}

function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU")
}

function placeholder(s: string): string {
  // Render a width-equivalent placeholder to avoid layout shift.
  return s.replace(/\d/g, "0")
}

/* ──────────────────────────────────────────────────────────────────────────
   Typewriter — types out a sequence of messages with a blinking red caret.
   Cycles forever, hangs on each line for `hold` ms before starting the next.
   ────────────────────────────────────────────────────────────────────────── */
export function Typewriter({
  lines,
  typeSpeed = 38,
  eraseSpeed = 18,
  hold = 1600,
  className,
}: {
  lines: string[]
  typeSpeed?: number
  eraseSpeed?: number
  hold?: number
  className?: string
}) {
  const [text, setText] = useState("")
  const [lineIdx, setLineIdx] = useState(0)
  const [phase, setPhase] = useState<"typing" | "holding" | "erasing">("typing")

  useEffect(() => {
    if (lines.length === 0) return
    const current = lines[lineIdx % lines.length]

    if (phase === "typing") {
      if (text.length < current.length) {
        const t = setTimeout(
          () => setText(current.slice(0, text.length + 1)),
          typeSpeed,
        )
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => setPhase("holding"), 0)
      return () => clearTimeout(t)
    }

    if (phase === "holding") {
      const t = setTimeout(
        () => setPhase(lines.length > 1 ? "erasing" : "holding"),
        hold,
      )
      return () => clearTimeout(t)
    }

    if (phase === "erasing") {
      if (text.length > 0) {
        const t = setTimeout(
          () => setText(text.slice(0, -1)),
          eraseSpeed,
        )
        return () => clearTimeout(t)
      }
      setLineIdx((i) => (i + 1) % lines.length)
      setPhase("typing")
    }
  }, [text, phase, lineIdx, lines, typeSpeed, eraseSpeed, hold])

  return (
    <span className={className}>
      {text}
      <span className="brand-caret" aria-hidden>
        &nbsp;
      </span>
    </span>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   MagneticButton — wraps any clickable element and shifts it slightly toward
   the cursor on hover. Subtle: max ~10px translation. Disabled on touch.
   ────────────────────────────────────────────────────────────────────────── */
export function MagneticButton({
  children,
  className,
  strength = 0.25,
}: {
  children: ReactNode
  className?: string
  strength?: number
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof window === "undefined") return
    if (window.matchMedia("(hover: none)").matches) return

    let raf = 0
    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) * strength
      const dy = (e.clientY - cy) * strength
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
      })
    }
    const handleLeave = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.transform = "translate3d(0, 0, 0)"
      })
    }
    el.addEventListener("mousemove", handleMove)
    el.addEventListener("mouseleave", handleLeave)
    return () => {
      el.removeEventListener("mousemove", handleMove)
      el.removeEventListener("mouseleave", handleLeave)
      cancelAnimationFrame(raf)
    }
  }, [strength])

  return (
    <div
      ref={ref}
      className={cn("inline-block transition-transform duration-300 ease-out", className)}
      style={{ willChange: "transform" }}
    >
      {children}
    </div>
  )
}
