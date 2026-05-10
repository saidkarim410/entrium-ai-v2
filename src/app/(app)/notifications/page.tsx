import { listNotifications } from "@/lib/notifications/actions"
import { NotificationsInbox } from "./notifications-inbox"

export const dynamic = "force-dynamic"
export const metadata = { title: "Inbox · Entrium" }

/**
 * Full-page inbox view (F-11 from TZ_FULLSTACK.md). Complements the
 * floating <NotificationsBell> sheet — when a user wants to triage 50
 * notifications, the sheet's 200px column isn't enough. This page
 * gives a real grid + filters + bulk read.
 */
export default async function NotificationsPage() {
  // Fetch a generous initial slice. Pagination can come later if users
  // accumulate hundreds of notifications.
  const items = await listNotifications(100)
  return <NotificationsInbox initial={items} />
}
