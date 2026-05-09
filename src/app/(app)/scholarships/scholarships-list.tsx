"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Search, X, MapPin, GraduationCap, Wallet, Sparkles, Calendar, Trophy, Filter,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type Scholarship = {
  id: string
  name: string
  provider: string | null
  country: string | null
  level: string | null
  amount_usd: number | null
  full_funding: boolean | null
  deadline: string | null
  description: string | null
  url: string | null
}

type SortKey = "deadline" | "amount" | "name"

const LEVEL_LABEL: Record<string, string> = {
  bachelor: "Бакалавр",
  master: "Магистратура",
  phd: "PhD",
  any: "Любой уровень",
}

export function ScholarshipsList({
  items,
  countryOptions,
  levelOptions,
}: {
  items: Scholarship[]
  countryOptions: Array<[string, number]>
  levelOptions: Array<[string, number]>
}) {
  const [search, setSearch] = useState("")
  const [country, setCountry] = useState("")
  const [level, setLevel] = useState("")
  const [fullOnly, setFullOnly] = useState(false)
  const [hasDeadlineOnly, setHasDeadlineOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>("deadline")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let out = items.filter((s) => {
      if (country && s.country !== country) return false
      if (level && s.level !== level) return false
      if (fullOnly && !s.full_funding) return false
      if (hasDeadlineOnly && !s.deadline) return false
      if (q) {
        const hay = `${s.name} ${s.provider ?? ""} ${s.country ?? ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    out = [...out].sort((a, b) => {
      switch (sort) {
        case "amount":
          return (b.amount_usd ?? 0) - (a.amount_usd ?? 0)
        case "name":
          return a.name.localeCompare(b.name)
        case "deadline":
        default: {
          // Items WITH a deadline first (chronological), then those without (by amount desc)
          const ad = a.deadline ?? null
          const bd = b.deadline ?? null
          if (ad && bd) return ad < bd ? -1 : 1
          if (ad && !bd) return -1
          if (!ad && bd) return 1
          return (b.amount_usd ?? 0) - (a.amount_usd ?? 0)
        }
      }
    })

    return out
  }, [items, search, country, level, fullOnly, hasDeadlineOnly, sort])

  const hasFilter = search.trim() || country || level || fullOnly || hasDeadlineOnly

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Filters */}
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3 sticky top-0 z-10 backdrop-blur">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream-3 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию, провайдеру, стране..."
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-3 hover:text-cream"
                aria-label="Очистить"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-cream-3" />
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-xs font-mono-label focus:outline-none"
              aria-label="Фильтр по стране"
            >
              <option value="">Все страны</option>
              {countryOptions.map(([c, n]) => (
                <option key={c} value={c} className="bg-background">{c} ({n})</option>
              ))}
            </select>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-xs font-mono-label focus:outline-none"
              aria-label="Фильтр по уровню"
            >
              <option value="">Любой уровень</option>
              {levelOptions.map(([l, n]) => (
                <option key={l} value={l} className="bg-background">{LEVEL_LABEL[l] ?? l} ({n})</option>
              ))}
            </select>
            <label className="inline-flex items-center gap-1.5 px-2 h-8 rounded-md border border-border bg-card text-xs font-mono-label cursor-pointer hover:border-gold/40">
              <input
                type="checkbox"
                checked={fullOnly}
                onChange={(e) => setFullOnly(e.target.checked)}
                className="h-3 w-3 accent-gold"
              />
              Full only
            </label>
            <label className="inline-flex items-center gap-1.5 px-2 h-8 rounded-md border border-border bg-card text-xs font-mono-label cursor-pointer hover:border-gold/40">
              <input
                type="checkbox"
                checked={hasDeadlineOnly}
                onChange={(e) => setHasDeadlineOnly(e.target.checked)}
                className="h-3 w-3 accent-gold"
              />
              С дедлайном
            </label>

            {hasFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("")
                  setCountry("")
                  setLevel("")
                  setFullOnly(false)
                  setHasDeadlineOnly(false)
                }}
                className="gap-1 text-xs h-8"
              >
                <X className="h-3 w-3" />
                Сбросить
              </Button>
            )}

            <span className="ml-auto text-[11px] font-mono-label text-cream-3">
              {filtered.length} из {items.length}
            </span>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono-label text-cream-3 uppercase tracking-wider">Сортировка:</span>
            {([
              ["deadline", "Дедлайн"],
              ["amount", "Сумма"],
              ["name", "Название"],
            ] as Array<[SortKey, string]>).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSort(k)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-mono-label transition-colors",
                  sort === k ? "bg-gold text-background" : "bg-card border border-border text-cream-3 hover:text-cream"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-10 text-center space-y-2">
            <Search className="h-6 w-6 text-cream-3 mx-auto" />
            <p className="font-display text-base">Ничего не нашлось</p>
            <p className="font-serif text-sm text-cream-3">Попробуй другие фильтры</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((s) => (
              <ScholarshipCard key={s.id} s={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ScholarshipCard({ s }: { s: Scholarship }) {
  const days = s.deadline ? daysUntil(s.deadline) : null
  const urgent = days !== null && days >= 0 && days <= 30
  const passed = days !== null && days < 0

  return (
    <Link
      href={`/scholarships/${s.id}`}
      className="group rounded-xl border border-border/60 bg-card/50 p-5 transition-all hover:border-gold/40 hover:bg-card block"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium tracking-tight group-hover:text-gold transition-colors">{s.name}</h3>
          {s.provider && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{s.provider}</p>
          )}
        </div>
        {s.full_funding && (
          <Badge variant="default" className="text-[10px] shrink-0 bg-gold/15 text-gold border-gold/30">
            <Trophy className="h-2.5 w-2.5 mr-0.5" />
            FULL
          </Badge>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {s.country && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {s.country}
          </span>
        )}
        {s.level && (
          <span className="inline-flex items-center gap-1">
            <GraduationCap className="h-3 w-3" />
            {LEVEL_LABEL[s.level] ?? s.level}
          </span>
        )}
        {s.amount_usd ? (
          <span className="inline-flex items-center gap-1">
            <Wallet className="h-3 w-3" />
            ${s.amount_usd.toLocaleString()}
          </span>
        ) : null}
        {s.deadline && (
          <span
            className={cn(
              "inline-flex items-center gap-1 ml-auto font-mono-label",
              passed ? "text-cream-3 line-through" : urgent ? "text-rose-400" : "text-cream-2"
            )}
          >
            <Calendar className="h-3 w-3" />
            {formatDate(s.deadline)}
            {days !== null && (
              <span>
                {passed ? "" : days === 0 ? "· сегодня" : ` · ${days}д`}
              </span>
            )}
          </span>
        )}
      </div>

      {s.description && (
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {s.description}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2 text-[10px] font-mono-label text-cream-3">
        <Sparkles className="h-3 w-3 text-gold" />
        AI match · детали
      </div>
    </Link>
  )
}

function daysUntil(iso: string): number {
  const target = new Date(iso + "T00:00:00Z").getTime()
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  return Math.ceil((target - today.getTime()) / 86_400_000)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" })
}
