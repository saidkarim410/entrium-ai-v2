import { getApplicantProfile } from "@/lib/applicant/actions"
import { ProfileSettings } from "./profile-settings"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const profile = await getApplicantProfile()
  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base sm:text-lg tracking-tight truncate">Профиль абитуриента</h1>
          <p className="font-mono-label text-cream-3 mt-0.5 truncate">Заполни один раз — autofill во всех 11 инструментах</p>
        </div>
      </header>
      <ProfileSettings initial={profile} />
    </>
  )
}
