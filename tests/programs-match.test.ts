import { describe, it, expect } from "vitest"
import {
  parseCountries,
  normalizeLanguage,
  normalizeLevel,
  parseBudgetUsd,
  budgetIncludesLiving,
  parseIeltsRequirement,
  filtersFromProfile,
  matchProgram,
  formatProgramsContext,
  tuitionUsdPerYear,
  type Program,
  type ApplicantFilters,
} from "@/lib/programs/types"
import { EMPTY_PROFILE } from "@/lib/applicant/types"

const bocconi: Program = {
  id: "p1",
  university_name: "Bocconi University",
  country: "Italy",
  city: "Milan",
  program_name: "BSc International Economics and Finance",
  level: "bachelor",
  language: "en",
  intake: "Fall 2027",
  intake_year: 2027,
  tuition_amount: 4000, // public-university level fee so the TZ budget ($10k) covers tuition
  tuition_currency: "EUR",
  tuition_period: "year",
  admission_requirements: "12 years of schooling or 11 + 1 year of university",
  accepts_11_year_school: "conditional",
  required_exams: [],
  english_requirement: "IELTS 6.0",
  application_deadline: null,
  deadline_status: "not_published",
  source_url: "https://www.unibocconi.eu/",
  status: "verified",
  verified_at: "2026-09-28",
}

const tuGraz: Program = {
  ...bocconi,
  id: "p2",
  university_name: "TU Graz",
  country: "Austria",
  city: "Graz",
  program_name: "Bachelor Economics",
  language: "de",
  tuition_amount: 727,
  accepts_11_year_school: "unknown",
  english_requirement: null,
}

// The CTO TZ test profile: UZ, 11-year school, Bachelor Economics, English, Italy/Germany,
// IELTS 7.0, no SAT, $10k/year incl. living, needs a scholarship.
const tzProfile = {
  ...EMPTY_PROFILE,
  personal: { citizenship: "Узбекистан" },
  academic: { schoolYears: "11", graduation: "июнь 2027", gpa: "4.6/5", ielts: "7.0" },
  goals: {
    level: "Bachelor" as const,
    year: "2027",
    major: "Economics and Finance",
    countries: "Италия, Германия",
    budget: "$10 000 в год, включая обучение и проживание",
    instructionLanguage: "английский",
  },
}

describe("programs — normalisers", () => {
  it("countries and languages in Russian or English map to canonical values", () => {
    expect(parseCountries("Италия, Германия")).toEqual(["Italy", "Germany"])
    expect(parseCountries("USA and UK")).toEqual(["United States", "United Kingdom"])
    expect(normalizeLanguage("английский")).toBe("en")
    expect(normalizeLanguage("German")).toBe("de")
    expect(normalizeLevel("Bachelor")).toBe("bachelor")
    expect(normalizeLevel("магистратура")).toBe("master")
  })

  it("budget parsing", () => {
    expect(parseBudgetUsd("$10 000 в год, включая обучение и проживание")).toBe(10000)
    expect(parseBudgetUsd("15k")).toBe(15000)
    expect(parseBudgetUsd("€8.000")).toBe(8800)
    expect(parseBudgetUsd("")).toBeNull()
    expect(budgetIncludesLiving("$10 000 в год, включая проживание")).toBe(true)
    expect(budgetIncludesLiving("$10 000 tuition")).toBe(false)
  })

  it("IELTS requirement parsing and tuition per year", () => {
    expect(parseIeltsRequirement("IELTS 6.5 (no band below 6.0)")).toBe(6.5)
    expect(parseIeltsRequirement("TOEFL 90")).toBeNull()
    expect(tuitionUsdPerYear({ ...bocconi, tuition_amount: 1000, tuition_currency: "EUR", tuition_period: "semester" })).toBe(2200)
  })
})

describe("programs — filters from the TZ profile", () => {
  const f = filtersFromProfile(tzProfile)
  it("extracts level, countries, language, intake, budget and school length", () => {
    expect(f).toMatchObject({
      level: "bachelor",
      countries: ["Italy", "Germany"],
      language: "en",
      intakeYear: 2027,
      budgetUsd: 10000,
      budgetIncludesLiving: true,
      schoolYears: "11",
      ielts: 7,
      sat: null,
    })
  })
})

describe("programs — matching (P0-03 acceptance)", () => {
  const f: ApplicantFilters = filtersFromProfile(tzProfile)

  it("Austria + German-taught programme is NOT in the main results", () => {
    const m = matchProgram(tuGraz, f)
    expect(m.status).toBe("not_eligible")
    expect(m.outsideRequest).toEqual(expect.arrayContaining(["country", "language"]))
  })

  it("11-year school barrier is checked before recommending direct entry", () => {
    const m = matchProgram(bocconi, f)
    expect(m.status).toBe("conditions")
    expect(m.reasons.join(" ")).toContain("11-летней школы")
    const direct = matchProgram({ ...bocconi, accepts_11_year_school: "no" }, f)
    expect(direct.status).toBe("not_eligible")
  })

  it("budget above tuition but not living → funding gap flagged, still inside the request", () => {
    const m = matchProgram(bocconi, f)
    expect(m.outsideRequest).toEqual([])
    expect(m.fundingGapUsd).toBeGreaterThan(0)
  })

  it("tuition above budget → outside the request (alternative), never a silent pass", () => {
    const pricey = { ...bocconi, tuition_amount: 14000 } // €14k ≈ $15.4k > $10k
    const m = matchProgram(pricey, f)
    expect(m.outsideRequest).toContain("budget")
    expect(m.status).toBe("not_eligible")
  })

  it("unknown values are 'insufficient_data', not a match", () => {
    const m = matchProgram(
      { ...bocconi, accepts_11_year_school: "yes", english_requirement: null, tuition_amount: null },
      { ...f, budgetUsd: null }
    )
    expect(m.status).toBe("insufficient_data")
  })

  it("meets when every published requirement is satisfied", () => {
    const m = matchProgram(
      { ...bocconi, accepts_11_year_school: "yes", english_requirement: "IELTS 6.0" },
      { ...f, budgetUsd: null, schoolYears: "12" }
    )
    expect(m.status).toBe("meets")
  })
})

describe("programs — prompt context", () => {
  const f = filtersFromProfile(tzProfile)
  it("separates main results from alternatives and forbids percentages", () => {
    const ctx = formatProgramsContext(
      [
        { program: bocconi, match: matchProgram(bocconi, f) },
        { program: { ...tuGraz, language: "en" }, match: matchProgram({ ...tuGraz, language: "en" }, f) },
      ],
      f
    )
    expect(ctx).toContain("ОСНОВНАЯ ВЫДАЧА")
    expect(ctx).toContain("Bocconi University")
    expect(ctx).toContain("АЛЬТЕРНАТИВЫ")
    expect(ctx).toContain("ОТКЛОНЕНИЕ ОТ ЗАПРОСА: country")
    expect(ctx).toContain("Никаких процентов")
    expect(ctx).toContain("https://www.unibocconi.eu/")
  })

  it("empty base is stated, not filled in", () => {
    const ctx = formatProgramsContext([], f)
    expect(ctx).toContain("ОСНОВНАЯ ВЫДАЧА: пусто")
  })
})
