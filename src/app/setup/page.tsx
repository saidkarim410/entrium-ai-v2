import { redirect } from "next/navigation"
import { getCurrentProfile } from "@/lib/supabase/server"
import { SetupClient } from "./setup-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Setup wizard · Entrium" }

/**
 * One-shot setup wizard. Applies all pending migrations, sets Vercel env vars,
 * and registers the Telegram webhook — given 2 access tokens from the user.
 *
 * Locked to authenticated users only. Owner can verify their identity via
 * the email field shown.
 */
export default async function SetupPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login?next=/setup")

  return (
    <div className="min-h-screen bg-background text-cream">
      <header className="border-b border-border/40 px-4 sm:px-6 h-16 flex items-center justify-between">
        <h1 className="font-display text-base sm:text-lg tracking-tight">Setup wizard</h1>
        <span className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider truncate max-w-[60%]">
          {profile.email}
        </span>
      </header>

      <SetupClient userEmail={profile.email} />
    </div>
  )
}
