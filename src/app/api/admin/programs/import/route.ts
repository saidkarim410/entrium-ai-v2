import { requireAdminApi } from "@/lib/admin/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { programsFromCsv } from "@/lib/programs/csv"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Admin-only CSV import of verified programmes (P0-03).
 * Body: text/csv (or JSON {csv}). Upsert on the natural key
 * (university + programme + level + language + intake year).
 * Returns per-line errors instead of half-importing silently.
 */
export async function POST(req: Request) {
  const denied = await requireAdminApi()
  if (denied) return denied

  const contentType = req.headers.get("content-type") ?? ""
  let csv = ""
  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { csv?: string }
    csv = body.csv ?? ""
  } else {
    csv = await req.text()
  }
  if (!csv.trim()) return Response.json({ error: "empty_csv" }, { status: 400 })
  if (csv.length > 2_000_000) return Response.json({ error: "csv_too_large" }, { status: 413 })

  const { rows, errors } = programsFromCsv(csv)
  if (rows.length === 0) return Response.json({ imported: 0, errors }, { status: 400 })

  // `natural_key` is a stored generated column (0024): re-importing the same programme updates it
  const { data, error } = await supabaseAdmin
    .from("programs")
    .upsert(rows, { onConflict: "natural_key" })
    .select("id")
  if (error) {
    const missing = error.code === "42P01" || error.code === "PGRST205"
    return Response.json(
      {
        imported: 0,
        errors: [
          ...errors,
          { line: 0, error: missing ? "Таблица programs не создана — примените миграцию 0024_programs.sql" : error.message },
        ],
      },
      { status: missing ? 409 : 500 }
    )
  }
  return Response.json({ imported: data?.length ?? 0, errors })
}
