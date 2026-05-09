import { getApplicantProfile } from "@/lib/applicant/actions"
import { getTelegramStatus } from "@/lib/telegram-actions"
import { getSharingStatus } from "@/lib/share/actions"
import { getEmailPrefs } from "@/lib/email/actions"
import { getMyNotificationPrefs } from "@/lib/notifications/actions"
import { telegramEnabled, emailEnabled } from "@/lib/env"
import { ProfileSettings } from "./profile-settings"
import { TelegramLinkCard } from "@/components/telegram-link-card"
import { ShareCard } from "@/components/share-card"
import { EmailPrefsCard } from "@/components/email-prefs-card"
import { NotificationPrefsCard } from "@/components/notification-prefs-card"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const [profile, telegramStatus, sharingStatus, emailPrefs, notificationPrefs] = await Promise.all([
    getApplicantProfile(),
    getTelegramStatus(),
    getSharingStatus(),
    getEmailPrefs(),
    getMyNotificationPrefs(),
  ])

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base sm:text-lg tracking-tight truncate">Профиль абитуриента</h1>
          <p className="font-mono-label text-cream-3 mt-0.5 truncate">Заполни один раз — autofill во всех 11 инструментах</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <a
            href="/profile/history"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card hover:border-gold/30 hover:text-gold px-3 py-1.5 text-xs font-medium text-cream-2 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            Growth
          </a>
          <a
            href="/profile/print"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            PDF / Print
          </a>
        </div>
      </header>
      <ProfileSettings
        initial={profile}
        telegramSlot={telegramEnabled() ? <TelegramLinkCard initial={telegramStatus} /> : null}
        shareSlot={<ShareCard initial={sharingStatus} />}
        emailSlot={emailEnabled() ? <EmailPrefsCard initial={emailPrefs} /> : null}
        notificationSlot={<NotificationPrefsCard initial={notificationPrefs} />}
      />
    </>
  )
}
