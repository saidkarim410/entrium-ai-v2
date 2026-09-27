import { AgentClient } from "./agent-client"
import { getApplicantProfile } from "@/lib/applicant/actions"
import { profileCompleteness } from "@/lib/applicant/types"
import { getCurrentUser } from "@/lib/supabase/server"
import { getUsageStatus, FREE_DAILY_LIMIT } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

export default async function AgentPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>
}) {
  const [applicant, user, params] = await Promise.all([getApplicantProfile(), getCurrentUser(), searchParams])
  const completeness = profileCompleteness(applicant)
  // Read-only balance so the mission cards can show cost vs. what's left (P1-04)
  const usage = user ? await getUsageStatus(user.id) : null

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base sm:text-lg tracking-tight truncate">AI Agent</h1>
          <p className="font-mono-label text-cream-3 mt-0.5 truncate">
            Автономный pipeline · Запускает несколько инструментов подряд
          </p>
        </div>
      </header>
      <AgentClient
        profileCompleteness={completeness}
        usage={{
          tier: usage?.tier ?? "free",
          remaining: usage?.remaining ?? 0,
          bonus: usage?.bonus ?? 0,
          limit: usage?.limit ?? FREE_DAILY_LIMIT,
        }}
        initialRunId={params.run ?? null}
      />
    </>
  )
}
