/**
 * Single Applicant Profile — used by all 11 AI tools as auto-fill context.
 * Stored in entrium.profiles.applicant_data jsonb.
 */
export type ApplicantProfile = {
  personal: {
    name?: string
    age?: string
    citizenship?: string
    location?: string
    email?: string
    phone?: string
    linkedin?: string
    github?: string
    portfolio?: string
  }
  academic: {
    school?: string
    schoolType?: string
    /** Length of secondary schooling, e.g. "11" or "12" (years) */
    schoolYears?: string
    /** Expected graduation, free text or YYYY-MM, e.g. "июнь 2027" */
    graduation?: string
    /** What the current education is: school | college | foundation | university */
    educationType?: string
    gpa?: string
    /** Scale the GPA is on, e.g. "5", "4", "100", "IB 45" */
    gpaScale?: string
    sat?: string
    act?: string
    ielts?: string
    toefl?: string
    duolingo?: string
    apIb?: string
    coursework?: string
  }
  goals: {
    level?: "Bachelor" | "Master" | "PhD" | "MBA" | "Foundation"
    year?: string
    /** Intake label, e.g. "Fall 2027" / "осень 2027" */
    intake?: string
    major?: string
    region?: string
    countries?: string
    targetUnis?: string
    /** Language of instruction the applicant wants: "английский" | "any" | … */
    instructionLanguage?: string
    budget?: string
    /** What the budget covers */
    budgetIncludes?: "tuition" | "tuition_living"
    /** How much of the cost must be funded externally */
    fundingNeed?: "none" | "partial" | "full"
  }
  experience?: string
  activities?: string
  awards?: string
  projects?: string
  skillsTech?: string
  skillsLang?: string
  weak?: string
  goalsText?: string
  /** internal flag for onboarding completion */
  _completed?: boolean
  /** ISO timestamp of last update */
  _updated?: string
}

export const EMPTY_PROFILE: ApplicantProfile = {
  personal: {},
  academic: {},
  goals: {},
}

/**
 * Normalize raw applicant_data — which can be null, {}, or a partial object
 * missing the personal/academic/goals sub-objects — into a safe ApplicantProfile.
 * Mirrors the defensive merge in getApplicantProfile so AI routes that read the
 * profile via the admin client never throw "Cannot read properties of undefined".
 */
export function normalizeApplicantProfile(raw: unknown): ApplicantProfile {
  const p = (raw && typeof raw === "object" ? raw : {}) as Partial<ApplicantProfile>
  return {
    ...p,
    personal: { ...EMPTY_PROFILE.personal, ...(p.personal ?? {}) },
    academic: { ...EMPTY_PROFILE.academic, ...(p.academic ?? {}) },
    goals: { ...EMPTY_PROFILE.goals, ...(p.goals ?? {}) },
  } as ApplicantProfile
}

/**
 * Calculate completeness percentage to show onboarding progress.
 */
/**
 * The checks behind the "profile N%" number, with human labels — so the UI can
 * say WHICH fields are missing instead of a bare percentage (P1-05).
 * Order = importance for the first recommendation.
 */
export const PROFILE_CHECKS: ReadonlyArray<{ key: string; label: string; test: (p: ApplicantProfile) => boolean }> = [
  { key: "level", label: "уровень обучения (бакалавр / магистр…)", test: (p) => !!p.goals.level },
  { key: "major", label: "специальность", test: (p) => !!p.goals.major },
  { key: "citizenship", label: "гражданство", test: (p) => !!p.personal.citizenship },
  { key: "gpa", label: "GPA / средний балл", test: (p) => !!p.academic.gpa },
  { key: "english", label: "английский (IELTS / TOEFL / Duolingo)", test: (p) => !!(p.academic.ielts || p.academic.toefl || p.academic.duolingo) },
  { key: "name", label: "имя", test: (p) => !!p.personal.name },
  { key: "targetUnis", label: "целевые университеты", test: (p) => !!p.goals.targetUnis },
  { key: "activities", label: "активности или опыт", test: (p) => !!(p.activities || p.experience) },
]

export function profileCompleteness(p: ApplicantProfile): number {
  const done = PROFILE_CHECKS.filter((c) => c.test(p)).length
  return Math.round((done / PROFILE_CHECKS.length) * 100)
}

/** Labels of the checks that are still empty, most important first. */
export function missingProfileFields(p: ApplicantProfile): string[] {
  return PROFILE_CHECKS.filter((c) => !c.test(p)).map((c) => c.label)
}

/**
 * Render profile as plain-text context block to inject into AI prompts.
 * Used by all tools to pre-load applicant context without manual re-entry.
 */
export function profileToContextBlock(p: ApplicantProfile): string {
  const parts: string[] = []

  if (p.personal.name) parts.push(`Имя: ${p.personal.name}`)
  if (p.personal.age) parts.push(`Возраст: ${p.personal.age}`)
  if (p.personal.citizenship) parts.push(`Гражданство: ${p.personal.citizenship}`)
  if (p.personal.location) parts.push(`Город: ${p.personal.location}`)

  if (p.academic.school) parts.push(`Школа/университет: ${p.academic.school}`)
  if (p.academic.educationType) parts.push(`Тип образования: ${p.academic.educationType}`)
  if (p.academic.schoolYears) parts.push(`Длительность школы: ${p.academic.schoolYears} лет`)
  if (p.academic.graduation) parts.push(`Окончание: ${p.academic.graduation}`)
  if (p.academic.gpa) parts.push(`GPA: ${p.academic.gpa}${p.academic.gpaScale ? ` (шкала ${p.academic.gpaScale})` : ""}`)
  if (p.academic.sat) parts.push(`SAT: ${p.academic.sat}`)
  if (p.academic.act) parts.push(`ACT: ${p.academic.act}`)
  if (p.academic.ielts) parts.push(`IELTS: ${p.academic.ielts}`)
  if (p.academic.toefl) parts.push(`TOEFL: ${p.academic.toefl}`)
  if (p.academic.duolingo) parts.push(`Duolingo: ${p.academic.duolingo}`)
  if (p.academic.apIb) parts.push(`AP/IB: ${p.academic.apIb}`)
  if (p.academic.coursework) parts.push(`Курсы: ${p.academic.coursework}`)

  if (p.goals.level) parts.push(`Уровень: ${p.goals.level}`)
  if (p.goals.year) parts.push(`Год поступления: ${p.goals.year}${p.goals.intake ? ` (${p.goals.intake})` : ""}`)
  if (p.goals.major) parts.push(`Специальность: ${p.goals.major}`)
  if (p.goals.region) parts.push(`Регион: ${p.goals.region}`)
  if (p.goals.countries) parts.push(`Страны: ${p.goals.countries}`)
  if (p.goals.instructionLanguage) parts.push(`Язык обучения: ${p.goals.instructionLanguage}`)
  if (p.goals.targetUnis) parts.push(`Целевые вузы: ${p.goals.targetUnis}`)
  if (p.goals.budget) {
    const covers = p.goals.budgetIncludes === "tuition_living" ? "обучение + проживание" : p.goals.budgetIncludes === "tuition" ? "только обучение" : ""
    parts.push(`Бюджет $/год: ${p.goals.budget}${covers ? ` (${covers})` : ""}`)
  }
  if (p.goals.fundingNeed) {
    const label = { none: "не нужно", partial: "частично", full: "полное финансирование" }[p.goals.fundingNeed]
    parts.push(`Нужна стипендия/финансирование: ${label}`)
  }

  if (p.experience) parts.push(`Опыт: ${p.experience}`)
  if (p.activities) parts.push(`Активности: ${p.activities}`)
  if (p.awards) parts.push(`Награды: ${p.awards}`)
  if (p.projects) parts.push(`Проекты: ${p.projects}`)
  if (p.skillsTech) parts.push(`Tech skills: ${p.skillsTech}`)
  if (p.skillsLang) parts.push(`Языки: ${p.skillsLang}`)
  if (p.weak) parts.push(`Слабые места: ${p.weak}`)
  if (p.goalsText) parts.push(`Цели: ${p.goalsText}`)

  if (parts.length === 0) return ""
  return `[Контекст профиля абитуриента]\n${parts.join("\n")}\n\n`
}
