import { EMPTY_PROFILE, type ApplicantProfile } from "@/lib/applicant/types"

/**
 * Regression profiles (CTO TZ §5 — «не менее 20 вымышленных профилей»).
 * Each profile states what the deterministic pipeline must guarantee for it.
 * These run without any AI call: filters, matching, temporal rules, scholarship
 * eligibility and quota arithmetic are pure functions.
 */
export type RegressionProfile = {
  id: string
  note: string
  profile: ApplicantProfile
  expect: {
    level: "bachelor" | "master" | "phd" | "foundation" | null
    countries: string[]
    language: string
    intakeYear: number | null
    intakeStatus: "ok" | "tight" | "past" | "unknown"
    /** Seed programmes that may appear in the MAIN results (empty = none allowed) */
    allowedMainCountries: string[]
    /** Must the main results be empty against the 2026-09-28 seed? */
    mainMustBeEmpty?: boolean
    /** May any programme be reported as "meets" for this applicant? */
    meetsAllowed: boolean
  }
}

const base = (over: Partial<ApplicantProfile>): ApplicantProfile => ({
  ...EMPTY_PROFILE,
  ...over,
  personal: { ...EMPTY_PROFILE.personal, ...(over.personal ?? {}) },
  academic: { ...EMPTY_PROFILE.academic, ...(over.academic ?? {}) },
  goals: { ...EMPTY_PROFILE.goals, ...(over.goals ?? {}) },
})

export const REGRESSION_PROFILES: RegressionProfile[] = [
  {
    id: "tz-italy-germany-11y",
    note: "Профиль из ТЗ: 11 классов, IELTS 7, без SAT, $10k с проживанием, Италия/Германия, англ.",
    profile: base({
      personal: { citizenship: "Узбекистан" },
      academic: { schoolYears: "11", graduation: "июнь 2027", gpa: "4.6/5", ielts: "7.0" },
      goals: { level: "Bachelor", year: "2027", major: "Economics and Finance", countries: "Италия, Германия", budget: "$10 000 в год, включая обучение и проживание", instructionLanguage: "английский" },
    }),
    expect: { level: "bachelor", countries: ["Italy", "Germany"], language: "en", intakeYear: 2027, intakeStatus: "ok", allowedMainCountries: ["Italy", "Germany"], meetsAllowed: false },
  },
  {
    id: "kz-12y-italy-rich",
    note: "12 классов (Казахстан), большой бюджет, только Италия — Bocconi может попасть в основную выдачу",
    profile: base({
      personal: { citizenship: "Казахстан" },
      academic: { schoolYears: "12", gpa: "4.8/5", ielts: "7.5", sat: "1420" },
      goals: { level: "Bachelor", year: "2027", major: "Finance", countries: "Италия", budget: "$30 000 в год", instructionLanguage: "английский" },
    }),
    expect: { level: "bachelor", countries: ["Italy"], language: "en", intakeYear: 2027, intakeStatus: "ok", allowedMainCountries: ["Italy"], meetsAllowed: true },
  },
  {
    id: "uz-11y-germany-only-english",
    note: "11 классов, только Германия, только английский — немецкоязычный Mannheim не в основной выдаче",
    profile: base({
      personal: { citizenship: "Узбекистан" },
      academic: { schoolYears: "11", gpa: "4.2/5", ielts: "6.5" },
      goals: { level: "Bachelor", year: "2027", major: "Economics", countries: "Германия", budget: "$8 000 в год", instructionLanguage: "английский" },
    }),
    expect: { level: "bachelor", countries: ["Germany"], language: "en", intakeYear: 2027, intakeStatus: "ok", allowedMainCountries: ["Germany"], meetsAllowed: false },
  },
  {
    id: "ru-12y-germany-german-ok",
    note: "12 классов, язык обучения «любой» — Mannheim может быть в основной выдаче",
    profile: base({
      personal: { citizenship: "Россия" },
      academic: { schoolYears: "12", gpa: "4.9/5", ielts: "7.0" },
      goals: { level: "Bachelor", year: "2027", major: "Economics", countries: "Германия", budget: "$15 000 в год", instructionLanguage: "любой" },
    }),
    expect: { level: "bachelor", countries: ["Germany"], language: "any", intakeYear: 2027, intakeStatus: "ok", allowedMainCountries: ["Germany"], meetsAllowed: true },
  },
  {
    id: "past-intake-2025",
    note: "Год поступления 2025 уже прошёл — временной контекст должен это сказать",
    profile: base({
      personal: { citizenship: "Узбекистан" },
      academic: { schoolYears: "11", gpa: "4.0/5" },
      goals: { level: "Bachelor", year: "2025", major: "Economics", countries: "Италия", budget: "$10 000 в год" },
    }),
    expect: { level: "bachelor", countries: ["Italy"], language: "en", intakeYear: 2025, intakeStatus: "past", allowedMainCountries: [], mainMustBeEmpty: true, meetsAllowed: false },
  },
  {
    id: "tight-intake-2026",
    note: "Поступление в текущем году — статус tight (осенние наборы закрыты)",
    profile: base({
      personal: { citizenship: "Узбекистан" },
      academic: { schoolYears: "12", gpa: "4.5/5", ielts: "7.0" },
      goals: { level: "Bachelor", year: "2026", major: "Economics", countries: "Италия", budget: "$12 000 в год" },
    }),
    expect: { level: "bachelor", countries: ["Italy"], language: "en", intakeYear: 2026, intakeStatus: "tight", allowedMainCountries: [], mainMustBeEmpty: true, meetsAllowed: false },
  },
  {
    id: "no-intake-year",
    note: "Год не указан — статус unknown, программы 2027 в основной выдаче допустимы",
    profile: base({
      personal: { citizenship: "Узбекистан" },
      academic: { schoolYears: "11", gpa: "4.3/5", ielts: "6.5" },
      goals: { level: "Bachelor", major: "Economics", countries: "Италия", budget: "$10 000 в год" },
    }),
    expect: { level: "bachelor", countries: ["Italy"], language: "en", intakeYear: null, intakeStatus: "unknown", allowedMainCountries: ["Italy"], meetsAllowed: false },
  },
  {
    id: "master-italy",
    note: "Магистратура — в seed только бакалавриат, основная выдача пуста",
    profile: base({
      personal: { citizenship: "Узбекистан" },
      academic: { gpa: "4.7/5", ielts: "7.5" },
      goals: { level: "Master", year: "2027", major: "Finance", countries: "Италия", budget: "$15 000 в год" },
    }),
    expect: { level: "master", countries: ["Italy"], language: "en", intakeYear: 2027, intakeStatus: "ok", allowedMainCountries: [], mainMustBeEmpty: true, meetsAllowed: false },
  },
  {
    id: "phd-japan",
    note: "PhD в Японии — нет данных в базе",
    profile: base({
      personal: { citizenship: "Узбекистан" },
      academic: { gpa: "4.9/5", ielts: "8.0" },
      goals: { level: "PhD", year: "2027", major: "Cybersecurity", countries: "Япония", budget: "$5 000 в год" },
    }),
    expect: { level: "phd", countries: ["Japan"], language: "en", intakeYear: 2027, intakeStatus: "ok", allowedMainCountries: [], mainMustBeEmpty: true, meetsAllowed: false },
  },
  {
    id: "no-ielts-no-sat",
    note: "Без IELTS и SAT — статус только «условия» или «недостаточно данных», не «соответствует»",
    profile: base({
      personal: { citizenship: "Узбекистан" },
      academic: { schoolYears: "12", gpa: "4.4/5" },
      goals: { level: "Bachelor", year: "2027", major: "Economics", countries: "Италия", budget: "$12 000 в год" },
    }),
    expect: { level: "bachelor", countries: ["Italy"], language: "en", intakeYear: 2027, intakeStatus: "ok", allowedMainCountries: ["Italy"], meetsAllowed: false },
  },
  {
    id: "tiny-budget",
    note: "Бюджет $2 000 — платные программы уходят в альтернативы, бесплатный Bayreuth и Bologna остаются",
    profile: base({
      personal: { citizenship: "Узбекистан" },
      academic: { schoolYears: "12", gpa: "4.6/5", ielts: "7.0", sat: "1300" },
      goals: { level: "Bachelor", year: "2027", major: "Economics", countries: "Италия, Германия", budget: "$2 000 в год", instructionLanguage: "английский" },
    }),
    expect: { level: "bachelor", countries: ["Italy", "Germany"], language: "en", intakeYear: 2027, intakeStatus: "ok", allowedMainCountries: ["Italy", "Germany"], meetsAllowed: true },
  },
  {
    id: "no-budget-given",
    note: "Бюджет не указан — фильтр по бюджету не применяется, но стоимость помечается как неизвестная там, где её нет",
    profile: base({
      personal: { citizenship: "Узбекистан" },
      academic: { schoolYears: "12", gpa: "4.6/5", ielts: "7.0" },
      goals: { level: "Bachelor", year: "2027", major: "Economics", countries: "Италия", instructionLanguage: "английский" },
    }),
    expect: { level: "bachelor", countries: ["Italy"], language: "en", intakeYear: 2027, intakeStatus: "ok", allowedMainCountries: ["Italy"], meetsAllowed: true },
  },
  {
    id: "austria-requested",
    note: "Австрия запрошена явно — в seed её нет, основная выдача пуста, Италия/Германия только как альтернативы",
    profile: base({
      personal: { citizenship: "Узбекистан" },
      academic: { schoolYears: "12", gpa: "4.6/5", ielts: "7.0" },
      goals: { level: "Bachelor", year: "2027", major: "Economics", countries: "Австрия", budget: "$10 000 в год", instructionLanguage: "английский" },
    }),
    expect: { level: "bachelor", countries: ["Austria"], language: "en", intakeYear: 2027, intakeStatus: "ok", allowedMainCountries: [], mainMustBeEmpty: true, meetsAllowed: false },
  },
  {
    id: "usa-uk-only",
    note: "США/Великобритания — вне seed",
    profile: base({
      personal: { citizenship: "Узбекистан" },
      academic: { schoolYears: "12", gpa: "4.9/5", ielts: "8.0", sat: "1500" },
      goals: { level: "Bachelor", year: "2027", major: "Economics", countries: "USA, UK", budget: "$60 000 в год" },
    }),
    expect: { level: "bachelor", countries: ["United States", "United Kingdom"], language: "en", intakeYear: 2027, intakeStatus: "ok", allowedMainCountries: [], mainMustBeEmpty: true, meetsAllowed: false },
  },
  {
    id: "any-country",
    note: "Страны не указаны — фильтр по стране не применяется",
    profile: base({
      personal: { citizenship: "Кыргызстан" },
      academic: { schoolYears: "11", gpa: "4.5/5", ielts: "6.5" },
      goals: { level: "Bachelor", year: "2027", major: "Economics", budget: "$10 000 в год", instructionLanguage: "английский" },
    }),
    expect: { level: "bachelor", countries: [], language: "en", intakeYear: 2027, intakeStatus: "ok", allowedMainCountries: ["Italy", "Germany"], meetsAllowed: false },
  },
  {
    id: "intake-2028-early",
    note: "Поступление 2028 — программы набора 2027 не в основной выдаче (несовпадение набора)",
    profile: base({
      personal: { citizenship: "Узбекистан" },
      academic: { schoolYears: "11", graduation: "июнь 2028", gpa: "4.2/5" },
      goals: { level: "Bachelor", year: "2028", major: "Economics", countries: "Италия", budget: "$10 000 в год" },
    }),
    expect: { level: "bachelor", countries: ["Italy"], language: "en", intakeYear: 2028, intakeStatus: "ok", allowedMainCountries: [], mainMustBeEmpty: true, meetsAllowed: false },
  },
  {
    id: "italian-language-ok",
    note: "Готов учиться на итальянском — фильтр языка = it, англоязычные программы уходят в альтернативы",
    profile: base({
      personal: { citizenship: "Узбекистан" },
      academic: { schoolYears: "12", gpa: "4.6/5" },
      goals: { level: "Bachelor", year: "2027", major: "Economics", countries: "Италия", budget: "$6 000 в год", instructionLanguage: "итальянский" },
    }),
    expect: { level: "bachelor", countries: ["Italy"], language: "it", intakeYear: 2027, intakeStatus: "ok", allowedMainCountries: [], mainMustBeEmpty: true, meetsAllowed: false },
  },
  {
    id: "foundation-seeker",
    note: "Ищет foundation — в seed нет",
    profile: base({
      personal: { citizenship: "Узбекистан" },
      academic: { schoolYears: "11", gpa: "3.9/5" },
      goals: { level: "Foundation", year: "2027", major: "Economics", countries: "Италия", budget: "$8 000 в год" },
    }),
    expect: { level: "foundation", countries: ["Italy"], language: "en", intakeYear: 2027, intakeStatus: "ok", allowedMainCountries: [], mainMustBeEmpty: true, meetsAllowed: false },
  },
  {
    id: "low-ielts",
    note: "IELTS 5.5 ниже требований — «условия», не «соответствует»",
    profile: base({
      personal: { citizenship: "Узбекистан" },
      academic: { schoolYears: "12", gpa: "4.7/5", ielts: "5.5", sat: "1350" },
      goals: { level: "Bachelor", year: "2027", major: "Economics", countries: "Италия, Германия", budget: "$20 000 в год", instructionLanguage: "английский" },
    }),
    expect: { level: "bachelor", countries: ["Italy", "Germany"], language: "en", intakeYear: 2027, intakeStatus: "ok", allowedMainCountries: ["Italy", "Germany"], meetsAllowed: false },
  },
  {
    id: "euro-budget",
    note: "Бюджет в евро — парсится и конвертируется",
    profile: base({
      personal: { citizenship: "Узбекистан" },
      academic: { schoolYears: "12", gpa: "4.6/5", ielts: "7.0", sat: "1400" },
      goals: { level: "Bachelor", year: "2027", major: "Economics", countries: "Италия", budget: "€9 000 в год (только обучение)", instructionLanguage: "английский" },
    }),
    expect: { level: "bachelor", countries: ["Italy"], language: "en", intakeYear: 2027, intakeStatus: "ok", allowedMainCountries: ["Italy"], meetsAllowed: true },
  },
  {
    id: "empty-profile",
    note: "Пустой профиль — ничего не ломается, ничего не «соответствует»",
    profile: base({}),
    expect: { level: null, countries: [], language: "en", intakeYear: null, intakeStatus: "unknown", allowedMainCountries: ["Italy", "Germany"], meetsAllowed: false },
  },
]
