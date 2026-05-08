import { ApplicantProfile } from "./types"

/**
 * Returns the strongest English test score available for prefilling form fields
 * that ask for a single "English" value (e.g. "IELTS 7.5" or "TOEFL 105").
 */
export function bestEnglishTest(p: ApplicantProfile): string {
  if (p.academic.ielts) return `IELTS ${p.academic.ielts}`
  if (p.academic.toefl) return `TOEFL ${p.academic.toefl}`
  if (p.academic.duolingo) return `Duolingo ${p.academic.duolingo}`
  return ""
}

/**
 * Returns the strongest standardized test score for fields asking SAT/ACT.
 */
export function bestStandardizedTest(p: ApplicantProfile): string {
  if (p.academic.sat) return p.academic.sat
  if (p.academic.act) return `ACT ${p.academic.act}`
  return ""
}

/**
 * Profile diagnostic tool form defaults.
 */
export function profileDefaults(p: ApplicantProfile) {
  return {
    name: p.personal.name ?? "",
    age: p.personal.age ?? "",
    level: "11 класс",
    year: p.goals.year ?? "2027",
    gpa: p.academic.gpa ?? "",
    eng: bestEnglishTest(p),
    sat: bestStandardizedTest(p),
    apTests: p.academic.apIb ?? "",
    major: p.goals.major ?? "",
    prog: (p.goals.level ?? "Bachelor"),
    region: p.goals.region ?? "USA",
    unis: p.goals.targetUnis ?? "",
    budget: p.goals.budget ?? "",
    citizenship: p.personal.citizenship ?? "Узбекистан",
    extra: p.activities ?? "",
    awards: p.awards ?? "",
    weak: p.weak ?? "",
    goals: p.goalsText ?? "",
  }
}

/**
 * Analyzer (chances) tool defaults.
 */
export function analyzerDefaults(p: ApplicantProfile) {
  return {
    gpa: p.academic.gpa ?? "",
    eng: bestEnglishTest(p),
    sat: bestStandardizedTest(p),
    apTests: p.academic.apIb ?? "",
    major: p.goals.major ?? "",
    prog: p.goals.level ?? "Bachelor",
    unis: p.goals.targetUnis ?? "",
    profile: [p.activities, p.awards, p.experience].filter(Boolean).join("\n\n"),
  }
}

/**
 * Tracker tool defaults.
 */
export function trackerDefaults(p: ApplicantProfile) {
  return {
    name: p.personal.name ?? "",
    age: p.personal.age ?? "",
    level: "11 класс",
    year: p.goals.year ?? "2027",
    gpa: p.academic.gpa ?? "",
    eng: bestEnglishTest(p),
    sat: bestStandardizedTest(p),
    major: p.goals.major ?? "",
    prog: p.goals.level ?? "Bachelor",
    unis: p.goals.targetUnis ?? "",
    extra: p.activities ?? "",
    weak: p.weak ?? "",
  }
}

/**
 * University advisor tool defaults.
 */
export function universityDefaults(p: ApplicantProfile) {
  return {
    gpa: p.academic.gpa ?? "",
    eng: bestEnglishTest(p),
    sat: bestStandardizedTest(p),
    major: p.goals.major ?? "",
    prog: p.goals.level ?? "Bachelor",
    countries: p.goals.countries ?? "",
    budget: p.goals.budget ?? "",
    preferences: p.goalsText ?? "",
  }
}

/**
 * Scholarship matcher defaults.
 */
export function scholarshipDefaults(p: ApplicantProfile) {
  return {
    citizenship: p.personal.citizenship ?? "Узбекистан",
    gpa: p.academic.gpa ?? "",
    eng: bestEnglishTest(p),
    major: p.goals.major ?? "",
    prog: p.goals.level ?? "Bachelor",
    countries: p.goals.countries ?? "",
    needFull: "yes",
    extra: [p.weak, p.goalsText].filter(Boolean).join(" · ") || "",
  }
}

/**
 * CV builder defaults.
 */
export function cvDefaults(p: ApplicantProfile) {
  return {
    name: p.personal.name ?? "",
    email: p.personal.email ?? "",
    phone: p.personal.phone ?? "",
    location: p.personal.location ?? "",
    linkedin: p.personal.linkedin ?? "",
    github: p.personal.github ?? "",
    portfolio: p.personal.portfolio ?? "",
    targetRole: [p.goals.targetUnis, p.goals.major].filter(Boolean).join(" · "),
    targetCountry: p.goals.countries ?? "",
    education: [p.academic.school, p.academic.gpa, p.academic.coursework]
      .filter(Boolean)
      .join("\n"),
    experience: p.experience ?? "",
    projects: p.projects ?? "",
    skillsTech: p.skillsTech ?? "",
    skillsLang: p.skillsLang ?? "",
    awards: p.awards ?? "",
    activities: p.activities ?? "",
    publications: "",
    format: "us_ats" as const,
    length: "1page" as const,
    lang: "English" as const,
  }
}

/**
 * Cost calculator defaults.
 */
export function costDefaults(p: ApplicantProfile) {
  // Use first country if comma-separated
  const firstCountry = (p.goals.countries ?? "").split(",")[0].trim()
  return {
    country: firstCountry,
    city: "",
    university: "",
    level: (p.goals.level ?? "Bachelor"),
    duration: "4",
    lifestyle: "standard" as const,
    scholarship: "",
    budget: p.goals.budget ?? "",
    citizenship: p.personal.citizenship ?? "Узбекистан",
    field: p.goals.major ?? "",
    notes: p.weak ?? "",
    lang: "Русский" as const,
  }
}

/**
 * Recommendation letter — student-side defaults.
 */
export function recommendationDefaults(p: ApplicantProfile) {
  return {
    rec_name: "",
    rec_position: "",
    rec_institution: "",
    rec_email: "",
    rec_subject: "",
    rec_duration: "",
    st_name: p.personal.name ?? "",
    st_target: [p.goals.targetUnis?.split(",")[0]?.trim(), p.goals.major]
      .filter(Boolean)
      .join(" · "),
    st_program: p.goals.level ?? "Bachelor",
    achievements: p.awards ?? "",
    qualities: "",
    anecdote: "",
    growth: "",
    lang: "Русский" as const,
    tone: "formal" as const,
    length: "medium" as const,
  }
}

/**
 * Reviewer (Mock Application Reviewer) defaults.
 */
export function reviewerDefaults(p: ApplicantProfile) {
  return {
    university: (p.goals.targetUnis ?? "").split(",")[0]?.trim() ?? "",
    program: p.goals.major ?? "",
    round: "Regular Decision (RD)" as const,
    deadline: "",
    strictness: "top30" as const,
    citizenship: p.personal.citizenship ?? "Узбекистан",
    schoolType: p.academic.schoolType ?? "",
    gpa: p.academic.gpa ?? "",
    tests: [p.academic.sat && `SAT ${p.academic.sat}`, bestEnglishTest(p)]
      .filter(Boolean)
      .join(", "),
    apIb: p.academic.apIb ?? "",
    personalStatement: "",
    supplemental1: "",
    supplemental2: "",
    supplemental3: "",
    activities: p.activities ?? "",
    awards: p.awards ?? "",
    recommenders: "",
    demographics: "",
    constraints: p.weak ?? "",
  }
}

/**
 * Interview trainer defaults.
 */
export function interviewDefaults(p: ApplicantProfile) {
  return {
    uni: (p.goals.targetUnis ?? "").split(",")[0]?.trim() ?? "",
    major: p.goals.major ?? "",
    type: "Alumni interview (US)",
    lang: "Русский",
    count: "8",
    about: [p.activities, p.awards].filter(Boolean).join("\n\n"),
  }
}
