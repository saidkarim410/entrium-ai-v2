import { notFound } from "next/navigation"
import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import { ExternalLink, MapPin, Globe, Trophy, ArrowLeft, GraduationCap } from "lucide-react"
import { UniInsightsClient } from "./insights-client"
import { FavoriteButton } from "@/components/favorite-button"
import { listFavoriteIds } from "@/lib/favorites/actions"

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
  description: string | null
  metadata: Record<string, unknown> | null
}

export default async function UniversityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [{ data }, user, favIds] = await Promise.all([
    supabaseAdmin
      .from("universities")
      .select("id, qs_rank, rank_display, name, country, city, region, overall_score, website, description, metadata")
      .eq("id", id)
      .maybeSingle(),
    getCurrentUser(),
    listFavoriteIds("university"),
  ])

  if (!data) notFound()
  const uni = data as UniRow
  const isFavorited = favIds.includes(uni.id)

  // Pull a few "similar" universities (same country, near rank) for the right-rail
  let similar: UniRow[] = []
  if (uni.qs_rank !== null) {
    const { data: sim } = await supabaseAdmin
      .from("universities")
      .select("id, qs_rank, rank_display, name, country, city, overall_score")
      .eq("country", uni.country)
      .neq("id", uni.id)
      .gte("qs_rank", Math.max(1, uni.qs_rank - 50))
      .lte("qs_rank", uni.qs_rank + 50)
      .order("qs_rank", { ascending: true })
      .limit(5)
    similar = (sim ?? []) as UniRow[]
  }

  const md = uni.metadata ?? {}
  const research = (md.research as string | null) ?? null
  const employer = (md.employer_reputation as string | null) ?? null
  const academic = (md.academic_reputation as string | null) ?? null
  const intl = (md.international_students as string | null) ?? null
  const facStudent = (md.faculty_student as string | null) ?? null

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <Link href="/universities" className="text-cream-3 hover:text-gold transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-base sm:text-lg tracking-tight truncate">{uni.name}</h1>
            <p className="font-mono-label text-cream-3 mt-0.5 truncate">
              {uni.city ? `${uni.city}, ` : ""}{uni.country}
              {uni.qs_rank ? ` · QS #${uni.rank_display ?? uni.qs_rank}` : ""}
            </p>
          </div>
        </div>
        <Link href="/universities" className="font-mono-label text-xs text-cream-3 hover:text-gold transition-colors">
          ← Все универы
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Hero */}
          <section className="rounded-2xl border border-border bg-gradient-to-br from-card/60 to-transparent p-5 sm:p-6 space-y-4 accent-strip">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-2xl sm:text-3xl tracking-tight">{uni.name}</h2>
                <div className="flex items-center gap-3 flex-wrap mt-2">
                  <span className="inline-flex items-center gap-1.5 text-sm text-cream-2">
                    <MapPin className="h-3.5 w-3.5 text-gold" />
                    {uni.city ? `${uni.city}, ` : ""}{uni.country}
                    {uni.region && <span className="text-cream-3"> · {uni.region}</span>}
                  </span>
                  {uni.website && (
                    <a
                      href={uni.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-gold hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Сайт университета
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3 shrink-0">
                {user && (
                  <FavoriteButton
                    kind="university"
                    targetId={uni.id}
                    initial={isFavorited}
                    variant="labeled"
                  />
                )}
                {uni.qs_rank && (
                  <div className="text-right">
                    <div className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">QS World 2026</div>
                    <div className="font-display text-3xl sm:text-4xl text-gold">
                      #{uni.rank_display ?? uni.qs_rank}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* QS metric chips */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {uni.overall_score !== null && (
                <Metric label="Overall" value={Number(uni.overall_score).toFixed(1)} primary />
              )}
              {academic && <Metric label="Academic" value={String(academic)} />}
              {employer && <Metric label="Employer" value={String(employer)} />}
              {research && <Metric label="Research" value={String(research)} />}
              {facStudent && <Metric label="Faculty/Student" value={String(facStudent)} />}
              {intl && <Metric label="Internat'l" value={String(intl)} />}
            </div>
          </section>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-6">
              {/* AI insights */}
              {user ? (
                <UniInsightsClient universityId={uni.id} universityName={uni.name} />
              ) : (
                <div className="rounded-xl border border-border bg-card/40 p-5 text-center space-y-2">
                  <p className="font-display text-base">AI-анализ доступен после входа</p>
                  <Link href={`/login?next=/universities/${uni.id}`} className="text-sm text-gold hover:underline">
                    Войти →
                  </Link>
                </div>
              )}

              {/* Description */}
              {uni.description && (
                <section className="rounded-xl border border-border bg-card/40 p-5">
                  <h3 className="font-display text-lg mb-3">О университете</h3>
                  <p className="font-serif text-sm text-cream-2 leading-relaxed whitespace-pre-line">
                    {uni.description}
                  </p>
                </section>
              )}
            </div>

            {/* Right rail */}
            <aside className="space-y-4">
              {/* Quick add to applications */}
              {user && (
                <section className="rounded-xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-gold" />
                    <h3 className="font-display text-base">Готов подавать?</h3>
                  </div>
                  <p className="font-serif text-sm text-cream-2 leading-relaxed">
                    Добавь {uni.name} в Application Tracker — получишь чек-лист, дедлайны и AI-сопровождение.
                  </p>
                  <Link
                    href={`/applications?add=${encodeURIComponent(uni.name)}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-gold text-background px-3 py-2 text-xs font-medium hover:bg-gold-soft transition-colors"
                  >
                    Добавить заявку →
                  </Link>
                </section>
              )}

              {/* Similar */}
              {similar.length > 0 && (
                <section className="rounded-xl border border-border bg-card/40 p-5 space-y-3">
                  <h3 className="font-display text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-gold" />
                    Похожие в {uni.country}
                  </h3>
                  <ul className="space-y-2">
                    {similar.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/universities/${s.id}`}
                          className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-2.5 hover:border-gold/40 transition-colors"
                        >
                          <span className="grid h-8 w-10 place-items-center rounded font-mono text-xs text-cream-2 bg-card border border-border tabular-nums shrink-0">
                            {s.rank_display ?? s.qs_rank}
                          </span>
                          <span className="font-display text-sm truncate flex-1">{s.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Disclaimer */}
              <p className="font-mono-label text-[10px] text-cream-3 px-1 leading-relaxed">
                Данные из QS World University Rankings 2026. Reqs / dates меняются — всегда проверяй официальный сайт.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </>
  )
}

function Metric({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3 text-center">
      <div className="font-mono-label text-[9px] text-cream-3 uppercase tracking-wider">{label}</div>
      <div className={`font-display ${primary ? "text-2xl text-gold" : "text-lg text-cream"} tabular-nums`}>
        {value}
      </div>
    </div>
  )
}
