import { getApplicantProfile } from "@/lib/applicant/actions"
import { getTelegramStatus } from "@/lib/telegram-actions"
import { getSharingStatus } from "@/lib/share/actions"
import { telegramEnabled } from "@/lib/env"
import { ProfileSettings } from "./profile-settings"
import { TelegramLinkCard } from "@/components/telegram-link-card"
import { ShareCard } from "@/components/share-card"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const [profile, telegramStatus, sharingStatus] = await Promise.all([
    getApplicantProfile(),
    getTelegramStatus(),
    getSharingStatus(),
  ])

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base sm:text-lg tracking-tight truncate">Профиль абитуриента</h1>
          <p className="font-mono-label text-cream-3 mt-0.5 truncate">Заполни один раз — autofill во всех 11 инструментах</p>
        </div>
      </header>
      <ProfileSettings
        initial={profile}
        telegramSlot={telegramEnabled() ? <TelegramLinkCard initial={telegramStatus} /> : null}
        shareSlot={<ShareCard initial={sharingStatus} />}
      />
    </>
  )
}
