import { daysUntil, type Application, type AppStatus } from "@/lib/applications/types"
import { env } from "@/lib/env"

const SITE = (env.NEXT_PUBLIC_SITE_URL ?? "https://entrium-ai-v2.vercel.app").replace(/\/$/, "")

const ACTIVE_STATUSES: AppStatus[] = ["planning", "in_progress", "interview"]

export type NextStep = { text: string; href: string }

/**
 * Rule-based "what should this student do next" suggester.
 *
 * Deterministic (no AI) so it is free and instant inside the daily/weekly
 * reminder crons. Ordered by leverage: unblock personalization → start a
 * list → beat the nearest deadline → fill gaps → broaden → keep momentum.
 */
export function suggestNextStep(input: { apps: Application[]; completed: boolean }): NextStep {
  const { apps, completed } = input

  // 1. No profile yet — personalization unlocks every other agent.
  if (!completed) {
    return {
      text: "Заполни профиль о себе — и агенты начнут отвечать персонально под твой кейс",
      href: `${SITE}/onboarding`,
    }
  }

  const active = apps.filter((a) => ACTIVE_STATUSES.includes(a.status))

  // 2. No universities in progress — start the list.
  if (active.length === 0) {
    return {
      text: "Добавь первый вуз в список — и я помогу спланировать поступление",
      href: `${SITE}/applications`,
    }
  }

  const withDeadline = active
    .filter((a) => a.deadline)
    .map((a) => ({ a, days: daysUntil(a.deadline) }))
    .filter((x): x is { a: Application; days: number } => x.days !== null && x.days >= 0)
    .sort((x, y) => x.days - y.days)

  // 3. A deadline is close (≤14 days) — run the Reviewer on the nearest one.
  const urgent = withDeadline.find((x) => x.days <= 14)
  if (urgent) {
    return {
      text:
        urgent.days === 0
          ? `Дедлайн ${urgent.a.university_name} — сегодня. Прогони эссе через Reviewer прямо сейчас`
          : `До дедлайна ${urgent.a.university_name} — ${urgent.days} дн. Запусти Reviewer, он найдёт слабые места`,
      href: `${SITE}/tools/reviewer`,
    }
  }

  // 4. An active application has no deadline — fill it so reminders can fire.
  const noDeadline = active.find((a) => !a.deadline)
  if (noDeadline) {
    return {
      text: `Укажи дедлайн для ${noDeadline.university_name} — буду напоминать вовремя`,
      href: `${SITE}/applications`,
    }
  }

  // 5. Too few schools — broaden the list with the Agent.
  if (active.length < 3) {
    return {
      text: "Сильные абитуриенты подаются в 8–12 вузов. Запусти AI-Агента — подберёт список и стипендии",
      href: `${SITE}/agent`,
    }
  }

  // 6. Keep momentum on the nearest deadline, or fall back to the dashboard.
  const nearest = withDeadline[0]
  if (nearest) {
    return {
      text: `Продолжи ${nearest.a.university_name} — прогони следующий раздел через Reviewer`,
      href: `${SITE}/tools/reviewer`,
    }
  }

  return {
    text: "Открой дашборд — посмотри, что AI отметил по твоим заявкам",
    href: `${SITE}/dashboard`,
  }
}
