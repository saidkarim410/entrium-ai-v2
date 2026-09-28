import { supabaseAdmin } from "@/lib/supabase/admin"
import { GraduationCap } from "lucide-react"
import { ProgramsImport } from "./programs-import"
import { PROGRAM_CSV_COLUMNS } from "@/lib/programs/csv"

export const dynamic = "force-dynamic"

const STATUS_COLOR: Record<string, string> = {
  verified: "bg-emerald-500/15 text-emerald-300",
  needs_review: "bg-amber-500/15 text-amber-300",
  draft: "bg-slate-500/15 text-slate-300",
  archived: "bg-rose-500/15 text-rose-300",
}

export default async function AdminProgramsPage() {
  const { data, error } = await supabaseAdmin
    .from("programs")
    .select("id, university_name, country, program_name, level, language, intake_year, tuition_amount, tuition_currency, accepts_11_year_school, application_deadline, deadline_status, status, verified_at, source_url")
    .order("status", { ascending: false })
    .order("country")
    .order("university_name")
    .limit(500)

  const missingTable = error && (error.code === "42P01" || error.code === "PGRST205")
  const programs = data ?? []
  const counts = programs.reduce<Record<string, number>>((acc, p) => {
    acc[p.status as string] = (acc[p.status as string] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/15">
          <GraduationCap className="h-5 w-5 text-gold" />
        </div>
        <div>
          <h1 className="font-display text-xl">Программы (проверенная база)</h1>
          <p className="font-mono-label text-[11px] text-cream-3">
            {programs.length} записей · проверено {counts.verified ?? 0} · ждут проверки {counts.needs_review ?? 0} · черновики {counts.draft ?? 0}
          </p>
        </div>
      </div>

      {missingTable && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          Таблица <code>entrium.programs</code> ещё не создана — примените миграцию{" "}
          <code>supabase/migrations/0024_programs.sql</code>. До этого University Advisor честно сообщает, что проверенной базы нет.
        </div>
      )}
      {error && !missingTable && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error.message}</div>
      )}

      <ProgramsImport columns={[...PROGRAM_CSV_COLUMNS]} />

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full text-xs">
          <thead className="bg-card/60 font-mono-label text-[10px] uppercase text-cream-3">
            <tr>
              <th className="px-3 py-2 text-left">Вуз · программа</th>
              <th className="px-3 py-2 text-left">Страна</th>
              <th className="px-3 py-2 text-left">Ур. · язык · набор</th>
              <th className="px-3 py-2 text-left">Стоимость</th>
              <th className="px-3 py-2 text-left">11 кл.</th>
              <th className="px-3 py-2 text-left">Дедлайн</th>
              <th className="px-3 py-2 text-left">Статус</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((p) => (
              <tr key={p.id as string} className="border-t border-border/40 hover:bg-card/40">
                <td className="px-3 py-2">
                  <div className="font-medium">{p.university_name as string}</div>
                  <a href={p.source_url as string} target="_blank" rel="noreferrer" className="text-cream-2 hover:text-gold underline-offset-2 hover:underline">
                    {p.program_name as string}
                  </a>
                </td>
                <td className="px-3 py-2">{p.country as string}</td>
                <td className="px-3 py-2 font-mono">{p.level as string} · {(p.language as string).toUpperCase()} · {(p.intake_year as number) ?? "—"}</td>
                <td className="px-3 py-2 font-mono">
                  {p.tuition_amount ? `${Number(p.tuition_amount).toLocaleString("en-US")} ${p.tuition_currency}` : "—"}
                </td>
                <td className="px-3 py-2 font-mono">{p.accepts_11_year_school as string}</td>
                <td className="px-3 py-2 font-mono">
                  {(p.application_deadline as string | null) ?? "—"}
                  <span className="text-cream-3"> · {p.deadline_status as string}</span>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 font-mono-label text-[10px] ${STATUS_COLOR[p.status as string] ?? ""}`}>
                    {p.status as string}
                  </span>
                  {p.verified_at ? <div className="text-[10px] text-cream-3 mt-0.5">{p.verified_at as string}</div> : null}
                </td>
              </tr>
            ))}
            {programs.length === 0 && !error && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-cream-3">
                  Пока пусто. Импортируйте CSV выше — шаблон в <code>data/programs/programs-template.csv</code>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
