import { notFound } from "next/navigation"
import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { ApplicantProfile } from "@/lib/applicant/types"
import { Sparkles, GraduationCap, Award, Trophy, MapPin, Globe, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/applications/types"

export const dynamic = "force-dynamic"

type PageProps = { params: Promise<{ slug: string }> }

export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params

  // Fetch via security-definer RPC (bumps view counter, hides private)
  const { data: rows } = await supabaseAdmin.rpc("get_public_profile", { p_slug: slug })
  const profile = (rows as Array<{
    full_name: string | null
    applicant_data: ApplicantProfile
    visibility: "unlisted" | "public"
  }> | null)?.[0]

  if (!profile) notFound()

  const { data: appsRows } = await supabaseAdmin.rpc("get_public_applications", { p_slug: slug })
  const apps = (appsRows ?? []) as Array<{
    university_name: string
    university_country: string | null
    program: string | null
    level: string | null
    status: string
    priority: string
    deadline: string | null
  }>

  const a = profile.applicant_data ?? {}
  const personal = a.personal ?? {}
  const academic = a.academic ?? {}
  const goals = a.goals ?? {}

  const tests: string[] = []
  if (academic.gpa) tests.push(`GPA ${academic.gpa}`)
  if (academic.sat) tests.push(`SAT ${academic.sat}`)
  if (academic.act) tests.push(`ACT ${academic.act}`)
  if (academic.ielts) tests.push(`IELTS ${academic.ielts}`)
  if (academic.toefl) tests.push(`TOEFL ${academic.toefl}`)
  if (academic.duolingo) tests.push(`Duolingo ${academic.duolingo}`)
  if (academic.apIb) tests.push(academic.apIb)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-display text-base">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            Entrium AI
          </Link>
          <Link
            href="/signup"
            className="text-xs font-mono-label text-cream-2 hover:text-gold transition-colors"
          >
            Создать свой профиль →
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-8 space-y-8">
        {/* Identity */}
        <section className="space-y-2">
          <p className="font-mono-label text-[11px] text-cream-3 uppercase tracking-wider">
            Admission package · {profile.visibility}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight">
            {profile.full_name ?? personal.name ?? "Anonymous applicant"}
          </h1>
          {(personal.location || personal.citizenship) && (
            <p className="font-mono-label text-cream-3 flex items-center gap-3 flex-wrap">
              {personal.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" />
                  {personal.location}
                </span>
              )}
              {personal.citizenship && (
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-3 w-3" />
                  {personal.citizenship}
                </span>
              )}
            </p>
          )}
        </section>

        {/* Goals */}
        {(goals.major || goals.targetUnis || goals.countries) && (
          <Section icon={GraduationCap} title="Цель">
            <div className="space-y-1.5 font-serif text-cream-2">
              {goals.major && (
                <p>
                  <span className="text-cream-3">Specialty: </span>
                  <span className="text-cream">{goals.major}</span>
                  {goals.level && (
                    <span className="text-cream-3"> · {goals.level}</span>
                  )}
                  {goals.year && <span className="text-cream-3"> · {goals.year}</span>}
                </p>
              )}
              {goals.targetUnis && (
                <p>
                  <span className="text-cream-3">Target schools: </span>
                  <span className="text-cream">{goals.targetUnis}</span>
                </p>
              )}
              {goals.countries && (
                <p>
                  <span className="text-cream-3">Countries: </span>
                  <span className="text-cream">{goals.countries}</span>
                </p>
              )}
            </div>
          </Section>
        )}

        {/* Academics */}
        {tests.length > 0 && (
          <Section icon={Sparkles} title="Academics & tests">
            <div className="flex flex-wrap gap-2">
              {tests.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1.5 rounded-md border border-border bg-card font-mono text-sm text-cream-2"
                >
                  {t}
                </span>
              ))}
            </div>
            {academic.school && (
              <p className="font-serif text-cream-2 mt-3">
                <span className="text-cream-3">School: </span>
                <span className="text-cream">{academic.school}</span>
                {academic.schoolType && (
                  <span className="text-cream-3"> · {academic.schoolType}</span>
                )}
              </p>
            )}
          </Section>
        )}

        {/* Awards */}
        {a.awards && (
          <Section icon={Trophy} title="Awards & recognition">
            <p className="font-serif text-cream-2 whitespace-pre-wrap leading-relaxed">{a.awards}</p>
          </Section>
        )}

        {/* Activities */}
        {a.activities && (
          <Section icon={Award} title="Activities & leadership">
            <p className="font-serif text-cream-2 whitespace-pre-wrap leading-relaxed">{a.activities}</p>
          </Section>
        )}

        {/* Experience */}
        {a.experience && (
          <Section icon={Award} title="Experience & projects">
            <p className="font-serif text-cream-2 whitespace-pre-wrap leading-relaxed">
              {[a.experience, a.projects].filter(Boolean).join("\n\n")}
            </p>
          </Section>
        )}

        {/* Skills */}
        {(a.skillsTech || a.skillsLang) && (
          <Section icon={Sparkles} title="Skills">
            {a.skillsTech && (
              <p className="font-serif text-cream-2 mb-2">
                <span className="text-cream-3">Tech: </span>
                <span className="text-cream">{a.skillsTech}</span>
              </p>
            )}
            {a.skillsLang && (
              <p className="font-serif text-cream-2">
                <span className="text-cream-3">Languages: </span>
                <span className="text-cream">{a.skillsLang}</span>
              </p>
            )}
          </Section>
        )}

        {/* Applications */}
        {apps.length > 0 && (
          <Section icon={GraduationCap} title={`Applying to · ${apps.length} schools`}>
            <ul className="space-y-2">
              {apps.map((app, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card/40"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm">{app.university_name}</p>
                    <p className="font-mono-label text-[10px] text-cream-3 truncate">
                      {[app.program, app.level, app.university_country].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                      {PRIORITY_LABELS[app.priority as keyof typeof PRIORITY_LABELS] ?? app.priority}
                    </Badge>
                    <span className="font-mono-label text-[10px] text-cream-3">
                      {STATUS_LABELS[app.status as keyof typeof STATUS_LABELS] ?? app.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* CTA */}
        <section className="rounded-xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-5 text-center space-y-3">
          <p className="font-display text-lg">Хочешь такой же admission package?</p>
          <p className="font-serif text-sm text-cream-2">
            Entrium AI помогает поступать с AI-консультантом — оценивает шансы, подбирает универы и стипендии.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-md bg-gold text-background px-4 py-2 text-sm font-medium hover:bg-gold-soft transition-colors"
          >
            Попробовать бесплатно
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </section>

        <p className="text-center font-mono-label text-[10px] text-cream-3 pt-4 border-t border-border/40">
          Профиль опубликован пользователем. Entrium не верифицирует данные.
        </p>
      </div>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card/40 p-5 space-y-3 accent-strip">
      <div className="flex items-center gap-2 text-cream-3">
        <Icon className="h-4 w-4 text-gold" />
        <span className="font-mono-label uppercase tracking-wider text-[11px]">{title}</span>
      </div>
      {children}
    </section>
  )
}
