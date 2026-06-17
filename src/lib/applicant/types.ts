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
    gpa?: string
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
    major?: string
    region?: string
    countries?: string
    targetUnis?: string
    budget?: string
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
export function profileCompleteness(p: ApplicantProfile): number {
  const checks: boolean[] = [
    !!p.personal.name,
    !!p.personal.citizenship,
    !!p.academic.gpa,
    !!(p.academic.ielts || p.academic.toefl || p.academic.duolingo),
    !!p.goals.level,
    !!p.goals.major,
    !!p.goals.targetUnis,
    !!(p.activities || p.experience),
  ]
  const done = checks.filter(Boolean).length
  return Math.round((done / checks.length) * 100)
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
  if (p.academic.gpa) parts.push(`GPA: ${p.academic.gpa}`)
  if (p.academic.sat) parts.push(`SAT: ${p.academic.sat}`)
  if (p.academic.act) parts.push(`ACT: ${p.academic.act}`)
  if (p.academic.ielts) parts.push(`IELTS: ${p.academic.ielts}`)
  if (p.academic.toefl) parts.push(`TOEFL: ${p.academic.toefl}`)
  if (p.academic.duolingo) parts.push(`Duolingo: ${p.academic.duolingo}`)
  if (p.academic.apIb) parts.push(`AP/IB: ${p.academic.apIb}`)
  if (p.academic.coursework) parts.push(`Курсы: ${p.academic.coursework}`)

  if (p.goals.level) parts.push(`Уровень: ${p.goals.level}`)
  if (p.goals.year) parts.push(`Год поступления: ${p.goals.year}`)
  if (p.goals.major) parts.push(`Специальность: ${p.goals.major}`)
  if (p.goals.region) parts.push(`Регион: ${p.goals.region}`)
  if (p.goals.countries) parts.push(`Страны: ${p.goals.countries}`)
  if (p.goals.targetUnis) parts.push(`Целевые вузы: ${p.goals.targetUnis}`)
  if (p.goals.budget) parts.push(`Бюджет $/год: ${p.goals.budget}`)

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
