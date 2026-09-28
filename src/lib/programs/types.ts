import type { ApplicantProfile } from "@/lib/applicant/types"

/**
 * Verified study programmes (P0-03) — pure types, normalisers and the
 * eligibility check. No I/O here: everything is unit-testable and shared by
 * the server search, the prompt context and the admin import.
 */

export type ProgramLevel = "bachelor" | "master" | "phd" | "foundation"
export type SchoolAcceptance = "yes" | "no" | "conditional" | "unknown"
export type ProgramStatus = "verified" | "needs_review" | "draft" | "archived"

export type Program = {
  id: string
  university_id?: string | null
  university_name: string
  country: string
  city?: string | null
  campus?: string | null
  program_name: string
  level: ProgramLevel
  language: string
  intake?: string | null
  intake_year?: number | null
  academic_year?: string | null
  duration_years?: number | null
  tuition_amount?: number | null
  tuition_currency?: string | null
  tuition_period?: "year" | "total" | "semester" | null
  tuition_note?: string | null
  admission_requirements?: string | null
  accepts_11_year_school: SchoolAcceptance
  required_exams: string[]
  english_requirement?: string | null
  other_language_requirement?: string | null
  application_deadline?: string | null
  deadline_status: "published" | "not_published" | "estimated"
  deadline_note?: string | null
  source_url: string
  verified_at?: string | null
  verified_by?: string | null
  status: ProgramStatus
  notes?: string | null
}

// ── Normalisers ──────────────────────────────────────────────────────────────

const COUNTRY_ALIASES: Record<string, string> = {
  италия: "Italy", italy: "Italy", italia: "Italy",
  германия: "Germany", germany: "Germany", deutschland: "Germany",
  австрия: "Austria", austria: "Austria",
  нидерланды: "Netherlands", голландия: "Netherlands", netherlands: "Netherlands", holland: "Netherlands", "the netherlands": "Netherlands",
  франция: "France", france: "France",
  испания: "Spain", spain: "Spain",
  польша: "Poland", poland: "Poland",
  чехия: "Czechia", czechia: "Czechia", "czech republic": "Czechia",
  венгрия: "Hungary", hungary: "Hungary",
  великобритания: "United Kingdom", англия: "United Kingdom", uk: "United Kingdom", "united kingdom": "United Kingdom", england: "United Kingdom", britain: "United Kingdom",
  сша: "United States", америка: "United States", usa: "United States", us: "United States", "united states": "United States",
  канада: "Canada", canada: "Canada",
  австралия: "Australia", australia: "Australia",
  корея: "South Korea", "южная корея": "South Korea", korea: "South Korea", "south korea": "South Korea",
  япония: "Japan", japan: "Japan",
  турция: "Türkiye", turkey: "Türkiye", türkiye: "Türkiye",
  оаэ: "United Arab Emirates", uae: "United Arab Emirates", "united arab emirates": "United Arab Emirates",
  сингапур: "Singapore", singapore: "Singapore",
  китай: "China", china: "China",
  швейцария: "Switzerland", switzerland: "Switzerland",
  швеция: "Sweden", sweden: "Sweden",
  финляндия: "Finland", finland: "Finland",
  норвегия: "Norway", norway: "Norway",
  дания: "Denmark", denmark: "Denmark",
  ирландия: "Ireland", ireland: "Ireland",
  бельгия: "Belgium", belgium: "Belgium",
  португалия: "Portugal", portugal: "Portugal",
  малайзия: "Malaysia", malaysia: "Malaysia",
  казахстан: "Kazakhstan", kazakhstan: "Kazakhstan",
  россия: "Russia", russia: "Russia",
  узбекистан: "Uzbekistan", uzbekistan: "Uzbekistan",
  литва: "Lithuania", lithuania: "Lithuania",
  латвия: "Latvia", latvia: "Latvia",
  эстония: "Estonia", estonia: "Estonia",
  гонконг: "Hong Kong", "hong kong": "Hong Kong",
}

/** "Италия" / "italy" / "ITALY" → "Italy"; unknown names are returned trimmed. */
export function normalizeCountry(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ")
  return COUNTRY_ALIASES[key] ?? raw.trim()
}

/** "Италия, Германия" → ["Italy", "Germany"] */
export function parseCountries(raw: string | undefined | null): string[] {
  if (!raw) return []
  return Array.from(
    new Set(
      raw
        .split(/[,;/]|\s+и\s+|\s+and\s+/i)
        .map((s) => s.trim())
        .filter(Boolean)
        .map(normalizeCountry)
    )
  )
}

const LANGUAGE_ALIASES: Record<string, string> = {
  en: "en", english: "en", английский: "en", англ: "en", "на английском": "en",
  it: "it", italian: "it", итальянский: "it",
  de: "de", german: "de", немецкий: "de",
  fr: "fr", french: "fr", французский: "fr",
  es: "es", spanish: "es", испанский: "es",
  ru: "ru", russian: "ru", русский: "ru",
  ko: "ko", korean: "ko", корейский: "ko",
  ja: "ja", japanese: "ja", японский: "ja",
  tr: "tr", turkish: "tr", турецкий: "tr",
  zh: "zh", chinese: "zh", китайский: "zh",
  any: "any", любой: "any", "не важно": "any",
}

export function normalizeLanguage(raw: string | undefined | null): string {
  if (!raw) return "en"
  const key = raw.trim().toLowerCase()
  return LANGUAGE_ALIASES[key] ?? key
}

export function normalizeLevel(raw: string | undefined | null): ProgramLevel | null {
  if (!raw) return null
  const k = raw.trim().toLowerCase()
  if (/bachelor|бакалавр|undergrad|bsc|ba\b/.test(k)) return "bachelor"
  if (/master|магистр|msc|ma\b|mba/.test(k)) return "master"
  if (/phd|doctor|аспирант|докто/.test(k)) return "phd"
  if (/foundation|подготов/.test(k)) return "foundation"
  return null
}

/** Rough FX to USD for budget comparison only (not shown as a price). */
export const USD_RATES: Record<string, number> = { USD: 1, EUR: 1.1, GBP: 1.3, CHF: 1.15, PLN: 0.25, CZK: 0.044, HUF: 0.0027, TRY: 0.03, KRW: 0.00075, MYR: 0.24, JPY: 0.0067, AED: 0.27, SGD: 0.75, CAD: 0.73, AUD: 0.66 }

export function toUsd(amount: number, currency: string | null | undefined): number | null {
  const rate = USD_RATES[(currency ?? "USD").toUpperCase()]
  return rate ? Math.round(amount * rate) : null
}

/** "$10 000 в год (обучение + проживание)" → 10000; "10k" → 10000; "€8.000" → 8800 */
export function parseBudgetUsd(raw: string | undefined | null): number | null {
  if (!raw) return null
  const s = raw.replace(/ /g, " ")
  const m = s.match(/(\d[\d\s.,]*)\s*(k|к|тыс)?/i)
  if (!m) return null
  let n = Number(m[1].replace(/[\s.,]/g, ""))
  if (!Number.isFinite(n) || n === 0) return null
  if (m[2]) n *= 1000
  if (/€|eur|евро/i.test(s)) n = Math.round(n * USD_RATES.EUR)
  else if (/£|gbp|фунт/i.test(s)) n = Math.round(n * USD_RATES.GBP)
  return n
}

/** Does the free-text budget say it includes living costs? */
export function budgetIncludesLiving(raw: string | undefined | null): boolean {
  return /прожив|living|жиль|accommodation|всё включ|all-in/i.test(raw ?? "")
}

/** Rough annual living cost by country, USD — used only to flag a funding gap. */
export const LIVING_COST_USD: Record<string, number> = {
  Italy: 9000, Germany: 12000, Austria: 12000, Netherlands: 14000, France: 12000, Spain: 10000,
  Poland: 7000, Czechia: 8000, Hungary: 7000, "United Kingdom": 16000, "United States": 18000,
  Canada: 15000, Australia: 18000, "South Korea": 10000, Japan: 11000, "Türkiye": 6000,
  "United Arab Emirates": 15000, Singapore: 16000, China: 6000, Switzerland: 22000, Sweden: 12000,
  Finland: 11000, Norway: 15000, Denmark: 14000, Ireland: 15000, Belgium: 12000, Portugal: 9000,
  Malaysia: 5000, Kazakhstan: 4000, Lithuania: 7000, Latvia: 7000, Estonia: 8000, "Hong Kong": 15000,
}

/** "IELTS 6.5 (no band below 6.0)" → 6.5 */
export function parseIeltsRequirement(text: string | null | undefined): number | null {
  const m = (text ?? "").match(/ielts[^\d]{0,12}(\d(?:[.,]\d)?)/i)
  return m ? Number(m[1].replace(",", ".")) : null
}

export function parseScore(raw: string | undefined | null): number | null {
  const m = (raw ?? "").match(/\d+(?:[.,]\d+)?/)
  return m ? Number(m[0].replace(",", ".")) : null
}

// ── Eligibility ──────────────────────────────────────────────────────────────

export type MatchStatus = "meets" | "conditions" | "not_eligible" | "insufficient_data"

export const MATCH_LABELS: Record<MatchStatus, string> = {
  meets: "соответствует опубликованным требованиям",
  conditions: "нужно выполнить дополнительные условия",
  not_eligible: "не соответствует",
  insufficient_data: "недостаточно данных",
}

export type ProgramMatch = {
  status: MatchStatus
  /** Why — in the applicant's language, short */
  reasons: string[]
  /** Annual funding gap in USD when the budget is known and too small (null = unknown / none) */
  fundingGapUsd: number | null
  /** Which mandatory filters this programme fails (empty = within the request) */
  outsideRequest: Array<"level" | "field" | "country" | "language" | "intake" | "budget">
}

/**
 * Coarse field of study, derived from free text (programme name or the applicant's
 * target major). Used so a Computer Science programme is never offered as an
 * "alternative" to an Economics applicant once the base spans many fields.
 */
export type StudyField =
  | "computer_science"
  | "engineering"
  | "economics_business"
  | "law"
  | "medicine"
  | "social_sciences"
  | "natural_sciences"

const FIELD_PATTERNS: Array<[StudyField, RegExp]> = [
  ["computer_science", /computer|informati|software|data science|artificial intelligence|\bai\b|\bit\b|information technology|cyber|программир|информатик|компьютер|дата.?сайенс/i],
  ["engineering", /engineering|mechanical|electrical|civil|aerospace|mechatronic|инженер/i],
  ["economics_business", /econom|financ|business|management|accounting|marketing|\bbwl\b|\bvwl\b|эконом|финанс|бизнес|менеджмент|бухгалт|маркетинг/i],
  ["law", /\blaw\b|legal|jurisprud|юрид|правовед/i],
  ["medicine", /medicine|medical|dentist|pharmac|nursing|медицин|стоматолог|фармац/i],
  ["social_sciences", /international relations|political|sociolog|psycholog|международные отношения|политолог|социолог|психолог/i],
  ["natural_sciences", /physics|chemistry|biolog|mathematics|физик|\bхими|биолог|математик/i],
]

export function fieldOf(text: string | null | undefined): StudyField | null {
  const t = (text ?? "").trim()
  if (!t) return null
  for (const [field, re] of FIELD_PATTERNS) if (re.test(t)) return field
  return null
}

export const FIELD_LABELS: Record<StudyField, string> = {
  computer_science: "IT / Computer Science",
  engineering: "инженерия",
  economics_business: "экономика / бизнес / финансы",
  law: "право",
  medicine: "медицина",
  social_sciences: "социальные науки",
  natural_sciences: "естественные науки",
}

export type ApplicantFilters = {
  level: ProgramLevel | null
  /** Coarse target field from the applicant's major (null = unknown → no field filter) */
  field: StudyField | null
  countries: string[]
  language: string // "en" | "any" | ...
  intakeYear: number | null
  budgetUsd: number | null
  budgetIncludesLiving: boolean
  schoolYears: string | null
  ielts: number | null
  sat: number | null
}

export function filtersFromProfile(p: ApplicantProfile): ApplicantFilters {
  const yearMatch = (p.goals.year ?? "").match(/20\d{2}/)
  return {
    level: normalizeLevel(p.goals.level),
    field: fieldOf(p.goals.major),
    countries: parseCountries(p.goals.countries),
    language: normalizeLanguage(p.goals.instructionLanguage || "en"),
    intakeYear: yearMatch ? Number(yearMatch[0]) : null,
    budgetUsd: parseBudgetUsd(p.goals.budget),
    budgetIncludesLiving: budgetIncludesLiving(p.goals.budget) || p.goals.budgetIncludes === "tuition_living",
    schoolYears: p.academic.schoolYears?.trim() || null,
    ielts: parseScore(p.academic.ielts),
    sat: parseScore(p.academic.sat),
  }
}

/** Annual tuition in USD (null when unknown). */
export function tuitionUsdPerYear(program: Program): number | null {
  if (program.tuition_amount === null || program.tuition_amount === undefined) return null
  const usd = toUsd(Number(program.tuition_amount), program.tuition_currency)
  if (usd === null) return null
  if (program.tuition_period === "semester") return usd * 2
  if (program.tuition_period === "total" && program.duration_years) return Math.round(usd / Number(program.duration_years))
  return usd
}

/**
 * Compare one programme with the applicant. Unknown ≠ meets: a requirement we
 * cannot check makes the verdict "insufficient_data", never a pass.
 */
export function matchProgram(program: Program, f: ApplicantFilters): ProgramMatch {
  const reasons: string[] = []
  const outsideRequest: ProgramMatch["outsideRequest"] = []
  let notEligible = false
  let conditions = false
  let unknown = false

  // Mandatory request filters (level / country / language / intake / budget).
  // Level is also filtered in SQL, but the matcher must never trust the caller for it:
  // a bachelor programme is never a match — or an alternative — for a master applicant.
  if (f.level && program.level !== f.level) {
    outsideRequest.push("level")
    reasons.push(`уровень программы ${program.level}, а цель — ${f.level}`)
  }
  const programField = fieldOf(program.program_name)
  if (f.field && programField && programField !== f.field) {
    outsideRequest.push("field")
    reasons.push(`направление программы — ${FIELD_LABELS[programField]}, а цель — ${FIELD_LABELS[f.field]}`)
  }
  if (f.countries.length > 0 && !f.countries.includes(program.country)) {
    outsideRequest.push("country")
    reasons.push(`страна ${program.country} не входит в запрошенные (${f.countries.join(", ")})`)
  }
  if (f.language !== "any" && program.language !== f.language) {
    outsideRequest.push("language")
    reasons.push(`язык обучения ${program.language.toUpperCase()}, запрошен ${f.language.toUpperCase()}`)
  }
  if (f.intakeYear !== null && program.intake_year !== null && program.intake_year !== undefined && program.intake_year !== f.intakeYear) {
    outsideRequest.push("intake")
    reasons.push(`набор ${program.intake_year}, а цель — ${f.intakeYear}`)
  }

  // Budget: tuition alone above the budget → outside the request; living costs → funding gap
  const tuition = tuitionUsdPerYear(program)
  let fundingGapUsd: number | null = null
  if (f.budgetUsd !== null) {
    if (tuition === null) {
      unknown = true
      reasons.push("стоимость обучения не указана — проверить на сайте")
    } else if (tuition > f.budgetUsd) {
      outsideRequest.push("budget")
      reasons.push(`обучение ≈ $${tuition.toLocaleString("en-US")}/год превышает бюджет $${f.budgetUsd.toLocaleString("en-US")}`)
    } else if (f.budgetIncludesLiving) {
      const living = LIVING_COST_USD[program.country] ?? 10000
      const gap = tuition + living - f.budgetUsd
      if (gap > 0) {
        fundingGapUsd = gap
        reasons.push(`с проживанием (~$${living.toLocaleString("en-US")}/год) дефицит финансирования ≈ $${gap.toLocaleString("en-US")}/год — нужна стипендия`)
      }
    }
  } else if (tuition === null) {
    unknown = true
    reasons.push("стоимость обучения не указана")
  }

  // Previous education: 11-year school
  if (f.level === "bachelor" && f.schoolYears === "11") {
    switch (program.accepts_11_year_school) {
      case "no":
        notEligible = true
        reasons.push("после 11-летней школы прямой приём не предусмотрен (нужен foundation / год университета)")
        break
      case "conditional":
        conditions = true
        reasons.push(`после 11-летней школы — с условиями: ${program.admission_requirements ?? "см. требования"}`)
        break
      case "unknown":
        unknown = true
        reasons.push("приём после 11-летней школы не подтверждён — уточнить в приёмной комиссии")
        break
      default:
        break
    }
  } else if (f.level === "bachelor" && !f.schoolYears) {
    unknown = true
    reasons.push("длительность школы в профиле не указана (11 или 12 лет)")
  }

  // Mandatory exams
  const exams = program.required_exams ?? []
  for (const exam of exams) {
    const e = exam.toUpperCase()
    // One entry = one requirement; "Bocconi online test or SAT/ACT" is satisfied by a SAT/ACT score
    if (/\b(SAT|ACT)\b/.test(e)) {
      if (f.sat === null) {
        conditions = true
        reasons.push(`требуется ${exam} — в профиле нет результата SAT/ACT`)
      }
    } else if (/TOLC|IMAT|TESTDAF|DSH|SELECTIVITY|ENTRANCE|\bTEST\b|VPI|FSP|STUDIENKOLLEG|EXAM|INTERVIEW|ЭКЗАМЕН|ТЕСТ/.test(e)) {
      conditions = true
      reasons.push(`требуется вступительный тест: ${exam}`)
    }
  }

  // English
  const needIelts = parseIeltsRequirement(program.english_requirement)
  if (needIelts !== null) {
    if (f.ielts === null) {
      conditions = true
      reasons.push(`нужен ${program.english_requirement} — результат IELTS в профиле не указан`)
    } else if (f.ielts < needIelts) {
      conditions = true
      reasons.push(`IELTS ${f.ielts} ниже требуемого ${needIelts}`)
    }
  } else if (program.english_requirement) {
    unknown = true
    reasons.push(`языковое требование: ${program.english_requirement} — сверить с профилем`)
  } else if (program.language === "en") {
    unknown = true
    reasons.push("требование по английскому не указано")
  }

  const status: MatchStatus = notEligible
    ? "not_eligible"
    : outsideRequest.length > 0
      ? "not_eligible"
      : conditions
        ? "conditions"
        : unknown
          ? "insufficient_data"
          : "meets"

  return { status, reasons, fundingGapUsd, outsideRequest }
}

// ── Prompt context ───────────────────────────────────────────────────────────

function fmtTuition(p: Program): string {
  if (p.tuition_amount === null || p.tuition_amount === undefined) return p.tuition_note ? `стоимость: ${p.tuition_note}` : "стоимость не указана"
  const per = p.tuition_period === "semester" ? "семестр" : p.tuition_period === "total" ? "вся программа" : "год"
  return `стоимость: ${Number(p.tuition_amount).toLocaleString("en-US")} ${p.tuition_currency ?? "EUR"} / ${per}${p.tuition_note ? ` (${p.tuition_note})` : ""}`
}

function fmtDeadline(p: Program): string {
  if (p.deadline_status === "published" && p.application_deadline) return `официальный дедлайн набора ${p.intake_year ?? ""}: ${p.application_deadline}${p.deadline_note ? ` (${p.deadline_note})` : ""}`
  if (p.deadline_status === "estimated" && p.application_deadline) return `ориентир дедлайна (НЕ подтверждён): ~${p.application_deadline}${p.deadline_note ? ` (${p.deadline_note})` : ""}`
  return `дедлайн набора ${p.intake_year ?? ""} не опубликован${p.deadline_note ? ` (${p.deadline_note})` : ""}`
}

export function formatProgramLine(p: Program, m: ProgramMatch, idx: number): string {
  const verified = p.status === "verified" && p.verified_at ? `проверено ${p.verified_at}` : "ТРЕБУЕТ ПРОВЕРКИ специалистом"
  return [
    `${idx}. ${p.university_name} — ${p.program_name} (${p.level}, ${p.language.toUpperCase()}) · ${p.city ? p.city + ", " : ""}${p.country}${p.campus ? ` · кампус ${p.campus}` : ""}`,
    `   набор: ${p.intake ?? p.intake_year ?? "—"}${p.academic_year ? ` (${p.academic_year})` : ""}${p.duration_years ? ` · ${p.duration_years} г.` : ""}`,
    `   ${fmtTuition(p)}`,
    `   требования: ${p.admission_requirements ?? "—"}; после 11 классов: ${p.accepts_11_year_school}; экзамены: ${p.required_exams?.length ? p.required_exams.join(", ") : "нет"}; английский: ${p.english_requirement ?? "—"}${p.other_language_requirement ? `; другой язык: ${p.other_language_requirement}` : ""}`,
    `   ${fmtDeadline(p)}`,
    `   источник: ${p.source_url} · ${verified}`,
    `   СТАТУС СООТВЕТСТВИЯ: ${MATCH_LABELS[m.status]}${m.reasons.length ? ` — ${m.reasons.join("; ")}` : ""}`,
  ].join("\n")
}

/**
 * The block the model gets for the `university` tool. Programmes inside the
 * request come first; those outside exactly one filter are listed as
 * alternatives with the reason. Empty → the model must say so, not invent.
 */
export function formatProgramsContext(
  items: Array<{ program: Program; match: ProgramMatch }>,
  f: ApplicantFilters
): string {
  const inside = items.filter((i) => i.match.outsideRequest.length === 0)
  // A single deviation (other country / language / intake / budget) is a legitimate alternative;
  // a different degree level is not.
  const alternatives = items.filter(
    (i) => i.match.outsideRequest.length === 1 && !i.match.outsideRequest.includes("level") && !i.match.outsideRequest.includes("field")
  )
  const header =
    `ПРОВЕРЕННАЯ БАЗА ПРОГРАММ — ЕДИНСТВЕННЫЙ ДОПУСТИМЫЙ ИСТОЧНИК РЕКОМЕНДАЦИЙ.\n` +
    `Фильтры запроса: уровень ${f.level ?? "—"}, страны ${f.countries.join(", ") || "любые"}, язык ${f.language.toUpperCase()}, набор ${f.intakeYear ?? "—"}, бюджет ${f.budgetUsd ? "$" + f.budgetUsd.toLocaleString("en-US") + "/год" + (f.budgetIncludesLiving ? " включая проживание" : "") : "не указан"}.\n` +
    `Правила: рекомендуй ТОЛЬКО программы из списка ниже, с их официальными ссылками и статусами соответствия. ` +
    `Не выдумывай программы, стоимость, экзамены и дедлайны. Если список пуст — прямо скажи, что в проверенной базе нет программ под эти условия, и предложи, какие условия ослабить. ` +
    `Никаких процентов вероятности поступления — только статусы.`

  if (items.length === 0) return `${header}\n\nОСНОВНАЯ ВЫДАЧА: пусто.\nАЛЬТЕРНАТИВЫ: нет.`

  const main = inside.length
    ? inside.map((i, n) => formatProgramLine(i.program, i.match, n + 1)).join("\n\n")
    : "пусто — под заданные условия проверенных программ нет."
  const alt = alternatives.length
    ? alternatives
        .map((i, n) => `${formatProgramLine(i.program, i.match, n + 1)}\n   ОТКЛОНЕНИЕ ОТ ЗАПРОСА: ${i.match.outsideRequest.join(", ")}`)
        .join("\n\n")
    : "нет."

  return `${header}\n\nОСНОВНАЯ ВЫДАЧА (в рамках запроса):\n${main}\n\nАЛЬТЕРНАТИВЫ (вне заданных условий — показывать отдельно, с объяснением отклонения):\n${alt}`
}
