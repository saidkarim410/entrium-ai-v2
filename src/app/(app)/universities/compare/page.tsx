import Link from "next/link"
import { redirect } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import { CompareClient, type CompareUni } from "./compare-client"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>
}) {
  const params = await searchParams
  const idList = (params.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5)

  if (idList.length < 2) redirect("/universities")

  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=${encodeURIComponent("/universities/compare?ids=" + idList.join(","))}`)

  const { data } = await supabaseAdmin
    .from("universities")
    .select("id, name, country, city, qs_rank, rank_display, overall_score, website, metadata")
    .in("id", idList)

  const unisMap = new Map(((data ?? []) as CompareUni[]).map((u) => [u.id, u]))
  // Preserve order from query string
  const unis = idList.map((id) => unisMap.get(id)).filter(Boolean) as CompareUni[]

  if (unis.length < 2) redirect("/universities")

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <Link href="/universities" className="text-cream-3 hover:text-gold transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-base sm:text-lg tracking-tight truncate">
              Comparison · {unis.length} universities
            </h1>
            <p className="font-mono-label text-cream-3 mt-0.5 truncate">
              {unis.map((u) => u.name).join(" vs ")}
            </p>
          </div>
        </div>
      </header>
      <CompareClient unis={unis} />
    </>
  )
}
