"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Search, Loader2, GraduationCap, Award, ListChecks, History, Sparkles,
  Brain, Map, FileText, MessageSquare, Mail, FileUser, Wallet, ShieldCheck, Bot, Wand2,
  type LucideIcon, ArrowRight, Hash,
} from "lucide-react"
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { SearchResult } from "@/app/api/search/route"

const TOOLS: Array<{ slug: string; label: string; icon: LucideIcon; href: string }> = [
  { slug: "agent", label: "AI Agent", icon: Bot, href: "/agent" },
  { slug: "profile", label: "Профиль · диагностика", icon: Brain, href: "/tools/profile" },
  { slug: "analyzer", label: "Шансы поступления", icon: Sparkles, href: "/tools/analyzer" },
  { slug: "tracker", label: "Roadmap · трекер", icon: Map, href: "/tools/tracker" },
  { slug: "university", label: "University Advisor", icon: GraduationCap, href: "/tools/university" },
  { slug: "scholarship", label: "Scholarship Matcher", icon: Award, href: "/tools/scholarship" },
  { slug: "essay", label: "Essay Coach", icon: FileText, href: "/tools/essay" },
  { slug: "humanizer", label: "Humanizer", icon: Wand2, href: "/tools/humanizer" },
  { slug: "interview", label: "Interview Trainer", icon: MessageSquare, href: "/tools/interview" },
  { slug: "recommendation", label: "Recommendation Letter", icon: Mail, href: "/tools/recommendation" },
  { slug: "cv", label: "CV / Resume Builder", icon: FileUser, href: "/tools/cv" },
  { slug: "cost", label: "Cost Calculator", icon: Wallet, href: "/tools/cost" },
  { slug: "reviewer", label: "Mock Reviewer", icon: ShieldCheck, href: "/tools/reviewer" },
]

const PAGES: Array<{ label: string; href: string; icon: LucideIcon; aliases: string[] }> = [
  { label: "Dashboard", href: "/dashboard", icon: Sparkles, aliases: ["главная", "home"] },
  { label: "Заявки · Application Tracker", href: "/applications", icon: ListChecks, aliases: ["apps", "applications"] },
  { label: "Calendar · Календарь дедлайнов", href: "/calendar", icon: GraduationCap, aliases: ["calendar", "deadlines"] },
  { label: "Activities · Common App", href: "/activities", icon: Award, aliases: ["activities", "common app"] },
  { label: "Все университеты · QS Rankings", href: "/universities", icon: GraduationCap, aliases: ["unis"] },
  { label: "Все стипендии", href: "/scholarships", icon: Award, aliases: ["scholarships"] },
  { label: "История запусков", href: "/history", icon: History, aliases: ["history", "past"] },
  { label: "Настройки профиля", href: "/settings", icon: Brain, aliases: ["settings", "profile"] },
  { label: "Рефералы", href: "/refer", icon: ArrowRight, aliases: ["referral", "invite"] },
  { label: "Pricing · Pro", href: "/pricing", icon: Sparkles, aliases: ["pro", "subscription"] },
]

const TYPE_ICONS: Record<SearchResult["type"], LucideIcon> = {
  university: GraduationCap,
  scholarship: Award,
  application: ListChecks,
  history: History,
}

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  university: "Университет",
  scholarship: "Стипендия",
  application: "Заявка",
  history: "История",
}

type Item =
  | { kind: "page"; key: string; label: string; href: string; icon: LucideIcon }
  | { kind: "tool"; key: string; label: string; href: string; icon: LucideIcon }
  | { kind: "result"; key: string; result: SearchResult }

export function CmdK() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cmd+K / Ctrl+K hotkey + global "open" event for mobile button
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(true)
      }
    }
    function onOpenEvt() {
      setOpen(true)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("cmdk:open", onOpenEvt)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("cmdk:open", onOpenEvt)
    }
  }, [])

  // Debounced search — clears results synchronously when query is too short,
  // then debounces the actual fetch. Setting state in this effect is the
  // intended pattern for input-driven async fetches.
  useEffect(() => {
    if (!open) return
    const trimmed = q.trim()
    if (trimmed.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(null)
      return
    }
    setLoading(true)
    const handle = setTimeout(async () => {
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: trimmed }),
        })
        const json = await res.json()
        if (res.ok) setResults((json.results as SearchResult[]) ?? [])
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => {
      clearTimeout(handle)
      setLoading(false)
    }
  }, [q, open])

  // Reset state each time dialog opens — legitimate side-effect pattern
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQ("")
      setResults(null)
      setActiveIdx(0)
      // focus input
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Compose flat item list
  const qLower = q.trim().toLowerCase()
  const matchedPages = qLower
    ? PAGES.filter(
        (p) =>
          p.label.toLowerCase().includes(qLower) ||
          p.aliases.some((a) => a.includes(qLower))
      )
    : []
  const matchedTools = qLower
    ? TOOLS.filter((t) => t.label.toLowerCase().includes(qLower) || t.slug.includes(qLower))
    : []

  const flat: Item[] = [
    ...matchedPages.map((p) => ({ kind: "page" as const, key: "p:" + p.href, label: p.label, href: p.href, icon: p.icon })),
    ...matchedTools.map((t) => ({ kind: "tool" as const, key: "t:" + t.slug, label: t.label, href: t.href, icon: t.icon })),
    ...((results ?? []).map((r) => ({ kind: "result" as const, key: r.type + ":" + r.id, result: r }))),
  ]

  // Keep activeIdx in bounds whenever the flat list shrinks below current index
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeIdx >= flat.length) setActiveIdx(0)
  }, [flat.length, activeIdx])

  function navigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, Math.max(0, flat.length - 1)))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx((i) => Math.max(0, i - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const item = flat[activeIdx]
      if (item) {
        const href = item.kind === "result" ? item.result.href : item.href
        navigate(href)
      }
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden gap-0" showCloseButton={false}>
        <div className="flex items-center gap-2 border-b border-border/40 px-4">
          <Search className="h-4 w-4 text-cream-3 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Поиск университетов, заявок, инструментов..."
            className="flex-1 h-12 bg-transparent border-0 text-sm focus:outline-none placeholder:text-cream-3 text-cream"
          />
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-cream-3" />}
          <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-cream-3">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {qLower.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <p className="font-mono-label text-xs text-cream-3 uppercase tracking-wider">Что можно искать</p>
              <ul className="text-sm font-serif text-cream-2 space-y-1">
                <li>🎓 Университеты — название, город, страна</li>
                <li>🏆 Стипендии — название, страна</li>
                <li>📋 Свои заявки — университет, программа</li>
                <li>📜 История — текст в результатах AI</li>
                <li>🛠 Инструменты и страницы — agent, profile, calendar...</li>
              </ul>
              <p className="font-mono-label text-[10px] text-cream-3 pt-2">
                Стрелки ↑↓ навигация · Enter переход
              </p>
            </div>
          ) : flat.length === 0 ? (
            <div className="p-6 text-center font-mono-label text-xs text-cream-3">
              {loading ? "Ищу..." : `Ничего не найдено по «${q}»`}
            </div>
          ) : (
            <div className="py-2">
              {/* Pages section */}
              {matchedPages.length > 0 && (
                <ResultGroup label="Страницы">
                  {matchedPages.map((p) => {
                    const flatIdx = flat.findIndex((f) => f.key === "p:" + p.href)
                    return (
                      <ResultRow
                        key={p.href}
                        active={flatIdx === activeIdx}
                        icon={p.icon}
                        title={p.label}
                        onClick={() => navigate(p.href)}
                      />
                    )
                  })}
                </ResultGroup>
              )}

              {/* Tools section */}
              {matchedTools.length > 0 && (
                <ResultGroup label="Инструменты">
                  {matchedTools.map((t) => {
                    const flatIdx = flat.findIndex((f) => f.key === "t:" + t.slug)
                    return (
                      <ResultRow
                        key={t.slug}
                        active={flatIdx === activeIdx}
                        icon={t.icon}
                        title={t.label}
                        onClick={() => navigate(t.href)}
                      />
                    )
                  })}
                </ResultGroup>
              )}

              {/* Search results grouped by type */}
              {(["university", "scholarship", "application", "history"] as const).map((type) => {
                const inType = (results ?? []).filter((r) => r.type === type)
                if (inType.length === 0) return null
                return (
                  <ResultGroup key={type} label={TYPE_LABELS[type]}>
                    {inType.map((r) => {
                      const flatIdx = flat.findIndex((f) => f.key === r.type + ":" + r.id)
                      const Icon = TYPE_ICONS[r.type]
                      return (
                        <ResultRow
                          key={r.id}
                          active={flatIdx === activeIdx}
                          icon={Icon}
                          title={r.title}
                          subtitle={r.subtitle}
                          meta={r.meta}
                          onClick={() => navigate(r.href)}
                        />
                      )
                    })}
                  </ResultGroup>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-2">
      <div className="px-3 pt-2 pb-1 font-mono-label text-[10px] text-cream-3 uppercase tracking-wider flex items-center gap-1.5">
        <Hash className="h-2.5 w-2.5" />
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function ResultRow({
  active,
  icon: Icon,
  title,
  subtitle,
  meta,
  onClick,
}: {
  active: boolean
  icon: LucideIcon
  title: string
  subtitle?: string
  meta?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
        active ? "bg-gold/10" : "hover:bg-accent"
      )}
    >
      <div
        className={cn(
          "grid h-7 w-7 place-items-center rounded shrink-0",
          active ? "bg-gold/20 text-gold" : "bg-card border border-border text-cream-3"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-display truncate", active && "text-gold")}>{title}</p>
        {subtitle && (
          <p className="text-[11px] font-mono-label text-cream-3 truncate mt-0.5">{subtitle}</p>
        )}
      </div>
      {meta && (
        <span className="text-[10px] font-mono-label text-cream-3 shrink-0">{meta}</span>
      )}
      {active && <ArrowRight className="h-3.5 w-3.5 text-gold shrink-0" />}
    </button>
  )
}
