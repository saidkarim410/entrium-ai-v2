import { supabaseAdmin } from "@/lib/supabase/admin"
import { UniListClient, type UniRow } from "./uni-list-client"

export const dynamic = "force-dynamic"

export default async function UniversitiesPage() {
  const { data, error } = await supabaseAdmin
    .from("universities")
    .select("id, qs_rank, rank_display, name, country, city, region, overall_score, website")
    .order("qs_rank", { ascending: true, nullsFirst: false })
    .limit(2000)

  const unis = (data ?? []) as UniRow[]

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base sm:text-lg tracking-tight truncate">QS World Rankings 2026</h1>
          <p className="font-mono-label text-cream-3 mt-0.5 truncate">
            {unis.length} университетов · отметь до 5 для сравнения с AI
          </p>
        </div>
      </header>

      {error && (
        <div className="px-6 py-3 bg-destructive/10 text-sm text-destructive border-b border-destructive/40">
          {error.message}
        </div>
      )}
      <UniListClient unis={unis} />
    </>
  )
}
