import type { ApplicantProfile } from "@/lib/applicant/types"

/**
 * Temporal context for AI prompts (P0-02 from the CTO TZ).
 *
 * The model has NO reliable notion of "today" — left alone it assumes its
 * training-cutoff year and builds plans that start in the past. Every prompt
 * that mentions dates, deadlines or timelines must therefore receive the
 * server date, the user's timezone, the target intake and a precomputed list
 * of plan months. Dates are computed here, never by the model.
 */

export const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE?.trim() || "Asia/Tashkent"

const RU_MONTHS_NOMINATIVE = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
]
const RU_MONTHS_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
]

export type IntakeStatus = "ok" | "tight" | "past" | "unknown"

export type TemporalContext = {
  /** Wall-clock instant the context was built from */
  now: Date
  timeZone: string
  /** YYYY-MM-DD in the user's timezone */
  todayIso: string
  /** e.g. "28 сентября 2026" */
  todayHuman: string
  /** e.g. "воскресенье" */
  weekday: string
  year: number
  /** 1-12 */
  month: number
  day: number
  /** e.g. "2026/2027" */
  academicYear: string
  /** Target intake year parsed from the profile, if any */
  intakeYear: number | null
  intakeStatus: IntakeStatus
  /** School graduation as stated in the profile (free text), if any */
  graduation: string | null
  /** Plan months starting from the current month, e.g. ["Сентябрь 2026", ...] */
  planMonths: string[]
}

type DateParts = { year: number; month: number; day: number; weekday: string }

/** Extract calendar parts of `now` in `timeZone` without any date library. */
export function datePartsInZone(now: Date, timeZone: string): DateParts {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const iso = fmt.format(now) // en-CA → YYYY-MM-DD
  const [y, m, d] = iso.split("-").map((s) => Number(s))
  const weekday = new Intl.DateTimeFormat("ru-RU", { timeZone, weekday: "long" }).format(now)
  return { year: y, month: m, day: d, weekday }
}

export function todayIso(now: Date = new Date(), timeZone: string = DEFAULT_TIMEZONE): string {
  const { year, month, day } = datePartsInZone(now, timeZone)
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** "Сентябрь 2026", "Октябрь 2026", … — `count` months starting at (year, month). */
export function planMonths(year: number, month: number, count: number): string[] {
  const out: string[] = []
  let y = year
  let m = month
  for (let i = 0; i < count; i++) {
    out.push(`${RU_MONTHS_NOMINATIVE[m - 1]} ${y}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
}

export function parseIntakeYear(raw: string | undefined | null): number | null {
  if (!raw) return null
  const match = String(raw).match(/(20\d{2})/)
  return match ? Number(match[1]) : null
}

/**
 * Is the target intake still reachable from today?
 *  - past:   intake year already over
 *  - tight:  intake this calendar year — most autumn intakes are closed by now
 *  - ok:     next year or later
 */
export function intakeStatusFor(intakeYear: number | null, year: number, month: number): IntakeStatus {
  if (intakeYear === null) return "unknown"
  if (intakeYear < year) return "past"
  if (intakeYear === year) return month <= 2 ? "ok" : "tight"
  return "ok"
}

export function getTemporalContext(
  profile?: ApplicantProfile | null,
  opts: { now?: Date; timeZone?: string; planLength?: number } = {}
): TemporalContext {
  const now = opts.now ?? new Date()
  const timeZone = opts.timeZone ?? DEFAULT_TIMEZONE
  const { year, month, day, weekday } = datePartsInZone(now, timeZone)
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  const intakeYear = parseIntakeYear(profile?.goals?.year)
  const graduation = profile?.academic?.graduation?.trim() || null
  // Academic year flips in September for the target audience (UZ / CIS schools)
  const academicStart = month >= 9 ? year : year - 1

  return {
    now,
    timeZone,
    todayIso: iso,
    todayHuman: `${day} ${RU_MONTHS_GENITIVE[month - 1]} ${year}`,
    weekday,
    year,
    month,
    day,
    academicYear: `${academicStart}/${academicStart + 1}`,
    intakeYear,
    intakeStatus: intakeStatusFor(intakeYear, year, month),
    graduation,
    planMonths: planMonths(year, month, opts.planLength ?? 12),
  }
}

/** Prompt block appended to the system prompt. Server truth — NOT wrapped as user data. */
export function temporalPromptBlock(ctx: TemporalContext): string {
  const intakeLine = (() => {
    if (ctx.intakeYear === null) {
      return "- Целевой год поступления в профиле не указан — уточни его у пользователя, а до этого исходи из ближайшего реального набора."
    }
    switch (ctx.intakeStatus) {
      case "past":
        return `- Целевой год поступления по профилю: ${ctx.intakeYear}. ОН УЖЕ ПРОШЁЛ относительно сегодняшней даты — прямо скажи об этом и планируй на ближайший реальный набор (${ctx.year + 1}).`
      case "tight":
        return `- Целевой год поступления по профилю: ${ctx.intakeYear} (этот год). Большинство наборов на осень ${ctx.intakeYear} уже закрыты — проверь реалистичность и предложи ${ctx.intakeYear + 1} как основной вариант, если сроки не бьются.`
      default:
        return `- Целевой год поступления по профилю: ${ctx.intakeYear} (осенний набор ${ctx.intakeYear} — реалистичен).`
    }
  })()

  const graduationLine = ctx.graduation
    ? `- Окончание текущего учебного заведения по профилю: ${ctx.graduation}. Не планируй подачу документов, требующую аттестата, раньше этой даты, если не объяснён допустимый маршрут (условное зачисление, foundation и т.п.).`
    : ""

  return [
    "## ВРЕМЕННОЙ КОНТЕКСТ (задан сервером — единственный источник текущей даты)",
    `- Сегодня: ${ctx.weekday}, ${ctx.todayHuman} (${ctx.todayIso}), часовой пояс ${ctx.timeZone}.`,
    `- Текущий учебный год: ${ctx.academicYear}.`,
    intakeLine,
    graduationLine,
    `- Месяцы для планирования, строго по порядку: ${ctx.planMonths.join(", ")}.`,
    "",
    "ПРАВИЛА РАБОТЫ С ДАТАМИ:",
    "1. Любая дата в ответе — с явным годом. Дедлайны задач указывай в формате YYYY-MM-DD.",
    `2. Не назначай задачи и дедлайны раньше ${ctx.todayIso}. Сейчас НЕ ${ctx.year - 1} и НЕ ${ctx.year - 2} год.`,
    "3. Официальный дедлайн вуза или стипендии называй только если уверен, что он относится к нужному набору. Иначе пиши «дедлайн следующего набора не опубликован» и давай ориентир с пометкой «неподтверждённый ориентир». Не переноси прошлогоднюю дату на год вперёд молча.",
    "4. Различай три вида сроков: официальный дедлайн программы, личный срок подготовки, неподтверждённый ориентир.",
    "5. Если целевой набор нереалистичен относительно сегодняшней даты — скажи об этом прямо и предложи ближайший реальный.",
  ]
    .filter(Boolean)
    .join("\n")
}

/** Convenience: build the block for a profile in one call. */
export function buildTemporalBlock(
  profile?: ApplicantProfile | null,
  opts: { now?: Date; timeZone?: string; planLength?: number } = {}
): string {
  return temporalPromptBlock(getTemporalContext(profile, opts))
}
