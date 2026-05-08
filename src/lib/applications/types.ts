/**
 * Application — one university the student is applying to.
 * Stored in entrium.applications (1 row per app).
 */

export const APP_STATUSES = [
  "planning",
  "in_progress",
  "submitted",
  "interview",
  "accepted",
  "rejected",
  "waitlisted",
  "deferred",
  "withdrew",
] as const
export type AppStatus = (typeof APP_STATUSES)[number]

export const APP_PRIORITIES = ["reach", "match", "safety"] as const
export type AppPriority = (typeof APP_PRIORITIES)[number]

export const APP_LEVELS = ["Bachelor", "Master", "PhD", "MBA", "Foundation"] as const
export type AppLevel = (typeof APP_LEVELS)[number]

export type ChecklistItem = {
  id: string
  label: string
  done: boolean
  due?: string // ISO date
}

export type Application = {
  id: string
  user_id: string
  university_name: string
  university_country: string | null
  program: string | null
  level: AppLevel | null
  round: string | null
  deadline: string | null // ISO date
  status: AppStatus
  priority: AppPriority
  application_fee_usd: number | null
  notes: string | null
  checklist: ChecklistItem[]
  result_decision: string | null
  created_at: string
  updated_at: string
}

export const STATUS_LABELS: Record<AppStatus, string> = {
  planning: "Планирую",
  in_progress: "В работе",
  submitted: "Подано",
  interview: "Интервью",
  accepted: "Принят 🎉",
  rejected: "Отказ",
  waitlisted: "Waitlist",
  deferred: "Deferred",
  withdrew: "Снял",
}

export const STATUS_COLORS: Record<AppStatus, string> = {
  planning: "bg-cream-3/15 text-cream-2 border-cream-3/30",
  in_progress: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  submitted: "bg-gold/15 text-gold border-gold/30",
  interview: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  accepted: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  rejected: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  waitlisted: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  deferred: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  withdrew: "bg-cream-3/10 text-cream-3 border-cream-3/20 line-through",
}

export const PRIORITY_LABELS: Record<AppPriority, string> = {
  reach: "Reach",
  match: "Match",
  safety: "Safety",
}

export const PRIORITY_COLORS: Record<AppPriority, string> = {
  reach: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  match: "bg-gold/15 text-gold border-gold/30",
  safety: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
}

/** Build summary stats for header */
export function summarizeApplications(apps: Application[]) {
  const total = apps.length
  const submitted = apps.filter((a) =>
    ["submitted", "interview", "accepted", "rejected", "waitlisted", "deferred"].includes(a.status)
  ).length
  const accepted = apps.filter((a) => a.status === "accepted").length
  const upcoming = apps
    .filter((a) => a.deadline && new Date(a.deadline) > new Date())
    .sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))
  const nextDeadline = upcoming[0]?.deadline ?? null
  return { total, submitted, accepted, nextDeadline }
}

/** Days until deadline, negative if past */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const target = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

/** Compact context block for AI tools — list user's applications */
export function applicationsToContextBlock(apps: Application[]): string {
  if (!apps.length) return ""
  const lines = apps.map((a) => {
    const parts = [a.university_name]
    if (a.program) parts.push(a.program)
    if (a.level) parts.push(a.level)
    if (a.round) parts.push(a.round)
    if (a.deadline) parts.push(`до ${a.deadline}`)
    parts.push(STATUS_LABELS[a.status])
    parts.push(`(${PRIORITY_LABELS[a.priority]})`)
    return `• ${parts.join(" · ")}`
  })
  return `[Заявки абитуриента]\n${lines.join("\n")}\n\n`
}
