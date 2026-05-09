import { notFound } from "next/navigation"
import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import {
  ExternalLink, MapPin, ArrowLeft, Wallet, GraduationCap, Calendar,
  Trophy, Globe,
} from "lucide-react"
import { ScholarshipMatchClient } from "./match-client"

export const dynamic = "force-dynamic"

type SchRow = {
  id: string
  name: string
  provider: string | null
  country: string | null
  level: string | null
  amount_usd: number | null
  full_funding: boolean | null
  deadline: string | null
  url: string | null
  description: string | null
  requirements: Record<string, unknown> | null
}

const LEVEL_LABEL: Record<string, string> = {
  bachelor: "Бакалавр",
  master: "Магистратура",
  phd: "PhD",
  any: "Любой уровень",
}

export default async function ScholarshipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [{ data }, user] = await Promise.all([
    supabaseAdmin
      .from("scholarships")
      .select("id, name, provider, country, level, amount_usd, full_funding, deadline, url, description, requirements")
      .eq("id", id)
      .maybeSingle(),
    getCurrentUser(),
  ])

  if (!data) notFound()
  const sch = data as SchRow

  // Similar scholarships: same country + level
  const similar: SchRow[] = sch.country
    ? ((
        await supabaseAdmin
          .from("scholarships")
          .select("id, name, provider, country, level, amount_usd, full_funding, deadline, url, description, requirements")
          .eq("country", sch.country)
          .neq("id", sch.id)
          .order("amount_usd", { ascending: false, nullsFirst: false })
          .limit(5)
      ).data ?? []) as never
    : []

  const reqs = sch.requirements ?? null

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 gap-3">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <Link href="/scholarships" className="text-cream-3 hover:text-gold transition-colors" aria-label="Назад">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-base sm:text-lg tracking-tight truncate">{sch.name}</h1>
            <p className="font-mono-label text-cream-3 mt-0.5 truncate">
              {[sch.provider, sch.country].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <Link href="/scholarships" className="font-mono-label text-xs text-cream-3 hover:text-gold transition-colors shrink-0">
          ← Все стипендии
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Hero */}
          <section className="rounded-2xl border border-border bg-gradient-to-br from-card/60 to-transparent p-5 sm:p-6 space-y-4 accent-strip">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-2xl sm:text-3xl tracking-tight">{sch.name}</h2>
                {sch.provider && <p className="font-serif text-cream-2 mt-1">{sch.provider}</p>}

                <div className="flex items-center gap-3 flex-wrap mt-3">
                  {sch.country && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-cream-2">
                      <MapPin className="h-3.5 w-3.5 text-gold" />
                      {sch.country}
                    </span>
                  )}
                  {sch.level && (
                    <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-card border-border">
                      <GraduationCap className="h-3 w-3 mr-1" />
                      {LEVEL_LABEL[sch.level] ?? sch.level}
                    </Badge>
                  )}
                  {sch.full_funding && (
                    <Badge className="text-[10px] py-0.5 px-2 bg-gold/15 text-gold border-gold/30">
                      <Trophy className="h-3 w-3 mr-1" />
                      Full funding
                    </Badge>
                  )}
                  {sch.url && (
                    <a
                      href={sch.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-gold hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Подать заявку
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                {sch.amount_usd ? (
                  <>
                    <div className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">Сумма</div>
                    <div className="font-display text-3xl sm:text-4xl text-gold">
                      ${sch.amount_usd.toLocaleString("ru-RU")}
                    </div>
                    <div className="font-mono-label text-[9px] text-cream-3">USD</div>
                  </>
                ) : sch.full_funding ? (
                  <div className="font-display text-2xl text-gold">Full ride</div>
                ) : null}
                {sch.deadline && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono-label text-cream-3">
                    <Calendar className="h-3 w-3" />
                    {new Date(sch.deadline).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* AI match */}
              {user ? (
                <ScholarshipMatchClient scholarshipId={sch.id} scholarshipName={sch.name} />
              ) : (
                <div className="rounded-xl border border-border bg-card/40 p-5 text-center space-y-2">
                  <p className="font-display text-base">AI match доступен после входа</p>
                  <Link href={`/login?next=/scholarships/${sch.id}`} className="text-sm text-gold hover:underline">
                    Войти →
                  </Link>
                </div>
              )}

              {/* Description */}
              {sch.description && (
                <section className="rounded-xl border border-border bg-card/40 p-5">
                  <h3 className="font-display text-lg mb-3">Описание</h3>
                  <p className="font-serif text-sm text-cream-2 leading-relaxed whitespace-pre-line">
                    {sch.description}
                  </p>
                </section>
              )}

              {/* Requirements */}
              {reqs && Object.keys(reqs).length > 0 && (
                <section className="rounded-xl border border-border bg-card/40 p-5">
                  <h3 className="font-display text-lg mb-3">Требования</h3>
                  <ul className="space-y-1.5 text-sm font-serif text-cream-2">
                    {Object.entries(reqs).map(([k, v]) => (
                      <li key={k} className="flex gap-2">
                        <span className="text-cream-3 font-mono-label text-[10px] uppercase shrink-0 mt-0.5 min-w-[100px]">
                          {k}
                        </span>
                        <span className="flex-1">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <aside className="space-y-4">
              {sch.url && (
                <section className="rounded-xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-gold" />
                    <h3 className="font-display text-base">Подать заявку</h3>
                  </div>
                  <p className="font-serif text-sm text-cream-2 leading-relaxed">
                    Открой официальную страницу программы — там детали процесса и форма заявки.
                  </p>
                  <a
                    href={sch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-gold text-background px-3 py-2 text-xs font-medium hover:bg-gold-soft transition-colors"
                  >
                    Перейти →
                  </a>
                </section>
              )}

              {similar.length > 0 && (
                <section className="rounded-xl border border-border bg-card/40 p-5 space-y-3">
                  <h3 className="font-display text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-gold" />
                    Похожие в {sch.country}
                  </h3>
                  <ul className="space-y-2">
                    {similar.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/scholarships/${s.id}`}
                          className="block rounded-lg border border-border bg-card/40 p-2.5 hover:border-gold/40 transition-colors"
                        >
                          <p className="font-display text-sm truncate">{s.name}</p>
                          <p className="font-mono-label text-[10px] text-cream-3 truncate mt-0.5">
                            {s.provider ?? "—"}
                            {s.amount_usd ? ` · $${s.amount_usd.toLocaleString("ru-RU")}` : s.full_funding ? " · Full" : ""}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <p className="font-mono-label text-[10px] text-cream-3 px-1 leading-relaxed">
                Данные требований и сумм меняются — всегда проверяй на официальном сайте программы.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </>
  )
}
