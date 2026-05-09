import type { Application, AppPriority, AppStatus } from "./types"

export type PortfolioAnalytics = {
  total: number
  byPriority: Record<AppPriority, number>
  byStatus: Record<AppStatus, number>
  byCountry: Array<{ country: string; count: number }>
  uniqueCountries: number
  /** Calendar density: applications grouped by month YYYY-MM */
  byMonth: Array<{ month: string; count: number }>
  /** Honest analysis verdicts based on heuristics */
  verdicts: Verdict[]
}

export type Verdict = {
  level: "ok" | "warn" | "alert"
  title: string
  detail: string
}

const ZERO_PRIORITY: Record<AppPriority, number> = { reach: 0, match: 0, safety: 0 }
const ZERO_STATUS: Record<AppStatus, number> = {
  planning: 0,
  in_progress: 0,
  submitted: 0,
  interview: 0,
  accepted: 0,
  rejected: 0,
  waitlisted: 0,
  deferred: 0,
  withdrew: 0,
}

export function analyzePortfolio(apps: Application[]): PortfolioAnalytics {
  const total = apps.length

  const byPriority: Record<AppPriority, number> = { ...ZERO_PRIORITY }
  const byStatus: Record<AppStatus, number> = { ...ZERO_STATUS }
  const countries = new Map<string, number>()
  const months = new Map<string, number>()

  for (const a of apps) {
    byPriority[a.priority] = (byPriority[a.priority] ?? 0) + 1
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1

    const c = a.university_country?.trim() || "?"
    countries.set(c, (countries.get(c) ?? 0) + 1)

    if (a.deadline) {
      const m = a.deadline.slice(0, 7)
      months.set(m, (months.get(m) ?? 0) + 1)
    }
  }

  const byCountry = Array.from(countries.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)

  const byMonth = Array.from(months.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => (a.month < b.month ? -1 : 1))

  return {
    total,
    byPriority,
    byStatus,
    byCountry,
    uniqueCountries: countries.size,
    byMonth,
    verdicts: deriveVerdicts(total, byPriority, byStatus, byMonth, countries.size),
  }
}

function deriveVerdicts(
  total: number,
  pri: Record<AppPriority, number>,
  status: Record<AppStatus, number>,
  byMonth: Array<{ month: string; count: number }>,
  uniqueCountries: number,
): Verdict[] {
  const v: Verdict[] = []

  if (total === 0) {
    return [{
      level: "warn",
      title: "Нет ни одной заявки",
      detail: "Добавь хотя бы одну, чтобы получить аналитику.",
    }]
  }

  if (total < 4) {
    v.push({
      level: "warn",
      title: "Слишком мало вариантов",
      detail: `Сильные кандидаты обычно подают в 8-12 универов. У тебя только ${total}.`,
    })
  } else if (total > 16) {
    v.push({
      level: "warn",
      title: "Слишком много заявок",
      detail: "Качество страдает — на каждое эссе нужны часы. >16 универов = диффузный фокус.",
    })
  } else if (total >= 6) {
    v.push({
      level: "ok",
      title: `Здоровый объём · ${total} заявок`,
      detail: "Хороший balance между risk diversification и фокусом на качестве.",
    })
  }

  // Distribution check (only relevant when total ≥ 4)
  if (total >= 4) {
    const reachPct = pri.reach / total
    const safetyPct = pri.safety / total
    const matchPct = pri.match / total

    if (pri.safety === 0) {
      v.push({
        level: "alert",
        title: "Нет ни одного safety",
        detail: "Если все заявки откажут — приземлишься куда? Добавь 1-2 safety-варианта.",
      })
    } else if (safetyPct < 0.15 && total >= 6) {
      v.push({
        level: "warn",
        title: "Мало safety",
        detail: `Только ${pri.safety} safety из ${total} — стандарт ≥20%.`,
      })
    }

    if (reachPct > 0.6) {
      v.push({
        level: "alert",
        title: "Перевес в reach",
        detail: `${Math.round(reachPct * 100)}% reach — это рискованный стек. Перебалансируй.`,
      })
    } else if (reachPct === 0 && total >= 5) {
      v.push({
        level: "warn",
        title: "Нет ни одного reach",
        detail: "Применять только safe = недооценить себя. Добавь 1-2 dream schools.",
      })
    }

    if (matchPct >= 0.4 && safetyPct >= 0.15 && reachPct >= 0.15 && reachPct <= 0.5) {
      v.push({
        level: "ok",
        title: "Сбалансированный стек",
        detail: `${Math.round(reachPct * 100)}% reach / ${Math.round(matchPct * 100)}% match / ${Math.round(safetyPct * 100)}% safety — подходит большинству.`,
      })
    }
  }

  // Country diversity
  if (uniqueCountries === 1 && total >= 4) {
    v.push({
      level: "warn",
      title: "Одна страна",
      detail: "Все заявки в одну страну — visa / финансы / culture rejection становятся single point of failure.",
    })
  }

  // Status — too much in planning past start of season
  const planningPct = (status.planning ?? 0) / total
  if (planningPct > 0.7 && total >= 4) {
    v.push({
      level: "warn",
      title: "Большинство в planning",
      detail: "Перейди в работу — планирование без действий не двигает дедлайны.",
    })
  }

  // Deadline density spike
  const peakMonth = byMonth.reduce<{ month: string; count: number } | null>(
    (max, m) => (!max || m.count > max.count ? m : max),
    null,
  )
  if (peakMonth && peakMonth.count >= 4) {
    v.push({
      level: "warn",
      title: `Пик в ${peakMonth.month}: ${peakMonth.count} дедлайнов`,
      detail: "Эта неделя/месяц перегружены. Подвинь раунды или закладывай буфер.",
    })
  }

  // Outcomes
  if (status.accepted > 0) {
    v.push({
      level: "ok",
      title: `Уже принят в ${status.accepted}!`,
      detail: "Можешь смело снять с учёта или дожимать reach с уверенной запасной.",
    })
  }

  return v
}
