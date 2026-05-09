import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentProfile } from "@/lib/supabase/server"
import { getApplicantProfile } from "@/lib/applicant/actions"
import { listApplications } from "@/lib/applications/actions"
import { listActivities } from "@/lib/activities/actions"
import {
  STATUS_LABELS, PRIORITY_LABELS, daysUntil,
  type AppStatus, type AppPriority,
} from "@/lib/applications/types"
import { profileCompleteness } from "@/lib/applicant/types"
import { ArrowLeft } from "lucide-react"
import { PrintButton } from "./print-button"

export const dynamic = "force-dynamic"
export const metadata = { title: "Admission Profile · Entrium" }

export default async function ProfilePrintPage() {
  const auth = await getCurrentProfile()
  if (!auth) redirect("/login?next=/profile/print")

  const [applicant, apps, activities] = await Promise.all([
    getApplicantProfile(),
    listApplications(),
    listActivities(),
  ])

  const completeness = profileCompleteness(applicant)
  const today = new Date()
  const dateStr = today.toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" })

  const personal = applicant.personal ?? {}
  const academic = applicant.academic ?? {}
  const goals = applicant.goals ?? {}

  // Build tests row
  const tests: string[] = []
  if (academic.gpa) tests.push(`GPA: ${academic.gpa}`)
  if (academic.sat) tests.push(`SAT: ${academic.sat}`)
  if (academic.act) tests.push(`ACT: ${academic.act}`)
  if (academic.ielts) tests.push(`IELTS: ${academic.ielts}`)
  if (academic.toefl) tests.push(`TOEFL: ${academic.toefl}`)
  if (academic.duolingo) tests.push(`Duolingo: ${academic.duolingo}`)
  if (academic.apIb) tests.push(`AP/IB: ${academic.apIb}`)

  return (
    <>
      {/* Top control bar — hidden on print */}
      <div className="print-hide flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="text-cream-3 hover:text-gold transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-base sm:text-lg tracking-tight">Admission Profile · печатная версия</h1>
            <p className="font-mono-label text-cream-3 text-[10px] mt-0.5">
              Ctrl/⌘+P → Save as PDF
            </p>
          </div>
        </div>
        <PrintButton />
      </div>

      <div className="flex-1 overflow-y-auto bg-background print-area">
        {/* The printed page itself — sized to A4 */}
        <div className="max-w-[820px] mx-auto px-8 sm:px-12 py-10 print:p-0">
          {/* Header */}
          <header className="border-b-2 border-cream-3/40 pb-5 mb-6 flex items-end justify-between gap-6">
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl sm:text-4xl tracking-tight">
                {auth.full_name ?? personal.name ?? "Applicant"}
              </h1>
              <p className="font-mono-label text-[11px] text-cream-3 mt-2">
                ADMISSION PROFILE · {dateStr}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display text-3xl text-gold">{completeness}%</p>
              <p className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">complete</p>
            </div>
          </header>

          {/* Contact + identity */}
          <Section title="Personal">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {personal.age && <Field label="Age" value={personal.age} />}
              {personal.citizenship && <Field label="Citizenship" value={personal.citizenship} />}
              {personal.location && <Field label="Location" value={personal.location} />}
              {personal.email && <Field label="Email" value={personal.email} />}
              {personal.phone && <Field label="Phone" value={personal.phone} />}
              {personal.linkedin && <Field label="LinkedIn" value={personal.linkedin} />}
              {personal.github && <Field label="GitHub" value={personal.github} />}
              {personal.portfolio && <Field label="Portfolio" value={personal.portfolio} />}
            </div>
          </Section>

          {/* Goals */}
          {(goals.major || goals.targetUnis || goals.countries || goals.level) && (
            <Section title="Admission Goals">
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {goals.level && <Field label="Level" value={goals.level} />}
                {goals.year && <Field label="Year" value={goals.year} />}
                {goals.major && <Field label="Major" value={goals.major} />}
                {goals.region && <Field label="Region" value={goals.region} />}
                {goals.countries && <Field label="Countries" value={goals.countries} />}
                {goals.targetUnis && <Field label="Target schools" value={goals.targetUnis} />}
                {goals.budget && <Field label="Budget USD/yr" value={goals.budget} />}
              </div>
              {applicant.goalsText && (
                <p className="text-sm font-serif text-cream-2 leading-relaxed mt-3">
                  {applicant.goalsText}
                </p>
              )}
            </Section>
          )}

          {/* Academics */}
          {(tests.length > 0 || academic.school) && (
            <Section title="Academics">
              {academic.school && (
                <p className="text-sm font-serif text-cream-2 mb-2">
                  <span className="text-cream-3">School:</span> <strong>{academic.school}</strong>
                  {academic.schoolType && <span className="text-cream-3"> · {academic.schoolType}</span>}
                </p>
              )}
              {academic.coursework && (
                <p className="text-sm font-serif text-cream-2 mb-2">
                  <span className="text-cream-3">Coursework:</span> {academic.coursework}
                </p>
              )}
              {tests.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tests.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded border border-cream-3/30 text-xs font-mono text-cream-2"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* Activities (structured) */}
          {activities.length > 0 && (
            <Section title="Activities · Common App">
              <ol className="space-y-2.5">
                {activities.slice(0, 10).map((a, i) => (
                  <li key={a.id} className="text-sm font-serif text-cream-2 leading-relaxed">
                    <p>
                      <strong>{i + 1}. {a.position || "—"}</strong>
                      {a.organization && <span className="text-cream-3"> · {a.organization}</span>}
                      {a.type && <span className="text-cream-3"> ({a.type})</span>}
                    </p>
                    {a.description && <p className="ml-5 text-cream-2">{a.description}</p>}
                    <p className="ml-5 font-mono-label text-[10px] text-cream-3">
                      {[
                        a.grades.length ? `Grades ${a.grades.join("/")}` : "",
                        a.hoursPerWeek ? `${a.hoursPerWeek} hr/wk` : "",
                        a.weeksPerYear ? `${a.weeksPerYear} wk/yr` : "",
                        a.continue_in_college ? "→ continue in college" : "",
                      ].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {/* Awards */}
          {applicant.awards && (
            <Section title="Awards & Recognition">
              <p className="text-sm font-serif text-cream-2 leading-relaxed whitespace-pre-line">
                {applicant.awards}
              </p>
            </Section>
          )}

          {/* Activities free-text (if no structured Activity Builder used) */}
          {!activities.length && applicant.activities && (
            <Section title="Activities">
              <p className="text-sm font-serif text-cream-2 leading-relaxed whitespace-pre-line">
                {applicant.activities}
              </p>
            </Section>
          )}

          {/* Experience */}
          {(applicant.experience || applicant.projects) && (
            <Section title="Experience & Projects">
              {applicant.experience && (
                <p className="text-sm font-serif text-cream-2 leading-relaxed whitespace-pre-line mb-2">
                  {applicant.experience}
                </p>
              )}
              {applicant.projects && (
                <p className="text-sm font-serif text-cream-2 leading-relaxed whitespace-pre-line">
                  {applicant.projects}
                </p>
              )}
            </Section>
          )}

          {/* Skills */}
          {(applicant.skillsTech || applicant.skillsLang) && (
            <Section title="Skills">
              {applicant.skillsTech && (
                <p className="text-sm font-serif text-cream-2 mb-1">
                  <span className="text-cream-3">Tech:</span> {applicant.skillsTech}
                </p>
              )}
              {applicant.skillsLang && (
                <p className="text-sm font-serif text-cream-2">
                  <span className="text-cream-3">Languages:</span> {applicant.skillsLang}
                </p>
              )}
            </Section>
          )}

          {/* Applications */}
          {apps.length > 0 && (
            <Section title={`Applications (${apps.length})`}>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-[600px] sm:min-w-0 px-4 sm:px-0">
              <table className="w-full text-sm font-serif">
                <thead>
                  <tr className="border-b border-cream-3/30">
                    <th className="text-left py-1.5 font-mono-label text-[10px] text-cream-3 uppercase">University</th>
                    <th className="text-left py-1.5 font-mono-label text-[10px] text-cream-3 uppercase">Program</th>
                    <th className="text-left py-1.5 font-mono-label text-[10px] text-cream-3 uppercase">Round</th>
                    <th className="text-left py-1.5 font-mono-label text-[10px] text-cream-3 uppercase">Deadline</th>
                    <th className="text-left py-1.5 font-mono-label text-[10px] text-cream-3 uppercase">Status</th>
                    <th className="text-left py-1.5 font-mono-label text-[10px] text-cream-3 uppercase">Pri</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((a) => {
                    const days = daysUntil(a.deadline)
                    return (
                      <tr key={a.id} className="border-b border-cream-3/15 last:border-0">
                        <td className="py-1.5 text-cream-2">
                          <strong>{a.university_name}</strong>
                          {a.university_country && <span className="text-cream-3"> · {a.university_country}</span>}
                        </td>
                        <td className="py-1.5 text-cream-2">{a.program ?? "—"}</td>
                        <td className="py-1.5 text-cream-2">{a.round ?? "—"}</td>
                        <td className="py-1.5 text-cream-2">
                          {a.deadline ?? "—"}
                          {days !== null && days >= 0 && days <= 30 && (
                            <span className="text-[10px] text-cream-3"> ({days}д)</span>
                          )}
                        </td>
                        <td className="py-1.5 text-cream-2">{STATUS_LABELS[a.status as AppStatus] ?? a.status}</td>
                        <td className="py-1.5 text-cream-2">{PRIORITY_LABELS[a.priority as AppPriority] ?? a.priority}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
                </div>
              </div>
            </Section>
          )}

          {/* Footer */}
          <footer className="mt-8 pt-5 border-t border-cream-3/30 flex justify-between items-end text-[10px] font-mono-label text-cream-3">
            <span>Generated by Entrium AI · entrium-ai-v2.vercel.app</span>
            <span>{dateStr}</span>
          </footer>
        </div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 break-inside-avoid">
      <h2 className="font-display text-sm uppercase tracking-[0.2em] text-gold mb-3 pb-1 border-b border-cream-3/30">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span className="text-cream-3 font-mono-label text-[10px] uppercase tracking-wider">{label}: </span>
      <span className="text-cream font-serif">{value}</span>
    </div>
  )
}

