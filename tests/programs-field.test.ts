import { describe, it, expect } from "vitest"
import { fieldOf, filtersFromProfile, matchProgram, type Program } from "@/lib/programs/types"
import { EMPTY_PROFILE } from "@/lib/applicant/types"

/**
 * Found in the 2026-09-28 manual regression run: once the base spans many fields,
 * a Computer Science programme in Malaysia was listed as an "alternative" for an
 * Economics applicant targeting Italy. A different field is never an alternative.
 */
const base: Program = {
  id: "p1",
  university_name: "Asia Pacific University",
  country: "Malaysia",
  program_name: "BSc (Hons) in Computer Science",
  level: "bachelor",
  language: "en",
  intake_year: 2027,
  tuition_amount: 108500,
  tuition_currency: "MYR",
  tuition_period: "total",
  duration_years: 3,
  accepts_11_year_school: "conditional",
  required_exams: [],
  deadline_status: "not_published",
  source_url: "https://example.org",
  status: "verified",
} as unknown as Program

const economist = {
  ...EMPTY_PROFILE,
  academic: { schoolYears: "12", ielts: "7.0" },
  goals: { level: "Bachelor" as const, year: "2027", major: "Economics and Finance", countries: "Италия", instructionLanguage: "английский" },
}

describe("field of study", () => {
  it("classifies programme names and majors coarsely", () => {
    expect(fieldOf("Economics and Finance")).toBe("economics_business")
    expect(fieldOf("Global Business Administration")).toBe("economics_business")
    expect(fieldOf("Master in Management & Technology")).toBe("economics_business")
    expect(fieldOf("Computer Science Engineering BSc")).toBe("computer_science")
    expect(fieldOf("Electrical Engineering and Computer Science")).toBe("computer_science")
    expect(fieldOf("BSc Computer Engineering")).toBe("computer_science")
    expect(fieldOf("Mechanical Engineering")).toBe("engineering")
    expect(fieldOf("Philosophy & Economics")).toBe("economics_business")
    expect(fieldOf("Информатика")).toBe("computer_science")
    expect(fieldOf("")).toBeNull()
    expect(fieldOf("Underwater basket weaving")).toBeNull()
  })

  it("a programme in another field is outside the request and never an alternative", () => {
    const f = filtersFromProfile(economist)
    expect(f.field).toBe("economics_business")
    const m = matchProgram(base, f)
    expect(m.outsideRequest).toContain("field")
    expect(m.outsideRequest).toContain("country")
    expect(m.reasons.join(" ")).toMatch(/направление программы/)
  })

  it("an unknown field on either side applies no field filter", () => {
    const f = filtersFromProfile({ ...economist, goals: { ...economist.goals, major: "" } })
    expect(f.field).toBeNull()
    expect(matchProgram(base, f).outsideRequest).not.toContain("field")
    const vague = { ...base, program_name: "Liberal Studies" }
    expect(matchProgram(vague, filtersFromProfile(economist)).outsideRequest).not.toContain("field")
  })

  it("'Bocconi online test or SAT/ACT' is one requirement, satisfied by a SAT score", () => {
    const bocconi = { ...base, country: "Italy", program_name: "BSc in International Economics and Finance", required_exams: ["Bocconi online test or SAT/ACT"] }
    const noSat = matchProgram(bocconi, filtersFromProfile(economist))
    expect(noSat.reasons.join(" ")).toMatch(/нет результата SAT\/ACT/)
    const withSat = matchProgram(bocconi, filtersFromProfile({ ...economist, academic: { ...economist.academic, sat: "1400" } }))
    expect(withSat.reasons.join(" ")).not.toMatch(/SAT\/ACT/)
  })
})
