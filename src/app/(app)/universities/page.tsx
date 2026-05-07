import { supabaseAdmin } from "@/lib/supabase/admin"
import { ExternalLink, MapPin } from "lucide-react"

export const dynamic = "force-dynamic"

type UniRow = {
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

export default async function UniversitiesPage() {
  const { data, error } = await supabaseAdmin
    .from("universities")
    .select("id, qs_rank, rank_display, name, country, city, region, overall_score, website")
    .order("qs_rank", { ascending: true, nullsFirst: false })
    .limit(2000)

  const unis = (data ?? []) as UniRow[]

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-6 shrink-0">
        <div>
          <h1 className="font-semibold tracking-tight">QS World Rankings 2026</h1>
          <p className="text-xs text-muted-foreground">
            {unis.length} университетов · данные с topuniversities.com
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
          <div className="space-y-2">
            {unis.map((u) => {
              const card = (
                <div className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card/50 p-4 transition-all hover:border-foreground/30 hover:bg-card cursor-pointer">
                  <div className="grid h-12 w-14 shrink-0 place-items-center rounded-lg bg-accent font-mono text-sm font-medium tabular-nums">
                    {u.rank_display ?? u.qs_rank ?? "—"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium tracking-tight truncate group-hover:underline">
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
                  <ExternalLink className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground shrink-0" />
                </div>
              )

              return u.website ? (
                <a key={u.id} href={u.website} target="_blank" rel="noopener noreferrer" className="block">
                  {card}
                </a>
              ) : (
                <div key={u.id}>{card}</div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
