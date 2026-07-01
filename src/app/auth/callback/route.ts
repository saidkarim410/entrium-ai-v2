import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

/**
 * OAuth callback handler — Supabase redirects here after the user
 * completes the provider flow (Google, etc.) with ?code=...
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // Open-redirect guard: only same-origin relative paths (reject //evil, /\evil, absolute URLs)
  const rawNext = searchParams.get("next") ?? "/dashboard"
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("\\")
      ? rawNext
      : "/dashboard"

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    )
  }

  return NextResponse.redirect(`${origin}/login?error=missing_code`)
}
