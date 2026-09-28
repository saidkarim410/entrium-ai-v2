import { describe, it, expect } from "vitest"
import { effectiveStatus, isCurrentOpportunity, checkEligibility, formatScholarshipLine } from "@/lib/scholarships/quality"
import { EMPTY_PROFILE } from "@/lib/applicant/types"

const TODAY = "2026-09-28"

describe("scholarship status (P1-01)", () => {
  it("expired deadline is closed even without the 0025 column", () => {
    expect(effectiveStatus({ id: "1", name: "x", deadline: "2026-01-15" }, TODAY)).toBe("closed")
    expect(isCurrentOpportunity({ id: "1", name: "x", deadline: "2026-01-15" }, TODAY)).toBe(false)
  })

  it("future deadline is open; stored status wins", () => {
    expect(effectiveStatus({ id: "1", name: "x", deadline: "2026-11-04" }, TODAY)).toBe("open")
    expect(effectiveStatus({ id: "1", name: "x", deadline: "2026-11-04", status: "archived" }, TODAY)).toBe("archived")
  })
})

describe("scholarship eligibility before ranking", () => {
  const bachelor = { ...EMPTY_PROFILE, personal: { citizenship: "Узбекистан" }, goals: { level: "Bachelor" as const } }

  it("a master's-only contest is not offered to a bachelor applicant", () => {
    const v = checkEligibility({ id: "1", name: "Chevening", level: "master" }, bachelor)
    expect(v.ok).toBe(false)
    expect(v.blockers[0]).toContain("master")
  })

  it("citizenship lists are enforced; unknown citizenship is reported, not assumed", () => {
    expect(checkEligibility({ id: "1", name: "x", eligible_citizenships: ["Uzbekistan"] }, bachelor).ok).toBe(true)
    expect(checkEligibility({ id: "1", name: "x", eligible_citizenships: ["Kazakhstan"] }, bachelor).ok).toBe(false)
    const v = checkEligibility({ id: "1", name: "x", eligible_citizenships: ["Kazakhstan"] }, EMPTY_PROFILE)
    expect(v.ok).toBe(true)
    expect(v.unknowns[0]).toContain("гражданство")
  })

  it("context line carries status, edition year and verification", () => {
    const line = formatScholarshipLine(
      { id: "1", name: "DAAD", provider: "DAAD", country: "Germany", level: "master", deadline: "2026-01-15", edition_year: 2026, url: "https://daad.de" },
      1,
      TODAY,
      checkEligibility({ id: "1", name: "DAAD", level: "master" }, bachelor)
    )
    expect(line).toContain("статус: закрыт")
    expect(line).toContain("ПРОШЁЛ")
    expect(line).toContain("ТРЕБУЕТ ПРОВЕРКИ")
    expect(line).toContain("НЕ ПОДХОДИТ")
  })
})
