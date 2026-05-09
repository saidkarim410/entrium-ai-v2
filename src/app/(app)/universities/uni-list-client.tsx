"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Search, X, MapPin, Sparkles, Check, Trophy, Filter,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type UniRow = {
  id: string
  qs_rank: number | null
  rank_display: string | null
  name: string
  country: string
  city: string | null
  region: string | null
  overall_score: number | null
  website: string | null
}

const STORAGE_KEY = "entrium:compare-cart"
const MAX_COMPARE = 5

export function UniListClient({ unis }: { unis: UniRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [country, setCountry] = useState("")
  const [cart, setCart] = useState<Set<string>>(new Set())
  const [region, setRegion] = useState("")

  // Restore cart from localStorage on mount — set state once based on
  // cross-render persisted data; intentional side effect
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const ids = JSON.parse(raw) as string[]
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCart(new Set(ids.filter((id) => unis.some((u) => u.id === id))))
      }
    } catch {}
  }, [unis])

  function persist(next: Set<string>) {
    setCart(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
    } catch {}
  }

  function toggleCart(id: string) {
    const next = new Set(cart)
    if (next.has(id)) {
      next.delete(id)
    } else {
      if (next.size >= MAX_COMPARE) return
      next.add(id)
    }
    persist(next)
  }

  function clearCart() {
    persist(new Set())
  }

  function goCompare() {
    if (cart.size < 2) return
    router.push(`/universities/compare?ids=${[...cart].join(",")}`)
  }

  // Distinct countries + regions for filter dropdowns
  const countries = useMemo(() => {
    const m = new Map<string, number>()
    for (const u of unis) m.set(u.country, (m.get(u.country) ?? 0) + 1)
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
  }, [unis])

  const regions = useMemo(() => {
    const m = new Map<string, number>()
    for (const u of unis) {
      if (u.region) m.set(u.region, (m.get(u.region) ?? 0) + 1)
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
  }, [unis])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return unis.filter((u) => {
      if (country && u.country !== country) return false
      if (region && u.region !== region) return false
      if (q && !u.name.toLowerCase().includes(q) && !u.country.toLowerCase().includes(q) && !(u.city ?? "").toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [unis, search, country, region])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-4">
        {/* Filter bar */}
        <div className="rounded-xl border border-border bg-card/40 p-3 sm:p-4 space-y-3 sticky top-0 z-10 backdrop-blur">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream-3 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию, городу, стране..."
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
            >
              <option value="">Все страны</option>
              {countries.map(([c, n]) => (
                <option key={c} value={c} className="bg-background">{c} ({n})</option>
              ))}
            </select>
            {regions.length > 0 && (
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="h-8 rounded-md border border-border bg-card px-2 text-xs font-mono-label focus:outline-none"
              >
                <option value="">Все регионы</option>
                {regions.map(([r, n]) => (
                  <option key={r} value={r} className="bg-background">{r} ({n})</option>
                ))}
              </select>
            )}
            {(country || region || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setCountry(""); setRegion(""); setSearch("") }}
                className="gap-1 text-xs h-8"
              >
                <X className="h-3 w-3" />
                Сбросить
              </Button>
            )}
            <span className="ml-auto text-[11px] font-mono-label text-cream-3">
              {filtered.length} из {unis.length}
            </span>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {filtered.slice(0, 500).map((u) => {
            const inCart = cart.has(u.id)
            const cartFull = cart.size >= MAX_COMPARE && !inCart
            return (
              <div key={u.id} className="flex items-stretch gap-2">
                <button
                  onClick={() => toggleCart(u.id)}
                  disabled={cartFull}
                  aria-label={inCart ? "Убрать из сравнения" : "Добавить к сравнению"}
                  className={cn(
                    "shrink-0 w-10 grid place-items-center rounded-lg border transition-colors",
                    inCart
                      ? "bg-gold border-gold text-background"
                      : cartFull
                        ? "bg-card border-border text-cream-3/40 cursor-not-allowed"
                        : "bg-card border-border text-cream-3 hover:border-gold/40 hover:text-gold"
                  )}
                  title={cartFull ? `Максимум ${MAX_COMPARE}` : ""}
                >
                  {inCart ? <Check className="h-4 w-4" /> : <Trophy className="h-3.5 w-3.5" />}
                </button>
                <Link href={`/universities/${u.id}`} className="block flex-1 min-w-0">
                  <div
                    className={cn(
                      "group flex items-center gap-4 rounded-xl border bg-card/50 p-4 transition-all hover:bg-card cursor-pointer h-full",
                      inCart ? "border-gold/40" : "border-border/60 hover:border-gold/40"
                    )}
                  >
                    <div className="grid h-12 w-14 shrink-0 place-items-center rounded-lg bg-accent font-mono text-sm font-medium tabular-nums">
                      {u.rank_display ?? u.qs_rank ?? "—"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium tracking-tight truncate group-hover:text-gold transition-colors">
                        {u.name}
                      </h3>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {u.city ? `${u.city}, ` : ""}{u.country}
                        {u.region && <span className="text-muted-foreground/50">· {u.region}</span>}
                      </p>
                    </div>
                    {u.overall_score !== null && (
                      <div className="hidden sm:block text-right shrink-0">
                        <div className="font-mono text-sm tabular-nums">{Number(u.overall_score).toFixed(1)}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">overall</div>
                      </div>
                    )}
                    <Sparkles className="h-4 w-4 text-cream-3 group-hover:text-gold shrink-0 transition-colors" />
                  </div>
                </Link>
              </div>
            )
          })}
          {filtered.length > 500 && (
            <p className="text-center font-mono-label text-xs text-cream-3 py-3">
              Показано первые 500 из {filtered.length}. Уточни фильтр.
            </p>
          )}
        </div>
      </div>

      {/* Sticky compare bar */}
      {cart.size > 0 && (
        <div className="fixed bottom-20 lg:bottom-5 left-4 right-4 lg:left-1/2 lg:-translate-x-1/2 lg:right-auto z-40 lg:max-w-2xl">
          <div className="rounded-xl border border-gold/40 bg-popover/95 backdrop-blur shadow-2xl p-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
              <Trophy className="h-4 w-4 text-gold shrink-0" />
              <span className="font-mono-label text-xs text-cream-3 mr-1">
                {cart.size}/{MAX_COMPARE}:
              </span>
              {[...cart].map((id) => {
                const u = unis.find((x) => x.id === id)
                if (!u) return null
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gold/15 text-gold border border-gold/30 text-[11px] font-mono-label"
                  >
                    {u.name}
                    <button
                      onClick={() => toggleCart(id)}
                      className="text-gold/70 hover:text-gold ml-0.5"
                      aria-label="Убрать"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                )
              })}
            </div>
            <Button variant="ghost" size="sm" onClick={clearCart} className="shrink-0">
              <X className="h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={goCompare}
              disabled={cart.size < 2}
              size="sm"
              className="shrink-0 gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Compare {cart.size}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
