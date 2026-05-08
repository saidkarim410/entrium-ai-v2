import { AgentClient } from "./agent-client"
import { getApplicantProfile } from "@/lib/applicant/actions"
import { profileCompleteness } from "@/lib/applicant/types"

export const dynamic = "force-dynamic"

export default async function AgentPage() {
  const applicant = await getApplicantProfile()
  const completeness = profileCompleteness(applicant)

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
      <AgentClient profileCompleteness={completeness} />
    </>
  )
}
