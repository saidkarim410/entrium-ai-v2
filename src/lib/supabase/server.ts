import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { env } from "@/lib/env"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      db: { schema: "entrium" },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Setting cookies in Server Components is not allowed; proxy handles refresh
          }
        },
      },
    }
  )
}

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * Get the current user's profile.
 * Self-heals: if the auth user exists but profile is missing
 * (e.g. trigger failed, pre-existing user), creates one.
 */
export async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (profile) return profile

  // Profile missing — create via admin client (bypass RLS)
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null

  const referralCode = Buffer.from(crypto.getRandomValues(new Uint8Array(6))).toString("hex")

  const { data: created } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? `${user.id}@unknown.local`,
      full_name: fullName,
      avatar_url: avatarUrl,
      referral_code: referralCode,
    })
    .select("*")
    .single()

  return created
}
