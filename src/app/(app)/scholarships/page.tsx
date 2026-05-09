import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { Badge } from "@/components/ui/badge"
import { MapPin, GraduationCap, Wallet, Sparkles } from "lucide-react"

export const dynamic = "force-dynamic"

type SchRow = {
  id: string
  name: string
  provider: string | null
  country: string | null
  level: string | null
  amount_usd: number | null
  full_funding: boolean | null
  description: string | null
  url: string | null
}

const LEVEL_LABEL: Record<string, string> = {
  bachelor: "Бакалавр",
  master: "Магистратура",
  phd: "PhD",
  any: "Любой уровень",
}

export default async function ScholarshipsPage() {
  const { data, error } = await supabaseAdmin
    .from("scholarships")
    .select("id, name, provider, country, level, amount_usd, full_funding, description, url")
    .order("amount_usd", { ascending: false, nullsFirst: false })
    .limit(300)

  const scholarships = (data ?? []) as SchRow[]

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-6 shrink-0">
        <div>
          <h1 className="font-semibold tracking-tight">Стипендии</h1>
          <p className="text-xs text-muted-foreground">
            {scholarships.length} международных программ
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-5xl mx-auto px-6 py-8">
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error.message}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {scholarships.map((s) => (
              <Link
                key={s.id}
                href={`/scholarships/${s.id}`}
                className="group rounded-xl border border-border/60 bg-card/50 p-5 transition-all hover:border-gold/40 hover:bg-card block"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium tracking-tight group-hover:text-gold transition-colors">{s.name}</h3>
                    {s.provider && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{s.provider}</p>
                    )}
                  </div>
                  {s.full_funding && (
                    <Badge variant="default" className="text-[10px] shrink-0">
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
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
