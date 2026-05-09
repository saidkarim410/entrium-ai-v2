import { supabaseAdmin } from "@/lib/supabase/admin"
import { ScholarshipsList, type Scholarship } from "./scholarships-list"

export const dynamic = "force-dynamic"

export default async function ScholarshipsPage() {
  const { data, error } = await supabaseAdmin
    .from("scholarships")
    .select("id, name, provider, country, level, amount_usd, full_funding, deadline, description, url")
    // Default ordering: known deadlines first (chronological), then highest amounts
    .order("deadline", { ascending: true, nullsFirst: false })
    .order("amount_usd", { ascending: false, nullsFirst: false })
    .limit(500)

  const scholarships = (data ?? []) as Scholarship[]

  // Pre-compute filter dimensions server-side so the client doesn't iterate the
  // whole list twice
  const countries = new Map<string, number>()
  const levels = new Map<string, number>()
  for (const s of scholarships) {
    if (s.country) countries.set(s.country, (countries.get(s.country) ?? 0) + 1)
    if (s.level) levels.set(s.level, (levels.get(s.level) ?? 0) + 1)
  }
  const countryOptions = Array.from(countries.entries()).sort((a, b) => b[1] - a[1])
  const levelOptions = Array.from(levels.entries()).sort((a, b) => b[1] - a[1])

  const withDeadline = scholarships.filter((s) => s.deadline).length

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base sm:text-lg tracking-tight truncate">Стипендии</h1>
          <p className="font-mono-label text-cream-3 mt-0.5 truncate">
            {scholarships.length} программ · {withDeadline} с дедлайнами · {countryOptions.length} стран
          </p>
        </div>
      </header>

      {error && (
        <div className="px-6 py-3 bg-destructive/10 text-sm text-destructive border-b border-destructive/40">
          {error.message}
        </div>
      )}
      <ScholarshipsList
        items={scholarships}
        countryOptions={countryOptions}
        levelOptions={levelOptions}
      />
    </>
  )
}
