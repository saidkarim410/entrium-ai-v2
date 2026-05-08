import { CVTool } from "./cv-tool"
import { getApplicantProfile } from "@/lib/applicant/actions"
import { cvDefaults } from "@/lib/applicant/prefill"

export const dynamic = "force-dynamic"

export default async function CVPage() {
  const applicant = await getApplicantProfile()
  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base sm:text-lg tracking-tight truncate">CV / Resume Builder</h1>
          <p className="font-mono-label text-cream-3 mt-0.5 truncate">AI · ATS-friendly CV с impact-метриками</p>
        </div>
      </header>
      <CVTool initial={cvDefaults(applicant)} />
    </>
  )
}
