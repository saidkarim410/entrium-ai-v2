import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"

/**
 * Admin client — bypasses RLS. Server-only. Never expose to browser.
 */
export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: "entrium" },
  }
)
