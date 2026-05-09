import Link from "next/link"
import { redirect } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import { Star, MapPin, ArrowRight, Sparkles, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FavoriteButton } from "@/components/favorite-button"

export const dynamic = "force-dynamic"

export default async function ShortlistPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login?next=/shortlist")

  const { data: favs } = await supabaseAdmin
    .from("favorites")
    .select("target_id, created_at")
    .eq("user_id", user.id)
    .eq("kind", "university")
    .order("created_at", { ascending: false })

  const ids = (favs ?? []).map((f) => f.target_id as string)

  const unis: Array<{
    id: string
    qs_rank: number | null
    rank_display: string | null
    name: string
    country: string
    city: string | null
    overall_score: number | null
  }> = ids.length
    ? ((
        await supabaseAdmin
          .from("universities")
          .select("id, qs_rank, rank_display, name, country, city, overall_score")
          .in("id", ids)
      ).data ?? []) as never
    : []

  // Preserve the order favorites were added (newest first)
  const orderedUnis = ids
    .map((id) => unis.find((u) => u.id === id))
    .filter(Boolean) as typeof unis

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base sm:text-lg tracking-tight truncate flex items-center gap-2">
            <Star className="h-4 w-4 fill-gold text-gold" />
            Shortlist
          </h1>
          <p className="font-mono-label text-cream-3 mt-0.5 truncate">
            {orderedUnis.length} избранных · сюда добавляются ⭐ из /universities
          </p>
        </div>
        {orderedUnis.length >= 2 && (
          <Link
            href={`/universities/compare?ids=${orderedUnis.slice(0, 5).map((u) => u.id).join(",")}`}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Compare top {Math.min(5, orderedUnis.length)}
          </Link>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-3">
          {orderedUnis.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-10 text-center space-y-3">
              <Star className="h-10 w-10 text-cream-3 mx-auto" />
              <p className="font-display text-lg">Здесь будет твой shortlist</p>
              <p className="font-serif text-sm text-cream-2 max-w-md mx-auto">
                Открой <Link href="/universities" className="text-gold hover:underline">список университетов</Link>{" "}
                и нажми ⭐ рядом с теми, к кому присматриваешься.
              </p>
              <Link href="/universities">
                <Button className="gap-2 mt-3">
                  <GraduationCap className="h-4 w-4" />
                  К списку университетов
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {orderedUnis.map((u) => (
                <li key={u.id} className="flex items-stretch gap-2">
                  <FavoriteButton kind="university" targetId={u.id} initial={true} />
                  <Link href={`/universities/${u.id}`} className="block flex-1 min-w-0">
                    <div className="group flex items-center gap-4 rounded-xl border border-border bg-card/50 p-4 hover:bg-card hover:border-gold/40 transition-all h-full">
                      <div className="grid h-12 w-14 shrink-0 place-items-center rounded-lg bg-accent font-mono text-sm font-medium tabular-nums">
                        {u.rank_display ?? u.qs_rank ?? "—"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium tracking-tight truncate group-hover:text-gold transition-colors">
                          {u.name}
                        </h3>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-cream-3">
                          <MapPin className="h-3 w-3" />
                          {u.city ? `${u.city}, ` : ""}{u.country}
                        </p>
                      </div>
                      {u.overall_score !== null && (
                        <div className="hidden sm:block text-right shrink-0">
                          <div className="font-mono text-sm tabular-nums">{Number(u.overall_score).toFixed(1)}</div>
                          <div className="text-[10px] text-cream-3 uppercase tracking-wider">overall</div>
                        </div>
                      )}
                      <ArrowRight className="h-4 w-4 text-cream-3 group-hover:text-gold shrink-0 transition-colors" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
