import { redirect } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"

export type AdminProfile = {
  id: string
  email: string
  role: "admin"
  full_name: string | null
}

/**
 * Server-only helper. Returns the current user if (and only if) they are
 * an admin. For pages: pair with `if (!profile) redirect("/dashboard")`.
 * For API routes: use {@link requireAdminApi} which returns a Response
 * with the right status code instead of throwing/redirecting.
 */
export async function getCurrentAdmin(): Promise<AdminProfile | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, email, role, full_name")
    .eq("id", user.id)
    .maybeSingle()

  if (!data || data.role !== "admin") return null
  return data as AdminProfile
}

/**
 * Page-level guard. Redirects non-admins to /dashboard.
 */
export async function requireAdminPage(): Promise<AdminProfile> {
  const admin = await getCurrentAdmin()
  if (!admin) redirect("/dashboard")
  return admin
}

/**
 * API-route guard. Returns null when the caller is admin; otherwise
 * returns a Response (401/403) the route handler should return as-is.
 *
 * Usage:
 *   const denied = await requireAdminApi()
 *   if (denied) return denied
 *   // ...admin-only work
 */
export async function requireAdminApi(): Promise<Response | null> {
  const user = await getCurrentUser()
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    })
  }
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()
  if (!data || data.role !== "admin") {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    })
  }
  return null
}
